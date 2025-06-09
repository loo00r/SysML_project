from openai import OpenAI
import json
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

# Define the SysML element types for better structure
class DiagramTypes:
    BLOCK = "block"

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
            
            # --- Determine element levels based on connectivity ---
            # Build adjacency and inbound count for BFS traversal
            adjacency: Dict[str, List[str]] = {}
            inbound: Dict[str, int] = {}
            for element in elements:
                el_id = element.get("id")
                if el_id:
                    adjacency[el_id] = []
                    inbound.setdefault(el_id, 0)

            for rel in valid_relationships:
                s_id = rel.get("source_id")
                t_id = rel.get("target_id")
                if s_id in adjacency and t_id in adjacency:
                    adjacency[s_id].append(t_id)
                    inbound[t_id] = inbound.get(t_id, 0) + 1

            # Queue starting nodes with no inbound edges
            from collections import deque

            queue = deque([nid for nid, deg in inbound.items() if deg == 0])
            element_level_indices: Dict[str, int] = {nid: 0 for nid in queue}

            visited = set(queue)
            while queue:
                node = queue.popleft()
                for neighbor in adjacency.get(node, []):
                    level = element_level_indices[node] + 1
                    if element_level_indices.get(neighbor, -1) < level:
                        element_level_indices[neighbor] = level
                    inbound[neighbor] -= 1
                    if inbound[neighbor] <= 0 and neighbor not in visited:
                        queue.append(neighbor)
                        visited.add(neighbor)

            # Default any unvisited elements to level 0
            for el_id in adjacency.keys():
                element_level_indices.setdefault(el_id, 0)
            
            if element_level_indices:
                max_level = max(element_level_indices.values())
                for el_id in element_level_indices:
                    element_level_indices[el_id] = max_level - element_level_indices[el_id]

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
You are a SysML expert assisting a software tool.  When given a system description
and optional example diagrams, produce a Block Definition Diagram in JSON with the
structure shown below.

Required output format:
{
  "diagram_type": "block",
  "elements": [
    {"id": "sensor-1", "type": "sensor", "name": "...", "description": "...", "properties": {...}}
  ],
  "relationships": [
    {"source_id": "sensor-1", "target_id": "processor-1", "type": "smoothstep", "name": "..."}
  ]
}

Rules:
1. Allowed element types: "block", "sensor", "processor".  Use "block" for anything else.
2. Keep descriptions concise.
3. Use unique IDs for all elements.
4. Do **not** include position data in the response.
5. Only create logical connections relevant to the description.
6. Follow the style of provided examples without copying them verbatim.

Examples may be provided in the conversation before the actual request.  Use them
to guide your structure, then return only a single JSON object in your final reply.
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
    
    # Start building the messages list with our detailed system prompt template
    messages = [
        {"role": "system", "content": SYSML_PROMPT_TEMPLATE}
    ]
    
    # Log RAG usage
    if one_shot_examples and len(one_shot_examples) > 0:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples ====")
        
        # Add one-shot examples if provided with clear structure
        for i, example in enumerate(one_shot_examples):
            # Add the example input as a user message with clear formatting
            example_input = f"System description:\n\n{example['input']}"
            messages.append({"role": "user", "content": example_input})
            
            # Add the example output as an assistant message - formatted JSON
            example_output = json.dumps(example['output'], indent=2)
            messages.append({"role": "assistant", "content": example_output})
            
            print(f"Added example with {len(example['input'])} chars input and {len(example_output)} chars output")
    else:
        print("\n==== No RAG examples available ====")
    
    # Add the actual user query with clear formatting
    user_prompt = f"Generate a block diagram for the following system description:\n\n{prompt}"
    messages.append({"role": "user", "content": user_prompt})
    
    # Log what we're sending to the model
    print(f"\n==== Sending prompt to model ({len(user_prompt)} chars) ====")
    print(f"Prompt: {user_prompt[:200]}...")
    
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
            temperature=0.1
        )
        
        # Extract and parse the JSON response
        response_text = response.choices[0].message.content
        diagram_data = json.loads(response_text)
        
        # Validate and correct element types to ensure they are only 'block', 'sensor', or 'processor'
        def validate_element_types(diagram):
            valid_types = ['block', 'sensor', 'processor']
            if 'elements' in diagram:
                for element in diagram['elements']:
                    # Check if type exists and is valid
                    if 'type' not in element or element['type'] not in valid_types:
                        # Default to 'block' if type is missing or invalid
                        original_type = element.get('type', 'unknown')
                        element['type'] = 'block'
                        print(f"Warning: Changed invalid element type '{original_type}' to 'block' for element {element.get('id', 'unknown')}")
            return diagram
        
        # Apply validation to ensure only allowed types are used
        validated_diagram = validate_element_types(diagram_data)
        
        # Apply automatic positioning to the diagram elements
        positioned_diagram = DiagramPositioning.apply_positioning(validated_diagram)
        
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