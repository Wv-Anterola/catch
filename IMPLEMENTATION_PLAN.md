# CATCH — Implementation Plan (living)

Condensed plan of record. Detailed narrative in the approved plan; operational status in
`CATCH_BUILD_STATE.md`; claims in `CLAIM_LEDGER.md`.

## 1. Current state
Engine + ETL + Next.js app all built and working end-to-end on the full 300k bundle. Gates 1–3
passed. Presentation assets written. Remaining: final polish + full test pass.

## 2. Verified data model
Synthea CSVs. CATCH reads patients, observations (BP + BMI/LDL/A1c), conditions (HTN +
comorbidities), medications (antihypertensives), encounters, organizations. Skips claims* (153 GB),
imaging, procedures, devices, supplies. BP once per encounter (no same-day dupes). ZIP often
`00000` → geography uses CITY + LAT/LON.

## 3. Winning product thesis
Not a dashboard: a ranked, explainable **outreach worklist**. Find the high blood pressure
already in the chart that never turned into care; hand a community health worker who to call and
why, with a rule trace and a safe EN/ES draft. Deterministic, auditable, human-in-the-loop.

## 4. Architecture
DuckDB projected ETL → parquet staging → deterministic engine → `catch.sqlite` → Next.js with
`node:sqlite` (no native build). Read-only cohort cache; contact status in a separate writable DB.

## 5. Engine definitions
See `engine.py` / Methodology view. Red Box A (undiagnosed), Red Box B (treated-uncontrolled),
priority from severity + count + stacked comorbidities. Adult-age readings only; titration-aware.

## 6. Build phases — all delivered
0 scaffold · 1 code registry + med audit · 2 ETL · 3 engine + Gate 1 · 4 Gate 2 reconciliation ·
5 minimal demo path · 6 Gate 3 + full 300k · 7 app (queue/evidence/population/methodology) ·
8 test pass + assets.

## 7. Validation gates
- Gate 1: 16 engine unit fixtures — PASS.
- Gate 2: sample reconciled vs slides (`SAMPLE_VALIDATION.md`) — age bands 45-59/60+ exact;
  undiagnosed 49% (adult-age readings) documented vs prior 53%.
- Gate 3: measured full run (extract ~6m15s, engine ~7m, 100 MB DB, 32,454 flagged).

## 8. Five-minute demo path
`DEMO_GUIDE.md`. Queue → patient rule trace → EN/ES draft + mark contacted → population view →
methodology & limits → close.

## 9. Claim & safety boundaries
`CLAIM_LEDGER.md`. Banners in every view. Never: real prevalence, diagnose/predict, protected-group
disparity, messages sent.

## 10. Cut list (if time runs short)
admin/upload → advanced map → secondary charts → ES generation → deployment → nonessential filters
→ animation. Never cut: validated rules, rule trace, queue, patient detail, disclaimers, reliable
demo path, claim ledger, reproduction commands. (No admin/upload view was built — intentionally,
per cut order; the three core views were prioritized.)
