import unittest

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


class TestDeterministicSarValidation(unittest.TestCase):
    def test_synonym_warning(self):
        report = validate_sar_unified_payload(
            text="Manager coordinates the incident response.",
            bdd_diagram=_valid_min_bdd(),
            constraints=load_sar_constraints(),
        )
        self.assertEqual(report.counts["critical"], 0)
        self.assertEqual(report.recommendation, "refine")
        self.assertTrue(any(issue.code == "TERMINOLOGY_SYNONYM_USED" for issue in report.issues))

    def test_missing_required_bdd_block_fail_fast(self):
        bdd = _valid_min_bdd()
        bdd["elements"] = [el for el in bdd["elements"] if el["name"] != "CommunicationsSubsystem"]
        report = validate_sar_unified_payload(
            text="Flood rescue mission.",
            bdd_diagram=bdd,
            constraints=load_sar_constraints(),
        )
        self.assertEqual(report.recommendation, "fail_fast")
        self.assertTrue(any(issue.code == "MISSING_REQUIRED_BDD_BLOCK" for issue in report.issues))

    def test_ibd_stage_does_not_repeat_bdd_required_block_check(self):
        bdd = _valid_min_bdd()
        bdd["elements"] = [el for el in bdd["elements"] if el["name"] != "CommunicationsSubsystem"]
        report = validate_sar_unified_payload(
            text="Flood rescue mission.",
            bdd_diagram=bdd,
            ibd_data=[{"parent_block_id": "x", "nodes": [{"id": "n1", "name": "Radio"}], "edges": []}],
            stage="IBD",
            constraints=load_sar_constraints(),
        )
        self.assertNotEqual(report.recommendation, "fail_fast")
        self.assertFalse(any(issue.code == "MISSING_REQUIRED_BDD_BLOCK" for issue in report.issues))


if __name__ == "__main__":
    unittest.main()
