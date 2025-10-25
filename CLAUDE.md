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

Task SMD-06 — Prototype validation minimum

Goal
Implement a minimal validation pass for SMD diagrams, invoked by the VALIDATE button. Show badges on problematic nodes/edges. Rules:

*   Exactly one Initial per diagram; if more than one exists → WARNING (not an error).
    
*   No dangling transitions (edges must have both a valid source and a valid target).
    
*   Forbid transition Initial → Initial (error).
    
*   Forbid any transition whose source is Final (Final → \*) (error).
    

Scope of Work

1.  Validator service
    

*   Create validateSmd(diagramId: string): ValidationResult\[\].
    
*   ValidationResult fields:{ id: string; kind: "node" | "edge"; severity: "error" | "warning"; code: "SMD001" | "SMD002" | ...; message: string; }
    
*   Rules:• SMD001 (warning): count nodes where type === "initial". If count > 1, return a warning for each extra Initial node with a message like “Only one Initial is recommended; found N.”• SMD002 (error): dangling transitions — for each edge of type "smdTransition", if source or target node is missing/unknown, return an error on the edge.• SMD003 (error): Initial → Initial — if edge.source.type === "initial" AND edge.target.type === "initial".• SMD004 (error): Final → \* — if edge.source.type === "final".
    
*   Return the array; store it under diagramStore.validation.results\[diagramId\].
    
*   Clear results on any graph-mutating action (node/edge add/remove/move/connect) so stale badges disappear until the user revalidates.
    

2.  VALIDATE button integration
    

*   Wire the existing “VALIDATE” toolbar button to run validateSmd for the active diagram only when the diagram type === "smd".
    
*   On completion:• If results.length === 0: show a brief success toast “No issues found”.• Else: show a compact summary toast “Validation: X errors, Y warnings”. Keep detailed results in state.
    

3.  Badges on canvas
    

*   For each node/edge with issues, render a small badge near it:• Red circle for error, yellow triangle for warning.• If multiple issues affect the same element, show a single badge with a tiny count overlay (e.g., “2”).
    
*   Tooltip on hover: show code + message (e.g., “SMD004: Final states cannot be sources.”).
    
*   Ensure badges are non-interactive (pointer-events: none) and have a high z-index above nodes/edges/labels.
    

4.  Optional results panel (lightweight)
    

*   If you already have a right-panel section, add a “Validation” list for the active diagram showing rows: icon, code, message, and a “Focus” link that selects the node/edge and pans to it.
    
*   Keep this purely optional; badges + toasts satisfy the requirement.
    

5.  Persistence and imports
    

*   Validation runs are ephemeral; do not persist results into diagram JSON.
    
*   No special handling needed for Test Mode imports beyond the same rules.
    

6.  Safety and performance
    

*   Use memoized index maps: nodeById, typeById, outgoingById to avoid O(N×M) scans.
    
*   Run entirely on the client; avoid blocking the UI—if results > 2k elements, chunk with requestIdleCallback (not required now, but structure for it).
    

Acceptance Criteria

*   Pressing VALIDATE on an SMD diagram shows warnings if there are multiple Initial nodes. Extra Initials display yellow badges; the toast summarizes counts.
    
*   Dangling edges are flagged as errors with red badges; selecting them shows the tooltip with SMD002 message.
    
*   Any Initial → Initial edge is flagged as an error (red badge on that edge).
    
*   Any edge with a Final as the source is flagged as an error (red badge on that edge).
    
*   Clicking VALIDATE on a clean diagram shows a success toast and no badges.
    
*   After any edit (e.g., deleting an extra Initial), badges disappear until VALIDATE is clicked again.
    

Manual Test Plan

1.  Create two Initial nodes and connect one to Idle; click VALIDATE → 1+ yellow badge(s), summary toast shows warnings > 0.
    
2.  Create an edge Initial → Initial; VALIDATE → red badge on that edge (SMD003).
    
3.  Create an edge Final → State; VALIDATE → red badge on that edge (SMD004).
    
4.  Create an edge with a missing target (e.g., delete the target node); VALIDATE → red badge (SMD002).
    
5.  Fix issues and re-validate → badges clear; success toast appears.
    

Files Likely Touched

*   frontend/src/services/validation/smdValidator.ts (new)
    
*   frontend/src/store/diagramStore.ts (results state; clear-on-change)
    
*   frontend/src/components/toolbar/ValidateButton.tsx (wire-up)
    
*   frontend/src/components/overlays/ValidationBadge.tsx (new, canvas badges)
    
*   frontend/src/components/panels/ValidationPanel.tsx (optional)
    
*   frontend/src/styles/validation.css (icons, z-index, tooltip)
    

Changelog (prepare after merge)
Version: 1.2.17
Added

*   SMD validation pass with badges and summary (one Initial recommended, no dangling edges, block Initial→Initial and Final→\*).Improved
    
*   VALIDATE button now runs SMD checks and highlights problematic nodes/edges.