from typing import List, Dict, Any, Optional
import json
from datetime import datetime

import numpy as np
from openai import OpenAI
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.models import DiagramEmbedding, SysMLTemplate, UAVComponent

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

async def generate_embedding(text: str) -> List[float]:
    """
    Generate OpenAI embedding vector for text
    """
    response = client.embeddings.create(
        model="text-embedding-ada-002",
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
    Optimize the diagram JSON structure to match the exact format from the prompt.
    Position information is removed since we use Dagre for automatic positioning.
    Converts nodes/edges format to elements/relationships format for RAG consistency.
    """
    # Create the output structure exactly matching the prompt format
    optimized_json = {
        "diagram_type": "block",
        "elements": [],
        "relationships": []
    }
    
    # Process nodes -> elements (matching prompt format)
    if "nodes" in diagram_json:
        for node in diagram_json["nodes"]:
            # Create element in the exact format as specified in the prompt
            element = {
                "id": node["id"],
                "type": node["type"],
                "name": node["data"].get("label", ""),
                "description": node["data"].get("description", "")
            }
            
            # Add properties if available
            if "properties" in node["data"]:
                element["properties"] = {}
                for key, value in node["data"]["properties"].items():
                    # Include all meaningful properties
                    if key != "id" or key == "name":
                        element["properties"][key] = value
            else:
                element["properties"] = {}
                
            optimized_json["elements"].append(element)
    
    # Process edges -> relationships (matching prompt format)
    if "edges" in diagram_json:
        for edge in diagram_json["edges"]:
            # Create relationship in the exact format as specified in the prompt
            relationship = {
                "source_id": edge["source"],
                "target_id": edge["target"],
                "type": edge["type"]
            }
            
            # Add label/name if available
            if "data" in edge and edge["data"] and "name" in edge["data"]:
                relationship["name"] = edge["data"]["name"]
            elif "label" in edge and edge["label"]:
                relationship["name"] = edge["label"]
                
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
    Store a diagram with its embedding vector in the database
    If a diagram with the same raw_text exists, update it instead of creating a new one
    """
    print(f"\n==== STORING DIAGRAM ====")
    print(f"Database session: {db}")
    print(f"Diagram name: {name}")
    print(f"Diagram type: {diagram_type}")
    print(f"Description length: {len(description)}")
    print(f"Raw text length: {len(raw_text)}")
    
    # First, check if a diagram with the same raw_text already exists
    existing_diagram = await find_diagram_by_raw_text(db, raw_text)
    print(f"Existing diagram found: {existing_diagram is not None}")
    
    # Optimize the diagram JSON structure
    optimized_json = await optimize_diagram_json(diagram_json)
    print(f"JSON optimized: {len(str(optimized_json))} characters")
    
    # Generate embedding for the raw text
    embedding_vector = await generate_embedding(raw_text)
    print(f"Embedding generated: {len(embedding_vector)} dimensions")
    
    try:
        if existing_diagram:
            print(f"Updating existing diagram (ID: {existing_diagram.id})")
            # Update the existing diagram
            existing_diagram.name = name
            existing_diagram.description = description
            existing_diagram.diagram_type = diagram_type
            existing_diagram.diagram_json = optimized_json
            existing_diagram.embedding = embedding_vector
            existing_diagram.updated_at = datetime.utcnow()
            
            await db.commit()
            print(f"Database commit successful for update")
            await db.refresh(existing_diagram)
            print(f"Database refresh successful")
            return existing_diagram
        else:
            print(f"Creating new diagram embedding record")
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
            print(f"Added new diagram to session")
            await db.commit()
            print(f"Database commit successful for new diagram")
            await db.refresh(db_embedding)
            print(f"Database refresh successful")
            print(f"New diagram ID: {db_embedding.id}")
            
            return db_embedding
    except Exception as e:
        print(f"ERROR storing diagram: {str(e)}")
        await db.rollback()
        raise

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
    print(f"\n==== VECTOR SEARCH DETAILS ====")
    print(f"Database session: {db}")
    print(f"Searching for diagrams similar to: {query_text[:100]}...")
    print(f"Limit: {limit}, Diagram type filter: {diagram_type}, Include scores: {include_scores}")
    
    try:
        # First, let's check if we have any diagrams in the database at all
        check_stmt = select(func.count(DiagramEmbedding.id))
        check_result = await db.execute(check_stmt)
        total_diagrams = check_result.scalar()
        print(f"Total diagrams in database: {total_diagrams}")
        
        if total_diagrams == 0:
            print("WARNING: No diagrams found in the database at all!")
            return []
        
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
            # Check how many diagrams match this type first
            type_check_stmt = select(func.count(DiagramEmbedding.id)).filter(DiagramEmbedding.diagram_type == diagram_type)
            type_check_result = await db.execute(type_check_stmt)
            type_count = type_check_result.scalar()
            print(f"Found {type_count} diagrams of type '{diagram_type}'")
            
            if type_count > 0:
                # Only apply the filter if we have diagrams of this type
                stmt = stmt.filter(DiagramEmbedding.diagram_type == diagram_type)
                print(f"Filtering by diagram type: {diagram_type}")
            else:
                print(f"WARNING: No diagrams found with type '{diagram_type}', will search without type filter")
                # We don't apply any filter, so we'll search all diagrams
        
        # Order by cosine similarity and limit results
        # This uses pgvector's cosine distance operator <-> for similarity search
        stmt = stmt.order_by(
            DiagramEmbedding.embedding.cosine_distance(query_vector)
        ).limit(limit)
        
        print(f"Executing query: {stmt}")
        result = await db.execute(stmt)
        
        if include_scores:
            # Process results with scores
            results_with_scores = result.all()
            print(f"Query returned {len(results_with_scores)} results with scores")
            
            # Extract diagrams and scores
            diagrams = []
            for diagram, score in results_with_scores:
                # Add score as an attribute to the diagram object
                setattr(diagram, "similarity_score", score)
                diagrams.append(diagram)
                
                # Log the score
                print(f"Found diagram '{diagram.name}' (ID: {diagram.id}) with similarity score: {score:.4f}")
            
            return diagrams
        else:
            # Return just the diagrams without scores
            results = result.scalars().all()
            print(f"Query returned {len(results)} results without scores")
            
            # Log found diagrams
            for diagram in results:
                print(f"Found diagram '{diagram.name}' (ID: {diagram.id})")
                
            return results
    except Exception as e:
        print(f"ERROR in vector search: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return []

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
