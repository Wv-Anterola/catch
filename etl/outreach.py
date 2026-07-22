"""Pure, non-clinical outreach-routing helpers."""

from __future__ import annotations


def language_status(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"english", "en"}:
        return "english"
    if normalized in {"spanish", "es", "espanol", "español"}:
        return "spanish"
    return "interpreter_required"


def recommended_routes(category: str, profile: dict) -> list[dict[str, object]]:
    """Return explainable team recommendations without changing clinical priority."""
    routes: list[dict[str, object]] = []
    chw_reasons: list[str] = []
    language = profile["preferred_language"]["status"]
    if language == "spanish":
        chw_reasons.append("Spanish-preferred outreach")
    elif language == "interpreter_required":
        chw_reasons.append("confirm language and arrange interpreter")
    if profile["food_access"]["status"] == "documented_need":
        chw_reasons.append("documented food-access need")
    if profile["transportation"]["status"] == "documented_need":
        chw_reasons.append("documented transportation barrier")
    if chw_reasons:
        routes.append({"role": "Community health worker", "reasons": chw_reasons})

    coordinator_reasons: list[str] = []
    if profile["insurance"]["status"] in {"uninsured_evidenced", "coverage_gap_evidenced"}:
        coordinator_reasons.append(profile["insurance"]["label"])
    if profile["pcp_continuity"]["status"] in {"limited_evidence", "not_evidenced"}:
        coordinator_reasons.append(profile["pcp_continuity"]["label"])
    if coordinator_reasons:
        routes.append({"role": "Care coordinator", "reasons": coordinator_reasons})

    if category == "treated_uncontrolled":
        routes.append({"role": "Pharmacist", "reasons": ["medication review for treated, uncontrolled blood pressure"]})
    routes.append({"role": "Clinical reviewer", "reasons": ["review the hypertension care-gap evidence"]})
    return routes


def support_flags(profile: dict) -> list[str]:
    flags: list[str] = []
    if profile["preferred_language"]["status"] in {"spanish", "interpreter_required"}:
        flags.append("language")
    if profile["food_access"]["status"] == "documented_need":
        flags.append("food")
    if profile["transportation"]["status"] == "documented_need":
        flags.append("transportation")
    if profile["insurance"]["status"] in {"uninsured_evidenced", "coverage_gap_evidenced"}:
        flags.append("insurance")
    if profile["pcp_continuity"]["status"] in {"limited_evidence", "not_evidenced"}:
        flags.append("pcp")
    return flags
