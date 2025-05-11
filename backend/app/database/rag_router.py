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
    context = ""
    
    if use_rag:
        # Find similar diagrams for context
        similar_diagrams = await find_similar_diagrams(
            db=db, 
            query_text=text, 
            limit=3, 
            diagram_type=diagram_type
        )
        
        # Get relevant templates
        templates = await get_template_by_type(db, diagram_type)
        
        # Build context from similar diagrams and templates
        context += "Here are some example diagrams similar to what you might want to create:\n\n"
        
        for i, diagram in enumerate(similar_diagrams):
            context += f"Example {i+1}: {diagram.name}\n"
            context += f"Description: {diagram.description}\n"
            context += f"Structure: {json.dumps(diagram.diagram_json, indent=2)}\n\n"
        
        context += "Here are some templates you can use as a starting point:\n\n"
        
        for i, template in enumerate(templates):
            context += f"Template {i+1}: {template.template_name}\n"
            context += f"Description: {template.template_description}\n"
            context += f"Structure: {json.dumps(template.template_json, indent=2)}\n\n"
    
    # Enhanced prompt with context
    enhanced_prompt = f"""
    Generate a {diagram_type} diagram for the following system description:
    
    {text}
    
    {context}
    """
    
    # Generate diagram with context
    result = generate_diagram(enhanced_prompt)
    
    # Store the generated diagram in the database
    if "diagram" in result and "error" not in result:
        try:
            await store_diagram_with_embedding(
                db=db,
                name=f"Generated {diagram_type.capitalize()} Diagram",
                description=text[:100] + "...",
                raw_text=text,
                diagram_type=diagram_type,
                diagram_json=result["diagram"]
            )
        except Exception as e:
            print(f"Error storing generated diagram: {str(e)}")
    
    return result
