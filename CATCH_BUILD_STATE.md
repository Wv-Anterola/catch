# CATCH: Build State

_Operational memory so any session can resume without re-running reconnaissance._

## Deployment architecture (selected)

**Static JSON bundle + `localStorage`, shipped as a Next.js static export.** (Option A from the
deployment brief.)

- Offline Python ETL builds `data/processed/catch.sqlite` (gitignored), then
  `python -m etl.export_web` emits a compact, immutable bundle to `app/public/data/`:
  `manifest.json`, `queue.json`, `geography.json`, and `patients/<id>.json` per queue patient.
- The Next.js app reads that bundle at **build time** (`lib/data.ts`, `fs`), so every page is
  statically prerendered (`output: "export"`, `trailingSlash: true`). Patient detail is fetched
  **on demand** as a static asset. Contact status is browser `localStorage`, namespaced by dataset
  version (`lib/contacted.ts`, via `useSyncExternalStore` → hydration-safe).
- **No database, no API route, no server, no filesystem write at runtime.** DuckDB/SQLite live only
  in the offline ETL.

**Why:** measured bundle is ~3.5 MB, small enough to commit and CDN-cache, so no object storage
(Option B) or Postgres (Option C) is warranted. A pure static export deploys unchanged to both
Vercel and GitHub Pages, and is the fastest, most reliable option for a live demo.

## Deploy targets

- **Vercel (primary demo):** import repo, set **Root Directory = `app`**. Auto-detects Next.js.
  PR → Preview Deployment; `main` → Production. No env vars, no secrets.
- **GitHub Pages (fallback):** `.github/workflows/deploy-pages.yml` builds with
  `NEXT_PUBLIC_BASE_PATH=/<repo>` and publishes on push to `main`. Enable once:
  Settings → Pages → Source: GitHub Actions.
- **CI:** `.github/workflows/ci.yml` runs install → lint → typecheck → build (web) and pytest
  (engine). Does not need the raw 300k dataset.

## Bundle sizes (full 300k, engine v0.1.0)

- `manifest.json` ~0.9 KB · `queue.json` ~287 KB (top 1000, slim) · `geography.json` ~13 KB
- `patients/` 1000 files ~3.1 MB (fetched one at a time on selection) · **total ~3.5 MB**

## Tests run (this deployment pass)

- `npm run lint` clean · `npm run typecheck` clean · `npm run build` → 5 static routes exported.
- `python -m pytest tests` → 16/16 pass (run from `catch/`; import is `from etl.engine`).
- Local production browser test (served `app/out`): all routes 200 from direct URLs; queue
  hydrates with honest totals (32,454 flagged, capped "1,000 of 32,454"); on-demand patient detail
  fetch renders (BP timeline, rule trace, EN/ES draft); **Mark contacted persists across a full
  reload** (localStorage); missing patient file → graceful message; console clean.

## Copy sweep (product wording pass)

One pass over all user-facing text to remove pitch/AI-flavored phrasing and standardize
terminology. Nav is now Overview / Outreach queue / Geographic summary / Methodology (one name per
destination, sentence case). Overview leads with "Hypertension follow-up overview" and a plain
purpose statement instead of the pitch headline. Patient detail uses "Reason for review",
"Supporting evidence" (Diagnosis / Medication evidence, Relevant conditions), "Show the rule trace",
and "Suggested follow-up". Empty/loading states are specific ("No records match these filters",
"Loading record details…"). Synthetic-data and non-diagnostic disclaimers were preserved verbatim in
intent; engine-generated reasons and rule traces were left unchanged (analytical output). Verified
via lint + typecheck + static build.

## Code map

`etl/`: `config.py` thresholds · `codes.py` clinical+med registry · `extract.py` DuckDB scans →
parquet · `transform.py` PatientFacts + engine · `engine.py` classification + rule trace
(unit-tested) · `emit.py` writes catch.sqlite · **`export_web.py` writes the web JSON bundle** ·
`build.py` orchestrator · `validate.py` · `med_audit.py`.

`app/`: `lib/data.ts` (build-time bundle reader) · `lib/paths.ts` (basePath + data URLs) ·
`lib/contacted.ts` (localStorage store) · `app/*/page.tsx` static pages · `components/*` (queue,
patient drawer, RI map, geo explorer).

## Full 300k measured results (engine v0.1.0, ref 2026-05-15)

- Extract ~6m15s → ~700 MB parquet. Engine+emit ~7m → catch.sqlite ~100 MB, 32,454 flagged.
- 348,120 records → 238,629 adults → 34,505 repeated-highs → 17,987 undiagnosed +
  14,467 treated-uncontrolled + 0 diagnosed-no-med.

## Known limitations

- The browsable queue is capped at the top 1,000 by priority; aggregate counts are the full 32,454
  (honest headline, small payload). Raise `--queue-limit` to ship more (also grows patient files).
- SyntheticRI is synthetic; the defensible disparity is **age**, not any protected group.
- A dark-mode browser extension (Dark Reader / Screen Shader) repaints the page black in the
  developer's local Chrome: a client-side override, not an app bug. Verify visually with the
  extension off, in Incognito, or on the hosted URL in a clean profile.

## Demo-state reset

"Reset contacted" in the queue filter bar, or clear the site's `localStorage`. A new dataset build
bumps the version namespace so old marks never carry over.

## Next action

Push to GitHub, enable Pages / import to Vercel, then browser-test the hosted Preview URL.
