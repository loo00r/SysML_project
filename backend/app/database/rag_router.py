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
    # Initialize context and one-shot examples
    context = ""
    one_shot_examples = []
    
    if use_rag:
        # Find similar diagrams for context using vector similarity search
        similar_diagrams = await find_similar_diagrams(
            db=db, 
            query_text=text, 
            limit=3, 
            diagram_type=diagram_type
        )
        
        # Get relevant templates for the requested diagram type
        templates = await get_template_by_type(db, diagram_type)
        
        # If we found similar diagrams, use them as one-shot examples
        if similar_diagrams:
            # Format the best match as a one-shot example
            best_match = similar_diagrams[0]
            one_shot_examples.append({
                "input": best_match.raw_text,
                "output": best_match.diagram_json
            })
            
            # Add additional context from other similar diagrams
            context += "Here are some similar examples for reference:\n\n"
            for i, diagram in enumerate(similar_diagrams[1:], start=1):
                context += f"Example {i}: {diagram.name}\n"
                context += f"Description: {diagram.description}\n\n"
        
        # Add templates as additional context if available
        if templates:
            context += "\nRelevant templates for this diagram type:\n\n"
            for i, template in enumerate(templates, start=1):
                context += f"Template {i}: {template.template_name}\n"
                context += f"Description: {template.template_description}\n\n"
    
    # Construct the enhanced prompt with one-shot examples and context
    enhanced_prompt = f"Generate a {diagram_type} diagram for the following system description:\n\n{text}"
    
    # Generate diagram with RAG context
    result = generate_diagram(enhanced_prompt, one_shot_examples=one_shot_examples, additional_context=context)
    
    # Store the generated diagram in the database for future RAG use
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
