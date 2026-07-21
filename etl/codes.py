"""CATCH clinical + technical code registry: single source of truth.

Every code CATCH relies on is declared here with its code system, display
name, purpose, and a verification note. "verified_in_sample" means the code
was observed in the local 1k_20260505 bundle during the Phase-1 audit.

Nothing is classified silently. Medications are matched two ways:
  1. exact RxNorm code (curated, verified) -> class
  2. regex name-stem fallback on DESCRIPTION -> class
The med audit (med_audit.py) reports any DESCRIPTION that matches a stem but
whose exact code is NOT in ANTIHYPERTENSIVE_CODES, so new formulations in the
300k bundle are surfaced for review rather than missed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Code:
    code: str
    system: str          # LOINC | SNOMED-CT | RxNorm
    display: str
    purpose: str
    verified_in_sample: bool
    note: str = ""


# --- Blood pressure & labs (LOINC observations) -----------------------------
SYSTOLIC_BP = Code("8480-6", "LOINC", "Systolic Blood Pressure",
                   "core: elevated-reading detection", True)
DIASTOLIC_BP = Code("8462-4", "LOINC", "Diastolic Blood Pressure",
                    "recorded alongside systolic", True)
BMI = Code("39156-5", "LOINC", "Body mass index (BMI) [Ratio]",
           "comorbidity tag: obesity (BMI >= 30)", True)
LDL = Code("18262-6", "LOINC", "Cholesterol in LDL [Mass/volume] (Direct)",
           "comorbidity tag: high LDL", True)
HDL = Code("2085-9", "LOINC", "Cholesterol in HDL [Mass/volume]",
           "context for lipid panel", True)
TOTAL_CHOL = Code("2093-3", "LOINC", "Cholesterol [Mass/volume] in Serum/Plasma",
                  "context for lipid panel", True)
A1C = Code("4548-4", "LOINC", "Hemoglobin A1c/Hemoglobin.total in Blood",
           "comorbidity tag: prediabetes (5.7-6.4%)", True)

OBSERVATION_CODES = {c.code: c for c in
                     (SYSTOLIC_BP, DIASTOLIC_BP, BMI, LDL, HDL, TOTAL_CHOL, A1C)}

# --- Hypertension diagnosis (SNOMED-CT conditions) --------------------------
# Sample contained only 59621000. Others are standard Synthea/SNOMED HTN codes
# kept so the 300k build recognizes them if present (harmless if absent).
HYPERTENSION_CODES = {
    "59621000": Code("59621000", "SNOMED-CT", "Essential hypertension (disorder)",
                     "core: recorded HTN diagnosis", True),
    "38341003": Code("38341003", "SNOMED-CT", "Hypertensive disorder, systemic arterial",
                     "recognized if present", False,
                     "not seen in 1k sample; standard SNOMED HTN code"),
    "1201005":  Code("1201005", "SNOMED-CT", "Benign essential hypertension",
                     "recognized if present", False, "defensive inclusion"),
}

# --- Comorbidity conditions (SNOMED-CT) -------------------------------------
COMORBIDITY_CODES = {
    "162864005": Code("162864005", "SNOMED-CT", "Body mass index 30+ - obesity (finding)",
                      "risk tag: obesity", True),
    "408512008": Code("408512008", "SNOMED-CT", "Body mass index 40+ - severely obese (finding)",
                      "risk tag: severe obesity", True),
    "714628002": Code("714628002", "SNOMED-CT", "Prediabetes (finding)",
                      "risk tag: prediabetes", True),
    "55822004":  Code("55822004", "SNOMED-CT", "Hyperlipidemia (disorder)",
                      "risk tag: hyperlipidemia", True),
    "237602007": Code("237602007", "SNOMED-CT", "Metabolic syndrome X (disorder)",
                      "risk tag: metabolic syndrome", True),
    "44054006":  Code("44054006", "SNOMED-CT", "Diabetes mellitus type 2 (disorder)",
                      "context: diabetes (already-managed, not a care-gap tag)", True),
}

# --- Antihypertensive medications (RxNorm) ----------------------------------
# class labels: ACE | ARB | THIAZIDE | CCB | BETA_BLOCKER | LOOP | ARNI
# LOOP and ARNI are ambiguous (primarily heart-failure) -> ambiguous=True and
# NOT counted as HTN treatment unless config.COUNT_AMBIGUOUS_ANTIHYPERTENSIVES.


@dataclass(frozen=True)
class Med:
    code: str
    display: str
    drug_class: str
    ambiguous: bool = False


ANTIHYPERTENSIVE_CODES: dict[str, Med] = {m.code: m for m in (
    # ACE inhibitors
    Med("311353", "lisinopril 2.5 MG", "ACE"),
    Med("311354", "lisinopril 5 MG", "ACE"),
    Med("314076", "lisinopril 10 MG", "ACE"),
    Med("314077", "lisinopril 20 MG", "ACE"),
    Med("197884", "lisinopril 40 MG", "ACE"),
    Med("197887", "HCTZ 25 / lisinopril 20 MG", "ACE"),  # combo (thiazide+ACE)
    Med("858804", "enalapril maleate 2.5 MG", "ACE"),
    Med("858810", "enalapril maleate 20 MG", "ACE"),
    Med("198188", "ramipril 2.5 MG", "ACE"),
    Med("261962", "ramipril 10 MG", "ACE"),
    Med("314203", "quinapril 40 MG", "ACE"),
    # ARBs
    Med("979485", "losartan potassium 25 MG", "ARB"),
    Med("979492", "losartan potassium 50 MG", "ARB"),
    Med("979480", "losartan potassium 100 MG", "ARB"),
    Med("979471", "HCTZ 25 / losartan 100 MG", "ARB"),   # combo
    Med("349200", "valsartan 320 MG", "ARB"),
    Med("200285", "HCTZ 12.5 / valsartan 160 MG", "ARB"),  # combo
    Med("200095", "irbesartan 150 MG", "ARB"),
    # CCBs
    Med("308136", "amlodipine 2.5 MG", "CCB"),
    Med("897685", "verapamil hydrochloride 80 MG", "CCB"),
    Med("999970", "amlodipine / HCTZ / olmesartan (Tribenzor)", "CCB"),  # triple combo
    # Thiazide diuretics
    Med("310798", "hydrochlorothiazide 25 MG", "THIAZIDE"),
    # Beta-blockers
    Med("197379", "atenolol 100 MG", "BETA_BLOCKER"),
    Med("197381", "atenolol 50 MG", "BETA_BLOCKER"),
    Med("200032", "carvedilol 12.5 MG", "BETA_BLOCKER"),
    Med("200033", "carvedilol 25 MG", "BETA_BLOCKER"),
    Med("686924", "carvedilol 3.125 MG", "BETA_BLOCKER"),
    Med("751616", "nebivolol 10 MG", "BETA_BLOCKER"),
    Med("856448", "propranolol 10 MG", "BETA_BLOCKER"),
    Med("856460", "propranolol ER 120 MG", "BETA_BLOCKER"),
    Med("856535", "propranolol ER 60 MG", "BETA_BLOCKER"),
    Med("866412", "metoprolol succinate ER 100 MG", "BETA_BLOCKER"),
    Med("866419", "metoprolol succinate ER 200 MG", "BETA_BLOCKER"),
    Med("866427", "metoprolol succinate ER 25 MG", "BETA_BLOCKER"),
    Med("866429", "metoprolol succinate ER 25 MG (Toprol)", "BETA_BLOCKER"),
    Med("866436", "metoprolol succinate ER 50 MG", "BETA_BLOCKER"),
    Med("866511", "metoprolol tartrate 100 MG", "BETA_BLOCKER"),
    Med("866514", "metoprolol tartrate 50 MG", "BETA_BLOCKER"),
    Med("866924", "metoprolol tartrate 25 MG", "BETA_BLOCKER"),
    Med("896758", "labetalol hydrochloride 100 MG", "BETA_BLOCKER"),
    # Ambiguous, primarily heart failure; not counted by default
    Med("313988", "Furosemide 40 MG Oral", "LOOP", ambiguous=True),
    Med("1719286", "Furosemide 10 MG/ML Injection", "LOOP", ambiguous=True),
    Med("1656356", "sacubitril / valsartan (Entresto)", "ARNI", ambiguous=True),
)}

# Regex name-stem fallback for the 300k build (catches new strengths/formulations).
# Ordered longest-stem-first is not needed; classes are disjoint by stem.
_STEM_TO_CLASS: list[tuple[str, str, bool]] = [
    (r"lisinopril|enalapril|ramipril|benazepril|captopril|quinapril|fosinopril|perindopril", "ACE", False),
    (r"losartan|valsartan|olmesartan|irbesartan|candesartan|telmisartan", "ARB", False),
    (r"amlodipine|nifedipine|diltiazem|verapamil|felodipine|nicardipine", "CCB", False),
    (r"hydrochlorothiazide|chlorthalidone|chlortalidone|indapamide|metolazone", "THIAZIDE", False),
    (r"atenolol|carvedilol|bisoprolol|propranolol|nebivolol|labetalol|nadolol|metoprolol", "BETA_BLOCKER", False),
    (r"sacubitril", "ARNI", True),
    (r"furosemide|torsemide|bumetanide", "LOOP", True),
]
STEM_PATTERNS = [(re.compile(rx, re.I), cls, amb) for rx, cls, amb in _STEM_TO_CLASS]

# Sacubitril/valsartan matches both ARB and ARNI stems; ARNI (ambiguous) wins.
ARNI_OVERRIDE = re.compile(r"sacubitril", re.I)


def classify_med(code: str, description: str) -> Med | None:
    """Return a Med classification, or None if not an antihypertensive.

    Exact code wins; otherwise fall back to name stems. ARNI overrides ARB when
    sacubitril is present (it is a heart-failure combo, treated as ambiguous).
    """
    if code in ANTIHYPERTENSIVE_CODES:
        return ANTIHYPERTENSIVE_CODES[code]
    desc = description or ""
    if ARNI_OVERRIDE.search(desc):
        return Med(code, description, "ARNI", ambiguous=True)
    for pat, cls, amb in STEM_PATTERNS:
        if pat.search(desc):
            return Med(code, description, cls, ambiguous=amb)
    return None


# Codes to pull from observations.csv (projection filter in extract.py).
OBSERVATION_CODE_LIST = tuple(OBSERVATION_CODES.keys())
CONDITION_CODE_LIST = tuple(HYPERTENSION_CODES.keys()) + tuple(COMORBIDITY_CODES.keys())

# Combined lower-cased stem regex (for the DuckDB medications projection filter).
ALL_MED_STEMS = "|".join(rx for rx, _cls, _amb in _STEM_TO_CLASS)
