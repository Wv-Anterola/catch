# CATCH — Anticipated Judge Q&A

**Why hypertension?**
It's the "silent killer" — usually no symptoms, so the only signal is the number on the cuff,
and that number is already written down at every visit. About 1 in 3 RI adults have it and
only ~1 in 4 have it controlled. It's a gateway to cardiovascular, renal, and metabolic
disease, so a small act (a phone call) has outsized downstream value.

**What's novel? Isn't this just an EHR alert?**
EHR best-practice alerts fire at the point of care, to the clinician already in the room, and
suffer from alert fatigue. CATCH works *retrospectively across the whole population* and
produces a *ranked outreach worklist* for community health workers — the people who do
follow-up outside the visit. It's an operational queue, not a pop-up. And every item is
explainable, so it's triage-ready.

**How were patients classified?**
Two deterministic rules. (A) Undiagnosed: an adult with ≥2 systolic ≥140 readings on distinct
days and no hypertension diagnosis code on file. (B) Treated-but-uncontrolled: a hypertension
diagnosis plus antihypertensive medication plus ≥2 elevated readings after treatment began.
Priority (urgent/high/routine) comes from severity, reading count, and stacked comorbidities.
Everything is in the rule trace on each patient.

**A patient you flagged as "undiagnosed" is on blood-pressure medication — how?**
Because there is no hypertension *diagnosis code* on their chart. That's exactly the gap: with
no code, they're invisible to every registry, recall list, and quality measure — even if a
med was started. The rule trace shows the medication openly, so a clinician sees the full
picture and can reprioritize. Surfacing the coding gap is the point.

**How accurate is it? What's your validation?**
We validated the engine two ways. Sixteen unit fixtures cover the edge cases (minors, same-day
duplicates, diagnosis timing, titration lag, missing values). On the 1k sample the engine
reproduces the exploratory pattern and matches the 45–59 and 60+ age-band miss rates exactly.
We're honest where we differ: restricting to adult-age readings gives ~49% undiagnosed among
repeated-high adults, slightly more conservative than an earlier count that included pediatric
readings.

**How did you use the SyntheticRI longitudinal data (vs. just visualizing it)?**
We streamed the full 300k-patient bundle with DuckDB — 10M blood-pressure observations, 12.8M
labs, 4.7M medications — and used the *time dimension*: readings across years, diagnosis timing
vs. reading timing, and medication start dates vs. later readings (that's what "uncontrolled
after treatment" means). This isn't a cross-sectional chart; it's longitudinal logic.

**Does this show real Rhode Island prevalence?**
No, and we won't claim it. SyntheticRI is synthetic. Our numbers demonstrate that the *method*
holds up at scale, not a real state rate. The value transfers; the specific percentages don't.

**How would this transfer to real data?**
The code registry (LOINC/SNOMED/RxNorm) and the rules are standard and portable. Point the same
DuckDB ETL at a real Synthea-format or FHIR export, re-run the med audit to confirm local
formularies, and the same engine produces the same worklist. The deterministic design is what
makes it safe to hand to a health system.

**Privacy implications?**
Here everything is synthetic, so there's no real PHI. In production this is a within-EHR
analytic — no external data leaves the system, outreach messages are drafts a human sends, and
the queue exposes only the fields needed for follow-up. No model training on patient data.

**What about the very high visit counts / odd ages?**
Those are Synthea simulation artifacts. We flag them with a data-quality note and demote them
below clean records in the queue, so they never top the urgent list. We don't claim real
clinics see patients 25+ times — that's a simulation quirk we surface honestly.

**Why deterministic instead of a predictive model?**
You can't hand a community health worker a name with no defensible reason. A plain rule gives an
instant, auditable answer ("repeated highs, no diagnosis — here's the list"), and a clinician
can throw out a wrong flag in two seconds. Trust and transparency beat a marginal accuracy gain
for this use case.

**What would you build next?**
Get a rough version in front of an actual community health worker at a place like a free clinic
or refugee center, wire the "mark contacted" state to a real recall workflow, and add
configurable thresholds so a clinic can tune the rule to its own guidelines.
