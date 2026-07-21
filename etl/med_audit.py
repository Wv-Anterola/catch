"""Medication audit: never classify antihypertensives silently.

Scans medications.csv, groups by (code, description) with frequency, applies
codes.classify_med, and writes a Markdown report:
  * medications classified as antihypertensive, grouped by class
  * name-stem matches whose exact code is NOT in the curated registry
    (new formulations to review before trusting the 300k build)
  * the highest-frequency medications overall (human eyeball for misses)

Run:
  python -m catch.etl.med_audit --source ./1k_20260505_bundle --output ./catch/validation
"""

from __future__ import annotations

from pathlib import Path

import duckdb

from . import codes
from .config import SOURCE_FILES


def audit(source: Path) -> dict:
    src = (Path(source) / SOURCE_FILES["medications"]).as_posix()
    con = duckdb.connect()
    con.execute("PRAGMA memory_limit='4GB'")
    rows = con.execute(f"""
        SELECT CODE AS code, DESCRIPTION AS description, count(*) AS n
        FROM read_csv('{src}', header=true, all_varchar=true, ignore_errors=true)
        GROUP BY 1, 2
        ORDER BY n DESC
    """).fetchall()
    con.close()

    classified: dict[str, list] = {}
    stem_only: list = []          # matched by stem but code not curated
    top_overall = rows[:40]

    for code, desc, n in rows:
        m = codes.classify_med(code, desc or "")
        if m is None:
            continue
        classified.setdefault(m.drug_class, []).append((code, desc, n, m.ambiguous))
        if code not in codes.ANTIHYPERTENSIVE_CODES:
            stem_only.append((code, desc, n, m.drug_class, m.ambiguous))

    return {"classified": classified, "stem_only": stem_only,
            "top_overall": top_overall, "total_distinct": len(rows)}


def write_report(result: dict, out_dir: Path, source: Path) -> Path:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "MED_AUDIT.md"
    lines = ["# CATCH Medication Audit", "",
             f"Source: `{source}`  ", f"Distinct (code, description) pairs: **{result['total_distinct']}**",
             "", "Ambiguous classes (LOOP, ARNI) are primarily heart-failure agents and are",
             "NOT counted as antihypertensive treatment by default (see config).", ""]

    lines.append("## Classified antihypertensives (by class)\n")
    for cls in sorted(result["classified"]):
        items = sorted(result["classified"][cls], key=lambda r: -r[2])
        total = sum(r[2] for r in items)
        amb = " (AMBIGUOUS, excluded by default)" if items and items[0][3] else ""
        lines.append(f"### {cls}{amb}: {total:,} dispenses across {len(items)} products\n")
        lines.append("| code | description | dispenses |")
        lines.append("|---|---|---:|")
        for code, desc, n, _amb in items:
            lines.append(f"| {code} | {desc} | {n:,} |")
        lines.append("")

    lines.append("## Stem-matched but NOT in curated code registry\n")
    if result["stem_only"]:
        lines.append("Review these new formulations found by name stem:\n")
        lines.append("| code | description | dispenses | class | ambiguous |")
        lines.append("|---|---|---:|---|---|")
        for code, desc, n, cls, amb in sorted(result["stem_only"], key=lambda r: -r[2]):
            lines.append(f"| {code} | {desc} | {n:,} | {cls} | {amb} |")
    else:
        lines.append("_None. Every stem match is already in the curated registry._")
    lines.append("")

    lines.append("## Top 40 medications overall (eyeball for missed antihypertensives)\n")
    lines.append("| code | description | dispenses |")
    lines.append("|---|---|---:|")
    for code, desc, n in result["top_overall"]:
        lines.append(f"| {code} | {desc} | {n:,} |")
    lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
    return path


if __name__ == "__main__":  # pragma: no cover
    import argparse

    ap = argparse.ArgumentParser(description="CATCH medication audit")
    ap.add_argument("--source", required=True)
    ap.add_argument("--output", default="./catch/validation")
    a = ap.parse_args()
    res = audit(Path(a.source))
    p = write_report(res, Path(a.output), Path(a.source))
    print(f"Wrote {p}")
    print(f"Classes: {', '.join(f'{k}={sum(x[2] for x in v):,}' for k, v in res['classified'].items())}")
