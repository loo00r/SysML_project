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

Task SMD-06a — Remove top/bottom handles on State and Choice (Initial/Final keep all four)

Goal
For SMD diagrams, State and Choice nodes should expose only two handles: LEFT (target/inbound) and RIGHT (source/outbound). Remove TOP and BOTTOM handles entirely for these two node types. Initial and Final keep all four visual handles as before (with existing validation rules still active: Initial remains source-only; right/bottom remain disallowed as targets globally).

Scope of Work

1.  Node handle config
    

*   Update StateNode and ChoiceNode components to render exactly two handles:• left: isTarget = true, isSource = false• right: isTarget = false, isSource = true
    
*   Do not render top/bottom handles for these node types at all.
    
*   Keep InitialNode and FinalNode unchanged (all four handles visible).
    

2.  Connection validation (defense in depth)
    

*   In validateConnection/onConnect guard for SMD edges, add a type-aware rule:• if target node type ∈ {state, choice} then reject targetPosition ∈ {Top, Bottom}.
    
*   Keep existing global policy (no inbound to RIGHT/BOTTOM for any node), so this is largely a safeguard for legacy/imported data.
    

3.  Normalization/migration (rehydrate + Test Mode import)
    

*   In normalizeSmdTargetSide(edge, targetNode):• if targetNode.type ∈ {state, choice} and targetPosition === Top, remap to Left.• if targetPosition ∈ {Right, Bottom}, keep the existing remap to Left/Top logic, but for state/choice always prefer Left.
    
*   Persist normalized edges immediately after import/rehydrate to avoid flip-flop across reloads.
    

4.  Arrow overlay
    

*   Since top/bottom handles no longer exist on state/choice, ensure the inbound-sides hook cannot report Top/Bottom for these nodes.
    
*   Result: state/choice only ever display a left-side inbound arrow.
    

5.  Test Mode (JSON → SMD) and Dagre
    

*   When flexiblePositions is enabled, bias connection anchoring for state/choice to left (targets) and right (sources).
    
*   If the auto-router chooses Top/Bottom for state/choice targets, override to Left before edge creation.
    

Acceptance Criteria

1.  State and Choice nodes render only two handles (left target, right source). No top/bottom dots on these nodes. Initial and Final remain with four handles.
    
2.  It is impossible to connect an inbound transition to the top or bottom of State/Choice in the UI.
    
3.  Imported/Test-Mode diagrams that tried to target Top/Bottom on State/Choice are automatically normalized to Left; no warnings or duplicate arrows appear.
    
4.  Arrow overlays on State/Choice only render on the left side.
    
5.  No regressions for labels, arrows, or validation on Initial/Final nodes.
    

Manual Test Plan

*   Try to create edges into the top or bottom of a State and a Choice: no handle appears, and validation blocks any forced attempts.
    
*   Import a JSON that targets Top on a State: after import, the edge targets Left and the arrow shows on the left.
    
*   Create typical flows: Initial → State → Choice → Final. Verify handles behave as specified and arrows look correct.
    
*   Reload (rehydrate) and undo/redo to ensure normalization persists and nothing flips back to Top/Bottom.
    

Files Likely Touched

*   frontend/src/components/nodes/smd/StateNode.tsx
    
*   frontend/src/components/nodes/smd/ChoiceNode.tsx
    
*   frontend/src/edges/smdTransition/validateConnection.ts (or equivalent)
    
*   frontend/src/utils/smdTransition.ts (normalizeSmdTargetSide updates)
    
*   frontend/src/components/shared/useSmdInboundSides.ts (or wherever inbound-side detection lives)
    
*   frontend/src/services/imports/smdFromJson.ts (Test Mode import hook)
    

Changelog (prepare after merge)Version: 1.2.17Changed

*   State and Choice nodes now expose only two handles (left inbound, right outbound); top/bottom handles removed.Fixed
    
*   Normalization ensures imported SMD edges targeting Top/Bottom on State/Choice are remapped to Left to match new handle policy.