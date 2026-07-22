"""Export the analytical SQLite into the static JSON bundle the web app serves.

    catch.sqlite  ->  app/public/data/{manifest,queue,geography}.json + patients/<id>.json

Run after a new analytical build:

    python -m etl.export_web --db data/processed/catch.sqlite --out app/public/data

The app never opens SQLite; it reads these files at build time. Output is byte-stable so
Git diffs stay meaningful, and artifacts are size-capped to catch accidental bloat.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

# Fields the queue list needs (search, filters, row rendering). Anything heavier
# (rule trace, timeline, evidence) is fetched per-patient on demand.
QUEUE_FIELDS = [
    "patient_id", "category", "priority", "reason",
    "city", "age", "stacked", "comorbid_tags", "support_flags", "recommended_roles",
]

REQUIRED_TABLES = {"meta", "cohort", "patient_detail", "city_stats", "hospitals", "funnel", "equity_stats"}

MAX_ARTIFACT_MB = 4.0
MAX_QUEUE_MB = 1.5


def _validate_db(con: sqlite3.Connection) -> None:
    have = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    missing = REQUIRED_TABLES - have
    if missing:
        raise SystemExit(f"error: {', '.join(sorted(missing))} missing from the analytical db")


def _meta(con: sqlite3.Connection) -> dict:
    return {k: v for k, v in con.execute("SELECT key, value FROM meta")}


def _num(v):
    """Return v as int/float when it parses as a number, else unchanged."""
    try:
        f = float(v)
        return int(f) if f.is_integer() else f
    except (TypeError, ValueError):
        return v


def _write(path: Path, obj, *, max_mb: float, sizes: dict) -> None:
    text = json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    mb = len(text.encode("utf-8")) / 1e6
    if mb > max_mb:
        raise SystemExit(f"error: {path.name} is {mb:.2f} MB, over the {max_mb} MB budget")
    path.write_text(text, encoding="utf-8")
    sizes[str(path)] = mb


def export(db: Path, out: Path, queue_limit: int) -> None:
    db, out = Path(db), Path(out)
    if not db.exists():
        raise SystemExit(f"error: analytical db not found: {db}")

    con = sqlite3.connect(db)
    con.row_factory = sqlite3.Row
    _validate_db(con)

    meta_raw = _meta(con)
    meta = {k: _num(v) for k, v in meta_raw.items()}

    # Counts come from the full cohort, so headline numbers stay correct even though the
    # browsable queue is capped.
    flagged_total = con.execute("SELECT count(*) FROM cohort").fetchone()[0]
    prio = {r["priority"]: r["n"]
            for r in con.execute("SELECT priority, count(*) n FROM cohort GROUP BY priority")}
    n_cities = con.execute("SELECT count(*) FROM city_stats WHERE adults >= 3").fetchone()[0]
    n_hosp = con.execute("SELECT count(*) FROM hospitals").fetchone()[0]
    funnel = [dict(r) for r in con.execute("SELECT stage, n, ord FROM funnel ORDER BY ord")]

    build_date = str(meta_raw.get("build_timestamp", ""))[:10]
    version = f"{meta_raw.get('engine_version', 'v0')}+{build_date}" if build_date else str(
        meta_raw.get("engine_version", "v0"))

    manifest = {
        "version": version,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "SyntheticRI (Synthea): synthetic data, not real Rhode Island patients",
        "meta": meta,
        "counts": {
            "adults": _num(meta_raw.get("adults", 0)),
            "total_patients": _num(meta_raw.get("total_patients", 0)),
            "flagged": flagged_total,
            "undiagnosed": _num(meta_raw.get("undiagnosed", 0)),
            "treated_uncontrolled": _num(meta_raw.get("treated_uncontrolled", 0)),
            "urgent": prio.get("urgent", 0),
            "high": prio.get("high", 0),
            "routine": prio.get("routine", 0),
            "cities": n_cities,
            "hospitals": n_hosp,
            "queue_shown": min(queue_limit, flagged_total),
        },
        "funnel": funnel,
    }

    # Stratified queue sample: the browsable queue is capped at queue_limit, so a naive
    # "top N by rank" returns only urgent records (they all rank first) and High/Routine
    # never appear in the UI or get detail files. Instead allocate the cap across
    # priorities proportional to their share of the flagged cohort (largest-remainder,
    # never exceeding availability), taking the top-ranked within each tier, then order
    # the final list by global rank so urgent-first triage order is preserved. Headline
    # counts still come from the full cohort, so nothing about the numbers changes.
    order = ["urgent", "high", "routine"]
    avail = {p: prio.get(p, 0) for p in order}
    total_avail = sum(avail.values()) or 1
    target = min(queue_limit, flagged_total)
    raw = {p: target * avail[p] / total_avail for p in order}
    alloc = {p: min(int(raw[p]), avail[p]) for p in order}
    remainder = target - sum(alloc.values())
    for p in sorted(order, key=lambda p: raw[p] - int(raw[p]), reverse=True):
        if remainder <= 0:
            break
        if alloc[p] < avail[p]:
            alloc[p] += 1
            remainder -= 1

    cols = ", ".join(QUEUE_FIELDS)
    queue_rows = []
    for p in order:
        if alloc[p] <= 0:
            continue
        queue_rows.extend(dict(r) for r in con.execute(
            f"SELECT {cols}, rank FROM cohort WHERE priority = ? ORDER BY rank LIMIT ?",
            (p, alloc[p])))
    queue_rows.sort(key=lambda r: r["rank"])
    for r in queue_rows:
        r.pop("rank", None)
    print(f"  queue sample by priority: "
          + ", ".join(f"{p}={alloc[p]}" for p in order) + f" (of {target})")

    cities = [dict(r) for r in con.execute(
        "SELECT * FROM city_stats WHERE adults >= 3 ORDER BY flagged DESC")]
    hospitals = [dict(r) for r in con.execute("SELECT * FROM hospitals")]
    geography = {"cities": cities, "hospitals": hospitals}
    equity = {
        "suppression_min_n": 11,
        "rows": [dict(r) for r in con.execute(
            "SELECT * FROM equity_stats ORDER BY dimension, group_name")],
    }

    out.mkdir(parents=True, exist_ok=True)
    patients_dir = out / "patients"
    if patients_dir.exists():
        shutil.rmtree(patients_dir)  # drop details left over from a larger previous build
    patients_dir.mkdir(parents=True, exist_ok=True)

    sizes: dict = {}
    _write(out / "manifest.json", manifest, max_mb=MAX_ARTIFACT_MB, sizes=sizes)
    _write(out / "queue.json", queue_rows, max_mb=MAX_QUEUE_MB, sizes=sizes)
    _write(out / "geography.json", geography, max_mb=MAX_ARTIFACT_MB, sizes=sizes)
    _write(out / "equity.json", equity, max_mb=MAX_ARTIFACT_MB, sizes=sizes)

    # One detail file per queue patient (fetched when a row is selected).
    ids = [r["patient_id"] for r in queue_rows]
    q = "SELECT patient_id, json FROM patient_detail WHERE patient_id IN (%s)" % ",".join("?" * len(ids))
    detail_map = {r["patient_id"]: r["json"] for r in con.execute(q, ids)}
    detail_bytes = 0
    for pid in ids:
        raw = detail_map.get(pid)
        if raw is None:
            continue
        text = json.dumps(json.loads(raw), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        (patients_dir / f"{pid}.json").write_text(text, encoding="utf-8")
        detail_bytes += len(text.encode("utf-8"))
    con.close()

    total_mb = sum(sizes.values()) + detail_bytes / 1e6
    print("wrote web bundle to", out)
    for p, mb in sorted(sizes.items()):
        print(f"  {Path(p).name:16s} {mb*1000:8.1f} KB")
    print(f"  patients/       {len(ids)} files, {detail_bytes/1e6:7.2f} MB")
    print(f"  version {version}   total {total_mb:.2f} MB")
    if total_mb > 12:
        print("  warning: bundle over 12 MB; consider hosting patient files in object storage")


def main() -> None:
    ap = argparse.ArgumentParser(description="Export the CATCH web JSON bundle from the analytical SQLite.")
    ap.add_argument("--db", default="data/processed/catch.sqlite")
    ap.add_argument("--out", default="app/public/data")
    ap.add_argument("--queue-limit", type=int, default=1000)
    a = ap.parse_args()
    export(Path(a.db), Path(a.out), a.queue_limit)


if __name__ == "__main__":
    main()
