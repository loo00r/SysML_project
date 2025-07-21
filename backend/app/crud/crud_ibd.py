from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import models
from app.database.models import InternalBlockDiagramCreate


async def create_ibd(db: AsyncSession, ibd: InternalBlockDiagramCreate) -> models.InternalBlockDiagram:
    """Create a new Internal Block Diagram in the database"""
    db_ibd = models.InternalBlockDiagram(
        parent_bdd_diagram_id=ibd.parent_bdd_diagram_id,
        parent_block_id=ibd.parent_block_id,
        nodes=ibd.nodes,
        edges=ibd.edges,
        source=ibd.source,
    )
    db.add(db_ibd)
    await db.commit()
    await db.refresh(db_ibd)
    return db_ibd


async def get_ibd_by_block_id(db: AsyncSession, block_id: str):
    """
    Get the most recent Internal Block Diagram by its parent block ID.
    This is resilient to duplicate block_ids from repeated testing.
    """
    stmt = (
        select(models.InternalBlockDiagram)
        .filter(models.InternalBlockDiagram.parent_block_id == block_id)
        .order_by(desc(models.InternalBlockDiagram.created_at))
    )
    result = await db.execute(stmt)
    return result.scalars().first()  # .first() safely returns the first result or None


async def get_ibd_by_parent_and_block(db: AsyncSession, parent_bdd_id: int, block_id: str):
    """Get Internal Block Diagram by parent BDD ID and block ID"""
    stmt = select(models.InternalBlockDiagram).filter(
        models.InternalBlockDiagram.parent_bdd_diagram_id == parent_bdd_id,
        models.InternalBlockDiagram.parent_block_id == block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()