"""Build orchestrator: extract -> transform -> engine -> emit catch.sqlite.

  python -m catch.etl.build --source ./1k_20260505_bundle --output ./catch/data/processed
  python -m catch.etl.build --source "D:\\300k_20260508_bundle" \\
      --output ./catch/data/processed --duckdb-temp D:\\catch_tmp

Use --skip-extract to reuse existing staging parquet (fast iteration on the engine).
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

from . import extract
from .config import Paths
from .emit import emit
from .transform import build as transform_build


def main() -> None:
    ap = argparse.ArgumentParser(description="CATCH build")
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--duckdb-temp", default=None)
    ap.add_argument("--skip-extract", action="store_true")
    a = ap.parse_args()

    paths = Paths(source=a.source, output=a.output, duckdb_temp=a.duckdb_temp)
    t0 = time.time()

    if not a.skip_extract:
        print("[build] extracting (DuckDB projected scans)...")
        te = time.time()
        counts = extract.run(paths)
        print(f"[build] extract done in {time.time()-te:.1f}s: "
              + ", ".join(f"{k}={v:,}" for k, v in counts.items()))
    else:
        print("[build] skipping extract; reusing staging parquet")

    print("[build] transform + engine...")
    tt = time.time()
    df, details, meta = transform_build(paths.staging)
    print(f"[build] transform done in {time.time()-tt:.1f}s")

    out_db = paths.output / "catch.sqlite"
    emit(df, details, meta, paths.staging, out_db)
    size_mb = out_db.stat().st_size / 1e6
    print(f"[build] wrote {out_db} ({size_mb:.1f} MB) with {len(details):,} flagged patients")
    print(f"[build] TOTAL {time.time()-t0:.1f}s")
    print("[build] funnel: "
          f"adults={meta['adults']} 2+highs={meta['adults_with_2plus_highs']} "
          f"undiagnosed={meta['undiagnosed']} treated_uncontrolled={meta['treated_uncontrolled']}")


if __name__ == "__main__":
    main()
