from typing import List, Dict, Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    StateMachineDiagram,
    StateMachineDiagramCreate,
)


async def get_smd_by_parent_and_block(
    db: AsyncSession,
    parent_bdd_id: int,
    block_id: str
) -> Optional[StateMachineDiagram]:
    """
    Retrieve a state machine diagram for the given parent diagram and block.
    """
    stmt = select(StateMachineDiagram).filter_by(
        parent_bdd_diagram_id=parent_bdd_id,
        parent_block_id=block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_smds_by_parent_bdd(
    db: AsyncSession,
    parent_bdd_id: int
) -> List[StateMachineDiagram]:
    """
    Retrieve all state machine diagrams associated with a parent BDD diagram.
    """
    stmt = select(StateMachineDiagram).filter_by(parent_bdd_diagram_id=parent_bdd_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_smd(
    db: AsyncSession,
    smd: StateMachineDiagramCreate
) -> StateMachineDiagram:
    """
    Create a new state machine diagram record.
    """
    try:
        db_smd = StateMachineDiagram(**smd.model_dump())
        db.add(db_smd)
        await db.commit()
        await db.refresh(db_smd)
        return db_smd
    except Exception:
        await db.rollback()
        raise


async def update_smd(
    db: AsyncSession,
    db_smd: StateMachineDiagram,
    states: List[Dict[str, Any]],
    transitions: List[Dict[str, Any]],
    parent_block_name: Optional[str] = None,
    source: Optional[str] = None
) -> StateMachineDiagram:
    """
    Update an existing state machine diagram's core data.
    """
    try:
        db_smd.states = states
        db_smd.transitions = transitions
        if parent_block_name is not None:
            db_smd.parent_block_name = parent_block_name
        if source is not None:
            db_smd.source = source

        await db.commit()
        await db.refresh(db_smd)
        return db_smd
    except Exception:
        await db.rollback()
        raise
