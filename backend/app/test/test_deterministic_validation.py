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
    assert any(issue.code == "MISSING_MISSION_PHASE" for issue in report.issues)


def test_deterministic_validator_mixed_ics_and_gsb_roles_fails_fast():
    report = validate_sar_unified_payload(
        text="Incident Commander coordinates with Gold Commander.",
        bdd_diagram=_valid_min_bdd(),
        constraints=load_sar_constraints(),
    )

    assert report.recommendation == "fail_fast"
    assert any(issue.code == "MODE_MIXED_ICS_GSB" for issue in report.issues)

