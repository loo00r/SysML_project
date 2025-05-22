from openai import OpenAI
import json
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

# Define the SysML element types for better structure
class DiagramTypes:
    BLOCK = "block"
    ACTIVITY = "activity"
    USE_CASE = "use_case"

# Core SysML prompt template to help guide model responses
SYSML_PROMPT_TEMPLATE = """
You are a SysML diagram expert. Based on the provided system description, generate a SysML diagram with the following components:

1. Identify all system blocks/components
2. Define the relationships between blocks
3. Specify ports and flows for each block
4. Organize blocks into a hierarchical structure if applicable

Format your response as a valid JSON object with the following structure:
{
  "diagram_type": "block | activity | use_case",
  "elements": [
    {
      "id": "unique_id",
      "type": "block | sensor | processor",
      "name": "element_name",
      "description": "description_text",
      "properties": {},
      "position": {"x": 0, "y": 0} // Position coordinates for layout
    }
  ],
  "relationships": [
    {
      "source_id": "source_element_id",
      "target_id": "target_element_id",
      "type": "smoothstep"
    }
  ]
}

Important positioning and connection instructions:
1. Organize elements by hierarchical levels using the y-coordinate
   - Top level: y = 0 (any component type can be here)
   - Middle level: y = 200 (any component type can be here)
   - Bottom level: y = 400 (any component type can be here)

2. Space elements horizontally within the same level using the x-coordinate
   - First element: x = 0
   - Second element: x = 300
   - Third element: x = 600
   - Continue with 300 unit increments for additional elements

3. Connection rules:
   - Components should primarily connect to components in adjacent levels (e.g., top to middle, middle to bottom)
   - Avoid direct connections between top and bottom levels unless specifically requested
   - Components on the same level should generally not connect to each other unless specifically requested
   - Each bottom-level component should connect to exactly one middle-level component unless otherwise specified

Here is a concrete example of a well-formatted diagram for a UAV flood monitoring system:

{
  "diagram_type": "block",
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
  ],
  "relationships": [
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

For disaster management scenarios, particularly focus on sensor systems, data transmission, and decision-making components.
"""

def generate_diagram(prompt: str, one_shot_examples: List[Dict[str, Any]] = None, additional_context: str = None) -> Dict[str, Any]:
    """
    Generate a diagram based on the provided prompt using OpenAI's API.
    
    Args:
        prompt: The text description of the system to model
        one_shot_examples: Optional list of example inputs and outputs for one-shot learning
        additional_context: Optional additional context to include in the prompt
        
    Returns:
        Dictionary containing the diagram elements and metadata
    """
    # Initialize the OpenAI client with the API key
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Start building the messages list
    messages = [
        {"role": "system", "content": "You are a SysML modeling expert specialized in systems engineering and disaster management. Generate diagrams in JSON format according to the provided specifications."}
    ]
    
    # Add one-shot examples if provided
    if one_shot_examples and len(one_shot_examples) > 0:
        for example in one_shot_examples:
            # Add the example input as a user message
            example_prompt = f"{SYSML_PROMPT_TEMPLATE}\n\nSystem Description: {example['input']}"
            messages.append({"role": "user", "content": example_prompt})
            
            # Add the example output as an assistant message
            example_output = json.dumps(example['output'], indent=2)
            messages.append({"role": "assistant", "content": example_output})
    
    # Combine the system prompt with the user prompt and additional context
    full_prompt = f"{SYSML_PROMPT_TEMPLATE}\n\nSystem Description: {prompt}"
    
    # Add additional context if provided
    if additional_context:
        full_prompt += f"\n\nAdditional Context:\n{additional_context}"
    
    # Add the actual user query
    messages.append({"role": "user", "content": full_prompt})
    
    try:
        # Call OpenAI API with the structured prompt and examples
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7  # Slightly higher temperature for more creative outputs
        )
        
        # Extract and parse the JSON response
        response_text = response.choices[0].message.content
        diagram_data = json.loads(response_text)
        
        # Add metadata about the generation
        return {
            "diagram": diagram_data,
            "raw_text": prompt,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": one_shot_examples is not None and len(one_shot_examples) > 0
        }
    
    except Exception as e:
        print(f"Error generating diagram: {str(e)}")
        # Return a basic error structure
        return {
            "error": str(e),
            "diagram": {
                "diagram_type": "block",
                "elements": [],
                "relationships": []
            },
            "rag_used": one_shot_examples is not None and len(one_shot_examples) > 0
        }