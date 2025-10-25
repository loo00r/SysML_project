from app.database.rag_router import identify_diagram_candidates


def test_identify_diagram_candidates_filters_supported_types():
    elements = [
        {"id": "1", "type": "block", "name": "Flight Controller"},
        {"id": "2", "type": "processor", "name": "CPU"},
        {"id": "3", "type": "sensor", "name": "GPS"},
        {"id": "4", "type": "actuator", "name": "Servo"},
    ]

    ibd_candidates, smd_candidates = identify_diagram_candidates(elements)

    expected_ids = {"1", "2"}
    assert {item["id"] for item in ibd_candidates} == expected_ids
    assert {item["id"] for item in smd_candidates} == expected_ids

    # ensure sensor excluded
    assert all(item["type"] != "sensor" for item in ibd_candidates)
    assert all(item["type"] != "sensor" for item in smd_candidates)
