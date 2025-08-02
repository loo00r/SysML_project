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

Task: Fix Sidebar Lock State for AI-Generated Diagrams

Task Type: Frontend / State Management Bug Fix

Context
The sidebar correctly disables the "IBD Block" when a BDD tab is active for manually created diagrams. However, after a new BDD is created by the AI generator, the sidebar fails to update its state. This leaves the "IBD Block" unlocked, allowing users to incorrectly drag it onto a BDD canvas. The issue stems from the sidebar component not correctly re-rendering in response to state changes triggered by the AI generation process.

Goal
To ensure the sidebar's lock state is always correctly synchronized with the active diagram's type, regardless of whether the diagram was created manually or by the AI.

Acceptance Criteria
✅ Immediately after an AI generation creates a new BDD diagram, the "IBD Block" in the sidebar becomes correctly disabled/locked.
✅ When switching from an IBD tab to any BDD tab (manually or AI-created), the "IBD Block" becomes disabled.
✅ When switching from a BDD tab to an IBD tab, the "IBD Block" becomes enabled.
✅ The locking logic for other blocks (e.g., locking BDD blocks in an IBD tab) remains unaffected.

Technical Implementation Details

The fix requires ensuring the sidebar component correctly subscribes to the active diagram's type from the Zustand store and re-renders when it changes.

Locate the Sidebar Component:

Find the component responsible for rendering the "Diagram Elements" list in the sidebar. This is likely named DiagramElements.tsx, Sidebar.tsx, or a similar name.

Implement Correct State Subscription:

Inside this component, ensure you are using the useDiagramStore hook to derive the type of the currently active diagram. This subscription will automatically trigger a re-render when the active tab changes.

Apply the Conditional disabled Prop:

Use the derived diagram type to conditionally disable the "IBD Block" element.

Example Implementation:

TypeScript

// In your sidebar component (e.g., DiagramElements.tsx)

import useDiagramStore from '../store/diagramStore';
// Assuming you have a reusable SidebarItem component
import SidebarItem from './SidebarItem'; 

const DiagramElements = () => {
  // Subscribe directly to the active diagram's type.
  // This hook will force the component to re-render whenever the active diagram or its type changes.
  const activeDiagramType = useDiagramStore((state) => {
    const activeDiagram = state.openDiagrams.find(d => d.id === state.activeDiagramId);
    return activeDiagram?.type;
  });

  // Determine the lock state based on the active diagram type.
  const isIbdBlockLocked = activeDiagramType === 'bdd' || activeDiagramType === 'bdd_enhanced';

  return (
    <div>
      {/* ... other diagram elements like System Block, Sensor, etc. ... */}

      {/* IBD Block Element */}
      <SidebarItem
        label="IBD Block"
        nodeType="ibd_block" // or whatever type you use
        // Conditionally disable the component
        disabled={isIbdBlockLocked}
        // Provide a helpful tooltip that explains why it's locked
        title={isIbdBlockLocked ? "IBD Blocks can only be added to IBD diagrams" : "Add an IBD Block"}
      />
      
      {/* ... other sections ... */}
    </div>
  );
};