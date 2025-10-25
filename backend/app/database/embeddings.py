from typing import List, Dict, Any, Optional
import json
from datetime import datetime

import numpy as np
from openai import OpenAI
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import models
from app.database.models import (
    DiagramEmbedding,
    SysMLTemplate,
    UAVComponent,
    InternalBlockDiagram,
)

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)


async def generate_embedding(text: str) -> List[float]:
    """Generate OpenAI embedding vector for text."""
    response = client.embeddings.create(
        model="text-embedding-ada-002",
        input=text
    )
    return response.data[0].embedding


async def find_similar_ibds(
    db: AsyncSession,
    block_name: str,
    block_type: str = None,
    limit: int = 3
) -> List[InternalBlockDiagram]:
    """
    Keyword-based retrieval of IBD diagrams for one-shot examples using the
    persisted block catalog. Prefers exact matches and falls back to LIKE searches.
    """
    block_name = (block_name or "").strip()
    if not block_name:
        return []

    base_stmt = (
        select(models.InternalBlockDiagram)
        .outerjoin(models.BDDBlock, models.BDDBlock.id == models.InternalBlockDiagram.parent_block_ref_id)
    )

    exact_stmt = base_stmt.where(
        or_(
            func.lower(models.InternalBlockDiagram.parent_block_id) == func.lower(block_name),
            func.lower(models.BDDBlock.block_name) == func.lower(block_name)
        )
    )
    if block_type:
        exact_stmt = exact_stmt.where(func.lower(models.BDDBlock.block_type) == func.lower(block_type))

    exact_stmt = exact_stmt.order_by(models.InternalBlockDiagram.created_at.desc()).limit(limit)
    result = await db.execute(exact_stmt)
    matches = result.scalars().all()
    if matches:
        return matches

    like_pattern = f"%{block_name}%"
    fallback_stmt = base_stmt.where(
        or_(
            models.InternalBlockDiagram.parent_block_id.ilike(like_pattern),
            models.BDDBlock.block_name.ilike(like_pattern)
        )
    )
    if block_type:
        fallback_stmt = fallback_stmt.where(models.BDDBlock.block_type.ilike(f"%{block_type}%"))

    fallback_stmt = fallback_stmt.order_by(models.InternalBlockDiagram.created_at.desc()).limit(limit)
    result = await db.execute(fallback_stmt)
    return result.scalars().all()


async def find_diagram_by_raw_text(db: AsyncSession, raw_text: str) -> Optional[DiagramEmbedding]:
    """Find a diagram by its raw_text field."""
    stmt = select(DiagramEmbedding).filter(DiagramEmbedding.raw_text == raw_text)
    result = await db.execute(stmt)
    return result.scalars().first()


async def optimize_diagram_json(diagram_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize diagram JSON so we store consistent structure for RAG reuse.
    Removes positioning and converts nodes/edges to elements/relationships.
    """
    optimized_json = {
        "diagram_type": "block",
        "elements": [],
        "relationships": []
    }

    for node in diagram_json.get("nodes", []):
        element = {
            "id": node.get("id"),
            "type": node.get("type"),
            "name": node.get("data", {}).get("label", ""),
            "description": node.get("data", {}).get("description", "")
        }
        properties = node.get("data", {}).get("properties") or {}
        element["properties"] = {k: v for k, v in properties.items() if k not in {"id"}}
        optimized_json["elements"].append(element)

    for edge in diagram_json.get("edges", []):
        relationship = {
            "source_id": edge.get("source"),
            "target_id": edge.get("target"),
            "type": edge.get("type")
        }
        label = edge.get("data", {}).get("name") or edge.get("label")
        if label:
            relationship["name"] = label
        optimized_json["relationships"].append(relationship)

    return optimized_json


async def store_diagram_with_embedding(
    db: AsyncSession,
    name: str,
    description: str,
    raw_text: str,
    diagram_type: str,
    diagram_json: Dict[str, Any]
) -> DiagramEmbedding:
    """
    Store a diagram with its embedding vector. Updates existing record if raw_text matches.
    """
    print("\n==== STORING DIAGRAM ====")
    print(f"Diagram name: {name}")
    print(f"Diagram type: {diagram_type}")

    existing = await find_diagram_by_raw_text(db, raw_text)
    optimized = await optimize_diagram_json(diagram_json)
    embedding_vector = await generate_embedding(raw_text)

    try:
        if existing:
            existing.name = name
            existing.description = description
            existing.diagram_type = diagram_type
            existing.diagram_json = optimized
            existing.embedding = embedding_vector
            existing.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            return existing

        db_embedding = DiagramEmbedding(
            name=name,
            description=description,
            raw_text=raw_text,
            diagram_type=diagram_type,
            diagram_json=optimized,
            embedding=embedding_vector
        )
        db.add(db_embedding)
        await db.commit()
        await db.refresh(db_embedding)
        return db_embedding
    except Exception:
        await db.rollback()
        raise


async def find_similar_diagrams(
    db: AsyncSession,
    query_text: str,
    limit: int = 5,
    diagram_type: str = None,
    include_scores: bool = False
) -> List[DiagramEmbedding]:
    """Vector similarity search across diagram_embeddings (used for BDD RAG)."""
    check_stmt = select(func.count(DiagramEmbedding.id))
    total = (await db.execute(check_stmt)).scalar()
    if total == 0:
        return []

    query_embedding = await generate_embedding(query_text)
    query_vector = np.array(query_embedding)

    if include_scores:
        stmt = select(
            DiagramEmbedding,
            DiagramEmbedding.embedding.cosine_distance(query_vector).label("similarity_score")
        )
    else:
        stmt = select(DiagramEmbedding)

    if diagram_type:
        stmt = stmt.filter(DiagramEmbedding.diagram_type == diagram_type)

    stmt = stmt.order_by(DiagramEmbedding.embedding.cosine_distance(query_vector)).limit(limit)
    result = await db.execute(stmt)

    if include_scores:
        diagrams = []
        for diagram, score in result.all():
            setattr(diagram, "similarity_score", score)
            diagrams.append(diagram)
        return diagrams

    return result.scalars().all()


async def get_template_by_type(db: AsyncSession, template_type: str) -> List[SysMLTemplate]:
    stmt = select(SysMLTemplate).filter(SysMLTemplate.template_type == template_type)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_components_by_type(db: AsyncSession, component_type: str) -> List[UAVComponent]:
    stmt = select(UAVComponent).filter(UAVComponent.component_type == component_type)
    result = await db.execute(stmt)
    return result.scalars().all()
