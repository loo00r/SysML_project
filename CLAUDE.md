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
Task: Light Refactoring: Dead Code and Unused Element Removal
Goal:
Streamline the codebase by identifying and safely removing all unused elements (components, functions, variables, dependencies) across the frontend and backend. This is a cleanup task, not an architectural refactor. The existing file structure and application logic must remain unchanged.
Acceptance Criteria:
The application must build and run successfully using docker-compose up --build.
All existing functionality must remain intact. There should be no regressions in AI generation, diagram editing, the tab system, or any other feature.
All backend tests must pass when running poetry run pytest.
No new files or directories should be created. This task is strictly about deletion and cleanup.
The final codebase will be smaller and cleaner, containing only actively used code and dependencies.
Cleanup Plan
Follow these steps in order to safely clean the repository.
Identify and Remove Unused Frontend Files:
Action: Systematically check the frontend/src/ directory, especially within components/, hooks/, and any utility folders. Identify .tsx, .ts, and .css files that are not imported or used anywhere in the application.
Verification: Before deleting, use your IDE's "Find Usages" or a global search to confirm a file is truly unreferenced.
Result: Delete the confirmed unused files.
Clean Unused Code Within Frontend Files:
Action: Go through the remaining components and utility files. Look for and remove:
Unused imports at the top of files.
Unused variables and functions (your linter should highlight these).
State variables or actions in the Zustand store (src/store/diagramStore.ts) that are no longer used.
Large blocks of commented-out legacy code that are no longer needed for reference.
Audit and Prune Frontend Dependencies:
Action: In the frontend directory, run the command npx depcheck to identify unused dependencies in package.json.
Result: Carefully review the list from depcheck. For each library confirmed as unused, remove it from package.json and then run npm install to update the package-lock.json file.
Clean Unused Backend Code:
Action: Review the backend/app/ directory. Look for unused Python functions, classes, or entire modules (.py files) that are no longer imported or called.
Focus Areas: Pay special attention to helper functions in database/ or AI/ that might have become obsolete after recent updates.
Final Verification (Crucial Step):
Action: After all cleanups are complete, perform a full system check to ensure nothing was broken.
Run docker-compose down followed by docker-compose up --build to confirm the application builds and starts correctly.
In the backend directory, run poetry run pytest to ensure all tests still pass.
Manually test the application's key features: create a diagram with AI, switch tabs, close a tab, save a diagram.