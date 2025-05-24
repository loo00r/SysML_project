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
        try:
            # Ensure we have a valid diagram_data object
            if not diagram_data or not isinstance(diagram_data, dict):
                print("Warning: Invalid diagram data provided to positioning function")
                return diagram_data or {"diagram_type": "block", "elements": [], "relationships": []}
            
            # Get elements and relationships with safe defaults
            elements = diagram_data.get("elements", [])
            relationships = diagram_data.get("relationships", [])
            
            # Safety check for elements
            if not elements or not isinstance(elements, list):
                print("Warning: No elements found in diagram data")
                diagram_data["elements"] = []
                return diagram_data
            
            # Validate each element has an id
            for i, element in enumerate(elements):
                if not element.get("id"):
                    element["id"] = f"element-{i+1}"
                    print(f"Warning: Element without ID found, assigned ID: {element['id']}")
            
            # Create a map of element IDs to their indices
            element_map = {element["id"]: i for i, element in enumerate(elements) if "id" in element}
            
            # Identify source and target elements from relationships
            source_elements = set()
            target_elements = set()
            
            # Validate relationships
            valid_relationships = []
            for rel in relationships:
                source_id = rel.get("source_id")
                target_id = rel.get("target_id")
                
                # Skip invalid relationships
                if not source_id or not target_id:
                    print(f"Warning: Skipping relationship with missing source or target ID")
                    continue
                    
                # Check if source and target elements exist
                if source_id not in element_map:
                    print(f"Warning: Relationship source '{source_id}' not found in elements")
                    continue
                    
                if target_id not in element_map:
                    print(f"Warning: Relationship target '{target_id}' not found in elements")
                    continue
                
                # Add to valid relationships
                valid_relationships.append(rel)
                source_elements.add(source_id)
                target_elements.add(target_id)
            
            # Update relationships with only valid ones
            diagram_data["relationships"] = valid_relationships
            
            # Assign level indices based on relationship patterns
            element_level_indices = {}
            for element in elements:
                element_id = element.get("id")
                if not element_id:
                    continue
                    
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
            for level_index in set(element_level_indices.values()):
                level_counts[level_index] = 0
            
            # Apply positions based on level indices
            for element in elements:
                element_id = element.get("id")
                if not element_id:
                    continue
                    
                level_index = element_level_indices.get(element_id, 0)  # Default to middle level (0)
                
                # Ensure level_index exists in level_counts
                if level_index not in level_counts:
                    level_counts[level_index] = 0
                
                # Set position
                x_pos = DiagramPositioning.get_x_position(level_counts[level_index])
                y_pos = DiagramPositioning.get_y_position(level_index)
                
                # Update element with position
                if "position" not in element:
                    element["position"] = {}
                
                element["position"]["x"] = x_pos
                element["position"]["y"] = y_pos
                
                # Increment count for this level
                level_counts[level_index] += 1
            
            # Return the updated diagram data
            return diagram_data
            
        except Exception as e:
            print(f"Error in apply_positioning: {str(e)}")
            # Return original data if there was an error
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
    
    # Start building the messages list with a detailed system prompt
    messages = [
        {"role": "system", "content": f"""
            You are a SysML diagram expert. Based on the provided system description, generate a SysML diagram with the following components:
            
            1. Identify all system blocks/components
            2. Define the relationships between blocks
            3. Specify ports and flows for each block
            4. Organize blocks into a hierarchical structure if applicable
            
            Your response must be a valid JSON object with the following structure:
            {{
              "diagram_type": "block",
              "elements": [
                {{
                  "id": "unique-id",
                  "type": "block",
                  "name": "Component Name",
                  "description": "Component description",
                  "properties": {{}}
                }}
              ],
              "relationships": [
                {{
                  "source_id": "source_element_id",
                  "target_id": "target_element_id",
                  "type": "smoothstep"
                }}
              ]
            }}
            
            Connection rules:
            - Components should primarily connect based on their functional relationships
            - Each component should have logical connections that reflect data or control flow
            - Avoid creating unnecessary connections
            
            For disaster management scenarios, particularly focus on sensor systems, data transmission, and decision-making components.
            
            Here is a concrete example of a well-formatted diagram for a UAV flood monitoring system:
            {{
              "diagram_type": "block",
              "elements": [
                {{
                  "id": "uav-1",
                  "type": "block",
                  "name": "UAV Platform",
                  "description": "Main aerial vehicle platform for flood monitoring",
                  "properties": {{
                    "weight": "5kg",
                    "flight_time": "45min"
                  }}
                }},
                {{
                  "id": "sensor-1",
                  "type": "sensor",
                  "name": "Optical Camera",
                  "description": "High-resolution optical imaging sensor",
                  "properties": {{
                    "resolution": "20MP",
                    "weight": "250g"
                  }}
                }},
                {{
                  "id": "sensor-2",
                  "type": "sensor",
                  "name": "Thermal Camera",
                  "description": "Thermal imaging for night operations",
                  "properties": {{
                    "resolution": "640x480",
                    "weight": "300g"
                  }}
                }},
                {{
                  "id": "processor-1",
                  "type": "processor",
                  "name": "Data Processing Unit",
                  "description": "Onboard computer for image analysis",
                  "properties": {{
                    "processor": "Quad-core ARM",
                    "memory": "8GB"
                  }}
                }}
              ],
              "relationships": [
                {{
                  "source_id": "sensor-1",
                  "target_id": "processor-1",
                  "type": "smoothstep"
                }},
                {{
                  "source_id": "sensor-2",
                  "target_id": "processor-1",
                  "type": "smoothstep"
                }},
                {{
                  "source_id": "uav-1",
                  "target_id": "sensor-1",
                  "type": "smoothstep"
                }}
              ]
            }}
            
            IMPORTANT: Your response must be a valid JSON object with the exact structure shown above.
        """}
    ]
    
    # Log RAG usage
    if one_shot_examples and len(one_shot_examples) > 0:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples ====")
        
        # Add one-shot examples if provided - just raw input and output
        for i, example in enumerate(one_shot_examples):
            # Add the example input as a user message - keep it simple
            messages.append({"role": "user", "content": example['input']})
            
            # Add the example output as an assistant message - just the JSON
            example_output = json.dumps(example['output'])
            messages.append({"role": "assistant", "content": example_output})
            
            print(f"Added example with {len(example['input'])} chars input and {len(example_output)} chars output")
    else:
        print("\n==== No RAG examples available ====")
    
    # Add the actual user query - keep it simple and clean
    messages.append({"role": "user", "content": prompt})
    
    # Log what we're sending to the model
    print(f"\n==== Sending prompt to model ({len(prompt)} chars) ====")
    print(f"Prompt: {prompt[:200]}...")
    
    # Log the full conversation for debugging
    print("\n==== FULL CONVERSATION SENT TO MODEL ====")
    for i, msg in enumerate(messages):
        role = msg["role"].upper()
        content = msg["content"]
        print(f"\n[{i+1}] {role}: {content[:500]}" + ("..." if len(content) > 500 else ""))
    print("\n==== END OF CONVERSATION ====")
    
    try:
        # Call OpenAI API with the structured prompt and examples
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.7
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
            "examples_count": len(one_shot_examples) if one_shot_examples else 0
        }