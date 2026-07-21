# CATCH: Care-gap Alerts for Treating Community Hypertension

CATCH turns the SyntheticRI / Synthea EHR bundle into a **deterministic, auditable outreach
workflow** for community health workers. It finds adults who match an explicit hypertension
care-gap rule, ranks them for follow-up, shows the exact rule trace and evidence for each, and
drafts a cautious (non-diagnostic) outreach message in English or Spanish.

It does **not** diagnose, predict, or report real Rhode Island prevalence. **SyntheticRI is
synthetic data**: the numbers show that the method works, not a real prevalence rate. Every flag
is a candidate for human review. See `CLAIM_LEDGER.md` for the exact wording that is and isn't
allowed.

## Two pipelines, one boundary

CATCH is split so the deployed app carries no database and no heavy dependency:

```
Raw SyntheticRI bundle (local, never committed)
        ↓  DuckDB + pandas ETL  (offline, python -m etl.build)
Validated analytical output  (data/processed/catch.sqlite, gitignored)
        ↓  export  (python -m etl.export_web)
Compact static JSON bundle   (app/public/data/*.json, COMMITTED)
        ↓  next build (output: export)
Static site  →  Vercel  and/or  GitHub Pages
```

The **production web app is 100% static**: every page is prerendered from the committed JSON
bundle. There is no server, no database, no API route, and no filesystem write at runtime. Contact
status (which patients a worker has reached) lives in the browser via `localStorage`, namespaced by
dataset version. DuckDB and SQLite exist **only in the offline ETL**.

## Layout

```
catch/
  etl/            Python ETL: extract → engine → catch.sqlite → export_web (JSON bundle)
  tests/          pytest engine fixtures (16, deterministic, no data needed)
  app/            Next.js + TypeScript static app  ← Vercel "Root Directory"
    public/data/  the committed web bundle: manifest, queue, geography, patients/*.json
  .github/workflows/  ci.yml (lint·typecheck·tests·build) + deploy-pages.yml
  CLAIM_LEDGER.md  DEMO_GUIDE.md  JUDGE_QA.md  CATCH_BUILD_STATE.md  validation/
```

## Run the app locally

Prereqs: Node 20+.

```bash
cd app
npm install
npm run dev      # http://localhost:3000  (uses the committed bundle in public/data)
```

Production build (static export → `app/out/`):

```bash
cd app
npm run build
npx serve out    # or any static file server
```

Checks:

```bash
cd app
npm run lint
npm run typecheck
```

## Regenerate the data (offline ETL, only when the analytical build changes)

Prereqs: Python 3.12+, `pip install duckdb pandas pyarrow pytest`. The raw bundle stays on your
machine and is never committed.

```bash
# engine unit tests (no data required)
python -m pytest tests -q

# build the analytical database from the raw bundle (paths are examples)
python -m etl.build --source /path/to/300k_bundle --output data/processed

# export the compact static bundle the app serves
python -m etl.export_web --db data/processed/catch.sqlite --out app/public/data
```

`export_web` writes `manifest.json`, `queue.json`, `geography.json`, and one
`patients/<id>.json` per queue patient; it validates its input, produces byte-stable output, and
refuses to emit an oversized artifact. Commit the regenerated `app/public/data` to ship it.

## Deploy

**Vercel (recommended for the demo).** Import the GitHub repo; set **Root Directory = `app`**.
Vercel auto-detects Next.js and builds the static export. No environment variables, no database.
Every pull request gets a Preview Deployment; merges to `main` update Production.

**GitHub Pages (zero-cost fallback).** `.github/workflows/deploy-pages.yml` builds the static
export with the base path set to the repo name and publishes it on every push to `main`. Enable it
once under **Settings → Pages → Source: GitHub Actions**. URL: `https://<owner>.github.io/<repo>/`.

## Environment variables

None are required. The only variable is optional and build-time: `NEXT_PUBLIC_BASE_PATH`, a path
prefix for sub-path hosting (empty for Vercel/root; `/<repo>` for GitHub project pages, which the
Pages workflow sets for you). See `.env.example`.

## Data & privacy boundaries

- Raw SyntheticRI CSVs and the analytical `catch.sqlite` are **gitignored** and never leave your
  machine. Only the compact, sanitized JSON bundle (fields the UI needs) is committed.
- No real patients, no PII, no secrets, no credentials anywhere in the repo or the deployed app.
- Outreach messages are **drafts only**; CATCH never sends anything.

## Demo-state reset

Contact marks are stored in the browser. Use **"Reset contacted"** in the queue filter bar, or
clear the site's `localStorage`. A new dataset build changes the version namespace, so old marks
never bleed into a new build.

## Measured results (full 300k bundle, engine v0.1.0)

- 348,120 records → **238,629 adults** → 34,505 with repeated highs →
  **17,987 undiagnosed** + **14,467 treated-but-uncontrolled**; 0 diagnosed-untreated.
- Web bundle: manifest + queue + geography ≈ 0.3 MB, plus 1,000 patient files ≈ 3.1 MB.

## The rules (see the Methodology page / `etl/engine.py`)

- **Undiagnosed:** adult, ≥2 systolic ≥140 on distinct adult-age days, no HTN diagnosis on file.
- **Treated-uncontrolled:** HTN diagnosis + non-ambiguous antihypertensive + ≥2 elevated readings
  after treatment started. Loop diuretics and ARNI are treated as ambiguous, not counted.
- **Priority:** urgent / high / routine from severity, reading count, and stacked comorbidities.
