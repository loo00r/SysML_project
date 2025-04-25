from fastapi import APIRouter
from app.AI.diagram_generation import generate_diagram

router = APIRouter(prefix="/create-diagram", tags=["Create Diagram"])

@router.get("/")
def create_diagram():
    """
    Create a diagram based on the provided prompt using OpenAI's API.
    """
    prompt = "Create a diagram of a cat"
    diagram = generate_diagram(prompt)
    return {"diagram": diagram}

