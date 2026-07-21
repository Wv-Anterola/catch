"""Deterministic care-gap engine.

Pure classification logic separated from data plumbing so it can be unit-tested
with hand-built fixtures (Gate 1). `classify_patient` takes plain facts about
one synthetic patient and returns an explainable result with a full rule trace.
Nothing here predicts or diagnoses; it applies explicit, visible rules.

Categories:
  undiagnosed          -> RED BOX A: adult, 2+ qualifying highs, no HTN dx
  treated_uncontrolled -> RED BOX B: HTN dx + on antihypertensive + a high after meds started
  diagnosed_no_med     -> minor: HTN dx + repeated highs but no antihypertensive evidence
  managed              -> has dx and/or meds and not currently uncontrolled by our rule
  not_flagged          -> no qualifying pattern
Only undiagnosed and treated_uncontrolled are `flagged` (the two red boxes).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from . import config

# stacked comorbidities that raise outreach priority (deck: cholesterol/obesity/prediabetes)
STACKED_RISK_TAGS = ("obesity", "high_ldl", "hyperlipidemia", "prediabetes", "metabolic_syndrome")


@dataclass
class PatientFacts:
    patient_id: str
    age: float                       # years at reference date
    alive: bool
    gender: str = ""
    city: str = ""
    county: str = ""
    lat: float | None = None
    lon: float | None = None
    # adult-age systolic readings only, as (date, value)
    systolic: list[tuple[datetime, float]] = field(default_factory=list)
    htn_dx: list[datetime] = field(default_factory=list)          # HTN diagnosis dates
    # antihypertensive meds as (start, class, ambiguous)
    meds: list[tuple[datetime, str, bool]] = field(default_factory=list)
    comorbidities: dict[str, str] = field(default_factory=dict)   # tag -> evidence text
    n_visits: int = 0


@dataclass
class PatientResult:
    patient_id: str
    category: str
    flagged: bool
    priority: str | None
    reason: str
    n_qualifying_highs: int
    max_systolic: float | None
    first_high_date: datetime | None
    last_high_date: datetime | None
    on_antihypertensive: bool
    has_htn_dx: bool
    stacked_risk_count: int
    comorbid_tags: list[str]
    rule_trace: list[str]
    priority_factors: list[str]
    data_quality: list[str] = field(default_factory=list)


def _qualifying_high_days(systolic: list[tuple[datetime, float]], cfg) -> list[tuple[datetime, float]]:
    """Collapse to one reading per calendar day (max systolic) and keep days >= threshold."""
    if not systolic:
        return []
    by_day: dict = {}
    for dt, val in systolic:
        if dt is None or val is None:
            continue
        key = dt.date()
        if key not in by_day or val > by_day[key][1]:
            by_day[key] = (dt, val)
    days = [(dt, val) for dt, val in by_day.values() if val >= cfg.SYSTOLIC_HIGH]
    days.sort(key=lambda x: x[0])
    return days


def classify_patient(pf: PatientFacts, cfg=config) -> PatientResult:
    trace: list[str] = []

    # --- eligibility ---
    if not pf.alive:
        trace.append("Excluded: patient not alive as of reference date.")
        return _result(pf, "not_flagged", False, None, "Not eligible (deceased)",
                       [], None, False, bool(pf.htn_dx), 0, trace, [])
    if pf.age < cfg.ADULT_MIN_AGE:
        trace.append(f"Excluded: age {pf.age:.0f} < {cfg.ADULT_MIN_AGE} (adults only).")
        return _result(pf, "not_flagged", False, None, "Not eligible (minor)",
                       [], None, False, bool(pf.htn_dx), 0, trace, [])
    trace.append(f"Adult (age {pf.age:.0f}), alive as of reference date.")

    # --- qualifying elevated readings ---
    high_days = _qualifying_high_days(pf.systolic, cfg)
    n_high = len(high_days)
    max_sys = max((v for _, v in pf.systolic if v is not None), default=None)
    first_high = high_days[0][0] if high_days else None
    last_high = high_days[-1][0] if high_days else None
    if n_high:
        trace.append(
            f"{n_high} day(s) with systolic >= {cfg.SYSTOLIC_HIGH} "
            f"(max {max_sys:.0f}); first {first_high.date()}, last {last_high.date()}.")
    else:
        trace.append(f"No days with systolic >= {cfg.SYSTOLIC_HIGH}.")

    has_dx = bool(pf.htn_dx)
    first_dx = min(pf.htn_dx) if has_dx else None
    trace.append(f"HTN diagnosis on file: {'yes, first ' + str(first_dx.date()) if has_dx else 'no'}.")

    # non-ambiguous antihypertensive evidence
    real_meds = [(s, c) for (s, c, amb) in pf.meds if not amb or cfg.COUNT_AMBIGUOUS_ANTIHYPERTENSIVES]
    ambiguous_only = bool(pf.meds) and not real_meds
    on_meds = bool(real_meds)
    first_med = min((s for s, _ in real_meds), default=None)
    if on_meds:
        classes = sorted({c for _, c in real_meds})
        trace.append(f"Antihypertensive evidence: {', '.join(classes)} (first {first_med.date()}).")
    elif ambiguous_only:
        trace.append("Only ambiguous (loop/ARNI) med evidence, not counted as antihypertensive treatment.")
    else:
        trace.append("No antihypertensive medication evidence.")

    comorbid_tags = [t for t in STACKED_RISK_TAGS if t in pf.comorbidities]
    stacked = len(comorbid_tags)
    if pf.comorbidities:
        trace.append("Comorbidity tags: " + "; ".join(
            f"{t} ({pf.comorbidities[t]})" for t in comorbid_tags) if comorbid_tags
            else "Comorbidity context present but no stacked-risk tags.")

    repeated = n_high >= cfg.MIN_QUALIFYING_HIGHS

    # --- classification ---
    category, flagged, reason = "not_flagged", False, "No qualifying care-gap pattern"

    if repeated and not has_dx:
        category, flagged = "undiagnosed", True
        reason = f"{n_high} elevated readings on distinct days, no recorded HTN diagnosis"
        trace.append("RULE A met: repeated elevated readings AND no HTN diagnosis -> "
                     "potential care gap (undiagnosed).")
    elif has_dx and on_meds:
        # treated; require the SAME repeated-evidence bar during the treatment window.
        # A single high right after starting meds is not "uncontrolled" (titration lag).
        highs_after_med = [d for d, _ in high_days if first_med and d >= first_med]
        if len(highs_after_med) >= cfg.MIN_QUALIFYING_HIGHS:
            category, flagged = "treated_uncontrolled", True
            reason = f"{len(highs_after_med)} elevated readings after antihypertensive started"
            trace.append(f"RULE B met: HTN diagnosis + antihypertensive treatment + "
                         f"{len(highs_after_med)} elevated readings (>= {cfg.MIN_QUALIFYING_HIGHS}) "
                         "after treatment began -> potential care gap (treated, uncontrolled).")
        else:
            category = "managed"
            reason = ("Diagnosed and treated; fewer than "
                      f"{cfg.MIN_QUALIFYING_HIGHS} elevated readings after treatment began")
            trace.append(f"Diagnosed + treated; only {len(highs_after_med)} elevated reading(s) "
                         f"after treatment (< {cfg.MIN_QUALIFYING_HIGHS}) -> not flagged.")
    elif has_dx and repeated and not on_meds:
        category = "diagnosed_no_med"
        reason = f"HTN diagnosis with {n_high} elevated readings but no antihypertensive evidence"
        trace.append("Diagnosed with repeated highs but no antihypertensive evidence "
                     "(minor category; not a primary red box).")
    elif has_dx:
        category = "managed"
        reason = "Diagnosed; no qualifying uncontrolled pattern by our rule"
    else:
        trace.append("No red-box rule met.")

    # --- priority (explainable, only for flagged) ---
    priority, factors = None, []
    if flagged:
        priority, factors = _priority(n_high, max_sys, last_high, stacked, comorbid_tags, cfg)
        trace.append(f"Priority = {priority} because: {'; '.join(factors)}.")

    # --- data-quality flags (Synthea artifacts; surfaced, never hidden) ---
    dq: list[str] = []
    if pf.age > 89:
        dq.append(f"age {pf.age:.0f} exceeds typical adult range (synthetic)")
    if n_high > 40:
        dq.append(f"{n_high} elevated readings likely inflated by simulation visit frequency")
    if dq:
        trace.append("Data-quality note: " + "; ".join(dq) + ".")

    res = _result(pf, category, flagged, priority, reason, high_days, max_sys,
                  on_meds, has_dx, stacked, trace, factors,
                  n_high=n_high, first_high=first_high, last_high=last_high,
                  comorbid_tags=comorbid_tags)
    res.data_quality = dq
    return res


def _priority(n_high, max_sys, last_high, stacked, tags, cfg):
    factors = []
    severe = max_sys is not None and max_sys >= cfg.SYSTOLIC_SEVERE
    if severe:
        factors.append(f"severe reading (systolic {max_sys:.0f} >= {cfg.SYSTOLIC_SEVERE})")
    if n_high >= 3:
        factors.append(f"{n_high} elevated readings")
    if stacked >= 1:
        factors.append(f"{stacked} stacked risk factor(s): {', '.join(tags)}")
    # urgent: severe OR (repeated highs AND 2+ stacked risks)
    if severe or (n_high >= cfg.MIN_QUALIFYING_HIGHS and stacked >= 2):
        return "urgent", factors or ["meets urgent rule"]
    if n_high >= 3 or stacked >= 1:
        return "high", factors or ["meets high rule"]
    return "routine", ["repeated elevated readings without additional stacked risks"]


def _result(pf, category, flagged, priority, reason, high_days, max_sys,
            on_meds, has_dx, stacked, trace, factors, *, n_high=None,
            first_high=None, last_high=None, comorbid_tags=None) -> PatientResult:
    if n_high is None:
        n_high = len(high_days) if isinstance(high_days, list) else 0
    return PatientResult(
        patient_id=pf.patient_id, category=category, flagged=flagged, priority=priority,
        reason=reason, n_qualifying_highs=n_high, max_systolic=max_sys,
        first_high_date=first_high, last_high_date=last_high, on_antihypertensive=on_meds,
        has_htn_dx=has_dx, stacked_risk_count=stacked,
        comorbid_tags=comorbid_tags or [], rule_trace=trace, priority_factors=factors)
