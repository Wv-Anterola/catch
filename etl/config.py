"""CATCH ETL configuration.

All tunable thresholds and paths live here so the engine is reproducible and
auditable. Paths accept CLI/env overrides in build.py; these are defaults.

Thresholds are chosen to MATCH the validated pitch numbers (systolic >= 140,
2+ qualifying readings on distinct dates). Diastolic is recorded but does not
drive the "repeated high" count by default, so the sample reconciles with the
slide figure of "136 adults with 2+ systolic >= 140".
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


# --- Blood-pressure thresholds (mm[Hg]) -------------------------------------
SYSTOLIC_HIGH = 140          # qualifying elevated systolic (stage-2 / traditional)
SYSTOLIC_SEVERE = 180        # single-reading "severe" review flag
DIASTOLIC_HIGH = 90          # recorded; not part of the default count rule
USE_DIASTOLIC_IN_COUNT = False  # keep False to match validated slide numbers

# --- Cohort rules -----------------------------------------------------------
ADULT_MIN_AGE = 18           # adults only
MIN_QUALIFYING_HIGHS = 2     # "repeated" = 2+ qualifying readings on distinct dates
DEDUPE_SAME_DAY = True       # collapse multiple readings on the same calendar day

# --- Lab thresholds for comorbidity tagging ---------------------------------
BMI_OBESE = 30.0             # kg/m^2
LDL_HIGH = 130.0             # mg/dL (borderline-high; tag only, never a diagnosis)
A1C_PREDIABETES_LOW = 5.7    # %  (5.7-6.4 = prediabetes range)
A1C_PREDIABETES_HIGH = 6.4   # %

# --- Ambiguous medication handling ------------------------------------------
# Loop diuretics (furosemide) and ARNI (sacubitril/valsartan) are primarily
# heart-failure agents. They are NOT counted as antihypertensive treatment
# evidence by default. Flip to True only with a documented rationale.
COUNT_AMBIGUOUS_ANTIHYPERTENSIVES = False


@dataclass
class Paths:
    """Resolved input/output paths for a build run."""

    source: Path                       # raw Synthea bundle dir (stays outside repo)
    output: Path                       # processed output dir (gitignored)
    duckdb_temp: Path | None = None    # DuckDB spill dir (use D: for the 300k run)
    staging: Path = field(init=False)  # compact intermediate parquet

    def __post_init__(self) -> None:
        self.source = Path(self.source)
        self.output = Path(self.output)
        self.staging = self.output / "staging"
        if self.duckdb_temp is not None:
            self.duckdb_temp = Path(self.duckdb_temp)

    def ensure(self) -> None:
        self.output.mkdir(parents=True, exist_ok=True)
        self.staging.mkdir(parents=True, exist_ok=True)
        if self.duckdb_temp is not None:
            self.duckdb_temp.mkdir(parents=True, exist_ok=True)


# Synthea CSVs CATCH actually reads. claims*, imaging_studies, procedures,
# devices, supplies, allergies, careplans, payers* are intentionally skipped.
SOURCE_FILES = {
    "patients": "patients.csv",
    "observations": "observations.csv",
    "conditions": "conditions.csv",
    "medications": "medications.csv",
    "encounters": "encounters.csv",
    "organizations": "organizations.csv",
    "providers": "providers.csv",
    "payer_transitions": "payer_transitions.csv",
    "payers": "payers.csv",
}
