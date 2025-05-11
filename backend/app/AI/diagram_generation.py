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
      "type": "block | activity | action",
      "name": "element_name",
      "description": "description_text",
      "properties": []
    }
  ],
  "relationships": [
    {
      "source_id": "source_element_id",
      "target_id": "target_element_id",
      "type": "composition | aggregation | dependency | flow",
      "name": "optional_relationship_name"
    }
  ]
}

For disaster management scenarios, particularly focus on sensor systems, data transmission, and decision-making components.
"""

def generate_diagram(prompt: str) -> Dict[str, Any]:
    """
    Generate a diagram based on the provided prompt using OpenAI's API.
    
    Args:
        prompt: The text description of the system to model
        
    Returns:
        Dictionary containing the diagram elements and metadata
    """
    # Initialize the OpenAI client with the API key
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Combine the system prompt with the user prompt
    full_prompt = f"{SYSML_PROMPT_TEMPLATE}\n\nSystem Description: {prompt}"
    
    try:
        # Call OpenAI API with the structured prompt
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=[
                {"role": "system", "content": "You are a SysML modeling expert specialized in disaster management systems."},
                {"role": "user", "content": full_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Extract and parse the JSON response
        response_text = response.choices[0].message.content
        diagram_data = json.loads(response_text)
        
        # Add metadata about the generation
        return {
            "diagram": diagram_data,
            "raw_text": prompt,
            "model_used": settings.OPENAI_GENERATIVE_MODEL
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
            }
        }