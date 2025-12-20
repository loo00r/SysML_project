import unittest

from app.core.payload_merge import merge_payload


class TestPayloadMerge(unittest.TestCase):
    def test_events_accumulate_and_dedupe(self):
        existing = {"events": [{"ts": 1, "type": "A", "msg": "x"}]}
        payload = {"events": [{"ts": 2, "type": "B", "msg": "y"}, {"ts": 1, "type": "A", "msg": "x"}]}
        merged = merge_payload(existing, payload)
        self.assertIn("events", merged)
        self.assertEqual(len(merged["events"]), 2)

    def test_validation_report_is_always_object(self):
        merged = merge_payload({}, {"validation_report": None})
        self.assertEqual(merged["validation_report"], {})

        merged = merge_payload({}, {"validation_report": "oops"})
        self.assertEqual(merged["validation_report"], {})

    def test_subdiagram_validation_deep_merge(self):
        existing = {"subdiagram_validation": {"ibd:a": {"quality_score": 50}}}
        payload = {"subdiagram_validation": {"smd:b": {"quality_score": 80}}}
        merged = merge_payload(existing, payload)
        self.assertEqual(set(merged["subdiagram_validation"].keys()), {"ibd:a", "smd:b"})

    def test_llm_subdiagram_validation_deep_merge(self):
        existing = {"llm_subdiagram_validation": {"ibd:a": {"quality_score_0to100": 70}}}
        payload = {"llm_subdiagram_validation": {"smd:b": {"quality_score_0to100": 60}}}
        merged = merge_payload(existing, payload)
        self.assertEqual(set(merged["llm_subdiagram_validation"].keys()), {"ibd:a", "smd:b"})


if __name__ == "__main__":
    unittest.main()
