import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.database import models
from app.database.embeddings import find_similar_smds


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


async def _create_parent_bdd(session: AsyncSession) -> models.DiagramEmbedding:
    diagram = models.DiagramEmbedding(
        name="Test BDD",
        description="BDD for lookup tests",
        raw_text="Test raw text",
        diagram_type="bdd",
        diagram_json={"elements": [], "relationships": []},
        embedding=None,
    )
    session.add(diagram)
    await session.commit()
    await session.refresh(diagram)
    return diagram


async def _create_block(
    session: AsyncSession,
    parent_bdd_id: int,
    block_id: str,
    block_name: str,
    block_type: str | None = None,
) -> models.BDDBlock:
    block = models.BDDBlock(
        parent_bdd_diagram_id=parent_bdd_id,
        block_id=block_id,
        block_name=block_name,
        block_type=block_type,
        block_description=None,
    )
    session.add(block)
    await session.commit()
    await session.refresh(block)
    return block


async def _create_smd(
    session: AsyncSession,
    parent_bdd_id: int,
    block_id: str,
    block_name: str,
    block_ref_id: int | None = None,
) -> models.StateMachineDiagram:
    smd = models.StateMachineDiagram(
        parent_bdd_diagram_id=parent_bdd_id,
        parent_block_id=block_id,
        parent_block_name=block_name,
        parent_block_ref_id=block_ref_id,
        states=[{"id": "idle", "label": "Idle"}],
        transitions=[{"source": "idle", "target": "active", "label": "Activate"}],
        source="ai",
    )
    session.add(smd)
    await session.commit()
    await session.refresh(smd)
    return smd


@pytest.mark.asyncio
async def test_find_similar_smds_exact_match(async_session: AsyncSession):
    parent_diagram = await _create_parent_bdd(async_session)
    block = await _create_block(
        async_session,
        parent_diagram.id,
        block_id="block-1",
        block_name="Power Controller",
        block_type="controller",
    )
    smd = await _create_smd(
        async_session,
        parent_diagram.id,
        block_id="block-1",
        block_name="Power Controller",
        block_ref_id=block.id,
    )

    results = await find_similar_smds(
        async_session,
        block_name="Power Controller",
        block_type="controller",
        limit=2,
    )

    assert len(results) == 1
    assert results[0].id == smd.id


@pytest.mark.asyncio
async def test_find_similar_smds_fallback_search(async_session: AsyncSession):
    parent_diagram = await _create_parent_bdd(async_session)
    block = await _create_block(
        async_session,
        parent_diagram.id,
        block_id="block-2",
        block_name="Battery Management Unit",
        block_type="power",
    )
    await _create_smd(
        async_session,
        parent_diagram.id,
        block_id="block-2",
        block_name="Battery Management Unit",
        block_ref_id=block.id,
    )

    results = await find_similar_smds(
        async_session,
        block_name="Battery",
        block_type="power",
        limit=3,
    )

    assert len(results) == 1
    assert results[0].parent_block_name == "Battery Management Unit"
