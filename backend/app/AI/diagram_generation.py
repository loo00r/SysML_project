from openai import OpenAI
from app.core.config import settings


def generate_diagram(prompt: str) -> str:
    """
    Generate a diagram based on the provided prompt using OpenAI's API.
    """
    # Initialize the OpenAI client with the API key
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.responses.create(
        # model=settings.OPENAI_GENERATIVE_MODEL,
        model=settings.OPENAI_GENERATIVE_MODEL,
        input=prompt,
    )

    return response.output_text