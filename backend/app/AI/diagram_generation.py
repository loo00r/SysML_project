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
BDD_ONLY_PROMPT_TEMPLATE = """
You are a SysML expert specializing in Block Definition Diagrams (BDD).

TASK: Produce a SysML Block Definition Diagram in JSON format.

GOAL:
Generate a Block Definition Diagram that captures ONLY the high-level system structure described by the user.

Required output format:
{
  "diagram_type": "bdd",
  "elements": [
    {
    "id": "sensor-1", 
    "type": "sensor", 
    "name": "...", 
    "description": "...", 
    "properties": {...}
    },
    {
    "id": "block-1",
    "type": "block",  # allowed: "block", "sensor", "processor"
    "name": "Descriptive Name",
    "description": "Concise explanation of the block's role",
    "properties": {"optional_key": "value"}  # include only when relevant
    } 
  ],
  "relationships": [
    {"source_id": "sensor-1", "target_id": "block-1", "type": "smoothstep", "name": "..."}
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

IBD_ONLY_PROMPT_TEMPLATE = """
You are a SysML expert specializing in Internal Block Diagrams (IBD).

TASK: Produce an Internal Block Diagram in JSON format for a single block.

GOAL:
Describe ONLY the internal components and their connections that exist inside the block the user mentions. Do not generate any surrounding BDD context.

Required output format:
{
  "diagram_type": "ibd",
  "parent_block_id": "...",  # include when the block identifier is provided
  "nodes": [
    {
      "id": "component-1",
      "type": "ibd_block",
      "name": "Component Name",
      "description": "Concise explanation of the component's role",
      "properties": {"optional_key": "value"}  # include only when relevant
    }
  ],
  "edges": [
    {"id": "edge-1", "source": "component-1", "target": "component-2", "label": "Connection description"}
  ]
}

Rules:
1. Create 1-6 internal components that match the block description. All nodes MUST use type "ibd_block".
2. Provide concise descriptions and include properties when the prompt supplies useful details.
3. Connect every internal component with meaningful edges so no node is isolated. Edge labels must explain the interaction (e.g., "Power Supply", "Data Bus").
4. Use unique IDs across all nodes and edges.
5. Do **not** include position or layout data.
6. Return exactly one valid JSON object following the required format.
"""

SMD_PROMPT_TEMPLATE = """
You are a SysML behavioral modeling specialist.

TASK: Generate a State Machine Diagram (SMD) in JSON format for a specific block.

CONTEXT:
- Parent System: {system_context}
- Block Name: {block_name}
- Block Description: {block_description}
- Block Type: {block_type}
- Block ID: {block_id}

GOAL:
Capture the block's lifecycle using states (nodes) and transitions (edges) that describe how it behaves over time.

Required output format:
{{
  "diagram_type": "smd",
  "parent_block_id": "{block_id}",
  "parent_block_name": "{block_name}",
  "nodes": [
    {{"id": "init", "type": "initial"}},
    {{"id": "state-operational", "type": "state", "name": "Operational"}},
    {{"id": "state-fault", "type": "state", "name": "Fault"}},
    {{"id": "final", "type": "final"}}
  ],
  "edges": [
    {{"id": "edge-start", "source": "init", "target": "state-operational", "label": "initialize"}},
    {{"id": "edge-fault", "source": "state-operational", "target": "state-fault", "label": "error_detected"}},
    {{"id": "edge-reset", "source": "state-fault", "target": "state-operational", "label": "reset"}},
    {{"id": "edge-shutdown", "source": "state-operational", "target": "final", "label": "shutdown"}}
  ]
}}

RULES:
1. Nodes must use types "initial", "state", or "final". Include exactly one "initial" node. Add a "final" node when shutdown/end behavior is relevant.
2. Provide 4–8 nodes total (including initial/final). Use descriptive IDs such as "state-charging" and readable names for operational states.
3. Edges represent transitions. Every edge requires source, target, and a concise label describing the trigger or condition (e.g., "enable_autopilot").
4. Ensure no operational state is isolated: each must have at least one incoming and one outgoing edge.
5. Labels should be short verbs/phrases. Use an empty string only when the transition occurs automatically.
6. Do NOT include coordinates, layout data, or extra fields. Return exactly one JSON object matching the format above.
7. Tailor the lifecycle to the provided block and domain context (automotive, aerospace, robotics, energy, etc.).

DOMAIN EXAMPLES (for inspiration only):
- Vehicle control: init → Off → Driving → Manual → Autopilot → Parking → Charging → Final
- Flight computer: init → Boot → Standby → Active → Safe Mode → Final
- Industrial robot: init → Homing → Ready → Executing → Paused → Recovery → Final
- Battery management: init → Idle → Charging → Balancing → Fault → Final

