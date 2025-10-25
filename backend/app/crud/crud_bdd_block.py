from typing import Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import models
from app.database.models import BDDBlockCreate


async def get_block_by_parent_and_id(
    db: AsyncSession,
    parent_bdd_diagram_id: int,
    block_id: str
):
    stmt = select(models.BDDBlock).filter_by(
        parent_bdd_diagram_id=parent_bdd_diagram_id,
        block_id=block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_blocks_for_parent(
    db: AsyncSession,
    parent_bdd_diagram_id: int
):
    stmt = select(models.BDDBlock).filter_by(parent_bdd_diagram_id=parent_bdd_diagram_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def sync_bdd_blocks(
    db: AsyncSession,
    parent_bdd_diagram_id: int,
    elements: List[Dict]
) -> Dict[str, models.BDDBlock]:
    """Upsert blocks from a BDD diagram and return mapping by block_id."""
    existing_blocks = await get_blocks_for_parent(db, parent_bdd_diagram_id)
    existing_map = {block.block_id: block for block in existing_blocks}
    seen: Dict[str, models.BDDBlock] = {}

    for element in elements or []:
        block_id = element.get('id')
        if not block_id:
            continue
        block_name = element.get('name') or block_id
        block_description = element.get('description')


        if block_id in existing_map:
            block = existing_map[block_id]
            block.block_name = block_name
            block.block_description = block_description
        else:
            block_data = BDDBlockCreate(
                parent_bdd_diagram_id=parent_bdd_diagram_id,
                block_id=block_id,
                block_name=block_name,
                block_description=block_description
            )
            block = models.BDDBlock(**block_data.model_dump())
            db.add(block)
        seen[block_id] = block

    await db.commit()

    for block in seen.values():
        await db.refresh(block)

    return seen
