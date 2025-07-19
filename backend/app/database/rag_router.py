from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import json

from app.db.dependencies import get_db
from app.database.models import (
    DiagramEmbeddingCreate, 
    DiagramEmbeddingResponse, 
    TemplateResponse,
    ComponentResponse, 
    SimilarDiagramRequest
)
from app.database.embeddings import (
    store_diagram_with_embedding, 
    find_similar_diagrams,
    get_template_by_type,
    get_components_by_type
)
from app.AI.diagram_generation import generate_diagram

router = APIRouter(prefix="/rag", tags=["RAG"])

@router.post("/diagrams/", response_model=DiagramEmbeddingResponse)
async def create_diagram_embedding(
    diagram: DiagramEmbeddingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Store a new diagram with its embedding in the database
    """
    db_diagram = await store_diagram_with_embedding(
        db=db,
        name=diagram.name,
        description=diagram.description or "",
        raw_text=diagram.raw_text,
        diagram_type=diagram.diagram_type,
        diagram_json=diagram.diagram_json
    )
    return db_diagram

@router.post("/similar-diagrams/", response_model=List[DiagramEmbeddingResponse])
async def find_similar_diagrams_endpoint(
    request: SimilarDiagramRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Find similar diagrams based on text query
    """
    similar_diagrams = await find_similar_diagrams(
        db=db,
        query_text=request.query_text,
        limit=request.limit,
        diagram_type=request.diagram_type
    )
    return similar_diagrams

@router.get("/templates/{template_type}", response_model=List[TemplateResponse])
async def get_templates(
    template_type: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all templates for a specific diagram type
    """
    templates = await get_template_by_type(db, template_type)
    return templates

@router.get("/components/{component_type}", response_model=List[ComponentResponse])
async def get_components(
    component_type: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all UAV components of a specific type
    """
    components = await get_components_by_type(db, component_type)
    return components

@router.post("/generate-diagram-with-context/")
async def generate_diagram_with_context(
    text: str = Body(..., embed=True),
    diagram_type: str = Body("block", embed=True),
    use_rag: bool = Body(True, embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a diagram using context from the database if use_rag is True
    """
    one_shot_examples = []
    
    print(f"\n==== Generating {diagram_type} diagram with RAG: {use_rag} ====")
    print(f"Input text: {text[:100]}...")
    
    if use_rag:
        try:
            similar_diagrams = await find_similar_diagrams(
                db=db, 
                query_text=text, 
                limit=1,  
                diagram_type=diagram_type,
                include_scores=True
            )
            
            if not similar_diagrams:
                print(f"No diagrams of type '{diagram_type}' found, will proceed without RAG context")
                # Do not fall back to searching other diagram types - maintain strict type isolation
            
            if similar_diagrams:
                best_match = similar_diagrams[0]
                similarity_score = getattr(best_match, "similarity_score", None)
                
                print(f"Found best match: {best_match.name} (type: {best_match.diagram_type}) with similarity score: {similarity_score:.4f}")
                
                # Always use the best match regardless of score
                one_shot_examples.append({
                    "input": best_match.raw_text,
                    "output": best_match.diagram_json
                })
                
                print(f"Using one-shot example with {len(best_match.raw_text)} chars of text and {len(json.dumps(best_match.diagram_json))} chars of JSON")
            else:
                print("No similar diagrams found for RAG context at all")
                
        except Exception as e:
            print(f"Error during RAG context retrieval: {str(e)}")
            use_rag = False
    
    enhanced_prompt = f"Generate a {diagram_type} diagram for the following system description:\n\n{text}"
    
    result = generate_diagram(enhanced_prompt, one_shot_examples=one_shot_examples)
    
    if "diagram" in result and "error" not in result:
        result["saved_to_rag"] = False
        result["used_rag"] = use_rag and len(one_shot_examples) > 0
        result["examples_count"] = len(one_shot_examples)
    
    return result
