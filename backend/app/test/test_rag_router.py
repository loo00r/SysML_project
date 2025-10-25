from types import SimpleNamespace

import pytest

from app.database import rag_router
from app.database.rag_router import identify_diagram_candidates, build_ibd_one_shot_example


class DummyIBD(SimpleNamespace):
    """Lightweight object to mimic InternalBlockDiagram instances in tests."""


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


def test_build_ibd_one_shot_example_filters_invalid_ibds():
    empty_ibd = DummyIBD(nodes=[], edges=[])
    assert build_ibd_one_shot_example("Block", empty_ibd) is None

    valid_ibd = DummyIBD(
        nodes=[{"id": "n1", "type": "part"}],
        edges=[{"source": "n1", "target": "n1", "type": "flow"}],
    )
    example = build_ibd_one_shot_example("Power Unit", valid_ibd)
    assert example == {
        "input": "Power Unit",
        "output": {
            "nodes": valid_ibd.nodes,
            "edges": valid_ibd.edges,
        },
    }


@pytest.mark.asyncio
async def test_generate_ibd_for_block_async_uses_rag_examples(monkeypatch):
    captured_examples = {}

    async def fake_find_similar_ibds(db, block_name, block_type, limit):
        return [
            DummyIBD(
                nodes=[{"id": "n1", "type": "part"}],
                edges=[{"source": "n1", "target": "n1", "type": "flow"}],
            )
        ]

    def fake_generate_ibd_diagram(
        *,
        block_id,
        block_name,
        block_description,
        block_type,
        system_context,
        parent_relationships,
        one_shot_examples,
    ):
        captured_examples["value"] = one_shot_examples
        return {
            "ibd_raw": {
                "nodes": [{"id": "n1", "type": "part"}],
                "edges": [{"source": "n1", "target": "n1", "type": "flow"}],
            }
        }

    monkeypatch.setattr(rag_router, "find_similar_ibds", fake_find_similar_ibds)
    monkeypatch.setattr(rag_router, "generate_ibd_diagram", fake_generate_ibd_diagram)

    block = {"id": "block-1", "name": "Power Unit", "type": "block", "description": ""}
    result = await rag_router.generate_ibd_for_block_async(
        block=block,
        system_context="Test system context",
        relationships=[
            {"source": "block-1", "target": "block-2", "name": "connects to"}
        ],
        db=None,
        use_rag=True,
    )

    assert result is not None
    assert captured_examples["value"] is not None
    assert captured_examples["value"][0]["input"] == "Power Unit"


@pytest.mark.asyncio
async def test_generate_ibd_for_block_async_handles_missing_rag(monkeypatch):
    captured_examples = {}

    async def fake_find_similar_ibds(db, block_name, block_type, limit):
        return []

    def fake_generate_ibd_diagram(
        *,
        block_id,
        block_name,
        block_description,
        block_type,
        system_context,
        parent_relationships,
        one_shot_examples,
    ):
        captured_examples["value"] = one_shot_examples
        return {
            "ibd_raw": {
                "nodes": [{"id": "n1"}],
                "edges": [{"source": "n1", "target": "n1"}],
            }
        }

    monkeypatch.setattr(rag_router, "find_similar_ibds", fake_find_similar_ibds)
    monkeypatch.setattr(rag_router, "generate_ibd_diagram", fake_generate_ibd_diagram)

    block = {"id": "block-1", "name": "Power Unit", "type": "block", "description": ""}
    await rag_router.generate_ibd_for_block_async(
        block=block,
        system_context="Test",
        relationships=[],
        db=None,
        use_rag=True,
    )

    assert captured_examples["value"] is None
