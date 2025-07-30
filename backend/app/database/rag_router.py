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
    SimilarDiagramRequest,
    InternalBlockDiagramCreate
)
from app.database.embeddings import (
    store_diagram_with_embedding, 
    find_similar_diagrams,
    get_template_by_type,
    get_components_by_type
)
from app.AI.diagram_generation import generate_diagram, generate_sysml_diagram, DiagramPositioning
from app.crud import crud_ibd

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
    diagram_type: str = Body("bdd", embed=True),
    use_rag: bool = Body(True, embed=True),
    name: str = Body("Generated Diagram", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a diagram using context from the database if use_rag is True.
    Supports both 'bdd' and 'bdd_enhanced' diagram types with full IBD parsing.
    """
    one_shot_examples = []
    
    print(f"\n==== Generating {diagram_type} diagram with RAG: {use_rag} ====")
    print(f"Input text: {text[:100]}...")
    
    # TEMPORARY: Bootstrap example with connected IBD components for better AI training
    if diagram_type == "bdd_enhanced":
        bootstrap_example = {
            "input": "Create a UAV flight controller with CPU and memory connected internally, plus GPS sensor",
            "output": {
                "diagram_type": "bdd",
                "elements": [
                    {
                        "id": "flight-controller",
                        "type": "block", 
                        "name": "Flight Controller",
                        "internal_diagram": {
                            "nodes": [
                                {"id": "cpu-unit", "type": "ibd_block", "name": "Central Processing Unit"},
                                {"id": "memory-unit", "type": "ibd_block", "name": "Memory Module"},
                                {"id": "io-unit", "type": "ibd_block", "name": "I/O Controller"}
                            ],
                            "edges": [
                                {"id": "cpu-memory-bus", "source": "cpu-unit", "target": "memory-unit", "label": "Data Bus"},
                                {"id": "cpu-io-control", "source": "cpu-unit", "target": "io-unit", "label": "Control Signals"},
                                {"id": "memory-io-access", "source": "memory-unit", "target": "io-unit", "label": "Memory Access"}
                            ]
                        }
                    },
                    {
                        "id": "gps-sensor",
                        "type": "sensor",
                        "name": "GPS"
                    }
                ],
                "relationships": [
                    {"source_id": "gps-sensor", "target_id": "flight-controller", "name": "Provides data"}
                ]
            }
        }
        one_shot_examples.append(bootstrap_example)
        print(f"Added bootstrap example with {len(bootstrap_example['output']['elements'][0]['internal_diagram']['edges'])} connected IBD edges")
    
    if use_rag:
        try:
            # For enhanced diagrams, search for both bdd and bdd_enhanced examples
            search_type = diagram_type if diagram_type != "bdd_enhanced" else "bdd"
            similar_diagrams = await find_similar_diagrams(
                db=db, 
                query_text=text, 
                limit=1,  
                diagram_type=search_type,
                include_scores=True
            )
            
            if not similar_diagrams:
                print(f"No diagrams of type '{search_type}' found, will proceed without RAG context")
            
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
    
    try:
        # Use the new generation function that supports enhanced diagrams
        generation_result = generate_sysml_diagram(
            prompt=text,
            diagram_type=diagram_type,
            one_shot_examples=one_shot_examples
        )
        
        if "error" in generation_result:
            return {"error": generation_result["error"]}
        
        raw_diagram = generation_result["diagram_raw"]
        
        # Handle enhanced diagrams with IBD parsing
        ibd_to_create = []
        if diagram_type == "bdd_enhanced" and "elements" in raw_diagram:
            for element in raw_diagram["elements"]:
                if "internal_diagram" in element:
                    # Mark the element as having an IBD for the frontend
                    if "data" not in element:
                        element["data"] = {}
                    element["data"]["has_ibd"] = True
                    
                    # Prepare IBD for creation later
                    ibd_data = element.pop("internal_diagram")  # Remove IBD from main diagram
                    
                    # DEBUG: Log what edges were found in the AI response
                    edges_found = ibd_data.get("edges", [])
                    print(f"DEBUG: IBD for block {element['id']} has {len(edges_found)} edges in AI response")
                    if edges_found:
                        print(f"DEBUG: Edges content: {edges_found}")
                    else:
                        print(f"DEBUG: No edges found in internal_diagram for {element['id']}")
                    
                    ibd_to_create.append({
                        "parent_block_id": element["id"],
                        "nodes": ibd_data.get("nodes", []),
                        "edges": edges_found,
                    })
        
        # Apply positioning to the clean diagram
        positioned_diagram = DiagramPositioning.apply_positioning(raw_diagram)
        
        # Save the main diagram to get its ID
        db_diagram = await store_diagram_with_embedding(
            db=db,
            name=name,
            description=f"Generated {diagram_type} diagram",
            raw_text=text,
            diagram_type="bdd",  # Always save as 'bdd' for RAG consistency
            diagram_json=positioned_diagram
        )
        
        # Save parsed IBDs with the parent BDD ID - New Upsert Logic
        for ibd_data in ibd_to_create:
            existing_ibd = await crud_ibd.get_ibd_by_parent_and_block(
                db=db,
                parent_bdd_id=db_diagram.id,
                block_id=ibd_data["parent_block_id"]
            )

            if existing_ibd:
                # IBD already exists -> UPDATE it
                print(f"DEBUG: Found existing IBD for block {ibd_data['parent_block_id']}. Updating...")
                await crud_ibd.update_ibd(
                    db=db,
                    db_ibd=existing_ibd,
                    nodes=ibd_data["nodes"],
                    edges=ibd_data["edges"]
                )
            else:
                # IBD does not exist -> CREATE it
                print(f"DEBUG: No existing IBD for block {ibd_data['parent_block_id']}. Creating new...")
                new_ibd = InternalBlockDiagramCreate(
                    parent_bdd_diagram_id=db_diagram.id,
                    parent_block_id=ibd_data["parent_block_id"],
                    nodes=ibd_data["nodes"],
                    edges=ibd_data["edges"],
                    source="ai"
                )
                await crud_ibd.create_ibd(db=db, ibd=new_ibd)
        
        # Return in the expected format
        result = {
            "diagram": positioned_diagram,
            "raw_text": text,
            "model_used": generation_result["model_used"],
            "saved_to_rag": True,
            "used_rag": use_rag and len(one_shot_examples) > 0,
            "examples_count": len(one_shot_examples),
            "diagram_id": db_diagram.id
        }
        
        return result
        
    except Exception as e:
        print(f"Error in unified RAG generation: {str(e)}")
        return {"error": str(e)}
