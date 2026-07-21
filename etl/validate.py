"""Gate 2 driver: run the engine on staged data and reconcile with the slides.

Prints the CATCH funnel and the age-band miss rates so they can be compared to
the pitch numbers (798 adults -> 136 repeated highs -> 72 undiagnosed = 53%;
under-45 miss ~81%; 37 treated-uncontrolled). Does NOT force a match.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from . import config
from .transform import build


def reconcile(staging: Path) -> dict:
    df, details, meta = build(staging)
    adults = df[df["adult"]].copy()
    repeated = adults[adults["n_highs"] >= config.MIN_QUALIFYING_HIGHS]
    undiag = adults[adults["category"] == "undiagnosed"]

    print("\n=== CATCH funnel (adults) ===")
    print(f"  adults:                 {len(adults)}")
    print(f"  with 2+ high days:      {len(repeated)}")
    print(f"  undiagnosed (red box A):{len(undiag)}"
          f"  ({100*len(undiag)/max(len(repeated),1):.0f}% of repeated)")
    print(f"  treated-uncontrolled B: {(adults['category']=='treated_uncontrolled').sum()}")
    print(f"  diagnosed-no-med:       {(adults['category']=='diagnosed_no_med').sum()}")

    # age-band miss rate among repeated-high adults: share undiagnosed
    print("\n=== miss rate by age band (undiagnosed / repeated highs) ===")
    bands = [(18, 45, "18-44"), (45, 60, "45-59"), (60, 200, "60+")]
    for lo, hi, label in bands:
        b = repeated[(repeated["age"] >= lo) & (repeated["age"] < hi)]
        u = b[b["category"] == "undiagnosed"]
        rate = 100 * len(u) / max(len(b), 1)
        print(f"  {label}: {len(u)}/{len(b)} = {rate:.0f}%")

    # stacked risks among undiagnosed
    stacked2 = undiag[undiag["stacked"] >= 2]
    print(f"\n  undiagnosed with 2+ stacked risks: {len(stacked2)} "
          f"({100*len(stacked2)/max(len(undiag),1):.0f}%)")
    return {"df": df, "details": details, "meta": meta}


if __name__ == "__main__":  # pragma: no cover
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--staging", default="./catch/data/processed/staging")
    a = ap.parse_args()
    reconcile(Path(a.staging))
