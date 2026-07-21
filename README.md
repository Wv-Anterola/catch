# CATCH: Care-gap Alerts for Treating Community Hypertension

CATCH is a decision-support tool for community health workers. It reads a
Synthea / SyntheticRI EHR export, finds adults who meet an explicit hypertension
care-gap rule, ranks them for follow-up, and for each one shows the exact rule
that flagged them, the supporting evidence, and a cautious draft outreach
message in English or Spanish.

CATCH does not diagnose or predict, and it does not report real Rhode Island
prevalence. SyntheticRI is synthetic data, so the results demonstrate that the
method works; they are not epidemiological findings. Every flagged record is a
candidate for human review, and drafted messages are never sent automatically.

## How it is built

CATCH separates the analytical work from the deployed app, so the site ships
without a database or heavy runtime dependencies.

1. An offline ETL (DuckDB and pandas) reads the raw SyntheticRI bundle, applies
   the care-gap engine, and writes an analytical SQLite database. The raw data
   and this database stay on your machine and are never committed.
2. An export step turns that database into a small, sanitized JSON bundle
   containing only the fields the UI needs. This bundle is committed to the repo.
3. `next build` produces a fully static export from the committed bundle.

The production app is entirely static: every page is prerendered, and there is
no server, database, API route, or runtime filesystem access. Contacted status
(which patients a worker has reached) is kept in the browser's localStorage,
namespaced by dataset version. DuckDB and SQLite are used only in the offline ETL.

## Repository layout

```
etl/                 Python ETL: extract, engine, SQLite build, web export
tests/               pytest engine fixtures (deterministic, no data required)
app/                 Next.js + TypeScript static app (Vercel root directory)
  public/data/       the committed web bundle: manifest, queue, geography, patients
.github/workflows/   CI (lint, typecheck, tests, build) and GitHub Pages deploy
```

## Running the app

Requires Node 20 or newer.

```
cd app
npm install
npm run dev        # http://localhost:3000, served from the committed bundle
```

Production build (static export to `app/out`):

```
cd app
npm run build
npx serve out
```

Lint and type checks:

```
cd app
npm run lint
npm run typecheck
```

## Regenerating the data

Only needed when the analytical build changes. Requires Python 3.12 or newer and
`pip install duckdb pandas pyarrow pytest`. The raw bundle stays local and is
never committed.

```
python -m pytest tests -q

python -m etl.build --source /path/to/bundle --output data/processed

python -m etl.export_web --db data/processed/catch.sqlite --out app/public/data
```

The export writes `manifest.json`, `queue.json`, `geography.json`, and one
`patients/<id>.json` per queue patient. It validates its input, produces
byte-stable output, and refuses to emit an oversized artifact. Commit the
regenerated `app/public/data` to ship it.

## Deployment

Vercel is the primary target. Import the repository and set the root directory
to `app`; Vercel detects Next.js and builds the static export. No environment
variables or database are needed. Pull requests get preview deployments, and
merges to `main` update production.

A GitHub Pages workflow (`.github/workflows/deploy-pages.yml`) is included as a
zero-cost fallback. It builds the export with the base path set to the
repository name and publishes on every push to `main`. Enable it once under
Settings, Pages, Source: GitHub Actions.

The only configuration variable is optional and build-time:
`NEXT_PUBLIC_BASE_PATH`, a path prefix for sub-path hosting (empty for Vercel or
root hosting, `/<repo>` for GitHub project pages, which the Pages workflow sets
automatically). See `.env.example`.

## Data and privacy

- The raw SyntheticRI CSVs and the analytical SQLite database are gitignored and
  never leave your machine. Only the compact, sanitized JSON bundle is committed.
- There are no real patients, no PII, no secrets, and no credentials in the
  repository or the deployed app.
- Outreach messages are drafts for staff review; CATCH never sends them.

## Results on the full bundle

Measured on the full 300k-record SyntheticRI bundle with engine v0.1.0:

- 348,120 records reduce to 238,629 adults. Of those, 34,505 have repeated
  elevated readings (2+ systolic >= 140 mmHg on distinct days). CATCH flags
  32,454 of them as one of the two care gaps: 17,987 undiagnosed and 14,467
  treated but uncontrolled. The remaining 2,051 already carry a hypertension
  diagnosis and are either adequately treated or lack counted antihypertensive
  evidence, so they are not flagged.
- The web bundle is roughly 0.3 MB for the manifest, queue, and geography, plus
  about 3.1 MB for 1,000 patient files.

## The rules

The engine is defined in `etl/engine.py` and summarized on the app's methodology
page.

- Undiagnosed: an adult with at least two systolic readings of 140 or higher on
  distinct adult-age days and no hypertension diagnosis on file.
- Treated but uncontrolled: a hypertension diagnosis, a non-ambiguous
  antihypertensive medication, and at least two elevated readings after
  treatment began. Loop diuretics and ARNI are treated as ambiguous and are not
  counted.
- Priority (urgent, high, routine) comes from severity, the number of readings,
  and stacked comorbidities.
