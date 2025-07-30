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

Task: Implement Upsert Logic for IBD Storage to Prevent Duplicates

Task Type: Backend / Database Logic

Context
The current system creates a new row in the internal_block_diagrams table for every AI generation, which can lead to a cluttered database with multiple entries for the same block. The desired behavior is to maintain only one IBD record per block within a parent diagram. If a record already exists, it should be updated with the new data; otherwise, a new record should be created.

Goal
To refactor the IBD saving mechanism to perform an "upsert" (update or insert) operation, ensuring that the database remains clean and free of duplicate IBD records for the same block.

Acceptance Criteria
✅ When the AI generates an IBD for a block that does not already have one, a new row is created in the internal_block_diagrams table.
✅ When the AI generates an IBD for a block that already has an entry in the table, the existing row is updated with the new nodes and edges, and no new row is created.
✅ The get_ibd_by_block_id function is reverted to its simpler, original form, as duplicates will no longer be possible.

Technical Implementation Details

Update the IBD CRUD Module:

File to modify: backend/app/crud/crud_ibd.py.

Action: We need to add functions to check for an existing IBD and to update it. Replace the entire content of the file with the code below, which includes the new logic and reverts the old fix.

Python

# In backend/app/crud/crud_ibd.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc
from app.database import models
from app.database.models import InternalBlockDiagramCreate
from typing import List, Dict, Any

async def get_ibd_by_parent_and_block(db: AsyncSession, parent_bdd_id: int, block_id: str):
    """Checks if an IBD exists for a specific block in a specific parent diagram."""
    stmt = select(models.InternalBlockDiagram).filter_by(
        parent_bdd_diagram_id=parent_bdd_id,
        parent_block_id=block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def create_ibd(db: AsyncSession, ibd: InternalBlockDiagramCreate) -> models.InternalBlockDiagram:
    """Creates a new IBD record."""
    db_ibd = models.InternalBlockDiagram(**ibd.model_dump())
    db.add(db_ibd)
    await db.commit()
    await db.refresh(db_ibd)
    return db_ibd

async def update_ibd(db: AsyncSession, db_ibd: models.InternalBlockDiagram, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]):
    """Updates an existing IBD's nodes and edges."""
    db_ibd.nodes = nodes
    db_ibd.edges = edges
    await db.commit()
    await db.refresh(db_ibd)
    return db_ibd

async def get_ibd_by_block_id(db: AsyncSession, block_id: str):
    """
    Gets an IBD by its parent block ID. Reverted to simpler logic
    as duplicates are no longer expected.
    """
    # Note: This will fail if multiple diagrams reuse the same block_id.
    # The long-term fix would be to query by parent_diagram_id AND block_id.
    stmt = select(models.InternalBlockDiagram).filter_by(parent_block_id=block_id)
    result = await db.execute(stmt)
    # Assuming one diagram is worked on at a time, we take the newest if somehow duplicates still occur.
    return result.scalars().first()
Implement the Upsert Logic in the API Endpoint:

File to modify: backend/app/database/rag_router.py.

Action: Find the loop where IBDs are saved (for ibd_data in ibd_to_create:). Replace that entire loop with the new logic below, which checks for existence and then decides whether to create or update.

Current Code (to be replaced):

Python

# for ibd_data in ibd_to_create:
#     new_ibd = InternalBlockDiagramCreate(
#         parent_bdd_diagram_id=db_diagram.id,
#         parent_block_id=ibd_data["parent_block_id"],
#         nodes=ibd_data["nodes"],
#         edges=ibd_data["edges"],
#         source="ai"
#     )
#     await crud_ibd.create_ibd(db=db, ibd=new_ibd)
New Code (to replace the block above):

Python

# In backend/app/database/rag_router.py

# --- New Upsert Logic ---
for ibd_data in ibd_to_create:
    existing_ibd = await crud_ibd.get_ibd_by_parent_and_block(
        db=db,
        parent_bdd_id=db_diagram.id,
        block_id=ibd_data["parent_block_id"]
    )

    if existing_ibd:
        # IBD already exists -> UPDATE it
        print(f"DEBUG: Found existing IBD for block {ibd_data['parent_block_id']}. Updating...")
        await crud_ibd.update_ibd(
            db=db,
            db_ibd=existing_ibd,
            nodes=ibd_data["nodes"],
            edges=ibd_data["edges"]
        )
    else:
        # IBD does not exist -> CREATE it
        print(f"DEBUG: No existing IBD for block {ibd_data['parent_block_id']}. Creating new...")
        new_ibd = InternalBlockDiagramCreate(
            parent_bdd_diagram_id=db_diagram.id,
            parent_block_id=ibd_data["parent_block_id"],
            nodes=ibd_data["nodes"],
            edges=ibd_data["edges"],
            source="ai"
        )
        await crud_ibd.create_ibd(db=db, ibd=new_ibd)