from fastapi import APIRouter, Body, HTTPException
from app.AI.diagram_generation import generate_diagram
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter(prefix="/create-diagram", tags=["Create Diagram"])

class DiagramRequest(BaseModel):
    text: str
    diagram_type: str = "block"  # Default to block diagram if not specified

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
        # result = generate_diagram(enhanced_prompt)
        diagram_data = {"diagram_type": f"{request.diagram_type}",
  "elements": [
    {
      "id": "uav-1",
      "type": "block",
      "name": "UAV Platform",
      "description": "Main aerial vehicle platform for flood monitoring",
      "properties": {
        "weight": "5kg",
        "flight_time": "45min",
        "max_altitude": "120m"
      },
      "position": {"x": 0, "y": 400}
    },
    {
      "id": "sensor-1",
      "type": "sensor",
      "name": "Thermal Camera",
      "description": "Detects heat signatures for survivor location",
      "properties": {
        "resolution": "640x480"
      },
      "position": {"x": 0, "y": 200}
    },
    {
      "id": "sensor-2",
      "type": "sensor",
      "name": "LiDAR Scanner",
      "description": "Creates 3D maps of flood areas",
      "properties": {
        "range": "100m",
        "accuracy": "±20cm"
      },
      "position": {"x": 300, "y": 200}
    },
    {
      "id": "sensor-3",
      "type": "sensor",
      "name": "Water Level Sensor",
      "description": "Measures flood water depth",
      "properties": {
        "accuracy": "±1cm",
        "range": "0-10m"
      },
      "position": {"x": 600, "y": 200}
    },
    {
      "id": "processor-1",
      "type": "processor",
      "name": "Data Processing Unit",
      "description": "Onboard computer for image analysis",
      "properties": {
        "processor": "Quad-core ARM",
        "memory": "8GB"
      },
      "position": {"x": 300, "y": 0}
    }
  ],  "relationships": [
    {
      "source_id": "sensor-1",
      "target_id": "processor-1",
      "type": "smoothstep"
    },
    {
      "source_id": "sensor-2",
      "target_id": "processor-1",
      "type": "smoothstep"
    },
    {
      "source_id": "sensor-3",
      "target_id": "processor-1",
      "type": "smoothstep"
    },
    {
      "source_id": "uav-1",
      "target_id": "sensor-1",
      "type": "smoothstep"
    }
  ]
}

        # Return the response in the expected DiagramResponse format
        return DiagramResponse(
            diagram=diagram_data,
            raw_text=request.text,
            model_used="hardcoded_example"  # Replace with actual model name when using generate_diagram
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagram: {str(e)}")
