import pytest


class FakeRedisClient:
    def __init__(self):
        self.data = {}

    def store_diagram(self, diagram_data: dict, diagram_id: str | None = None) -> str:
        assert diagram_id is not None
        self.data[diagram_id] = diagram_data
        return diagram_id

    def get_diagram(self, diagram_id: str):
        return self.data.get(diagram_id)


class _DummyAsyncSessionCtx:
    async def __aenter__(self):
        return None

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _dummy_async_session_local():
    return _DummyAsyncSessionCtx()


@pytest.mark.asyncio
async def test_unified_background_fail_fast_on_ibd_validation(monkeypatch):
    from app.database import rag_router
    import app.db.session as db_session

    fake_redis = FakeRedisClient()
    monkeypatch.setattr(rag_router, "redis_client", fake_redis)
    monkeypatch.setattr(db_session, "AsyncSessionLocal", _dummy_async_session_local)
    monkeypatch.setattr(rag_router, "detect_domain_and_mode", lambda *_args, **_kw: None)
    monkeypatch.setattr(rag_router, "find_similar_diagrams", lambda *_args, **_kw: [])

    def fake_generate_sysml_diagram(*, prompt, diagram_type, **_kw):
        assert diagram_type == "bdd"
        return {
            "diagram_raw": {
                "diagram_type": "bdd",
                "elements": [
                    {
                        "id": "block-1",
                        "type": "block",
                        "name": "CommandAndControl CommunicationsSubsystem SearchAssets RescueAssets MedicalTriage",
                    }
                ],
                "relationships": [],
            },
            "model_used": "fake",
        }

    async def fake_generate_ibd_for_block_async(**_kw):
        return {
            "parent_block_id": "block-1",
            "nodes": [{"id": "n1", "type": "ibd_block", "name": "CellularOnly"}],
            "edges": [],
        }

    monkeypatch.setattr(rag_router, "generate_sysml_diagram", fake_generate_sysml_diagram)
    monkeypatch.setattr(rag_router, "generate_ibd_for_block_async", fake_generate_ibd_for_block_async)

    diagram_id = "job-1"
    await rag_router._generate_diagram_in_background(
        diagram_id=diagram_id,
        text="SAR scenario with Incident Commander present",
        use_rag=False,
        generate_ibd=True,
        generate_smd=False,
        name="Test",
        domain="sar",
        command_mode="ICS",
    )

    payload = fake_redis.get_diagram(diagram_id)
    assert payload is not None
    assert payload["status"] == "completed"
    assert payload["stage"] == "FAILED_FAST"
    assert payload.get("progress_detail", {}).get("stage") == "FAILED_FAST"
    assert isinstance(payload.get("subdiagram_validation"), dict)
    assert "ibd:block-1" in payload["subdiagram_validation"]


@pytest.mark.asyncio
async def test_unified_background_fail_fast_on_bdd_validation(monkeypatch):
    from app.database import rag_router
    import app.db.session as db_session

    fake_redis = FakeRedisClient()
    monkeypatch.setattr(rag_router, "redis_client", fake_redis)
    monkeypatch.setattr(db_session, "AsyncSessionLocal", _dummy_async_session_local)
    monkeypatch.setattr(rag_router, "detect_domain_and_mode", lambda *_args, **_kw: None)
    monkeypatch.setattr(rag_router, "find_similar_diagrams", lambda *_args, **_kw: [])

    def fake_generate_sysml_diagram(*, prompt, diagram_type, **_kw):
        assert diagram_type == "bdd"
        return {
            "diagram_raw": {
                "diagram_type": "bdd",
                "elements": [{"id": "block-1", "type": "block", "name": "OnlyOneBlock"}],
                "relationships": [],
            },
            "model_used": "fake",
        }

    monkeypatch.setattr(rag_router, "generate_sysml_diagram", fake_generate_sysml_diagram)

    diagram_id = "job-2"
    await rag_router._generate_diagram_in_background(
        diagram_id=diagram_id,
        text="SAR scenario text",
        use_rag=False,
        generate_ibd=True,
        generate_smd=True,
        name="Test",
        domain="sar",
        command_mode="ICS",
    )

    payload = fake_redis.get_diagram(diagram_id)
    assert payload is not None
    assert payload["status"] == "completed"
    assert payload["stage"] == "FAILED_FAST"
    assert payload.get("ibd_data") == []
    assert payload.get("smd_data") == []


