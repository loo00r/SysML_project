from openai import OpenAI
import json
from typing import Dict, Any, List, Optional, Union
from app.core.config import settings

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

            # First pass: count elements at each level
            level_counts: Dict[int, int] = {}
            for el_id, level_index in element_level_indices.items():
                level_counts[level_index] = level_counts.get(level_index, 0) + 1

            if level_counts:
                bottom_level_index = max(level_counts.keys())
                bottom_count = level_counts[bottom_level_index]
            else:
                bottom_level_index = 0
                bottom_count = 0

            # Calculate horizontal offsets so higher levels are centered relative to the bottom level
            level_offsets: Dict[int, float] = {}
            for lvl, count in level_counts.items():
                offset = ((bottom_count - count) / 2) * DiagramPositioning.ELEMENT_X_SPACING
                level_offsets[lvl] = offset

            # Track element index within each level for x positioning
            level_position_indices = {lvl: 0 for lvl in level_counts.keys()}

            # Apply positions using counts and offsets
            for element in elements:
                element_id = element.get("id")
                if not element_id:
                    continue
                    
                level_index = element_level_indices.get(element_id, bottom_level_index)

                # Ensure position counter exists
                if level_index not in level_position_indices:
                    level_position_indices[level_index] = 0
                    level_offsets.setdefault(level_index, 0)

                x_index = level_position_indices[level_index]
                x_pos = DiagramPositioning.get_x_position(x_index) + level_offsets[level_index]
                y_pos = DiagramPositioning.get_y_position(level_index)
                
                # Update element with position
                if "position" not in element:
                    element["position"] = {}
                
                element["position"]["x"] = x_pos
                element["position"]["y"] = y_pos
                
                # Increment count for this level
                level_position_indices[level_index] += 1
            
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

BDD_ENHANCED_PROMPT_TEMPLATE = """
You are an expert SysML architect. Your task is to generate a comprehensive system diagram
in JSON format based on a user's description. The output must be a Block Definition
Diagram (BDD) that may contain nested Internal Block Diagrams (IBDs) for specific blocks.

Required output format:
{
  "diagram_type": "bdd",
  "elements": [
    {
      "id": "block-1", "type": "block", "name": "Flight Controller",
      "internal_diagram": {
        "nodes": [
          {"id": "ibd-cpu", "type": "ibd_block", "name": "Central Processing Unit"},
          {"id": "ibd-memory", "type": "ibd_block", "name": "Memory Module"},
          {"id": "ibd-io", "type": "ibd_block", "name": "I/O Controller"}
        ],
        "edges": [
          {"id": "cpu-memory", "source": "ibd-cpu", "target": "ibd-memory", "label": "Data Bus"},
          {"id": "cpu-io", "source": "ibd-cpu", "target": "ibd-io", "label": "Control Signals"},
          {"id": "memory-io", "source": "ibd-memory", "target": "ibd-io", "label": "Memory Access"}
        ]
      }
    },
    {"id": "sensor-1", "type": "sensor", "name": "GPS"}
  ],
  "relationships": [
    {"source_id": "sensor-1", "target_id": "block-1", "name": "Provides data"}
  ]
}

Rules:
1.  The main structure must be a BDD with "elements" and "relationships".
2.  For elements of type "block" or "processor" that have a complex internal structure,
    add an "internal_diagram" key.
3.  The "internal_diagram" object must contain its own "nodes" and "edges".
4.  "internal_diagram" should ONLY be added if the description implies internal complexity.
5.  All top-level element types must be "block", "sensor", or "processor".
6.  Use unique IDs for all elements across the entire JSON.
7.  Do NOT include position data. Positioning will be handled separately.
8.  **MANDATORY IBD POPULATION: When you create "internal_diagram", you MUST include AT LEAST 2-3 interconnected components mentioned in the user description. For example, if user mentions "CPU and memory module", create separate nodes for each component with connections between them.**
9.  **IBD CONNECTIONS REQUIRED: Internal components must be connected with edges to show data/signal flow. Never create isolated internal components. Each "internal_diagram" must have AT LEAST 2 edges connecting its nodes. For 3 components, create connections like: CPU→Memory, CPU→I/O Controller.**
10. **COMPONENT BREAKDOWN: When user mentions complex components (like "flight controller containing CPU and memory"), break them down into separate internal nodes. Each mentioned sub-component becomes its own ibd_block node.**
11. **MEANINGFUL CONNECTIONS: IBD edges must have descriptive labels showing the type of connection (e.g., "Data Bus", "Control Signals", "Power Supply", "Communication Link").**
12. **MANDATORY EDGES EXAMPLE: For 3 internal components, you must include at least 2-3 edges like: {"id": "cpu-memory", "source": "ibd-cpu", "target": "ibd-memory", "label": "Data Bus"}**
"""

