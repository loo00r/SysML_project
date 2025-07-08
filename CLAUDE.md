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
Task: Fix Hidden 'Add Diagram' Button in Tab Bar
Problem Description:
The application has been updated with a tabbed interface to manage multiple diagrams. However, there is a critical layout bug. When no diagrams are open, the main workspace shows a message instructing the user to "Create a new diagram by clicking the + button in the tab bar". Unfortunately, the tab bar containing this + button is either not rendered or is hidden behind another UI element, making it impossible for a user to create their first diagram.
Goal:
Adjust the frontend layout to ensure the DiagramTabs component, which contains the + button, is always visible above the main DiagramWorkspace.
Acceptance Criteria:
The tab bar must be visible at all times, especially when no diagrams are open.
The + button for adding a new diagram must be visible and clickable.
Clicking the + button must successfully open a new, empty diagram tab.
The layout must work correctly when multiple tabs are open, displaying them alongside the + button without any visual glitches.
The fix should not introduce any new layout issues or break responsiveness.
Suggested Approach & Relevant Files:
Investigate the Layout: The issue is almost certainly a CSS layout problem (Flexbox or Grid). Examine the main application layout component that arranges the sidebar, the tab bar, and the workspace.
Check Key Components:
src/components/DiagramTabs.tsx: This is the component for the tab bar itself.
src/components/DiagramWorkspace.tsx: This is the main content area that is likely overlapping the tab bar.
App.tsx (or equivalent layout root): This is where the primary flex/grid container is likely defined.
Fix the CSS: Adjust the CSS properties (display, flex-direction, height, z-index, etc.) of the main layout containers to ensure the DiagramTabs component is allocated its own space and is not overlapped by the workspace below it.

### new task
Task: Full-Stack Code Refactoring and Cleanup
Goal:
The primary goal of this task is to improve the overall quality, maintainability, and performance of the codebase. Over time, features have been added and changed, leaving behind unused components, functions, and outdated patterns. This refactoring effort will focus primarily on the frontend, but will also include a review of the backend to ensure a clean and efficient full-stack application.
Acceptance Criteria:
The application must build and run successfully via docker-compose up --build.
All existing functionality (AI generation, RAG, diagram editing, tabbing, saving, exporting) must remain intact and fully operational.
All backend tests (poetry run pytest) must pass.
Code linting tools should report fewer warnings, especially regarding unused imports and variables.
The final codebase should be demonstrably cleaner, with obsolete files and code removed.
The CLAUDE.md file should be updated to reflect any significant changes in structure or commands.
Refactoring Plan
Phase 1: Frontend Refactoring (Primary Focus)
The React frontend has evolved significantly, especially with the introduction of the tabbed interface. This is the area requiring the most attention.
Dead Code Elimination:
Analyze Components: Systematically scan the frontend/src/components/ directory. Identify and remove any React components that are no longer imported or used anywhere in the application.
Clean Up Hooks: Review the frontend/src/hooks/ directory. Delete any custom hooks that are no longer in use.
Prune Utility Functions: Examine helper and utility files. Remove any exported functions that are not being imported and used.
Zustand Store (diagramStore.ts): Scrutinize the Zustand store. Remove any state variables or actions that are relics of the previous single-diagram architecture and are no longer relevant to the multi-tab system.
Asset Cleanup: Check the frontend/public/ and frontend/src/assets/ directories for any images, fonts, or other static assets that are no longer referenced in the code.
Component Restructuring and Simplification:
Break Down Large Components: Identify "god components" that handle too much logic and state. A prime candidate is DiagramWorkspace.tsx. Break it down into smaller, more focused child components (e.g., FlowCanvas, WorkspaceToolbar, EmptyWorkspacePlaceholder).
Standardize Folder Structure: Ensure a consistent and logical folder structure. For example, group related components into their own subdirectories (e.g., frontend/src/components/Tabs/ for all tab-related UI).
Consolidate Styling: Find instances of repetitive inline styling or sx props. Abstract these into reusable styled components or add them to the global Material-UI theme for better consistency and maintainability.
State Management Optimization:
Review State Shape: Analyze the DiagramInstance interface and the main state array openDiagrams in diagramStore.ts. Ensure the structure is optimal and doesn't contain redundant or unnecessary data.
Memoization: Apply React.memo to components that re-render unnecessarily. Use useMemo and useCallback hooks where appropriate to optimize performance, especially within the React Flow canvas.
Phase 2: Backend Refactoring (Secondary Focus)
While the backend is more stable, there are opportunities for improvement.
Service Layer Abstraction:
Review app/api/api_v1.py and app/AI/diagram_generation.py. Business logic is currently mixed with API route handling.
Create a new app/services/ directory. Move the core logic for diagram generation, RAG context retrieval, and database interactions into dedicated service functions. The API endpoints should then become thin wrappers that call these services. This improves separation of concerns and testability.
Configuration and Constants Review:
Scan the codebase for "magic strings" or hardcoded numerical values (e.g., embedding dimensions, model names).
Move these into the central configuration file (app/core/config.py) or a dedicated constants file (app/core/constants.py) to make them easier to manage.
Phase 3: General Maintenance
Dependency Audit:
Frontend: Run npm audit and npx depcheck in the frontend directory to find unused or vulnerable dependencies. Prune the package.json accordingly and update critical packages.
Backend: Review the pyproject.toml file. Ensure all listed dependencies are necessary for the project. Use poetry lock --no-update to clean up the lock file.
Documentation Update:
As you refactor, update JSDoc/TSDoc comments in the frontend and Python docstrings in the backend to reflect the new code structure.
Finally, review this CLAUDE.md file. If any file paths, component names, or development commands have changed as a result of the refactoring, update this document to ensure it remains an accurate guide.