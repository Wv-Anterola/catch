# CATCH — 5-Minute Demo Guide

**Before you start (demo hygiene)**
- **Disable any dark-mode browser extension** (Dark Reader, Night Eye, "Dark Mode", etc.). CATCH
  ships a light theme and now sets `color-scheme: light`, but an aggressive extension that rewrites
  the page will still darken it and trigger a hydration warning. This is the single most likely
  thing to visually break the demo. Test in a clean profile or Incognito with extensions off.
- Run `cd catch/app && npm run dev` → open `http://localhost:3939`. Full-screen the browser.
- Start on the **Overview** page. Numbers below come from the full 300k build and update from the DB.

Only say what `CLAIM_LEDGER.md` approves. Never claim real RI prevalence, never say CATCH
diagnoses or predicts, never say a patient definitely has untreated hypertension.

Nav: **Overview · Outreach Queue · Population · Methodology.**

---

### 0:00–0:40 — Overview: the problem & what CATCH found
Land on **Overview**. Read the headline: *the high blood pressure already in the chart, still
waiting on someone to act.*
> "In Rhode Island about 1 in 3 adults have high blood pressure and only 1 in 4 have it
> controlled. The reading is already in the chart. Someone just has to act on it."

Point at the four metrics (adults evaluated, potential care gaps, urgent follow-ups, share of
adults) and the care-gap breakdown (undiagnosed vs treated-uncontrolled).
> "CATCH reviewed the synthetic records and flagged the care gaps with an explicit, auditable rule
> — not a prediction."

Click **Review prioritized outreach queue →**.

### 0:40–2:15 — Outreach queue + one patient's rule trace (the money shot)
1. "The queue is ranked by priority — the colored bar and dot on the left. Each row is one
   synthetic patient, the category, and the reason they were flagged."
2. Click the top **Undiagnosed** patient. The detail opens on the right.
3. Walk it top-to-bottom (it reads as a narrative):
   - **Why this record was flagged** — one plain sentence + the key evidence line (readings, max
     systolic, encounters).
   - **Blood pressure over time** — red dots are systolic ≥ 140. "Years of highs."
   - **Evidence on file** — diagnosis, medications, risk factors with their real evidence.
   - Click **Show the deterministic rule trace** — "Here's the whole logic, step by step. Nothing
     hidden; a clinician can overrule any line in seconds."

### 2:15–3:00 — The outreach action
In the **Recommended action** panel (visually separated at the bottom of the detail):
> "CATCH drafts a cautious, non-diagnostic message. It does not send anything — a human reviews
> and sends. Both languages are offered; we never infer language from a record."
Toggle **EN / ES**. Click **Mark contacted** — the row updates so nobody is called twice.

### 3:00–4:00 — Population view
Click **Population**.
- The **review funnel**: adults → repeated highs → undiagnosed + treated-uncontrolled.
- The **community scatter**: bigger dot = more flagged, redder = higher rate, ✚ = hospital. Hover a city.
- The **highest care-gap rate** list: where an outreach team would start.
> "Synthetic data — this shows the method, not a real Rhode Island rate."

### 4:00–4:45 — Methodology & honesty
Click **Methodology**. A short document: what was analyzed, what the rules do and don't do,
validation, and limits.
> "Every threshold is written down. And we're honest: synthetic data; no diagnosis or prediction;
> the disparity we can defend is age, not ethnicity; the diagnosed-but-untreated group was empty
> so we dropped it; simulation artifacts are flagged and demoted, not hidden."

### 4:45–5:00 — Close
> "Most projects predict who gets sick later. We start with the high blood pressure already in the
> chart that hasn't turned into care. The readings are there, the risk factors are visible —
> someone just has to act, and CATCH hands them the list."

---

## Backup path
- Empty/error queue: the app auto-falls back to the committed demo DB (`catch/data/demo/catch.sqlite`).
  Restart `npm run dev`.
- Page looks dark: a browser extension is rewriting it — disable it or use Incognito with extensions off.
- Worst case: pre-captured screenshots of Overview, the queue + a patient detail, and Population.
