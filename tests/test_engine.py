"""Gate 1 — deterministic engine unit fixtures.

Run from repo root: python -m pytest catch/tests -q
"""

from __future__ import annotations

from datetime import datetime

import pytest

from etl.engine import PatientFacts, classify_patient


def d(s: str) -> datetime:
    return datetime.fromisoformat(s)


def facts(**kw) -> PatientFacts:
    base = dict(patient_id="p", age=50.0, alive=True)
    base.update(kw)
    return PatientFacts(**base)


# --- eligibility ------------------------------------------------------------

def test_minor_excluded():
    pf = facts(age=15, systolic=[(d("2020-01-01"), 150), (d("2021-01-01"), 152)])
    r = classify_patient(pf)
    assert r.category == "not_flagged" and not r.flagged
    assert "minor" in r.reason.lower()


def test_deceased_excluded():
    pf = facts(alive=False, systolic=[(d("2020-01-01"), 150), (d("2021-01-01"), 152)])
    r = classify_patient(pf)
    assert not r.flagged and "deceased" in r.reason.lower()


def test_adult_single_high_not_flagged():
    pf = facts(systolic=[(d("2020-01-01"), 150)])
    r = classify_patient(pf)
    assert r.n_qualifying_highs == 1 and not r.flagged
    assert r.category == "not_flagged"


# --- RED BOX A: undiagnosed -------------------------------------------------

def test_repeated_highs_no_dx_is_undiagnosed():
    pf = facts(systolic=[(d("2019-01-01"), 145), (d("2020-01-01"), 150), (d("2021-01-01"), 148)])
    r = classify_patient(pf)
    assert r.category == "undiagnosed" and r.flagged
    assert r.n_qualifying_highs == 3


def test_same_day_duplicates_count_once():
    # two highs on the SAME calendar day -> one qualifying day -> not repeated
    pf = facts(systolic=[(d("2020-01-01T09:00"), 150), (d("2020-01-01T15:00"), 158)])
    r = classify_patient(pf)
    assert r.n_qualifying_highs == 1 and not r.flagged


def test_borderline_below_threshold_excluded():
    pf = facts(systolic=[(d("2019-01-01"), 139), (d("2020-01-01"), 138)])
    r = classify_patient(pf)
    assert r.n_qualifying_highs == 0 and not r.flagged


# --- diagnosis handling -----------------------------------------------------

def test_repeated_highs_with_dx_no_meds_is_diagnosed_no_med():
    pf = facts(systolic=[(d("2019-01-01"), 145), (d("2020-01-01"), 150)],
               htn_dx=[d("2018-06-01")])
    r = classify_patient(pf)
    assert r.category == "diagnosed_no_med" and not r.flagged  # not a primary red box


def test_dx_after_highs_still_not_undiagnosed():
    # dx recorded AFTER the highs -> patient now has a dx, so not "undiagnosed"
    pf = facts(systolic=[(d("2019-01-01"), 150), (d("2020-01-01"), 152)],
               htn_dx=[d("2021-01-01")])
    r = classify_patient(pf)
    assert r.category != "undiagnosed"


# --- RED BOX B: treated + uncontrolled --------------------------------------

def test_treated_controlled_not_flagged():
    # on meds since 2018; only high reading predates meds -> controlled after treatment
    pf = facts(systolic=[(d("2017-01-01"), 150), (d("2020-01-01"), 128)],
               htn_dx=[d("2017-06-01")], meds=[(d("2018-01-01"), "ACE", False)])
    r = classify_patient(pf)
    assert r.category == "managed" and not r.flagged


def test_treated_uncontrolled_flagged():
    pf = facts(systolic=[(d("2019-01-01"), 150), (d("2021-01-01"), 158)],
               htn_dx=[d("2018-06-01")], meds=[(d("2018-07-01"), "ACE", False)])
    r = classify_patient(pf)
    assert r.category == "treated_uncontrolled" and r.flagged
    assert r.on_antihypertensive


def test_ambiguous_med_not_counted_as_treatment():
    # only furosemide (LOOP, ambiguous) -> not treatment; dx + repeated highs -> diagnosed_no_med
    pf = facts(systolic=[(d("2019-01-01"), 150), (d("2021-01-01"), 158)],
               htn_dx=[d("2018-06-01")], meds=[(d("2018-07-01"), "LOOP", True)])
    r = classify_patient(pf)
    assert not r.on_antihypertensive
    assert r.category == "diagnosed_no_med"


# --- priority ---------------------------------------------------------------

def test_priority_urgent_on_severe_reading():
    pf = facts(systolic=[(d("2019-01-01"), 150), (d("2021-01-01"), 185)])
    r = classify_patient(pf)
    assert r.flagged and r.priority == "urgent"


def test_priority_urgent_on_stacked_risks():
    pf = facts(systolic=[(d("2019-01-01"), 150), (d("2020-01-01"), 152)],
               comorbidities={"obesity": "BMI 33", "prediabetes": "A1c 6.0"})
    r = classify_patient(pf)
    assert r.priority == "urgent" and r.stacked_risk_count == 2


def test_priority_routine_plain_repeated():
    pf = facts(systolic=[(d("2019-01-01"), 145), (d("2020-01-01"), 146)])
    r = classify_patient(pf)
    assert r.priority == "routine"


# --- robustness: missing / contradictory ------------------------------------

def test_missing_values_ignored():
    pf = facts(systolic=[(d("2019-01-01"), None), (None, 150), (d("2020-01-01"), 150),
                         (d("2021-01-01"), 151)])
    r = classify_patient(pf)  # the None-laden readings are dropped; 2 valid highs remain
    assert r.n_qualifying_highs == 2 and r.flagged


def test_no_readings_not_flagged():
    pf = facts(systolic=[])
    r = classify_patient(pf)
    assert r.n_qualifying_highs == 0 and not r.flagged


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(pytest.main([__file__, "-q"]))
