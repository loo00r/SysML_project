import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.database.models import (
    DiagramEmbedding,
    StateMachineDiagramCreate,
)
from app.crud import crud_smd


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def async_session():
    engine = create_async_engine(TEST_DATABASE_URL, future=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_factory = sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    async with async_session_factory() as session:
        yield session

    await engine.dispose()


async def _create_parent_bdd(session: AsyncSession) -> DiagramEmbedding:
    diagram = DiagramEmbedding(
        name="Test BDD",
        description="BDD for SMD tests",
        raw_text="Test raw text",
        diagram_type="bdd",
        diagram_json={"elements": [], "relationships": []},
        embedding=None
    )
    session.add(diagram)
    await session.commit()
    await session.refresh(diagram)
    return diagram


@pytest.mark.asyncio
async def test_create_and_get_smd(async_session: AsyncSession):
    parent_diagram = await _create_parent_bdd(async_session)

    smd_payload = StateMachineDiagramCreate(
        parent_bdd_diagram_id=parent_diagram.id,
        parent_block_id="block-1",
        parent_block_name="Battery Controller",
        states=[{"id": "idle", "label": "Idle"}],
        transitions=[{"source": "idle", "target": "charging", "label": "Start Charging"}],
    )

    created = await crud_smd.create_smd(async_session, smd_payload)
    assert created.id is not None
    assert created.parent_block_name == "Battery Controller"

    fetched = await crud_smd.get_smd_by_parent_and_block(
        async_session,
        parent_diagram.id,
        "block-1"
    )
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.states[0]["id"] == "idle"


@pytest.mark.asyncio
async def test_update_and_list_smds(async_session: AsyncSession):
    parent_diagram = await _create_parent_bdd(async_session)

    smd_payload = StateMachineDiagramCreate(
        parent_bdd_diagram_id=parent_diagram.id,
        parent_block_id="block-2",
        parent_block_name="Motor Controller",
        states=[{"id": "idle", "label": "Idle"}],
        transitions=[{"source": "idle", "target": "spin", "label": "Spin Up"}],
    )

    created = await crud_smd.create_smd(async_session, smd_payload)

    updated = await crud_smd.update_smd(
        async_session,
        created,
        states=[{"id": "spin", "label": "Spin"}],
        transitions=[{"source": "spin", "target": "idle", "label": "Stop"}],
        parent_block_name="Motor Controller Updated",
        source="manual"
    )

    assert updated.parent_block_name == "Motor Controller Updated"
    assert updated.source == "manual"
    assert updated.states[0]["id"] == "spin"

    smds = await crud_smd.get_smds_by_parent_bdd(async_session, parent_diagram.id)
    assert len(smds) == 1
    assert smds[0].id == updated.id
