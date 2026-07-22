"""Emit: write the compact app database (SQLite) from engine results.

Tables (all read by the Next.js app via better-sqlite3):
  meta(key, value)                     build metadata + thresholds
  cohort(...)                          one row per FLAGGED patient (the outreach queue)
  patient_detail(patient_id, json)     full evidence + rule trace + timeline
  city_stats(...)                      per-city denominators for population view
  hospitals(...)                       care sites with valid geo (name contains HOSPITAL)
  funnel(stage, n, ord)                the CATCH funnel
  equity_stats(...)                    suppressed, aggregate-only equity audit
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pandas as pd

from . import config


def emit(df: pd.DataFrame, details: dict, meta: dict, staging: Path, out_db: Path) -> Path:
    out_db = Path(out_db)
    out_db.parent.mkdir(parents=True, exist_ok=True)
    if out_db.exists():
        out_db.unlink()
    con = sqlite3.connect(out_db)
    cur = con.cursor()

    # --- meta ---
    cur.execute("CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT)")
    m = dict(meta)
    m.update({
        "systolic_high": config.SYSTOLIC_HIGH, "systolic_severe": config.SYSTOLIC_SEVERE,
        "min_qualifying_highs": config.MIN_QUALIFYING_HIGHS, "adult_min_age": config.ADULT_MIN_AGE,
    })
    cur.executemany("INSERT INTO meta VALUES(?,?)", [(k, str(v)) for k, v in m.items()])

    # --- cohort (flagged only, ranked) ---
    adults = df[df["adult"]].copy()
    flagged = adults[adults["flagged"]].copy()
    prio_rank = {"urgent": 0, "high": 1, "routine": 2}
    flagged["prio_rank"] = flagged["priority"].map(prio_rank).fillna(3)
    # Cap high-count influence so simulation artifacts don't dominate; clean records
    # rank above data-quality-flagged ones within the same priority.
    flagged["highs_capped"] = flagged["n_highs"].clip(upper=20)
    flagged["last_high_sort"] = flagged["last_high"].astype(str)
    flagged = flagged.sort_values(
        ["prio_rank", "dq_flag", "stacked", "highs_capped", "last_high_sort"],
        ascending=[True, True, False, False, False])
    cur.execute("""
        CREATE TABLE cohort(
            patient_id TEXT PRIMARY KEY, category TEXT, priority TEXT, reason TEXT,
            city TEXT, county TEXT, lat REAL, lon REAL, age REAL, gender TEXT,
            n_highs INTEGER, max_systolic REAL, first_high TEXT, last_high TEXT,
            on_meds INTEGER, has_htn_dx INTEGER, stacked INTEGER, comorbid_tags TEXT,
            n_visits INTEGER, data_quality TEXT, support_flags TEXT,
            recommended_roles TEXT, rank INTEGER)
    """)
    for rank, (_, r) in enumerate(flagged.iterrows(), start=1):
        cur.execute("INSERT INTO cohort VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
            r["patient_id"], r["category"], r["priority"], r["reason"], r["city"], r["county"],
            r["lat"], r["lon"], r["age"], r["gender"], int(r["n_highs"]),
            r["max_systolic"], _d(r["first_high"]), _d(r["last_high"]),
            int(bool(r["on_meds"])), int(bool(r["has_htn_dx"])), int(r["stacked"]),
            r["comorbid_tags"], int(r["n_visits"]), r["dq"], r["support_flags"],
            r["recommended_roles"], rank))

    # --- patient_detail ---
    cur.execute("CREATE TABLE patient_detail(patient_id TEXT PRIMARY KEY, json TEXT)")
    cur.executemany("INSERT INTO patient_detail VALUES(?,?)",
                    [(pid, json.dumps(d, default=str)) for pid, d in details.items()])

    # --- city_stats ---
    cur.execute("""CREATE TABLE city_stats(
        city TEXT, county TEXT, adults INTEGER, flagged INTEGER,
        undiagnosed INTEGER, treated_uncontrolled INTEGER, rate REAL,
        lat REAL, lon REAL)""")
    g = adults.groupby("city")
    for city, sub in g:
        adn = len(sub)
        fl = int(sub["flagged"].sum())
        und = int((sub["category"] == "undiagnosed").sum())
        tu = int((sub["category"] == "treated_uncontrolled").sum())
        lat = sub["lat"].dropna().median()
        lon = sub["lon"].dropna().median()
        cur.execute("INSERT INTO city_stats VALUES(?,?,?,?,?,?,?,?,?)", (
            city, sub["county"].iloc[0], adn, fl, und, tu,
            round(100 * fl / adn, 1) if adn else 0.0,
            None if pd.isna(lat) else lat, None if pd.isna(lon) else lon))

    # --- hospitals ---
    orgs = pd.read_parquet(staging / "organizations.parquet")
    orgs["lat"] = pd.to_numeric(orgs["lat"], errors="coerce")
    orgs["lon"] = pd.to_numeric(orgs["lon"], errors="coerce")
    hosp = orgs[orgs["name"].str.contains("HOSPITAL", case=False, na=False)
                & orgs["lat"].notna()]
    cur.execute("CREATE TABLE hospitals(name TEXT, city TEXT, lat REAL, lon REAL)")
    cur.executemany("INSERT INTO hospitals VALUES(?,?,?,?)",
                    [(r["name"], r.get("city", ""), r["lat"], r["lon"])
                     for _, r in hosp.iterrows()])

    # --- funnel ---
    cur.execute("CREATE TABLE funnel(stage TEXT, n INTEGER, ord INTEGER)")
    steps = [("Adults analyzed", meta["adults"]),
             ("2+ elevated readings (adult)", meta["adults_with_2plus_highs"]),
             ("Undiagnosed care gap", meta["undiagnosed"]),
             ("Treated but uncontrolled", meta["treated_uncontrolled"])]
    cur.executemany("INSERT INTO funnel VALUES(?,?,?)",
                    [(s, n, i) for i, (s, n) in enumerate(steps)])

    # --- aggregate equity audit ---
    # Race and ethnicity intentionally stay out of the queue and patient JSON. Groups
    # smaller than 11 are omitted even though this source bundle is synthetic.
    cur.execute("""CREATE TABLE equity_stats(
        dimension TEXT, group_name TEXT, adults INTEGER, flagged INTEGER,
        support_need INTEGER, language_support INTEGER, food_need INTEGER,
        transport_need INTEGER, insurance_need INTEGER, pcp_need INTEGER)""")

    def has_flag(series, flag: str):
        return series.fillna("").astype(str).str.split(",").map(lambda values: flag in values)

    audit = adults.copy()
    audit["_support"] = audit["support_flags"].fillna("").astype(bool)
    audit["_language"] = has_flag(audit["support_flags"], "language")
    audit["_food"] = has_flag(audit["support_flags"], "food")
    audit["_transport"] = has_flag(audit["support_flags"], "transportation")
    audit["_insurance"] = has_flag(audit["support_flags"], "insurance")
    audit["_pcp"] = has_flag(audit["support_flags"], "pcp")
    for dimension, column in (("overall", None), ("ethnicity", "ethnicity"), ("race", "race")):
        groups = [("All adults", audit)] if column is None else audit.groupby(column)
        for name, sub in groups:
            if len(sub) < 11:
                continue
            cur.execute("INSERT INTO equity_stats VALUES(?,?,?,?,?,?,?,?,?,?)", (
                dimension, str(name or "Unknown"), int(len(sub)), int(sub["flagged"].sum()),
                int(sub["_support"].sum()), int(sub["_language"].sum()), int(sub["_food"].sum()),
                int(sub["_transport"].sum()), int(sub["_insurance"].sum()), int(sub["_pcp"].sum()),
            ))

    con.commit()
    con.close()
    return out_db


def _d(v):
    if v is None or (isinstance(v, float) and v != v):
        return None
    return str(v)[:10]
