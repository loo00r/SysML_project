from fastapi import APIRouter, Body, HTTPException, Depends
from app.AI.diagram_generation import generate_diagram, generate_sysml_diagram, DiagramPositioning
from app.crud import crud_ibd
from app.database.models import InternalBlockDiagramCreate
from app.database.embeddings import store_diagram_with_embedding
from app.db.dependencies import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/create-diagram", tags=["Create Diagram"])

class DiagramRequest(BaseModel):
    text: str
    diagram_type: str = "bdd"  # "bdd" or "bdd_enhanced"
    name: str = "Generated Diagram"

class DiagramResponse(BaseModel):
    diagram: Dict[str, Any]
    raw_text: str
    model_used: str
    error: str = None
    diagram_id: int = None

@router.post("/", response_model=DiagramResponse)
async def create_diagram_endpoint(
    request: DiagramRequest = Body(...), 
    db: AsyncSession = Depends(get_db)
):
    """
    Create a diagram based on the provided text description using OpenAI's API.
    Supports both standard BDD and enhanced BDD+IBD generation.
    
    Args:
        request: The diagram request containing text description and parameters
        db: Database session
        
    Returns:
        The generated diagram structure and metadata
    """
    try:
        # 1. Call the new generation function
        generation_result = generate_sysml_diagram(
            prompt=request.text,
            diagram_type=request.diagram_type,
            one_shot_examples=[]  # TODO: Add RAG logic here if needed
        )
        
        if "error" in generation_result:
            raise HTTPException(status_code=500, detail=generation_result["error"])
        
        raw_diagram = generation_result["diagram_raw"]
        
        # 2. Parse for IBDs and prepare the main diagram
        ibd_to_create = []
        if "elements" in raw_diagram:
            for element in raw_diagram["elements"]:
                if "internal_diagram" in element:
                    # Mark the element as having an IBD for the frontend
                    if "data" not in element:
                        element["data"] = {}
                    element["data"]["has_ibd"] = True
                    
                    # Prepare IBD for creation later
                    ibd_data = element.pop("internal_diagram")  # Remove IBD from main diagram
                    ibd_to_create.append({
                        "parent_block_id": element["id"],
                        "nodes": ibd_data.get("nodes", []),
                        "edges": ibd_data.get("edges", []),
                    })
        
        # 3. Apply positioning to the now-clean BDD data
        positioned_diagram = DiagramPositioning.apply_positioning(raw_diagram)
        
        # 4. Save the main BDD diagram to get its ID
        db_diagram = await store_diagram_with_embedding(
            db=db,
            name=request.name,
            description=f"Generated {request.diagram_type} diagram",
            raw_text=generation_result["raw_text"],
            diagram_type=request.diagram_type,
            diagram_json=positioned_diagram  # Save the positioned, clean diagram
        )
        
        # 5. Save the parsed IBDs with the parent BDD ID
        for ibd_data in ibd_to_create:
            new_ibd = InternalBlockDiagramCreate(
                parent_bdd_diagram_id=db_diagram.id,
                parent_block_id=ibd_data["parent_block_id"],
                nodes=ibd_data["nodes"],
                edges=ibd_data["edges"],
                source="ai"
            )
            await crud_ibd.create_ibd(db=db, ibd=new_ibd)
        
        # Return the response in the expected DiagramResponse format
        return DiagramResponse(
            diagram=positioned_diagram,
            raw_text=request.text,
            model_used=generation_result["model_used"],
            diagram_id=db_diagram.id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagram: {str(e)}")


