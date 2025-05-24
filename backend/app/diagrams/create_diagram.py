from fastapi import APIRouter, Body, HTTPException
from app.AI.diagram_generation import generate_diagram
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/create-diagram", tags=["Create Diagram"])

class DiagramRequest(BaseModel):
    text: str
    diagram_type: str = "block"  # Only block diagram type is supported

class DiagramResponse(BaseModel):
    diagram: Dict[str, Any]
    raw_text: str
    model_used: str
    error: str = None

@router.post("/", response_model=DiagramResponse)
async def create_diagram(request: DiagramRequest = Body(...)):
    """
    Create a diagram based on the provided text description using OpenAI's API.
    
    Args:
        request: The diagram request containing text description and optional parameters
        
    Returns:
        The generated diagram structure and metadata
    """
    try:
        # Add diagram type information to the prompt if specified
        enhanced_prompt = f"Generate a {request.diagram_type} diagram for the following system: {request.text}"
        
        # Generate the diagram using the AI engine
        result = generate_diagram(enhanced_prompt)
        
        # Return the response in the expected DiagramResponse format
        return DiagramResponse(
            diagram=result["diagram"],
            raw_text=request.text,
            model_used=result["model_used"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagram: {str(e)}")
