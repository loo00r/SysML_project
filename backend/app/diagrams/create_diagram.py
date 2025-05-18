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
        
        # Mock response for UI development
        # This simulates what would be returned by the AI model
        mock_diagram = {
            "diagram_type": request.diagram_type,
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
                    "position": {"x": 250, "y": 100}
                },
                {
                    "id": "sensor-1",
                    "type": "block",
                    "name": "Thermal Camera",
                    "description": "Detects heat signatures for survivor location",
                    "properties": {
                        "resolution": "640x480",
                        "sensitivity": "0.05°C"
                    },
                    "position": {"x": 100, "y": 250}
                },
                {
                    "id": "sensor-2",
                    "type": "block",
                    "name": "LiDAR Scanner",
                    "description": "Creates 3D maps of flood areas",
                    "properties": {
                        "range": "100m",
                        "accuracy": "±2cm"
                    },
                    "position": {"x": 400, "y": 250}
                },
                {
                    "id": "processor-1",
                    "type": "block",
                    "name": "Data Processing Unit",
                    "description": "Onboard computer for image analysis",
                    "properties": {
                        "processor": "Quad-core ARM",
                        "memory": "8GB"
                    },
                    "position": {"x": 250, "y": 400}
                },
                {
                    "id": "comm-1",
                    "type": "block",
                    "name": "Communication Module",
                    "description": "Transmits data to ground station",
                    "properties": {
                        "protocol": "5G/WiFi",
                        "range": "10km"
                    },
                    "position": {"x": 550, "y": 400}
                }
            ],
            "relationships": [
                {
                    "source_id": "uav-1",
                    "target_id": "sensor-1",
                    "type": "composition",
                    "name": "contains"
                },
                {
                    "source_id": "uav-1",
                    "target_id": "sensor-2",
                    "type": "composition",
                    "name": "contains"
                },
                {
                    "source_id": "uav-1",
                    "target_id": "processor-1",
                    "type": "composition",
                    "name": "contains"
                },
                {
                    "source_id": "uav-1",
                    "target_id": "comm-1",
                    "type": "composition",
                    "name": "contains"
                },
                {
                    "source_id": "sensor-1",
                    "target_id": "processor-1",
                    "type": "flow",
                    "name": "thermal data"
                },
                {
                    "source_id": "sensor-2",
                    "target_id": "processor-1",
                    "type": "flow",
                    "name": "terrain data"
                },
                {
                    "source_id": "processor-1",
                    "target_id": "comm-1",
                    "type": "flow",
                    "name": "processed data"
                }
            ]
        }
        
        # If the request mentions specific keywords, add more relevant components
        if "water level" in request.text.lower():
            mock_diagram["elements"].append({
                "id": "sensor-3",
                "type": "block",
                "name": "Water Level Sensor",
                "description": "Measures flood water depth",
                "properties": {
                    "accuracy": "±1cm",
                    "range": "0-10m"
                },
                "position": {"x": 700, "y": 250}
            })
            mock_diagram["relationships"].append({
                "source_id": "uav-1",
                "target_id": "sensor-3",
                "type": "composition",
                "name": "contains"
            })
            mock_diagram["relationships"].append({
                "source_id": "sensor-3",
                "target_id": "processor-1",
                "type": "flow",
                "name": "water level data"
            })
        
        # If the request mentions activity or process, add some activity elements
        if request.diagram_type == "activity":
            mock_diagram = {
                "diagram_type": "activity",
                "elements": [
                    {
                        "id": "start-1",
                        "type": "activity",
                        "name": "Launch UAV",
                        "description": "Initial deployment of the UAV",
                        "position": {"x": 250, "y": 100}
                    },
                    {
                        "id": "activity-1",
                        "type": "activity",
                        "name": "Scan Flood Zone",
                        "description": "Systematic scanning of the affected area",
                        "position": {"x": 250, "y": 200}
                    },
                    {
                        "id": "decision-1",
                        "type": "activity",
                        "name": "Detect Survivors?",
                        "description": "Decision point for survivor detection",
                        "position": {"x": 250, "y": 300}
                    },
                    {
                        "id": "activity-2",
                        "type": "activity",
                        "name": "Mark Location",
                        "description": "Record GPS coordinates of survivors",
                        "position": {"x": 400, "y": 400}
                    },
                    {
                        "id": "activity-3",
                        "type": "activity",
                        "name": "Continue Scanning",
                        "description": "Move to next search area",
                        "position": {"x": 100, "y": 400}
                    },
                    {
                        "id": "activity-4",
                        "type": "activity",
                        "name": "Transmit Data",
                        "description": "Send collected data to command center",
                        "position": {"x": 250, "y": 500}
                    },
                    {
                        "id": "end-1",
                        "type": "activity",
                        "name": "Return to Base",
                        "description": "Complete mission and return",
                        "position": {"x": 250, "y": 600}
                    }
                ],
                "relationships": [
                    {
                        "source_id": "start-1",
                        "target_id": "activity-1",
                        "type": "flow",
                        "name": ""
                    },
                    {
                        "source_id": "activity-1",
                        "target_id": "decision-1",
                        "type": "flow",
                        "name": ""
                    },
                    {
                        "source_id": "decision-1",
                        "target_id": "activity-2",
                        "type": "flow",
                        "name": "yes"
                    },
                    {
                        "source_id": "decision-1",
                        "target_id": "activity-3",
                        "type": "flow",
                        "name": "no"
                    },
                    {
                        "source_id": "activity-2",
                        "target_id": "activity-4",
                        "type": "flow",
                        "name": ""
                    },
                    {
                        "source_id": "activity-3",
                        "target_id": "activity-1",
                        "type": "flow",
                        "name": ""
                    },
                    {
                        "source_id": "activity-4",
                        "target_id": "end-1",
                        "type": "flow",
                        "name": ""
                    }
                ]
            }
        
        # If the request mentions use cases, create a use case diagram
        if request.diagram_type == "usecase":
            mock_diagram = {
                "diagram_type": "use_case",
                "elements": [
                    {
                        "id": "actor-1",
                        "type": "actor",
                        "name": "Rescue Coordinator",
                        "description": "Person coordinating rescue operations",
                        "position": {"x": 100, "y": 300}
                    },
                    {
                        "id": "actor-2",
                        "type": "actor",
                        "name": "UAV Operator",
                        "description": "Person piloting the UAV",
                        "position": {"x": 100, "y": 150}
                    },
                    {
                        "id": "actor-3",
                        "type": "actor",
                        "name": "Data Analyst",
                        "description": "Person analyzing flood data",
                        "position": {"x": 100, "y": 450}
                    },
                    {
                        "id": "usecase-1",
                        "type": "useCase",
                        "name": "Deploy UAV",
                        "description": "Launch and control UAV",
                        "position": {"x": 350, "y": 100}
                    },
                    {
                        "id": "usecase-2",
                        "type": "useCase",
                        "name": "Monitor Flood Zone",
                        "description": "Real-time monitoring of flood areas",
                        "position": {"x": 350, "y": 200}
                    },
                    {
                        "id": "usecase-3",
                        "type": "useCase",
                        "name": "Detect Survivors",
                        "description": "Identify people needing rescue",
                        "position": {"x": 350, "y": 300}
                    },
                    {
                        "id": "usecase-4",
                        "type": "useCase",
                        "name": "Map Flood Extent",
                        "description": "Create maps of flooded areas",
                        "position": {"x": 350, "y": 400}
                    },
                    {
                        "id": "usecase-5",
                        "type": "useCase",
                        "name": "Coordinate Rescue",
                        "description": "Direct rescue teams based on UAV data",
                        "position": {"x": 350, "y": 500}
                    }
                ],
                "relationships": [
                    {
                        "source_id": "actor-2",
                        "target_id": "usecase-1",
                        "type": "association",
                        "name": ""
                    },
                    {
                        "source_id": "actor-2",
                        "target_id": "usecase-2",
                        "type": "association",
                        "name": ""
                    },
                    {
                        "source_id": "actor-1",
                        "target_id": "usecase-3",
                        "type": "association",
                        "name": ""
                    },
                    {
                        "source_id": "actor-3",
                        "target_id": "usecase-4",
                        "type": "association",
                        "name": ""
                    },
                    {
                        "source_id": "actor-1",
                        "target_id": "usecase-5",
                        "type": "association",
                        "name": ""
                    },
                    {
                        "source_id": "usecase-2",
                        "target_id": "usecase-3",
                        "type": "include",
                        "name": "includes"
                    },
                    {
                        "source_id": "usecase-2",
                        "target_id": "usecase-4",
                        "type": "include",
                        "name": "includes"
                    },
                    {
                        "source_id": "usecase-3",
                        "target_id": "usecase-5",
                        "type": "include",
                        "name": "includes"
                    }
                ]
            }
            
        result = {
            "diagram": mock_diagram,
            "raw_text": request.text,
            "model_used": "mock-model-for-development"
        }
        
        # Return the mock response
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating diagram: {str(e)}")
