"""Transform: assemble PatientFacts from staged parquet and run the engine.

Keeps data plumbing out of engine.py. Produces:
  * results_df : one row per adult patient with classification + demographics + geo
  * details    : {patient_id -> detail dict} for flagged patients (timeline, evidence,
                 rule trace, comorbidities, priority factors)
  * meta       : denominators + reference date + counts for validation/UI
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pandas as pd

from . import codes, config
from .engine import PatientFacts, classify_patient

YEAR = 365.25


def _to_dt(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True).dt.tz_localize(None)


def _load(staging: Path, name: str) -> pd.DataFrame:
    return pd.read_parquet(staging / f"{name}.parquet")


def build(staging: Path, log=print) -> tuple[pd.DataFrame, dict, dict]:
    staging = Path(staging)
    patients = _load(staging, "patients")
    bp = _load(staging, "bp")
    labs = _load(staging, "labs")
    htn = _load(staging, "htn_dx")
    comorbid = _load(staging, "comorbid_dx")
    meds = _load(staging, "meds")
    enc = _load(staging, "encounters")

    # --- dates ---
    patients["BIRTHDATE"] = _to_dt(patients["BIRTHDATE"])
    patients["DEATHDATE"] = _to_dt(patients["DEATHDATE"])
    bp["obs_date"] = _to_dt(bp["obs_date"])
    labs["obs_date"] = _to_dt(labs["obs_date"])
    htn["start_date"] = _to_dt(htn["start_date"])
    comorbid["start_date"] = _to_dt(comorbid["start_date"])
    meds["start_date"] = _to_dt(meds["start_date"])
    enc["start_date"] = _to_dt(enc["start_date"])

    reference = max(bp["obs_date"].max(), enc["start_date"].max())
    log(f"  [transform] reference date = {reference.date()}")

    patients = patients.set_index("patient")
    patients["age_ref"] = (reference - patients["BIRTHDATE"]).dt.days / YEAR
    patients["alive"] = patients["DEATHDATE"].isna()

    # --- BP split ---
    sysrows = bp[bp["code"] == codes.SYSTOLIC_BP.code].copy()
    diarows = bp[bp["code"] == codes.DIASTOLIC_BP.code].copy()
    sysrows = sysrows.join(patients["BIRTHDATE"], on="patient")
    sysrows["age_at"] = (sysrows["obs_date"] - sysrows["BIRTHDATE"]).dt.days / YEAR
    adult_sys = sysrows[sysrows["age_at"] >= config.ADULT_MIN_AGE]
    sys_by_pt: dict[str, list] = {}
    for pid, dt, v in zip(adult_sys["patient"], adult_sys["obs_date"], adult_sys["value"]):
        sys_by_pt.setdefault(pid, []).append((dt, v))

    # --- diagnoses / meds / visits ---
    htn_by_pt: dict[str, list] = {}
    for pid, sd in zip(htn["patient"], htn["start_date"]):
        if pd.notna(sd):
            htn_by_pt.setdefault(pid, []).append(sd)

    # Classify only DISTINCT (code, description) pairs, then map back to all rows
    # (avoids a per-row regex over millions of medication rows).
    uniq = meds[["code", "description"]].drop_duplicates()
    cls_map: dict[tuple, tuple | None] = {}
    for code_v, desc_v in zip(uniq["code"], uniq["description"]):
        m = codes.classify_med(str(code_v), str(desc_v))
        cls_map[(code_v, desc_v)] = (m.drug_class, m.ambiguous) if m else None
    keys = list(zip(meds["code"], meds["description"]))
    cls = [cls_map.get(k) for k in keys]
    meds = meds.assign(_cls=cls)
    meds = meds[meds["_cls"].notna() & meds["start_date"].notna()]
    meds_by_pt: dict[str, list] = {}
    for pid, sd, c in zip(meds["patient"], meds["start_date"], meds["_cls"]):
        meds_by_pt.setdefault(pid, []).append((sd, c[0], c[1]))

    visits_by_pt = enc.groupby("patient").size().to_dict()

    # --- comorbidity resolution (conditions + latest labs) ---
    como_codes_by_pt = {pid: set(g["code"]) for pid, g in comorbid.groupby("patient")}

    def latest_lab(code_str):
        sub = labs[labs["code"] == code_str].sort_values("obs_date")
        return sub.groupby("patient")["value"].last().to_dict()
    latest_bmi = latest_lab(codes.BMI.code)
    latest_ldl = latest_lab(codes.LDL.code)
    latest_a1c = latest_lab(codes.A1C.code)

    def comorbidities_for(pid) -> dict[str, str]:
        tags: dict[str, str] = {}
        cc = como_codes_by_pt.get(pid, set())
        bmi = latest_bmi.get(pid)
        ldl = latest_ldl.get(pid)
        a1c = latest_a1c.get(pid)
        # Evidence text must reflect the ACTUAL trigger. If a sub-threshold lab is
        # present but the tag comes from a diagnosis code, do NOT show the lab as if
        # it were the reason (e.g. never label BMI 27.8 as "obesity (BMI 27.8)").
        obese_by_bmi = bmi is not None and bmi >= config.BMI_OBESE
        if obese_by_bmi:
            tags["obesity"] = f"BMI {bmi:.1f}"
        elif "162864005" in cc or "408512008" in cc:
            tags["obesity"] = "obesity diagnosis on file"
        if ldl is not None and ldl >= config.LDL_HIGH:
            tags["high_ldl"] = f"LDL {ldl:.0f}"
        if "55822004" in cc:
            tags["hyperlipidemia"] = "hyperlipidemia diagnosis on file"
        prediab_by_a1c = a1c is not None and config.A1C_PREDIABETES_LOW <= a1c <= config.A1C_PREDIABETES_HIGH
        if prediab_by_a1c:
            tags["prediabetes"] = f"A1c {a1c:.1f}"
        elif "714628002" in cc:
            tags["prediabetes"] = "prediabetes diagnosis on file"
        if "237602007" in cc:
            tags["metabolic_syndrome"] = "metabolic syndrome dx on file"
        return tags

    # --- run engine per patient (single pass; keep facts only for flagged) ---
    rows = []
    flagged_items: dict[str, tuple] = {}
    cols = zip(patients.index, patients["age_ref"], patients["alive"], patients["GENDER"],
               patients["CITY"], patients["COUNTY"], patients["LAT"], patients["LON"])
    for pid, age_ref, alive, gender, city, county, lat, lon in cols:
        pf = PatientFacts(
            patient_id=pid,
            age=float(age_ref) if pd.notna(age_ref) else -1.0,
            alive=bool(alive),
            gender=gender or "", city=city or "", county=county or "",
            lat=_num(lat), lon=_num(lon),
            systolic=sys_by_pt.get(pid, []),
            htn_dx=htn_by_pt.get(pid, []),
            meds=meds_by_pt.get(pid, []),
            comorbidities=comorbidities_for(pid),
            n_visits=int(visits_by_pt.get(pid, 0)),
        )
        res = classify_patient(pf)
        rows.append({
            "patient_id": pid, "category": res.category, "flagged": res.flagged,
            "priority": res.priority, "reason": res.reason,
            "n_highs": res.n_qualifying_highs, "max_systolic": res.max_systolic,
            "first_high": res.first_high_date, "last_high": res.last_high_date,
            "on_meds": res.on_antihypertensive, "has_htn_dx": res.has_htn_dx,
            "stacked": res.stacked_risk_count, "comorbid_tags": ",".join(res.comorbid_tags),
            "age": round(pf.age, 1), "gender": pf.gender, "city": pf.city,
            "county": pf.county, "lat": pf.lat, "lon": pf.lon, "n_visits": pf.n_visits,
            "adult": pf.alive and pf.age >= config.ADULT_MIN_AGE,
            "dq": "; ".join(res.data_quality), "dq_flag": bool(res.data_quality),
        })
        if res.flagged:
            flagged_items[pid] = (pf, res)

    # --- build detail timelines only for flagged patients (pre-grouped, not O(n) each) ---
    fset = set(flagged_items)
    fsys = sysrows[sysrows["patient"].isin(fset)]
    fdia = diarows[diarows["patient"].isin(fset)]
    sys_tl = {pid: sorted(((r_dt, r_v) for r_dt, r_v in zip(g["obs_date"], g["value"])
                           if pd.notna(r_dt)), key=lambda x: x[0])
              for pid, g in fsys.groupby("patient")}
    dia_tl = {pid: {dt.date().isoformat(): v for dt, v in zip(g["obs_date"], g["value"])
                    if pd.notna(dt)}
              for pid, g in fdia.groupby("patient")}
    details = {pid: _detail(pid, pf, res, sys_tl.get(pid, []), dia_tl.get(pid, {}))
               for pid, (pf, res) in flagged_items.items()}

    results_df = pd.DataFrame(rows)
    meta = _meta(results_df, reference)
    for k, v in meta.items():
        log(f"  [transform] {k} = {v}")
    return results_df, details, meta


def _num(v):
    try:
        f = float(v)
        return f if f == f else None  # drop NaN
    except (TypeError, ValueError):
        return None


def _detail(pid, pf: PatientFacts, res, sys_series, dia_map) -> dict:
    # sys_series: sorted [(datetime, value)]; dia_map: {date_iso: value}
    timeline = [{"date": dt.date().isoformat(), "systolic": v,
                 "diastolic": dia_map.get(dt.date().isoformat())}
                for dt, v in sys_series]
    return {
        "patient_id": pid, "category": res.category, "priority": res.priority,
        "reason": res.reason, "age": round(pf.age, 1), "gender": pf.gender,
        "city": pf.city, "county": pf.county,
        "n_highs": res.n_qualifying_highs, "max_systolic": res.max_systolic,
        "first_high": res.first_high_date.date().isoformat() if res.first_high_date else None,
        "last_high": res.last_high_date.date().isoformat() if res.last_high_date else None,
        "on_meds": res.on_antihypertensive, "has_htn_dx": res.has_htn_dx,
        "n_visits": pf.n_visits,
        "comorbidities": [{"tag": t, "evidence": pf.comorbidities[t]} for t in res.comorbid_tags],
        "med_classes": sorted({c for _, c, amb in pf.meds if not amb}),
        "rule_trace": res.rule_trace, "priority_factors": res.priority_factors,
        "data_quality": res.data_quality,
        "bp_timeline": timeline,
    }


def _meta(df: pd.DataFrame, reference: datetime) -> dict:
    adults = df[df["adult"]]
    flagged = adults[adults["flagged"]]
    return {
        "reference_date": reference.date().isoformat(),
        "engine_version": __import__("catch.etl", fromlist=["ENGINE_VERSION"]).ENGINE_VERSION,
        "build_timestamp": datetime.now().isoformat(timespec="seconds"),
        "total_patients": int(len(df)),
        "adults": int(len(adults)),
        "adults_with_2plus_highs": int((adults["n_highs"] >= config.MIN_QUALIFYING_HIGHS).sum()),
        "flagged_total": int(len(flagged)),
        "undiagnosed": int((adults["category"] == "undiagnosed").sum()),
        "treated_uncontrolled": int((adults["category"] == "treated_uncontrolled").sum()),
        "diagnosed_no_med": int((adults["category"] == "diagnosed_no_med").sum()),
    }
