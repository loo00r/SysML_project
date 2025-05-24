from typing import List, Dict, Any, Optional
import json
from datetime import datetime
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

async def find_diagram_by_raw_text(db: AsyncSession, raw_text: str) -> Optional[DiagramEmbedding]:
    """
    Find a diagram by its raw_text field
    """
    stmt = select(DiagramEmbedding).filter(DiagramEmbedding.raw_text == raw_text)
    result = await db.execute(stmt)
    return result.scalars().first()

async def optimize_diagram_json(diagram_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Optimize the diagram JSON structure to remove unnecessary data and reduce size
    """
    optimized_json = {
        "nodes": [],
        "edges": []
    }
    
    # Process nodes - keep only essential data
    if "nodes" in diagram_json:
        for node in diagram_json["nodes"]:
            optimized_node = {
                "id": node["id"],
                "type": node["type"],
                "position": node["position"],
                "data": {
                    "label": node["data"].get("label", ""),
                    "type": node["data"].get("type", node["type"]),
                }
            }
            
            # Keep important properties but skip redundant ones
            if "properties" in node["data"]:
                optimized_node["data"]["properties"] = {}
                for key, value in node["data"]["properties"].items():
                    if key not in ["id"] or key == "name":  # Skip redundant properties
                        optimized_node["data"]["properties"][key] = value
            
            # Keep description if available
            if "description" in node["data"]:
                optimized_node["data"]["description"] = node["data"]["description"]
                
            optimized_json["nodes"].append(optimized_node)
    
    # Process edges - keep only essential data
    if "edges" in diagram_json:
        for edge in diagram_json["edges"]:
            optimized_edge = {
                "id": edge["id"],
                "source": edge["source"],
                "target": edge["target"],
                "type": edge["type"]
            }
            
            # Keep data if available
            if "data" in edge and edge["data"]:
                optimized_edge["data"] = {}
                if "type" in edge["data"]:
                    optimized_edge["data"]["type"] = edge["data"]["type"]
                if "name" in edge["data"]:
                    optimized_edge["data"]["name"] = edge["data"]["name"]
            
            # Keep animated property if true
            if edge.get("animated", False):
                optimized_edge["animated"] = True
                
            optimized_json["edges"].append(optimized_edge)
    
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
    Store a diagram with its embedding vector in the database
    If a diagram with the same raw_text exists, update it instead of creating a new one
    """
    # First, check if a diagram with the same raw_text already exists
    existing_diagram = await find_diagram_by_raw_text(db, raw_text)
    
    # Optimize the diagram JSON structure
    optimized_json = await optimize_diagram_json(diagram_json)
    
    # Generate embedding for the raw text
    embedding_vector = await generate_embedding(raw_text)
    
    if existing_diagram:
        # Update the existing diagram
        existing_diagram.name = name
        existing_diagram.description = description
        existing_diagram.diagram_type = diagram_type
        existing_diagram.diagram_json = optimized_json
        existing_diagram.embedding = embedding_vector
        existing_diagram.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(existing_diagram)
        return existing_diagram
    else:
        # Create a new diagram embedding record
        db_embedding = DiagramEmbedding(
            name=name,
            description=description,
            raw_text=raw_text,
            diagram_type=diagram_type,
            diagram_json=optimized_json,
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
    diagram_type: str = None,
    include_scores: bool = False
) -> List[DiagramEmbedding]:
    """
    Find similar diagrams in the database using vector similarity search
    
    Args:
        db: Database session
        query_text: The text to find similar diagrams for
        limit: Maximum number of results to return
        diagram_type: Optional filter by diagram type
        include_scores: Whether to include similarity scores in the output
        
    Returns:
        List of similar diagrams, ordered by similarity
    """
    print(f"\n==== Vector Search Details ====")
    print(f"Searching for diagrams similar to: {query_text[:100]}...")
    
    # Generate embedding for the query text
    query_embedding = await generate_embedding(query_text)
    print(f"Generated embedding vector with {len(query_embedding)} dimensions")
    
    # Convert to numpy array for cosine similarity
    query_vector = np.array(query_embedding)
    
    # Start building the SQL query
    if include_scores:
        # Include the cosine distance in the results
        stmt = select(
            DiagramEmbedding,
            DiagramEmbedding.embedding.cosine_distance(query_vector).label("similarity_score")
        )
    else:
        stmt = select(DiagramEmbedding)
    
    # Add diagram type filter if provided
    if diagram_type:
        stmt = stmt.filter(DiagramEmbedding.diagram_type == diagram_type)
        print(f"Filtering by diagram type: {diagram_type}")
    
    # Order by cosine similarity and limit results
    # This uses pgvector's cosine distance operator <-> for similarity search
    stmt = stmt.order_by(
        DiagramEmbedding.embedding.cosine_distance(query_vector)
    ).limit(limit)
    
    result = await db.execute(stmt)
    
    if include_scores:
        # Process results with scores
        results_with_scores = result.all()
        
        # Extract diagrams and scores
        diagrams = []
        for diagram, score in results_with_scores:
            # Add score as an attribute to the diagram object
            setattr(diagram, "similarity_score", score)
            diagrams.append(diagram)
            
            # Log the score
            print(f"Found diagram '{diagram.name}' with similarity score: {score:.4f}")
        
        return diagrams
    else:
        # Return just the diagrams without scores
        results = result.scalars().all()
        print(f"Found {len(results)} similar diagrams")
        return results

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