def generate_sysml_diagram(
    prompt: str,
    diagram_type: str,
    one_shot_examples: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a SysML diagram based on the provided prompt and type using OpenAI's API.

    Args:
        prompt: The text description of the system to model.
        diagram_type: The type of diagram to generate ('bdd' or 'bdd_enhanced').
        one_shot_examples: Optional list of RAG examples.

    Returns:
        Dictionary containing the raw diagram and metadata.
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Select the appropriate prompt based on the requested diagram type
    if diagram_type == "bdd_enhanced":
        system_prompt = BDD_ENHANCED_PROMPT_TEMPLATE
        print("\n==== Using BDD_ENHANCED prompt template ====")
    else:  # Default to standard BDD
        system_prompt = SYSML_PROMPT_TEMPLATE
        print("\n==== Using standard BDD prompt template ====")

    messages = [{"role": "system", "content": system_prompt}]

    if one_shot_examples and len(one_shot_examples) > 0:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples ====")
        for example in one_shot_examples:
            example_input = f"System description:\n\n{example['input']}"
            messages.append({"role": "user", "content": example_input})
            example_output = json.dumps(example['output'], indent=2)
            messages.append({"role": "assistant", "content": example_output})

    user_prompt = f"Generate a diagram for the following system description:\n\n{prompt}"
    messages.append({"role": "user", "content": user_prompt})

    print(f"\n==== Sending prompt to model ({settings.OPENAI_GENERATIVE_MODEL}) ====")

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        response_text = response.choices[0].message.content
        raw_diagram_data = json.loads(response_text)

        # Note: We are no longer validating or positioning here.
        # This will be handled in the API layer after parsing the nested data.

        result = {
            "diagram_raw": raw_diagram_data,  # Return raw data for parsing
            "raw_text": prompt,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": bool(one_shot_examples),
            "examples_count": len(one_shot_examples) if one_shot_examples else 0
        }

        print("\n==== Raw Generation Successful ====")
        return result

    except Exception as e:
        print(f"\n==== ERROR in generate_sysml_diagram: {str(e)} ====")
        return {"error": str(e), "diagram_raw": {}}

def generate_diagram(prompt: str, one_shot_examples: List[Dict[str, Any]] = None, additional_context: str = None) -> Dict[str, Any]:
    """
    Legacy function for backward compatibility.
    Generate a diagram based on the provided prompt using OpenAI's API.
    
    Args:
        prompt: The text description of the system to model
        one_shot_examples: Optional list of example inputs and outputs for one-shot learning
        additional_context: Optional additional context to include in the prompt
        
    Returns:
        Dictionary containing the diagram elements and metadata
    """
    # Use the new function with standard BDD type
    result = generate_sysml_diagram(prompt, "bdd", one_shot_examples)
    
    # If we got raw data, we need to process it for backward compatibility
    if "diagram_raw" in result and not result.get("error"):
        raw_diagram_data = result["diagram_raw"]
        
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
        validated_diagram = validate_element_types(raw_diagram_data)
        
        # Apply automatic positioning to the diagram elements
        positioned_diagram = DiagramPositioning.apply_positioning(validated_diagram)
        
        # Return in legacy format
        return {
            "diagram": positioned_diagram,
            "raw_text": result["raw_text"],
            "model_used": result["model_used"],
            "rag_used": result["rag_used"],
            "examples_count": result["examples_count"]
        }
    else:
        # Handle error case
        return {
            "error": result.get("error", "Unknown error"),
            "diagram": {
                "diagram_type": "block",
                "elements": [],
                "relationships": []
            },
            "rag_used": result.get("rag_used", False),
            "examples_count": result.get("examples_count", 0)
        }