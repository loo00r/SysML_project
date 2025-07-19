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

New Task
Task: Implement Diagram State Persistence on Page Reload

Task Type: Feature Enhancement

Context
Currently, the application does not persist the user's session. If the user creates or modifies one or more diagrams and then reloads the browser tab (e.g., by pressing F5 or navigating away and back), all work is lost. The application resets to its initial state with no open diagrams. This behavior can lead to a frustrating user experience and accidental loss of work.

Goal
To enhance usability and prevent data loss by automatically saving the diagram state to the browser's localStorage. The application should restore the user's complete workspace, including all open diagrams and the active tab, after a page reload.

Acceptance Criteria
✅ The state of all open diagrams (nodes, edges, names, types) is successfully persisted in the browser's localStorage.
✅ When the user reloads the page, all previously open diagrams and their tabs are restored to their last saved state.
✅ The diagram tab that was active before the reload remains the active tab.
✅ Any change to the diagrams (adding/deleting nodes, moving elements, closing a tab, creating a new diagram) triggers an update to the persisted state.
✅ If no diagrams were open, the application starts with a clean slate after a reload, as expected.

Technical Implementation Details
This task should be implemented in the frontend by leveraging middleware from the Zustand state management library.

Identify the State Store

File to Modify: The primary file to work with is the Zustand store, located at frontend/src/store/diagramStore.ts.

Use Zustand's persist Middleware

The most effective way to achieve this is by using the built-in persist middleware from Zustand. It is designed specifically for this purpose.

Action:

Import persist and createJSONStorage from zustand/middleware.

Wrap your store's creator function with the persist middleware.

Configure the middleware to save the desired state to localStorage.

Implementation Example

You will need to refactor the create call in diagramStore.ts to include the middleware.

Before:

TypeScript

import { create } from 'zustand';
// ... other imports

export const useDiagramStore = create<DiagramState & DiagramActions>((set, get) => ({
  // ... your existing store logic
  openDiagrams: [],
  activeDiagramId: null,
  // ... actions
}));
After (with persist middleware):

TypeScript

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// ... other imports

export const useDiagramStore = create(
  persist<DiagramState & DiagramActions>(
    (set, get) => ({
      // ... your existing store logic
      openDiagrams: [],
      activeDiagramId: null,
      // ... actions
    }),
    {
      name: 'sysml-diagram-storage', // Unique name for the localStorage key
      storage: createJSONStorage(() => localStorage), // Specify localStorage
      // Optional: select which parts of the state to persist
      partialize: (state) => ({
        openDiagrams: state.openDiagrams,
        activeDiagramId: state.activeDiagramId,
      }),
    }
  )
);
Note: The partialize function is recommended to ensure you only save what's necessary and avoid persisting transient state like loading flags or error messages. You should persist openDiagrams and activeDiagramId.