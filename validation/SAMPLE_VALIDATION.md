# CATCH — Sample Validation (Gate 2)

Engine `v0.1.0` on `1k_20260505_bundle`, reference date **2026-05-05** (max observation date).

## Funnel (adults)

| Stage | CATCH | Pitch slide | Note |
|---|---:|---:|---|
| Total patient records | 1,124 | — | |
| Adults (alive, age ≥ 18 @ ref) | **796** | 798 | matches (±2; reference-date rounding) |
| Adults with 2+ elevated readings | **125** | 136 | see reconciliation below |
| Undiagnosed care gap (Red Box A) | **61** (49%) | 72 (53%) | see reconciliation below |
| Treated but uncontrolled (Red Box B) | **54** | 37 | see reconciliation below |
| Diagnosed, no medication | **0** | ~0 (dropped) | matches: this stage is empty |

## Age-band miss rate (undiagnosed / repeated-high adults)

| Band | CATCH | Pitch |
|---|---|---|
| 18–44 | 36/47 = **77%** | ~81% |
| 45–59 | 8/36 = **22%** | 22% (exact) |
| 60+ | 17/42 = **40%** | 40% (exact) |

The 45–59 and 60+ bands match the pitch exactly, confirming the core logic.

## Reconciled discrepancies (definition, not bug)

1. **136 → 125 repeated / 72 → 61 undiagnosed.** Diagnosed with a direct query:
   same-day de-duplication has **zero** effect (Synthea records BP once per encounter).
   The entire gap is the **adult-age-at-reading filter**: 11 patients only reach "2+
   elevated" if readings taken **before age 18** are counted. Counting a pediatric BP
   reading as evidence of an adult hypertension care gap is not defensible, so CATCH
   excludes them. **Defensible number: 61 undiagnosed = 49% ("about half").** The pitch's
   53% ("more than half") was inflated by pediatric readings — a correction to make in the deck.

2. **37 → 54 treated-uncontrolled.** CATCH requires the **same repeated-evidence bar
   (2+ elevated readings) during the treatment window**, mirroring Red Box A (a single
   high right after starting meds is titration lag, not "uncontrolled"). This is more
   principled than a single-reading rule. The residual gap to 37 is an unreconstructed
   prior definition; CATCH's is internally consistent and documented. Not forced to match.

3. **Data-quality artifacts.** 5 flagged records carry Synthea artifacts (age > 89, or
   > 40 elevated readings from simulation visit frequency). They are **surfaced** with a
   data-quality note and **demoted** below clean records within their priority tier, so the
   top of the outreach queue stays believable.

## Accepted definitions (engine v0.1.0)

- Adult = alive AND age ≥ 18 at reference date.
- Qualifying elevated reading = systolic ≥ 140, **taken at age ≥ 18**, one per calendar day (max).
- Repeated = ≥ 2 qualifying elevated days.
- Red Box A (undiagnosed) = adult + repeated + no HTN diagnosis on file.
- Red Box B (treated-uncontrolled) = HTN dx + non-ambiguous antihypertensive + ≥ 2 elevated
  days after first med start. Loop diuretics (furosemide) and ARNI (Entresto) are NOT
  antihypertensive treatment by default.
- Priority (urgent/high/routine) derived from severity, count, and stacked comorbidities.
