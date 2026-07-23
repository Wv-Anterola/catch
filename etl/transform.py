"""Transform staged SyntheticRI records into CATCH clinical and outreach views."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from . import ENGINE_VERSION, codes, config
from .engine import PatientFacts, classify_patient
from .outreach import language_status, recommended_routes, support_flags

YEAR = 365.25


def _to_dt(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce", utc=True).dt.tz_localize(None)


def _load(staging: Path, name: str) -> pd.DataFrame:
    return pd.read_parquet(Path(staging) / f"{name}.parquet")


def _num(v):
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def _iso(v) -> str | None:
    return v.date().isoformat() if pd.notna(v) else None


def _latest_text(rows: pd.DataFrame) -> dict[str, tuple[object, str]]:
    if rows.empty:
        return {}
    ordered = rows.dropna(subset=["obs_date"]).sort_values("obs_date")
    return {pid: (g.iloc[-1]["obs_date"], str(g.iloc[-1]["value"] or ""))
            for pid, g in ordered.groupby("patient")}


def _transport_profiles(rows: pd.DataFrame, reference) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for pid, g in rows.groupby("patient"):
        active = g[(g["start_date"].notna()) & (g["start_date"] <= reference)
                   & (g["stop_date"].isna() | (g["stop_date"] >= reference))]
        if not active.empty:
            row = active.sort_values("start_date").iloc[-1]
            out[pid] = {"status": "documented_need", "label": "transportation barrier documented",
                        "as_of": _iso(row["start_date"])}
    return out


def _insurance_profiles(rows: pd.DataFrame, payers: pd.DataFrame, reference) -> dict[str, dict]:
    names = {str(r["payer"]): str(r["name"] or "") for _, r in payers.iterrows()}
    lookback = reference - timedelta(days=365)
    out: dict[str, dict] = {}
    for pid, group in rows.groupby("patient"):
        group = group.dropna(subset=["start_date", "end_date"]).copy()
        if group.empty:
            continue
        group["payer_name"] = group["payer"].map(lambda p: names.get(str(p), ""))
        active = group[(group["start_date"] <= reference) & (group["end_date"] >= reference)]
        if active["payer_name"].str.upper().eq("NO_INSURANCE").any():
            row = active[active["payer_name"].str.upper().eq("NO_INSURANCE")].iloc[-1]
            out[pid] = {"status": "uninsured_evidenced", "label": "uninsured coverage status documented",
                        "as_of": _iso(row["start_date"])}
            continue
        insured = group[~group["payer_name"].str.upper().eq("NO_INSURANCE")]
        insured = insured[(insured["end_date"] >= lookback) & (insured["start_date"] <= reference)]
        if insured.empty:
            out[pid] = {"status": "not_evidenced", "label": "coverage continuity not evidenced", "as_of": None}
            continue
        intervals = sorted((max(r["start_date"], lookback), min(r["end_date"], reference))
                           for _, r in insured.iterrows())
        merged: list[list] = []
        for start, end in intervals:
            if not merged or start > merged[-1][1] + timedelta(days=31):
                merged.append([start, end])
            else:
                merged[-1][1] = max(merged[-1][1], end)
        continuous = merged[0][0] <= lookback and merged[-1][1] >= reference and len(merged) == 1
        if continuous:
            out[pid] = {"status": "continuous_evidenced", "label": "continuous coverage evidenced",
                        "as_of": _iso(reference)}
        elif not active.empty:
            out[pid] = {"status": "coverage_gap_evidenced", "label": "coverage gap in prior 12 months",
                        "as_of": _iso(reference)}
        else:
            out[pid] = {"status": "not_evidenced", "label": "current coverage not evidenced", "as_of": None}
    return out


def _pcp_profiles(encounters: pd.DataFrame, providers: pd.DataFrame, reference) -> dict[str, dict]:
    specialty = {str(r["provider"]): str(r["speciality"] or "").upper()
                 for _, r in providers.iterrows()}
    recent = encounters[(encounters["start_date"].notna())
                        & (encounters["start_date"] >= reference - timedelta(days=730))].copy()
    recent["speciality"] = recent["provider"].map(lambda p: specialty.get(str(p), ""))
    recent = recent[recent["encounterclass"].fillna("").str.lower().eq("ambulatory")]
    primary = recent[recent["speciality"].isin(codes.PRIMARY_CARE_SPECIALTIES)]
    out = {pid: {"status": "not_evidenced", "label": "established PCP continuity not evidenced", "as_of": None}
           for pid in encounters["patient"].dropna().unique()}
    if primary.empty:
        return out
    # Aggregate once by patient/provider; filtering the encounter frame per
    # patient is prohibitively expensive for the 300k bundle.
    by_provider = primary.groupby(["patient", "provider"]).size().rename("visits").reset_index()
    max_visits = by_provider.groupby("patient")["visits"].max()
    last_visit = primary.groupby("patient")["start_date"].max()
    for pid, visits in max_visits.items():
        last = last_visit[pid]
        if visits >= 2:
            out[pid] = {"status": "established_evidenced", "label": "established PCP continuity evidenced",
                        "as_of": _iso(last)}
        else:
            out[pid] = {"status": "limited_evidence", "label": "limited PCP continuity evidence",
                        "as_of": _iso(last)}
    return out


def _default_signal(status: str, label: str) -> dict:
    return {"status": status, "label": label, "as_of": None}


def build(staging: Path, log=print) -> tuple[pd.DataFrame, dict, dict]:
    staging = Path(staging)
    patients = _load(staging, "patients")
    observations = _load(staging, "observations_selected")
    conditions = _load(staging, "conditions_selected")
    meds = _load(staging, "meds")
    encounters = _load(staging, "encounters")
    providers = _load(staging, "providers")
    payer_transitions = _load(staging, "payer_transitions")
    payers = _load(staging, "payers")

    for frame, cols in ((patients, ["BIRTHDATE", "DEATHDATE"]),
                        (observations, ["obs_date"]),
                        (conditions, ["start_date", "stop_date"]),
                        (meds, ["start_date"]),
                        (encounters, ["start_date"]),
                        (payer_transitions, ["start_date", "end_date"])):
        for col in cols:
            frame[col] = _to_dt(frame[col])

    observations["numeric_value"] = pd.to_numeric(observations["value"], errors="coerce")
    bp = observations[observations["code"].isin((codes.SYSTOLIC_BP.code, codes.DIASTOLIC_BP.code))].copy()
    bp = bp[bp["numeric_value"].notna()]
    labs = observations[observations["code"].isin((codes.BMI.code, codes.LDL.code, codes.A1C.code,
                                                      codes.HDL.code, codes.TOTAL_CHOL.code))].copy()
    labs = labs[labs["numeric_value"].notna()]
    reference = max(bp["obs_date"].max(), encounters["start_date"].max())
    log(f"  [transform] reference date = {reference.date()}")

    patients = patients.set_index("patient")
    patients["age_ref"] = (reference - patients["BIRTHDATE"]).dt.days / YEAR
    patients["alive"] = patients["DEATHDATE"].isna()

    sysrows = bp[bp["code"] == codes.SYSTOLIC_BP.code].copy()
    diarows = bp[bp["code"] == codes.DIASTOLIC_BP.code].copy()
    sysrows = sysrows.join(patients["BIRTHDATE"], on="patient")
    sysrows["age_at"] = (sysrows["obs_date"] - sysrows["BIRTHDATE"]).dt.days / YEAR
    adult_sys = sysrows[sysrows["age_at"] >= config.ADULT_MIN_AGE]
    sys_by_pt: dict[str, list] = {}
    for pid, dt, value in zip(adult_sys["patient"], adult_sys["obs_date"], adult_sys["numeric_value"]):
        sys_by_pt.setdefault(pid, []).append((dt, value))

    htn = conditions[conditions["code"].isin(codes.HYPERTENSION_CODES)].copy()
    comorbid = conditions[conditions["code"].isin(codes.COMORBIDITY_CODES)].copy()
    transport = conditions[conditions["code"].isin(codes.TRANSPORTATION_CODES)].copy()
    htn_by_pt: dict[str, list] = {}
    for pid, sd in zip(htn["patient"], htn["start_date"]):
        if pd.notna(sd):
            htn_by_pt.setdefault(pid, []).append(sd)

    uniq = meds[["code", "description"]].drop_duplicates()
    cls_map = {}
    for code_v, desc_v in zip(uniq["code"], uniq["description"]):
        med = codes.classify_med(str(code_v), str(desc_v))
        cls_map[(code_v, desc_v)] = (med.drug_class, med.ambiguous) if med else None
    meds["_cls"] = [cls_map.get(k) for k in zip(meds["code"], meds["description"])]
    meds = meds[meds["_cls"].notna() & meds["start_date"].notna()]
    meds_by_pt: dict[str, list] = {}
    for pid, sd, classification in zip(meds["patient"], meds["start_date"], meds["_cls"]):
        meds_by_pt.setdefault(pid, []).append((sd, classification[0], classification[1]))
    visits_by_pt = encounters.groupby("patient").size().to_dict()

    como_codes_by_pt = {pid: set(g["code"]) for pid, g in comorbid.groupby("patient")}

    def latest_lab(code_str):
        sub = labs[labs["code"] == code_str].sort_values("obs_date")
        return sub.groupby("patient")["numeric_value"].last().to_dict()

    latest_bmi, latest_ldl, latest_a1c = (latest_lab(codes.BMI.code), latest_lab(codes.LDL.code), latest_lab(codes.A1C.code))

    def comorbidities_for(pid) -> dict[str, str]:
        tags: dict[str, str] = {}
        cc = como_codes_by_pt.get(pid, set())
        bmi, ldl, a1c = latest_bmi.get(pid), latest_ldl.get(pid), latest_a1c.get(pid)
        if bmi is not None and bmi >= config.BMI_OBESE:
            tags["obesity"] = f"BMI {bmi:.1f}"
        elif "162864005" in cc or "408512008" in cc:
            tags["obesity"] = "obesity diagnosis on file"
        if ldl is not None and ldl >= config.LDL_HIGH:
            tags["high_ldl"] = f"LDL {ldl:.0f}"
        if "55822004" in cc:
            tags["hyperlipidemia"] = "hyperlipidemia diagnosis on file"
        if a1c is not None and config.A1C_PREDIABETES_LOW <= a1c <= config.A1C_PREDIABETES_HIGH:
            tags["prediabetes"] = f"A1c {a1c:.1f}"
        elif "714628002" in cc:
            tags["prediabetes"] = "prediabetes diagnosis on file"
        if "237602007" in cc:
            tags["metabolic_syndrome"] = "metabolic syndrome dx on file"
        return tags

    lang_rows = observations[observations["code"] == codes.PREFERRED_LANGUAGE.code]
    food_rows = observations[observations["code"] == codes.PRAPARE_BASIC_NEED.code]
    language_by_pt = _latest_text(lang_rows)
    food_by_pt = _latest_text(food_rows)
    transport_by_pt = _transport_profiles(transport, reference)
    insurance_by_pt = _insurance_profiles(payer_transitions, payers, reference)
    pcp_by_pt = _pcp_profiles(encounters, providers, reference)

    def profile_for(pid: str, category: str) -> dict:
        lang_date, lang_value = language_by_pt.get(pid, (None, ""))
        lang_state = language_status(lang_value) if lang_value else "interpreter_required"
        language = {"status": lang_state, "label": lang_value or "confirm language / interpreter needed",
                    "as_of": _iso(lang_date)}
        food_date, food_value = food_by_pt.get(pid, (None, ""))
        food = ({"status": "documented_need", "label": "food-access need documented", "as_of": _iso(food_date)}
                if "food" in food_value.lower()
                else _default_signal("not_documented", "food-access need not documented"))
        profile = {
            "preferred_language": language,
            "food_access": food,
            "transportation": transport_by_pt.get(pid, _default_signal("not_documented", "transportation barrier not documented")),
            "insurance": insurance_by_pt.get(pid, _default_signal("unknown", "coverage continuity unknown")),
            "pcp_continuity": pcp_by_pt.get(pid, _default_signal("unknown", "PCP continuity unknown")),
        }
        profile["support_flags"] = support_flags(profile)
        profile["recommended_routes"] = recommended_routes(category, profile)
        return profile

    rows, flagged_items, profiles = [], {}, {}
    cols = zip(patients.index, patients["age_ref"], patients["alive"], patients["GENDER"],
               patients["CITY"], patients["COUNTY"], patients["LAT"], patients["LON"],
               patients["RACE"], patients["ETHNICITY"])
    for pid, age_ref, alive, gender, city, county, lat, lon, race, ethnicity in cols:
        facts = PatientFacts(patient_id=pid, age=float(age_ref) if pd.notna(age_ref) else -1.0,
                             alive=bool(alive), gender=gender or "", city=city or "", county=county or "",
                             lat=_num(lat), lon=_num(lon), systolic=sys_by_pt.get(pid, []),
                             htn_dx=htn_by_pt.get(pid, []), meds=meds_by_pt.get(pid, []),
                             comorbidities=comorbidities_for(pid), n_visits=int(visits_by_pt.get(pid, 0)))
        result = classify_patient(facts)
        profile = profile_for(pid, result.category)
        profiles[pid] = profile
        rows.append({
            "patient_id": pid, "category": result.category, "flagged": result.flagged,
            "priority": result.priority, "reason": result.reason, "n_highs": result.n_qualifying_highs,
            "max_systolic": result.max_systolic, "first_high": result.first_high_date,
            "last_high": result.last_high_date, "on_meds": result.on_antihypertensive,
            "has_htn_dx": result.has_htn_dx, "stacked": result.stacked_risk_count,
            "comorbid_tags": ",".join(result.comorbid_tags), "age": round(facts.age, 1),
            "gender": facts.gender, "city": facts.city, "county": facts.county, "lat": facts.lat,
            "lon": facts.lon, "n_visits": facts.n_visits, "adult": facts.alive and facts.age >= config.ADULT_MIN_AGE,
            "dq": "; ".join(result.data_quality), "dq_flag": bool(result.data_quality),
            "support_flags": ",".join(profile["support_flags"]),
            "recommended_roles": ",".join(r["role"] for r in profile["recommended_routes"]),
            "race": race or "", "ethnicity": ethnicity or "",
        })
        if result.flagged:
            flagged_items[pid] = (facts, result)

    fset = set(flagged_items)
    fsys = sysrows[sysrows["patient"].isin(fset)]
    fdia = diarows[diarows["patient"].isin(fset)]
    sys_tl = {pid: sorted(((r_dt, value) for r_dt, value in zip(g["obs_date"], g["numeric_value"])
                           if pd.notna(r_dt)), key=lambda item: item[0]) for pid, g in fsys.groupby("patient")}
    dia_tl = {pid: {dt.date().isoformat(): value for dt, value in zip(g["obs_date"], g["numeric_value"])
                    if pd.notna(dt)} for pid, g in fdia.groupby("patient")}
    details = {pid: _detail(pid, facts, result, sys_tl.get(pid, []), dia_tl.get(pid, {}), profiles[pid])
               for pid, (facts, result) in flagged_items.items()}
    results_df = pd.DataFrame(rows)
    meta = _meta(results_df, reference)
    for key, value in meta.items():
        log(f"  [transform] {key} = {value}")
    return results_df, details, meta


def _detail(pid, facts, result, sys_series, dia_map, outreach) -> dict:
    timeline = [{"date": dt.date().isoformat(), "systolic": value, "diastolic": dia_map.get(dt.date().isoformat())}
                for dt, value in sys_series]
    # Earliest antihypertensive start (non-ambiguous meds only, matching med_classes and
    # the "on_meds" definition). Lets the BP chart mark when treatment began.
    med_starts = [start for start, _cls, ambiguous in facts.meds if not ambiguous]
    med_start = min(med_starts).date().isoformat() if med_starts else None
    return {
        "patient_id": pid, "category": result.category, "priority": result.priority, "reason": result.reason,
        "age": round(facts.age, 1), "gender": facts.gender, "city": facts.city, "county": facts.county,
        "n_highs": result.n_qualifying_highs, "max_systolic": result.max_systolic,
        "first_high": _iso(result.first_high_date), "last_high": _iso(result.last_high_date),
        "on_meds": result.on_antihypertensive, "has_htn_dx": result.has_htn_dx, "n_visits": facts.n_visits,
        "comorbidities": [{"tag": tag, "evidence": facts.comorbidities[tag]} for tag in result.comorbid_tags],
        "med_classes": sorted({c for _, c, ambiguous in facts.meds if not ambiguous}),
        "med_start": med_start,
        "rule_trace": result.rule_trace, "priority_factors": result.priority_factors,
        "data_quality": result.data_quality, "bp_timeline": timeline, "outreach": outreach,
    }


def _meta(df: pd.DataFrame, reference: datetime) -> dict:
    adults = df[df["adult"]]
    flagged = adults[adults["flagged"]]
    return {
        "reference_date": reference.date().isoformat(),
        "engine_version": ENGINE_VERSION,
        "build_timestamp": datetime.now().isoformat(timespec="seconds"), "total_patients": int(len(df)),
        "adults": int(len(adults)), "adults_with_2plus_highs": int((adults["n_highs"] >= config.MIN_QUALIFYING_HIGHS).sum()),
        "flagged_total": int(len(flagged)), "undiagnosed": int((adults["category"] == "undiagnosed").sum()),
        "treated_uncontrolled": int((adults["category"] == "treated_uncontrolled").sum()),
        "documented_support_need": int(flagged["support_flags"].astype(bool).sum()),
    }