@pytest.mark.asyncio
async def test_unified_background_refines_bdd_once_when_issue_fixed(monkeypatch):
    from app.database import rag_router
    import app.db.session as db_session

    fake_redis = FakeRedisClient()
    monkeypatch.setattr(rag_router, "redis_client", fake_redis)
    monkeypatch.setattr(db_session, "AsyncSessionLocal", _dummy_async_session_local)
    monkeypatch.setattr(rag_router, "detect_domain_and_mode", lambda *_args, **_kw: None)
    monkeypatch.setattr(rag_router, "find_similar_diagrams", lambda *_args, **_kw: [])
    monkeypatch.setattr(rag_router.settings, "VALIDATION_ENABLE_LLM", False)

    call_count = {"n": 0}

    def fake_generate_sysml_diagram(*, prompt, diagram_type, **_kw):
        assert diagram_type == "bdd"
        call_count["n"] += 1
        if call_count["n"] == 1:
            # First pass: triggers a warning via terminology synonym presence in diagram data.
            return {
                "diagram_raw": {
                    "diagram_type": "bdd",
                    "elements": [
                        {
                            "id": "block-1",
                            "type": "block",
                            "name": "CommandAndControl CommunicationsSubsystem SearchAssets RescueAssets MedicalTriage",
                            "description": "Manager",
                        }
                    ],
                    "relationships": [],
                },
                "model_used": "fake",
            }

        # Second pass: fixed.
        return {
            "diagram_raw": {
                "diagram_type": "bdd",
                "elements": [
                    {
                        "id": "block-1",
                        "type": "block",
                        "name": "CommandAndControl CommunicationsSubsystem SearchAssets RescueAssets MedicalTriage",
                        "description": "Incident Commander",
                    }
                ],
                "relationships": [],
            },
            "model_used": "fake",
        }

    monkeypatch.setattr(rag_router, "generate_sysml_diagram", fake_generate_sysml_diagram)

    diagram_id = "job-3"
    await rag_router._generate_diagram_in_background(
        diagram_id=diagram_id,
        text="SAR scenario text",
        use_rag=False,
        generate_ibd=False,
        generate_smd=False,
        name="Test",
        domain="sar",
        command_mode="ICS",
    )

    payload = fake_redis.get_diagram(diagram_id)
    assert payload is not None
    assert payload["status"] == "completed"
    assert payload["stage"] == "COMPLETED"
    assert payload.get("bdd_version") == 2
    assert call_count["n"] == 2


@pytest.mark.asyncio
async def test_unified_background_fail_fast_on_smd_validation(monkeypatch):
    from app.database import rag_router
    import app.db.session as db_session

    fake_redis = FakeRedisClient()
    monkeypatch.setattr(rag_router, "redis_client", fake_redis)
    monkeypatch.setattr(db_session, "AsyncSessionLocal", _dummy_async_session_local)
    monkeypatch.setattr(rag_router, "detect_domain_and_mode", lambda *_args, **_kw: None)
    monkeypatch.setattr(rag_router, "find_similar_diagrams", lambda *_args, **_kw: [])

    def fake_generate_sysml_diagram(*, prompt, diagram_type, **_kw):
        assert diagram_type == "bdd"
        return {
            "diagram_raw": {
                "diagram_type": "bdd",
                "elements": [
                    {
                        "id": "block-1",
                        "type": "block",
                        "name": "CommandAndControl CommunicationsSubsystem SearchAssets RescueAssets MedicalTriage",
                    }
                ],
                "relationships": [],
            },
            "model_used": "fake",
        }

    async def fake_generate_smd_for_block_async(**_kw):
        # Missing required mission phases (e.g., no "Triage") -> fail_fast.
        return {
            "parent_block_id": "block-1",
            "parent_block_name": "Subsystem",
            "nodes": [{"id": "s1", "type": "state", "name": "Alert"}],
            "edges": [],
        }

    monkeypatch.setattr(rag_router, "generate_sysml_diagram", fake_generate_sysml_diagram)
    monkeypatch.setattr(rag_router, "generate_smd_for_block_async", fake_generate_smd_for_block_async)

    diagram_id = "job-4"
    await rag_router._generate_diagram_in_background(
        diagram_id=diagram_id,
        text="SAR scenario text",
        use_rag=False,
        generate_ibd=False,
        generate_smd=True,
        name="Test",
        domain="sar",
        command_mode="ICS",
    )

    payload = fake_redis.get_diagram(diagram_id)
    assert payload is not None
    assert payload["status"] == "completed"
    assert payload["stage"] == "FAILED_FAST"
    assert isinstance(payload.get("subdiagram_validation"), dict)
    assert "smd:block-1" in payload["subdiagram_validation"]


@pytest.mark.asyncio
async def test_generate_diagram_unified_stores_initial_payload_even_when_domain_set(monkeypatch):
    from app.database import rag_router

    class DummyBackgroundTasks:
        def __init__(self):
            self.added = []

        def add_task(self, fn, **kwargs):
            self.added.append((fn, kwargs))

    captured = {}

    def fake_generate_diagram_id():
        return "job-started"

    def fake_store_merged(diagram_id: str, payload: dict):
        captured["diagram_id"] = diagram_id
        captured["payload"] = payload

    monkeypatch.setattr(rag_router.redis_client, "generate_diagram_id", fake_generate_diagram_id)
    monkeypatch.setattr(rag_router, "_store_diagram_merged", fake_store_merged)

    bg = DummyBackgroundTasks()
    result = await rag_router.generate_diagram_unified(
        background_tasks=bg,
        text="SAR scenario",
        use_rag=False,
        generate_ibd=False,
        generate_smd=False,
        domain="sar",
        command_mode="ICS",
        name="Test",
    )

    assert result["diagramId"] == "job-started"
    assert captured["diagram_id"] == "job-started"
    assert captured["payload"]["stage"] == "STARTED"
    assert bg.added, "Background task should be scheduled"
