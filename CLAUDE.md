# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered SysML diagram generator built with FastAPI (backend) and React (frontend). The system uses OpenAI's GPT models to generate SysML diagrams from natural language descriptions, with optional Retrieval-Augmented Generation (RAG) using pgvector for semantic search. The application runs in Docker containers with PostgreSQL as the database.

## Development Commands

### Docker Development (Primary)
```bash
# Build and start all services
docker-compose up --build

# Start services without rebuilding
docker-compose up

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Install dependencies with Poetry
poetry install

# Run development server locally (requires PostgreSQL)
poetry run uvicorn app.main:app --reload --port 8000

# Run tests
poetry run pytest

# Database migrations
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"
```

### Frontend Development
```bash
# Navigate to frontend directory  
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Backend Structure
- **FastAPI Application** (`app/main.py`): Main API server with CORS middleware
- **API Routes** (`app/api/api_v1.py`): Router aggregation for all endpoints
- **AI Generation** (`app/AI/diagram_generation.py`): OpenAI integration for SysML diagram generation
- **Database Models** (`app/database/models.py`): SQLAlchemy models for embeddings, templates, and components
- **RAG System** (`app/database/rag_router.py`): Retrieval-Augmented Generation endpoints
- **Configuration** (`app/core/config.py`): Pydantic settings management

### Frontend Structure
- **React + TypeScript** with Material-UI components
- **State Management**: Zustand store (`src/store/diagramStore.ts`)
- **Diagram Editor**: React Flow integration for visual editing
- **AI Integration**: Hooks for AI generation (`src/hooks/useAIGeneration.ts`)
- **SysML Components**: Custom nodes and edges for SysML elements

### Key Components

#### SysML Node Types
- `block`: General system blocks
- `sensor`: Sensor components  
- `processor`: Processing components
- Located in `frontend/src/components/nodes/`

#### Database Schema
- `diagram_embeddings`: Stores diagrams with vector embeddings for RAG
- `sysml_templates`: Reusable diagram templates
- `uav_components`: UAV-specific component definitions

## Environment Configuration

Required environment variables in `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_GENERATIVE_MODEL=gpt-4o-mini
DATABASE_URL=postgresql+psycopg2://postgres:postgres@db:5432/postgres
DB_URL=postgresql+asyncpg://postgres:postgres@db:5432/postgres
```

## API Endpoints

- `GET /api/v1/ping`: Health check
- `POST /api/v1/create-diagram/`: Generate diagram without RAG
- `POST /api/v1/rag/generate-diagram-with-context/`: Generate diagram with RAG
- Database endpoints for embeddings, templates, and components

## Development Notes

- Backend uses Poetry for dependency management
- Frontend uses Vite for development and building
- Database migrations managed with Alembic
- pgvector extension required for semantic search
- OpenAI embeddings use 1536-dimensional vectors
- Diagram positioning is handled automatically by Dagre layout algorithm

### Changelog Maintenance

**After completing each task, you must update the changelog:**

1. **Update CHANGELOG.md**: Add a summary of the changes to the `[Unreleased]` section
2. **Increment Version**: Create a new version entry with incremented patch version (e.g., 1.1.0 → 1.1.1)
3. **Update .env**: Update both `APP_VERSION` and `VITE_APP_VERSION` to match the new version
4. **Categorize Changes**: Use the following categories:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for any bug fixes
   - `Security` for vulnerability fixes

**Example workflow:**
```markdown
## [Unreleased]

## [1.1.1] - 2025-07-08
### Added
- New feature implementation

### Fixed  
- Bug fix description
```

**Important**: Always follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/) principles.

## Testing

Backend tests are located in `backend/app/test/` and use pytest with async support. Run tests with `poetry run pytest` in the backend directory.

## Deployment

The application is containerized and deploys with Docker Compose. Services:
- `backend`: FastAPI server on port 8000
- `frontend`: Nginx serving React build on port 3000  
- `db`: PostgreSQL with pgvector on port 5432


## Current State

The application now features a **tabbed interface** for managing multiple diagrams simultaneously. Key components include:

### Multi-Diagram State Management
- **DiagramInstance Interface**: Each tab represents a diagram with `id`, `name`, `type`, `nodes`, `edges`, and timestamps
- **Zustand Store**: Manages `openDiagrams` array and `activeDiagramId` with actions for opening, closing, and switching tabs
- **Legacy Compatibility**: Maintains backward compatibility with existing single-diagram operations

### Tabbed Interface Components
- **DiagramTabs** (`src/components/DiagramTabs.tsx`): Tab bar with Material-UI styling, close buttons, and add new tab functionality
- **DiagramWorkspace** (`src/components/DiagramWorkspace.tsx`): Main ReactFlow canvas area with integrated toolbar and panels
- **App Layout**: Flex-based layout with sidebar, workspace, and generator panel

### Key Features
- Browser-like tab experience with switching and closing
- Automatic tab creation from AI generation
- Empty state handling when no diagrams are open
- All original functionality preserved (save, export, validation, etc.)

### new task

Task: Populate IBD Nodes with AI-Generated Descriptions and Properties

Task Type: Backend / AI Prompt Engineering

Context
Currently, when the AI generates an Internal Block Diagram (IBD), the nodes within it are created with only a name (label). They lack the description and properties fields that BDD nodes have. This limits the level of detail in the diagrams. We need to diagnose whether the AI is failing to generate this data or if our backend is failing to process it, and then implement a complete fix.

Goal
To ensure that nodes within an AI-generated IBD are created and saved with meaningful description and properties fields, provided the user's prompt contains sufficient detail.

Acceptance Criteria
✅ When a prompt provides details about an internal component (e.g., "the CPU is a 3.2 GHz quad-core processor"), the corresponding IBD node is saved to the database with a relevant description and/or properties.
✅ The BDD_ENHANCED_PROMPT_TEMPLATE is updated to explicitly instruct the AI to generate these details for internal nodes.
✅ The backend parsing logic correctly extracts and saves the full node object, including these new fields.
✅ The final IBD data, when retrieved via the API, contains the descriptions and properties.

Technical Implementation Details

This is a two-part task: first, we will enhance the AI's instructions, and second, we will ensure our code correctly handles the data.

Strengthen the AI Prompt:

File to modify: backend/app/AI/diagram_generation.py.

Action: Modify the BDD_ENHANCED_PROMPT_TEMPLATE. We need to update both the JSON example and the rules to explicitly ask for details in the internal diagram.

Find this section in the prompt's example:

JSON

"internal_diagram": {
  "nodes": [
    {"id": "ibd-cpu", "type": "ibd_block", "name": "Central Processing Unit"},
    // ...
  ],
And change it to include the new fields:

JSON

"internal_diagram": {
  "nodes": [
    {"id": "ibd-cpu", "type": "ibd_block", "name": "CPU", "description": "Main processing unit", "properties": {"clock_speed": "3.2 GHz"}},
    // ...
  ],
Then, find the Rules: section in the prompt and add a new rule:

// ... after the other rules ...
12. **INCLUDE IBD DETAILS: For each node inside an "internal_diagram", you MUST also generate 'description' and 'properties' fields if the user's prompt provides relevant details. Keep them concise.**
Verify Backend Parsing Logic:

File to review: backend/app/database/rag_router.py.

Action: This step is primarily for verification. The current parsing logic in the for ibd_data in ibd_to_create: loop should already be correctly handling the full node objects, as it uses ibd_data.get("nodes", []).

The assistant should confirm that this logic passes the entire node object (including any new description and properties fields) to the InternalBlockDiagramCreate model. Since the nodes are stored in a flexible JSON column in the database, no database schema changes are required.