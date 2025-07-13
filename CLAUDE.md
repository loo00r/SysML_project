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

Task: Implement Embedded IBD Diagrams in Frontend

Task: Implement Embedded IBD Diagrams in Frontend

### Context
We want to enable users to open and edit IBD (Internal Block Diagram) views nested within blocks of BDD (Block Definition Diagram) directly in the frontend. This feature allows better modularity and logical separation of internal structure.

This is a purely frontend-focused task.

---

### Goal
Allow users to open an IBD diagram as a new tab when clicking on a block node in the BDD diagram. Each IBD diagram should be treated as a separate diagram instance managed in the Zustand store.

---

### Step-by-Step Implementation

#### 1. Update Diagram Types in Zustand Store
- Open src/store/diagramStore.ts.
- Extend DiagramInstance interface with new type:
  
  type DiagramInstance = {
    id: string;
    name: string;
    type: 'bdd' | 'ibd';
    nodes: Node[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
  }
  
- Ensure the store allows opening and closing diagrams of both types.

#### 2. Add Button in BlockNode Component
- Open frontend/src/components/nodes/BlockNode.tsx.
- Add a button or icon (e.g. magnifying glass) to trigger IBD open.
- On click, dispatch a Zustand action to create a new diagram tab:
  
  onClick={() => openNewDiagramTab({
    id: `ibd-${node.id}`,
    name: `${node.data.label} - IBD`,
    type: 'ibd',
    nodes: [],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })}
  

#### 3. Render Conditional Editors Based on Diagram Type
- Open src/components/DiagramWorkspace.tsx.
- Modify canvas logic to render different sets of node types depending on diagram type:
  
  const nodeTypes = activeDiagram.type === 'ibd' ? ibdNodeTypes : bddNodeTypes;
  
- Use conditional rendering to support layout or styling differences.

#### 4. Create Separate Node Types for IBD
- Add components like PortNode.tsx, ConnectionNode.tsx in src/components/nodes/.
- Register them in the ibdNodeTypes map.

#### 5. Display Visual Indicator for Nested Diagram
- In BlockNode.tsx, if an IBD already exists for a block, show a small visual indicator (e.g., a badge or dot).
- Optional: add tooltip "Open internal diagram".

---

### Optional Future Work (Not in Scope)
- Saving IBD diagrams to backend and linking to block_id
- Generating IBD content from GPT

---

### Acceptance Criteria
- Clicking a block node opens a new tab of type ibd with its own canvas.
- Zustand correctly tracks multiple diagrams.
- Each IBD tab is independently editable.
- IBD tabs are distinguishable by name and type.
- Default IBD opens empty, but logic allows restoring saved ones in the future.

---

### Notes
- This task focuses only on frontend logic and UI changes.
- Reuse as much of the current tab management system as possible.
- UX should remain consistent with the existing diagram editor.