Use these patterns as inspiration, but align the final nodes and edges with the specific block description.
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
          {"id": "ibd-cpu", "type": "ibd_block", "name": "CPU", "description": "Main processing unit", "properties": {"clock_speed": "3.2 GHz"}},
          {"id": "ibd-memory", "type": "ibd_block", "name": "Memory Module", "description": "System memory storage", "properties": {"capacity": "16 GB", "type": "DDR4"}},
          {"id": "ibd-io", "type": "ibd_block", "name": "I/O Controller", "description": "Input/output management", "properties": {"ports": "USB 3.0, HDMI"}}
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
13. **INCLUDE IBD DETAILS: For each node inside an "internal_diagram", you MUST also generate 'description' and 'properties' fields if the user's prompt provides relevant details. Keep them concise.**
"""

def generate_sysml_diagram(
    prompt: str,
    diagram_type: str,
    one_shot_examples: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a SysML diagram based on the provided prompt and type using OpenAI's API.

    This function uses the chain prompting architecture where:
    - 'bdd' generates ONLY block structure without nested internal diagrams
    - 'ibd' generates ONLY internal structure for a specific block
    - 'bdd_enhanced' is DEPRECATED (generates BDD with nested IBD - lower quality)

    For best quality, use:
    1. generate_sysml_diagram(prompt, 'bdd') for block structure
    2. generate_ibd_diagram() for each block's internal structure (with full context)

    Args:
        prompt: The text description of the system to model.
        diagram_type: The type of diagram to generate:
            - 'bdd': Block Definition Diagram (recommended, uses BDD_ONLY_PROMPT_TEMPLATE)
            - 'ibd': Internal Block Diagram (standalone, uses IBD_ONLY_PROMPT_TEMPLATE)
            - 'bdd_enhanced': DEPRECATED - nested approach with lower quality
        one_shot_examples: Optional list of RAG examples.

    Returns:
        Dictionary containing the raw diagram and metadata:
        {
            "diagram_raw": dict,  # Raw AI-generated diagram structure
            "raw_text": str,      # Original user prompt
            "model_used": str,    # OpenAI model name
            "rag_used": bool,     # Whether RAG examples were used
            "examples_count": int # Number of RAG examples used
        }
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Select the appropriate prompt based on the requested diagram type
    if diagram_type == "bdd_enhanced":
        # DEPRECATED: Use chain prompting instead (bdd + generate_ibd_diagram)
        system_prompt = BDD_ENHANCED_PROMPT_TEMPLATE
        print("\n==== WARNING: Using DEPRECATED BDD_ENHANCED prompt template ====")
        print("==== Recommendation: Use 'bdd' + generate_ibd_diagram() for better quality ====")
    elif diagram_type == "ibd":
        system_prompt = IBD_ONLY_PROMPT_TEMPLATE
        print("\n==== Using IBD-only prompt template ====")
    else:  # Default to standard BDD (recommended for chain prompting)
        system_prompt = BDD_ONLY_PROMPT_TEMPLATE
        print("\n==== Using BDD-only prompt template (chain prompting mode) ====")

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

def generate_ibd_diagram(
    block_id: str,
    block_name: str,
    block_description: str,
    block_type: str,
    system_context: str,
    parent_relationships: List[Dict],
    one_shot_examples: List[Dict] = None
) -> Dict[str, Any]:
    """
    Generate IBD for a specific block using chain prompting with full context from BDD.

    This is the SECOND step in chain prompting:
    BDD Generation → IBD Generation (this function)

    Args:
        block_id: ID of the block from BDD
        block_name: Name of the block
        block_description: Description from BDD
        block_type: Type (block, processor, etc.)
        system_context: Overall system description
        parent_relationships: How this block connects to others in BDD
        one_shot_examples: RAG examples of similar IBDs

    Returns:
        Dictionary containing:
        - ibd_raw: The generated IBD structure
        - block_id: ID of parent block
        - block_name: Name of parent block
        - model_used: OpenAI model used
        - rag_used: Whether RAG examples were used
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Format relationships for context
    rel_text = "\n".join([
        f"- {r.get('source', 'Unknown')} → {r.get('target', 'Unknown')}: {r.get('label', 'Connection')}"
        for r in parent_relationships
    ]) if parent_relationships else "None"

    # Build context-aware prompt using the existing IBD_ONLY_PROMPT_TEMPLATE
    # Add context information before the template
    context_intro = f"""
CONTEXT FOR THIS IBD GENERATION:
- Parent System: {system_context}
- Block Name: {block_name}
- Block ID: {block_id}
- Block Type: {block_type}
- Block Description: {block_description}
- Block Connections in Parent BDD:
{rel_text}

TASK: Generate an Internal Block Diagram for the block "{block_name}" showing its internal components and their connections.

"""

    # Combine context with the existing template
    system_prompt = context_intro + IBD_ONLY_PROMPT_TEMPLATE

    messages = [{"role": "system", "content": system_prompt}]

    # Add RAG examples if provided
    if one_shot_examples and len(one_shot_examples) > 0:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples for IBD ====")
        for example in one_shot_examples:
            example_input = f"Generate IBD for block: {example.get('input', 'Example block')}"
            messages.append({"role": "user", "content": example_input})
            example_output = json.dumps(example.get('output', {}), indent=2)
            messages.append({"role": "assistant", "content": example_output})

    # User prompt
    user_prompt = f"Generate internal block diagram for '{block_name}'."
    messages.append({"role": "user", "content": user_prompt})

    print(f"\n==== Generating IBD for block: {block_name} (ID: {block_id}) ====")

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        response_text = response.choices[0].message.content
        ibd_data = json.loads(response_text)

        # Validate output structure
        if "nodes" not in ibd_data or "edges" not in ibd_data:
            raise ValueError("IBD must contain 'nodes' and 'edges' fields")

        if not isinstance(ibd_data["nodes"], list) or not isinstance(ibd_data["edges"], list):
            raise ValueError("IBD 'nodes' and 'edges' must be arrays")

        if len(ibd_data["nodes"]) == 0:
            raise ValueError("IBD must contain at least one node")

        # Build result
        result = {
            "ibd_raw": ibd_data,
            "block_id": block_id,
            "block_name": block_name,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": bool(one_shot_examples),
        }

        print(f"\n==== IBD Generation Successful for {block_name} ====")
        print(f"Generated {len(ibd_data['nodes'])} nodes and {len(ibd_data['edges'])} edges")

        return result

    except json.JSONDecodeError as e:
        print(f"\n==== ERROR: Invalid JSON in IBD generation for {block_name}: {str(e)} ====")
        return {"error": f"Invalid JSON response: {str(e)}", "ibd_raw": {}}
    except ValueError as e:
        print(f"\n==== ERROR: Validation failed for {block_name}: {str(e)} ====")
        return {"error": str(e), "ibd_raw": {}}
    except Exception as e:
        print(f"\n==== ERROR generating IBD for {block_name}: {str(e)} ====")
        return {"error": str(e), "ibd_raw": {}}




