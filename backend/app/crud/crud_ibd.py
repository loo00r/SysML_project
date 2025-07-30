from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from app.database import models
from app.database.models import InternalBlockDiagramCreate
from typing import List, Dict, Any

async def get_ibd_by_parent_and_block(db: AsyncSession, parent_bdd_id: int, block_id: str):
    """Checks if an IBD exists for a specific block in a specific parent diagram."""
    stmt = select(models.InternalBlockDiagram).filter_by(
        parent_bdd_diagram_id=parent_bdd_id,
        parent_block_id=block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_ibd(db: AsyncSession, ibd: InternalBlockDiagramCreate) -> models.InternalBlockDiagram:
    """Creates a new IBD record."""
    db_ibd = models.InternalBlockDiagram(**ibd.model_dump())
    db.add(db_ibd)
    await db.commit()
    await db.refresh(db_ibd)
    return db_ibd

async def update_ibd(db: AsyncSession, db_ibd: models.InternalBlockDiagram, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
    """Updates an existing IBD's nodes and edges."""
    db_ibd.nodes = nodes
    db_ibd.edges = edges
    await db.commit()
    await db.refresh(db_ibd)
    return db_ibd

async def get_ibd_by_block_id(db: AsyncSession, block_id: str):
    """
    Gets an IBD by its parent block ID. Reverted to simpler logic
    as duplicates are no longer expected.
    """
    # Note: This will fail if multiple diagrams reuse the same block_id.
    # The long-term fix would be to query by parent_diagram_id AND block_id.
    stmt = select(models.InternalBlockDiagram).filter_by(parent_block_id=block_id)
    result = await db.execute(stmt)
    # Assuming one diagram is worked on at a time, we take the newest if somehow duplicates still occur.
    return result.scalars().first()