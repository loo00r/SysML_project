from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import crud_ibd
from app.database.models import InternalBlockDiagramResponse, InternalBlockDiagramCreate
from app.db.dependencies import get_db
from app.AI.diagram_generation import DiagramPositioning

router = APIRouter(prefix="/diagrams", tags=["IBD Diagrams"])

@router.get("/ibd/{parent_block_id}", response_model=InternalBlockDiagramResponse)
async def read_ibd_by_block_id(
    parent_block_id: str, 
    db: AsyncSession = Depends(get_db)
):
    """
    Get Internal Block Diagram by parent block ID
    
    Args:
        parent_block_id: The ID of the parent block
        db: Database session
        
    Returns:
        The Internal Block Diagram data with positioned nodes and edges
    """
    db_ibd = await crud_ibd.get_ibd_by_block_id(db, block_id=parent_block_id)
    if db_ibd is None:
        raise HTTPException(status_code=404, detail="Internal Block Diagram not found")
    
    # Apply positioning to the IBD nodes only (edges don't need positioning)
    ibd_diagram_data = {
        "diagram_type": "ibd", 
        "elements": db_ibd.nodes,
        "relationships": []  # IBD doesn't use relationships, only edges
    }
    positioned_ibd = DiagramPositioning.apply_positioning(ibd_diagram_data)
    
    # Update the response with positioned data
    response_data = InternalBlockDiagramResponse(
        id=db_ibd.id,
        parent_bdd_diagram_id=db_ibd.parent_bdd_diagram_id,
        parent_block_id=db_ibd.parent_block_id,
        nodes=positioned_ibd.get("elements", []),
        edges=db_ibd.edges,  # Use edges directly from database
        source=db_ibd.source,
        created_at=db_ibd.created_at
    )
    
    return response_data

@router.post("/ibd/", response_model=InternalBlockDiagramResponse)
async def create_ibd_diagram(
    ibd_data: InternalBlockDiagramCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update an Internal Block Diagram
    
    Args:
        ibd_data: The IBD data to create
        db: Database session
        
    Returns:
        The created/updated Internal Block Diagram data
    """
    try:
        # Check if IBD already exists for this parent diagram and block
        existing_ibd = await crud_ibd.get_ibd_by_parent_and_block(
            db=db,
            parent_bdd_id=ibd_data.parent_bdd_diagram_id,
            block_id=ibd_data.parent_block_id
        )

        if existing_ibd:
            # IBD already exists -> UPDATE it
            print(f"DEBUG: Found existing IBD for block {ibd_data.parent_block_id}. Updating...")
            updated_ibd = await crud_ibd.update_ibd(
                db=db,
                db_ibd=existing_ibd,
                nodes=ibd_data.nodes,
                edges=ibd_data.edges
            )
            response_ibd = updated_ibd
        else:
            # IBD does not exist -> CREATE it
            print(f"DEBUG: No existing IBD for block {ibd_data.parent_block_id}. Creating new...")
            response_ibd = await crud_ibd.create_ibd(db=db, ibd=ibd_data)

        # Return the response
        return InternalBlockDiagramResponse(
            id=response_ibd.id,
            parent_bdd_diagram_id=response_ibd.parent_bdd_diagram_id,
            parent_block_id=response_ibd.parent_block_id,
            nodes=response_ibd.nodes,
            edges=response_ibd.edges,
            source=response_ibd.source,
            created_at=response_ibd.created_at
        )

    except Exception as e:
        print(f"Error creating/updating IBD: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating IBD: {str(e)}")