def generate_state_machine_diagram(
    block_id: str,
    block_name: str,
    block_description: str,
    block_type: str,
    system_context: str,
    one_shot_examples: List[Dict] = None
) -> Dict[str, Any]:
    """
    Generate an SMD for a specific block using chain prompting with behavioral context.

    This is part of the chain prompting workflow:
    BDD Generation → SMD Generation (this function)
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    system_prompt = SMD_PROMPT_TEMPLATE.format(
        system_context=system_context,
        block_name=block_name,
        block_description=block_description,
        block_type=block_type,
        block_id=block_id
    )

    messages = [{"role": "system", "content": system_prompt}]

    if one_shot_examples:
        print(f"
==== Using {len(one_shot_examples)} RAG examples for SMD ====")
        for example in one_shot_examples:
            example_input = example.get("input", block_name)
            messages.append({"role": "user", "content": f"Generate SMD for block: {example_input}"})
            messages.append({"role": "assistant", "content": json.dumps(example.get("output", {}), indent=2)})

    user_prompt = f"Generate state machine diagram for '{block_name}'."
    messages.append({"role": "user", "content": user_prompt})

    print(f"
==== Generating SMD for block: {block_name} (ID: {block_id}) ====")

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        response_text = response.choices[0].message.content
        smd_data = json.loads(response_text)

        if "nodes" not in smd_data or "edges" not in smd_data:
            raise ValueError("SMD must contain 'nodes' and 'edges' fields")
        if not isinstance(smd_data["nodes"], list) or not isinstance(smd_data["edges"], list):
            raise ValueError("SMD 'nodes' and 'edges' must be arrays")
        if len(smd_data["nodes"]) == 0:
            raise ValueError("SMD must contain at least one node")

        print(f"
==== SMD Generation Successful for {block_name} ====")
        print(f"Generated {len(smd_data['nodes'])} nodes and {len(smd_data['edges'])} edges")

        return {
            "smd_raw": smd_data,
            "block_id": block_id,
            "block_name": block_name,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": bool(one_shot_examples),
        }

    except json.JSONDecodeError as e:
        print(f"
==== ERROR: Invalid JSON in SMD generation for {block_name}: {str(e)} ====")
        return {"error": f"Invalid JSON response: {str(e)}", "smd_raw": {}}
    except ValueError as e:
        print(f"
==== ERROR: Validation failed for {block_name}: {str(e)} ====")
        return {"error": str(e), "smd_raw": {}}
    except Exception as e:
        print(f"
==== ERROR generating SMD for {block_name}: {str(e)} ====")
        return {"error": str(e), "smd_raw": {}}

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
