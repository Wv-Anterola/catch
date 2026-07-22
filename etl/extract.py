"""Projected, privacy-minimizing extraction from a Synthea CSV bundle."""

from __future__ import annotations

import time

import duckdb

from . import codes
from .config import Paths, SOURCE_FILES


def _csv(paths: Paths, key: str) -> str:
    return (paths.source / SOURCE_FILES[key]).as_posix()


def _sql_list(values) -> str:
    return ", ".join(f"'{v}'" for v in values)


def connect(paths: Paths) -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    con.execute("PRAGMA memory_limit='4GB'")
    con.execute("PRAGMA threads=4")
    if paths.duckdb_temp is not None:
        con.execute(f"SET temp_directory='{paths.duckdb_temp.as_posix()}'")
    return con


def run(paths: Paths, log=print) -> dict[str, int]:
    """Write compact staged parquet inputs. Raw CSV rows never leave staging."""
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

    def rd(key: str, cols: str) -> str:
        return (f"SELECT {cols} FROM read_csv('{_csv(paths, key)}', "
                "header=true, all_varchar=true, ignore_errors=true)")

    copy("patients", rd("patients",
        "Id AS patient, BIRTHDATE, DEATHDATE, GENDER, RACE, ETHNICITY, "
        "CITY, COUNTY, ZIP, LAT, LON, INCOME"))

    # One filtered scan of the very large observations file feeds both the
    # unchanged clinical pipeline and the two outreach-support signals.
    obs_codes = _sql_list(tuple(codes.OBSERVATION_CODES) + tuple(codes.OUTREACH_OBSERVATION_CODES))
    copy("observations_selected", f"""
        SELECT PATIENT AS patient, ENCOUNTER AS encounter, DATE AS obs_date,
               CODE AS code, DESCRIPTION AS description, VALUE AS value
        FROM read_csv('{_csv(paths, "observations")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({obs_codes})
    """)

    condition_codes = _sql_list(
        tuple(codes.HYPERTENSION_CODES) + tuple(codes.COMORBIDITY_CODES) + tuple(codes.TRANSPORTATION_CODES))
    copy("conditions_selected", f"""
        SELECT PATIENT AS patient, START AS start_date, STOP AS stop_date,
               CODE AS code, DESCRIPTION AS description
        FROM read_csv('{_csv(paths, "conditions")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({condition_codes})
    """)

    cur_codes = _sql_list(codes.ANTIHYPERTENSIVE_CODES.keys())
    copy("meds", f"""
        SELECT PATIENT AS patient, START AS start_date, STOP AS stop_date,
               CODE AS code, DESCRIPTION AS description
        FROM read_csv('{_csv(paths, "medications")}', header=true,
                      all_varchar=true, ignore_errors=true)
        WHERE CODE IN ({cur_codes})
           OR regexp_matches(lower(DESCRIPTION), '{codes.ALL_MED_STEMS}')
    """)

    copy("encounters", rd("encounters",
        "PATIENT AS patient, START AS start_date, ORGANIZATION AS organization, "
        "PROVIDER AS provider, PAYER AS payer, ENCOUNTERCLASS AS encounterclass"))
    copy("providers", rd("providers",
        "Id AS provider, ORGANIZATION AS organization, SPECIALITY AS speciality"))
    copy("organizations", rd("organizations",
        "Id AS organization, NAME AS name, CITY AS city, STATE AS state, "
        "ZIP AS zip, LAT AS lat, LON AS lon"))
    copy("payer_transitions", rd("payer_transitions",
        "PATIENT AS patient, START_DATE AS start_date, END_DATE AS end_date, "
        "PAYER AS payer, SECONDARY_PAYER AS secondary_payer"))
    copy("payers", rd("payers", "Id AS payer, NAME AS name, OWNERSHIP AS ownership"))

    con.close()
    return counts


if __name__ == "__main__":  # pragma: no cover
    import argparse

    ap = argparse.ArgumentParser(description="CATCH extract")
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--duckdb-temp", default=None)
    a = ap.parse_args()
    run(Paths(a.source, a.output, a.duckdb_temp))
