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
    
    # Log the request for debugging
    print(f"Generating {diagram_type} diagram with RAG: {use_rag}")
    print(f"Input text: {text[:100]}...")
    
    if use_rag:
        try:
            print("\n==== Starting Vector Search ====")
            print(f"Query text: {text[:100]}...")
            print(f"Diagram type filter: {diagram_type}")
            
            # Find similar diagrams for context using vector similarity search
            similar_diagrams = await find_similar_diagrams(
                db=db, 
                query_text=text, 
                limit=3, 
                diagram_type=diagram_type,
                include_scores=True  # Include similarity scores in results
            )
            
            print(f"Found {len(similar_diagrams)} similar diagrams for RAG context")
            
            # If we found similar diagrams, use them as one-shot examples
            if similar_diagrams:
                # Format the best match as a one-shot example
                best_match = similar_diagrams[0]
                
                # Get similarity score if available
                similarity_score = getattr(best_match, "similarity_score", None)
                score_text = f"(similarity score: {similarity_score:.4f})" if similarity_score is not None else "(high similarity)"
                
                print(f"\n==== Using Best Match for One-Shot Example ====")
                print(f"Diagram: {best_match.name} {score_text}")
                print(f"Description: {best_match.description}")
                print(f"Raw text length: {len(best_match.raw_text)} characters")
                print(f"JSON size: {len(json.dumps(best_match.diagram_json))} characters")
                
                # Create a clean one-shot example with the raw text and diagram JSON
                one_shot_examples.append({
                    "input": best_match.raw_text,
                    "output": best_match.diagram_json
                })
                
                # Add additional context from other similar diagrams
                if len(similar_diagrams) > 1:
                    print(f"\n==== Adding {len(similar_diagrams)-1} Additional Diagrams as Context ====")
                    context += "Here are some similar examples for reference:\n\n"
                    
                    for i, diagram in enumerate(similar_diagrams[1:], start=1):
                        # Get similarity score if available
                        sim_score = getattr(diagram, "similarity_score", None)
                        sim_text = f"(similarity: {sim_score:.4f})" if sim_score is not None else ""
                        
                        print(f"Context {i}: {diagram.name} {sim_text}")
                        context += f"Example {i}: {diagram.name} {sim_text}\n"
                        context += f"Description: {diagram.description}\n\n"
            else:
                print("No similar diagrams found for RAG context")
            
            # Get relevant templates for the requested diagram type
            templates = await get_template_by_type(db, diagram_type)
            
            # Add templates as additional context if available
            if templates:
                print(f"Adding {len(templates)} templates as additional context")
                context += "\nRelevant templates for this diagram type:\n\n"
                for i, template in enumerate(templates, start=1):
                    context += f"Template {i}: {template.template_name}\n"
                    context += f"Description: {template.template_description}\n\n"
        except Exception as e:
            print(f"Error during RAG context retrieval: {str(e)}")
            # Continue without RAG if there's an error
            use_rag = False
    
    # Construct the enhanced prompt with one-shot examples and context
    enhanced_prompt = f"Generate a {diagram_type} diagram for the following system description:\n\n{text}"
    
    # Add information about the expected output format
    enhanced_prompt += "\n\nThe output should be a SysML diagram with appropriate nodes and connections."
    
    # Generate diagram with RAG context
    result = generate_diagram(enhanced_prompt, one_shot_examples=one_shot_examples, additional_context=context)
    
    # We no longer automatically store the generated diagram in the database
    # This will only happen when the user explicitly clicks 'Save Diagram'
    # Adding a flag to indicate this diagram hasn't been saved to the RAG database yet
    if "diagram" in result and "error" not in result:
        result["saved_to_rag"] = False
        result["used_rag"] = use_rag
        if one_shot_examples:
            result["used_examples"] = len(one_shot_examples)
    
    return result
