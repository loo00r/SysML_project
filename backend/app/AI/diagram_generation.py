from openai import OpenAI
import json
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

# Define the SysML element types for better structure
class DiagramTypes:
    BLOCK = "block"
    ACTIVITY = "activity"
    USE_CASE = "use_case"

# Define positioning constants
class DiagramPositioning:
    # Vertical spacing (y-coordinates)
    Y_SPACING = 200
    BASE_Y = 0
    
    # Horizontal spacing (x-coordinates)
    ELEMENT_X_SPACING = 300
    
    @staticmethod
    def get_x_position(index_in_level: int) -> int:
        """Calculate x position based on element index within its level"""
        return index_in_level * DiagramPositioning.ELEMENT_X_SPACING
    
    @staticmethod
    def get_y_position(level_index: int) -> int:
        """
        Calculate y position based on level index
        Level index can be positive or negative, with 0 being the middle reference point
        Positive indices increase y (move down), negative indices decrease y (move up)
        """
        return DiagramPositioning.BASE_Y + (level_index * DiagramPositioning.Y_SPACING)

    @staticmethod
    def apply_positioning(diagram_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply automatic positioning to diagram elements based on their types and relationships.
        
        This function organizes elements into levels (top, middle, bottom) based on their types
        and relationships, then assigns appropriate x, y coordinates.
        
        Args:
            diagram_data: The diagram data without position information
            
        Returns:
            Updated diagram data with position information
        """
        elements = diagram_data.get("elements", [])
        relationships = diagram_data.get("relationships", [])
        
        # Create a map of element IDs to their indices
        element_map = {element["id"]: i for i, element in enumerate(elements)}
        
        # Identify source and target elements from relationships
        source_elements = set()
        target_elements = set()
        for rel in relationships:
            source_elements.add(rel.get("source_id"))
            target_elements.add(rel.get("target_id"))
        
        # Assign level indices based on relationship patterns
        element_level_indices = {}
        for element in elements:
            element_id = element["id"]
            
            # Elements that are only targets (receive connections) are likely top-level (negative index)
            if element_id in target_elements and element_id not in source_elements:
                element_level_indices[element_id] = -1
            # Elements that are both sources and targets are likely middle-level (index 0)
            elif element_id in target_elements and element_id in source_elements:
                element_level_indices[element_id] = 0
            # Elements that are only sources (initiate connections) are likely bottom-level (positive index)
            elif element_id in source_elements and element_id not in target_elements:
                element_level_indices[element_id] = 1
            else:
                # Default to middle level for elements without connections
                element_level_indices[element_id] = 0
        
        # Count elements per level index for horizontal positioning
        level_counts = {}
        
        # Initialize level counts for any level index that might be used
        for element_id, level_index in element_level_indices.items():
            if level_index not in level_counts:
                level_counts[level_index] = 0
        
        # Apply positions based on level indices
        for element in elements:
            element_id = element["id"]
            level_index = element_level_indices.get(element_id, 0)  # Default to middle level (0)
            
            # Set position
            x_pos = DiagramPositioning.get_x_position(level_counts[level_index])
            y_pos = DiagramPositioning.get_y_position(level_index)
            
            # Update element with position
            if "position" not in element or not element["position"]:
                element["position"] = {}
            
            element["position"]["x"] = x_pos
            element["position"]["y"] = y_pos
            
            # Increment count for this level
            level_counts[level_index] += 1
        
        # Return the updated diagram data
        return diagram_data

# Core SysML prompt template to help guide model responses (without positioning logic)
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
      "properties": {}
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

Connection rules:
- Components should primarily connect based on their functional relationships
- Each component should have logical connections that reflect data or control flow
- Avoid creating unnecessary connections

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
      }
    },
    {
      "id": "sensor-1",
      "type": "sensor",
      "name": "Thermal Camera",
      "description": "Detects heat signatures for survivor location",
      "properties": {
        "resolution": "640x480"
      }
    },
    {
      "id": "sensor-2",
      "type": "sensor",
      "name": "LiDAR Scanner",
      "description": "Creates 3D maps of flood areas",
      "properties": {
        "range": "100m",
        "accuracy": "±20cm"
      }
    },
    {
      "id": "sensor-3",
      "type": "sensor",
      "name": "Water Level Sensor",
      "description": "Measures flood water depth",
      "properties": {
        "accuracy": "±1cm",
        "range": "0-10m"
      }
    },
    {
      "id": "processor-1",
      "type": "processor",
      "name": "Data Processing Unit",
      "description": "Onboard computer for image analysis",
      "properties": {
        "processor": "Quad-core ARM",
        "memory": "8GB"
      }
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
    
    # Log RAG usage
    if one_shot_examples:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples ====")
    else:
        print("\n==== No RAG examples available ====")
    
    # Add one-shot examples if provided
    if one_shot_examples and len(one_shot_examples) > 0:
        for i, example in enumerate(one_shot_examples):
            print(f"\n--- RAG Example {i+1} ---")
            print(f"Input: {example['input'][:100]}...")
            print(f"Output: {len(json.dumps(example['output']))} characters of JSON")
            
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
        print("\n==== Additional RAG Context ====")
        print(additional_context)
        full_prompt += f"\n\nAdditional Context:\n{additional_context}"
    
    # Log the full prompt being sent to the model
    print("\n==== FULL PROMPT SENT TO MODEL ====")
    print(full_prompt)
    print("==== END OF PROMPT ====")
    
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
        
        # Apply automatic positioning to the diagram elements
        positioned_diagram = DiagramPositioning.apply_positioning(diagram_data)
        
        # Add metadata about the generation
        result = {
            "diagram": positioned_diagram,
            "raw_text": prompt,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": one_shot_examples is not None and len(one_shot_examples) > 0,
            "prompt_length": len(full_prompt),
            "examples_count": len(one_shot_examples) if one_shot_examples else 0
        }
        
        print("\n==== Generation Successful ====")
        print(f"Generated diagram with {len(positioned_diagram.get('elements', []))} elements and {len(positioned_diagram.get('relationships', []))} relationships")
        
        return result
    
    except Exception as e:
        error_msg = f"Error generating diagram: {str(e)}"
        print(f"\n==== ERROR ====")
        print(error_msg)
        # Return a basic error structure
        return {
            "error": str(e),
            "diagram": {
                "diagram_type": "block",
                "elements": [],
                "relationships": []
            },
            "rag_used": one_shot_examples is not None and len(one_shot_examples) > 0,
            "prompt_length": len(full_prompt) if 'full_prompt' in locals() else 0,
            "examples_count": len(one_shot_examples) if one_shot_examples else 0
        }