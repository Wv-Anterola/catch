"""Extract: DuckDB projected/filtered scans of the raw Synthea CSVs.

Reads only the columns and rows CATCH needs and writes compact parquet to the
staging dir. Never loads a full CSV into Python memory; DuckDB streams the scan
and spills to `duckdb_temp` if provided (use D: for the 300k run).

Outputs (staging/*.parquet):
  patients, bp, labs, htn_dx, comorbid_dx, meds, encounters, organizations, providers
"""

from __future__ import annotations

import time

import duckdb

from . import codes
from .config import Paths, SOURCE_FILES


def _csv(paths: Paths, key: str) -> str:
    p = (paths.source / SOURCE_FILES[key]).as_posix()
    return p


def _sql_list(values) -> str:
    return ", ".join(f"'{v}'" for v in values)


def connect(paths: Paths) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    # Bound memory; spill to temp dir (D:) for the big observations scan.
    con.execute("PRAGMA memory_limit='4GB'")
    con.execute("PRAGMA threads=4")
    if paths.duckdb_temp is not None:
        con.execute(f"SET temp_directory='{paths.duckdb_temp.as_posix()}'")
    return con


def run(paths: Paths, log=print) -> dict[str, int]:
    """Execute all extracts; return row counts per staged table."""
    paths.ensure()
    con = connect(paths)
    counts: dict[str, int] = {}

    def copy(name: str, query: str) -> None:
        t0 = time.time()
        out = (paths.staging / f"{name}.parquet").as_posix()
        con.execute(f"COPY ({query}) TO '{out}' (FORMAT parquet)")
        n = con.execute(f"SELECT count(*) FROM read_parquet('{out}')").fetchone()[0]
        counts[name] = n
        log(f"  [extract] {name}: {n:,} rows in {time.time()-t0:.1f}s")

    # read_csv with header; VALUE kept as VARCHAR (cast later) to survive non-numeric rows.
    def rd(key: str, cols: str) -> str:
        return (f"SELECT {cols} FROM read_csv('{_csv(paths, key)}', "
                f"header=true, all_varchar=true, ignore_errors=true)")

    # --- patients (small; keep only CATCH fields) ---
    copy("patients", rd("patients",
        "Id AS patient, BIRTHDATE, DEATHDATE, GENDER, RACE, ETHNICITY, "
        "CITY, COUNTY, ZIP, LAT, LON, INCOME"))

    # --- observations: BP only ---
    obs_codes = _sql_list(codes.OBSERVATION_CODE_LIST)
    bp_codes = _sql_list((codes.SYSTOLIC_BP.code, codes.DIASTOLIC_BP.code))
    lab_codes = _sql_list((codes.BMI.code, codes.LDL.code, codes.A1C.code,
                           codes.HDL.code, codes.TOTAL_CHOL.code))
    copy("bp", f"""
        SELECT PATIENT AS patient, ENCOUNTER AS encounter, DATE AS obs_date,
               CODE AS code, TRY_CAST(VALUE AS DOUBLE) AS value
        FROM read_csv('{_csv(paths, "observations")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({bp_codes}) AND TRY_CAST(VALUE AS DOUBLE) IS NOT NULL
    """)

    # --- observations: labs (BMI/LDL/A1c/HDL/chol) ---
    copy("labs", f"""
        SELECT PATIENT AS patient, DATE AS obs_date, CODE AS code,
               TRY_CAST(VALUE AS DOUBLE) AS value
        FROM read_csv('{_csv(paths, "observations")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({lab_codes}) AND TRY_CAST(VALUE AS DOUBLE) IS NOT NULL
    """)

    # --- conditions: hypertension dx ---
    htn = _sql_list(codes.HYPERTENSION_CODES.keys())
    copy("htn_dx", f"""
        SELECT PATIENT AS patient, START AS start_date, CODE AS code, DESCRIPTION AS description
        FROM read_csv('{_csv(paths, "conditions")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({htn})
    """)

    # --- conditions: comorbidities ---
    comorbid = _sql_list(codes.COMORBIDITY_CODES.keys())
    copy("comorbid_dx", f"""
        SELECT PATIENT AS patient, START AS start_date, CODE AS code, DESCRIPTION AS description
        FROM read_csv('{_csv(paths, "conditions")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({comorbid})
    """)

    # --- medications: antihypertensive candidates (curated codes OR name stems) ---
    cur_codes = _sql_list(codes.ANTIHYPERTENSIVE_CODES.keys())
    stems = codes.ALL_MED_STEMS
    copy("meds", f"""
        SELECT PATIENT AS patient, START AS start_date, STOP AS stop_date,
               CODE AS code, DESCRIPTION AS description
        FROM read_csv('{_csv(paths, "medications")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({cur_codes})
           OR regexp_matches(lower(DESCRIPTION), '{stems}')
    """)

    # --- encounters: patient + date only (visit counts) ---
    copy("encounters", rd("encounters",
        "PATIENT AS patient, START AS start_date, ORGANIZATION AS organization, "
        "ENCOUNTERCLASS AS encounterclass"))

    # --- organizations + providers (tiny; for hospital map) ---
    copy("organizations", rd("organizations",
        "Id AS organization, NAME AS name, CITY AS city, STATE AS state, "
        "ZIP AS zip, LAT AS lat, LON AS lon"))
    copy("providers", rd("providers",
        "Id AS provider, ORGANIZATION AS organization, NAME AS name, "
        "SPECIALITY AS speciality"))

    con.close()
    return counts


if __name__ == "__main__":  # pragma: no cover
    import argparse

    ap = argparse.ArgumentParser(description="CATCH extract")
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--duckdb-temp", default=None)
    a = ap.parse_args()
    p = Paths(source=a.source, output=a.output, duckdb_temp=a.duckdb_temp)
    run(p)
