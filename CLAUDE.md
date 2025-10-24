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

Task SMD-05R — Remove Composite State from SMD (and all dependencies)

Goal
Fully remove the SMD Composite State feature. That includes the node type, palette item, containment/parenting, auto-resize, overlays, policies, and any code paths that assume children inside a composite. Existing diagrams that contain composites must load without crashing; their contents should be flattened into the SMD root.

Scope of Work

1.  De-register and delete the Composite node type
    

*   Remove smdComposite from SMD nodeTypes registration and palette.
    
*   Delete/retire the component (e.g., CompositeNode.tsx) and styles/icons tied to it.
    
*   Remove Composite from seeded SMD examples and creation handles.
    
*   Update SMD unions/types so SmdNodeType no longer includes "composite".
    

2.  Remove Composite-specific behaviors
    

*   Delete/disable composite containment (no more parentNode usage for SMD children).
    
*   Remove composite workspace overlay (“hollow frame”, header), internal drag clamps, soft boundary rules, and external-connection policies.
    
*   Delete the composite auto-resize service and its debounced triggers (e.g., resizeCompositeToChildren, RAF schedulers).
    
*   Remove any composite-aware edge routing/port logic.
    

3.  Data model & migration (rehydrate-time)
    

*   On load, detect any smdComposite in persisted SMD diagrams and **flatten** them:
    
    *   Promote each child (nodes whose parentNode === composite.id) to the diagram root: clear parentNode.
        
    *   Convert child positions from parent-local to absolute by adding the composite’s top-left workspace offset + padding (ensure they remain within canvas bounds).
        
    *   Internal transitions between children remain as normal transitions (source/target now refer to root-level nodes).
        
    *   Edges that referenced the composite directly as source or target:
        
        *   Try to reattach to the nearest former child (by center distance to the original attach side).
            
        *   If no valid child exists, drop the edge and record a non-blocking migration note (collect into a banner/toast with the list of removed edge IDs).
            
*   After migration, persist the new diagram JSON immediately to avoid re-running migration.
    

4.  Store, selectors, and inspectors
    

*   Remove composite-specific selectors and inspector panels.
    
*   Ensure SMD edge label editing, arrows, selection, and pointer-events continue to work without any composite checks.
    
*   Keep any generic parentNode logic that is used by other diagram types (e.g., IBD) intact—scope deletions only to SMD.
    

5.  Event wiring & triggers
    

*   Remove any event subscriptions that referenced composite internals (child add/move/delete, internal connections) and their resize/layout side-effects.
    
*   Ensure that undo/redo and rehydrate paths no longer call composite services.
    

6.  Styling & assets
    

*   Delete composite CSS classes, header chrome, and overlay art.
    
*   Confirm that SMD nodes (initial/state/final/choice) and transitions render identically as before.
    

Acceptance Criteria

1.  No “Composite” item in the SMD palette; attempts to add a composite do nothing and produce no console errors.
    
2.  Building/running the app produces no imports or type references to smdComposite.
    
3.  Opening a saved diagram that previously contained composites succeeds without errors and shows all former child nodes at the root with preserved relative positions (visually similar layout).
    
4.  Internal transitions formerly inside the composite still connect the same child nodes at root level.
    
5.  Edges that previously targeted the composite are either reattached to the nearest former child or removed with a visible one-time migration note; the diagram remains valid and interactive.
    
6.  No regressions to SMD transitions (labels, arrows), selection, undo/redo, or performance.
    

Manual Test Plan

*   Confirm the SMD palette: Initial, State, Final, (Choice if present). No Composite.
    
*   Load an older SMD with a composite containing several states and internal transitions:
    
    *   Children appear at root, positions look reasonable; transitions preserved.
        
    *   Any composite-boundary edges are reattached or listed in a migration banner.
        
*   Create new SMDs and verify basic flow (Initial → State → Final) works as before.
    
*   Run undo/redo after moving nodes—no composite code paths are invoked; no errors.
    
*   Validate that arrows and labels still render and remain synced with the inspector.
    

Files Likely Touched

*   frontend/src/components/nodes/smd/CompositeNode.tsx (delete or archive)
    
*   frontend/src/components/palette/… (remove Composite from SMD section)
    
*   frontend/src/store/diagramStore.ts (types/registrations; remove composite triggers; add migration on rehydrate)
    
*   frontend/src/services/smd/autoResizeComposite\*.ts (remove)
    
*   frontend/src/utils/smdContainment.ts, smdConnectionPolicy.ts (remove/neutralize)
    
*   frontend/src/components/inspector/\* (remove composite inspector)
    
*   frontend/src/styles/\* (remove composite styles)
    
*   Any tests referencing composites; update snapshots/fixtures.
    

Changelog (prepare after merge)Version: 1.2.13

Removed

*   SMD Composite State and all related behaviors (containment, workspace overlay, auto-resize, boundary policies).Changed
    
*   Legacy diagrams with composites are migrated on load by flattening children to the root; composite-bound edges are reattached when possible or removed with a migration note.