from app.domain.constraints import load_sar_constraints
from app.validation.deterministic import validate_sar_unified_payload


def _valid_min_bdd():
    return {
        "diagram_type": "bdd",
        "elements": [
            {"id": "cac", "type": "block", "name": "CommandAndControl"},
            {"id": "comms", "type": "block", "name": "CommunicationsSubsystem"},
            {"id": "search", "type": "block", "name": "SearchAssets"},
            {"id": "rescue", "type": "block", "name": "RescueAssets"},
            {"id": "triage", "type": "block", "name": "MedicalTriage"},
        ],
        "relationships": [],
    }


def test_deterministic_validator_flags_synonyms_as_warning():
    report = validate_sar_unified_payload(
        text="Manager coordinates the incident response.",
        bdd_diagram=_valid_min_bdd(),
        constraints=load_sar_constraints(),
    )

    assert report.counts["critical"] == 0
    assert report.counts["warning"] == 1
    assert report.recommendation == "refine"
    assert report.issues[0].code == "TERMINOLOGY_SYNONYM_USED"
    assert report.scores_1to5["terminology"] == 4


def test_deterministic_validator_missing_required_bdd_block_fails_fast():
    bdd = _valid_min_bdd()
    bdd["elements"] = [el for el in bdd["elements"] if el["name"] != "CommunicationsSubsystem"]

    report = validate_sar_unified_payload(
        text="Flood rescue mission.",
        bdd_diagram=bdd,
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    assert any(issue.code == "MISSING_REQUIRED_BDD_BLOCK" for issue in report.issues)
    assert report.scores_1to5["completeness"] == 3


def test_deterministic_validator_missing_triage_phase_fails_fast():
    smd = {
        "diagram_type": "smd",
        "parent_block_id": "mission",
        "nodes": [
            {"id": "alert", "type": "state", "name": "Alert"},
            {"id": "deploy", "type": "state", "name": "Deployment"},
            {"id": "search", "type": "state", "name": "Search"},
            {"id": "rescue", "type": "state", "name": "Rescue"},
        ],
        "edges": [
            {"id": "e1", "source": "alert", "target": "deploy", "label": "dispatch"},
            {"id": "e2", "source": "deploy", "target": "search", "label": "arrive"},
            {"id": "e3", "source": "search", "target": "rescue", "label": "locate"},
        ],
    }

    report = validate_sar_unified_payload(
        text="Flood rescue mission lifecycle.",
        bdd_diagram=_valid_min_bdd(),
        smd_data=[smd],
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    missing_phase_issue = next((issue for issue in report.issues if issue.code == "MISSING_MISSION_PHASE"), None)
    assert missing_phase_issue is not None
    assert missing_phase_issue.location == "smd:mission"


def test_deterministic_validator_mixed_ics_and_gsb_roles_fails_fast():
    bdd = _valid_min_bdd()
    bdd["elements"].append({"id": "ic", "type": "block", "name": "Incident Commander"})
    bdd["elements"].append({"id": "gc", "type": "block", "name": "Gold Commander"})

    report = validate_sar_unified_payload(
        text="Incident Commander coordinates with Gold Commander.",
        bdd_diagram=bdd,
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "refine"
    mode_issue = next((issue for issue in report.issues if issue.code == "MODE_MIXED_ICS_GSB"), None)
    assert mode_issue is not None
    assert mode_issue.location == "bdd.elements.ic"


def test_deterministic_validator_mixed_ics_and_gsb_roles_fail_fast_when_mode_set():
    report = validate_sar_unified_payload(
        text="Incident Commander coordinates with Gold Commander.",
        bdd_diagram=_valid_min_bdd(),
        mode="ICS",
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    assert any(issue.code == "MODE_MIXED_ICS_GSB" and issue.severity == "critical" for issue in report.issues)


def test_deterministic_validator_forbidden_transition_affects_correctness():
    smd = {
        "diagram_type": "smd",
        "parent_block_id": "mission",
        "nodes": [
            {"id": "alert", "type": "state", "name": "Alert"},
            {"id": "deploy", "type": "state", "name": "Deployment"},
            {"id": "search", "type": "state", "name": "Search"},
            {"id": "rescue", "type": "state", "name": "Rescue"},
            {"id": "transport", "type": "state", "name": "Transport"},
        ],
        "edges": [
            {"id": "e1", "source": "alert", "target": "deploy", "label": "dispatch"},
            {"id": "e2", "source": "deploy", "target": "search", "label": "arrive"},
            {"id": "e3", "source": "search", "target": "rescue", "label": "locate"},
            {"id": "e4", "source": "rescue", "target": "transport", "label": "handoff"},
        ],
    }

    report = validate_sar_unified_payload(
        text="Flood rescue mission lifecycle.",
        bdd_diagram=_valid_min_bdd(),
        smd_data=[smd],
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    transition_issue = next((issue for issue in report.issues if issue.code == "FORBIDDEN_TRANSITION"), None)
    assert transition_issue is not None
    assert transition_issue.location == "smd:mission.edges.e4"
    assert report.scores_1to5["correctness"] <= 3


def test_deterministic_validator_invalid_structure_affects_standards():
    bdd = _valid_min_bdd()
    bdd["elements"][0].pop("id")

    report = validate_sar_unified_payload(
        text="Flood rescue mission.",
        bdd_diagram=bdd,
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    assert report.scores_1to5["standards"] == 3


def test_deterministic_validator_generic_naming_affects_understandability():
    bdd = _valid_min_bdd()
    bdd["elements"].append({"id": "g1", "type": "block", "name": "Module1"})

    report = validate_sar_unified_payload(
        text="Flood rescue mission.",
        bdd_diagram=bdd,
        constraints=load_sar_constraints(),
    )

    assert report.scores_1to5["understandability"] == 4
    generic_issue = next((issue for issue in report.issues if issue.code == "GENERIC_NAMING"), None)
    assert generic_issue is not None
    assert generic_issue.location == "bdd.elements.g1"
