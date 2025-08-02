from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import crud_ibd
from app.database.models import InternalBlockDiagramResponse
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