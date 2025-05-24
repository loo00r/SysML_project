from typing import List, Dict, Any
import json
from openai import OpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import numpy as np
from app.core.config import settings
from app.database.models import DiagramEmbedding, SysMLTemplate, UAVComponent

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

async def generate_embedding(text: str) -> List[float]:
    """
    Generate OpenAI embedding vector for text
    """
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

async def store_diagram_with_embedding(
    db: AsyncSession, 
    name: str, 
    description: str, 
    raw_text: str, 
    diagram_type: str, 
    diagram_json: Dict[str, Any]
) -> DiagramEmbedding:
    """
    Store a diagram with its embedding vector in the database
    """
    # Prepare text for embedding
    embedding_text = raw_text
    
    # Generate embedding
    embedding_vector = await generate_embedding(embedding_text)
    
    # Create new diagram embedding record
    db_embedding = DiagramEmbedding(
        name=name,
        description=description,
        raw_text=raw_text,
        diagram_type=diagram_type,
        diagram_json=diagram_json,
        embedding=embedding_vector
    )
    
    # Save to database
    db.add(db_embedding)
    await db.commit()
    await db.refresh(db_embedding)
    
    return db_embedding

async def find_similar_diagrams(
    db: AsyncSession, 
    query_text: str, 
    limit: int = 5, 
    diagram_type: str = None
) -> List[DiagramEmbedding]:
    """
    Find similar diagrams in the database using vector similarity search
    """
    # Generate embedding for the query text
    query_embedding = await generate_embedding(query_text)
    
    # Convert to numpy array for cosine similarity
    query_vector = np.array(query_embedding)
    
    # Start building the SQL query
    stmt = select(DiagramEmbedding)
    
    # Add diagram type filter if provided
    if diagram_type:
        stmt = stmt.filter(DiagramEmbedding.diagram_type == diagram_type)
    
    # Order by cosine similarity and limit results
    # This uses pgvector's cosine distance operator <-> for similarity search
    stmt = stmt.order_by(
        DiagramEmbedding.embedding.cosine_distance(query_vector)
    ).limit(limit)
    
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_template_by_type(db: AsyncSession, template_type: str) -> List[SysMLTemplate]:
    """
    Retrieve all templates for a specific diagram type
    """
    stmt = select(SysMLTemplate).filter(SysMLTemplate.template_type == template_type)
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_components_by_type(db: AsyncSession, component_type: str) -> List[UAVComponent]:
    """
    Retrieve all UAV components of a specific type
    """
    stmt = select(UAVComponent).filter(UAVComponent.component_type == component_type)
    result = await db.execute(stmt)
    return result.scalars().all()
