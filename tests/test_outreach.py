from etl.outreach import language_status, recommended_routes, support_flags


def profile(**overrides):
    base = {
        "preferred_language": {"status": "english", "label": "English", "as_of": None},
        "food_access": {"status": "not_documented", "label": "not documented", "as_of": None},
        "transportation": {"status": "not_documented", "label": "not documented", "as_of": None},
        "insurance": {"status": "continuous_evidenced", "label": "continuous", "as_of": None},
        "pcp_continuity": {"status": "established_evidenced", "label": "established", "as_of": None},
    }
    base.update(overrides)
    return base


def test_language_values_never_infer_a_translation():
    assert language_status("English") == "english"
    assert language_status("Español") == "spanish"
    assert language_status("Portuguese") == "interpreter_required"
    assert language_status(None) == "interpreter_required"


def test_support_flags_only_capture_documented_or_actionable_states():
    p = profile(
        preferred_language={"status": "spanish", "label": "Spanish", "as_of": None},
        food_access={"status": "documented_need", "label": "food", "as_of": None},
        transportation={"status": "documented_need", "label": "transport", "as_of": None},
        insurance={"status": "coverage_gap_evidenced", "label": "gap", "as_of": None},
        pcp_continuity={"status": "not_evidenced", "label": "no PCP", "as_of": None},
    )
    assert support_flags(p) == ["language", "food", "transportation", "insurance", "pcp"]


def test_routes_are_team_based_and_preserve_clinical_review():
    p = profile(
        preferred_language={"status": "interpreter_required", "label": "confirm", "as_of": None},
        food_access={"status": "documented_need", "label": "food", "as_of": None},
        insurance={"status": "uninsured_evidenced", "label": "uninsured", "as_of": None},
    )
    routes = recommended_routes("treated_uncontrolled", p)
    assert [route["role"] for route in routes] == [
        "Community health worker", "Care coordinator", "Pharmacist", "Clinical reviewer",
    ]
