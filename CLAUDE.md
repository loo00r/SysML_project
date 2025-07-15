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

Task: Fix IBD Connection Line Deviation and Add Label
Task Type: UI/UX Improvement
Context
A visual regression has been identified in IBD diagrams, likely introduced between versions 1.1.28 and 1.1.33. The connection line between two IBD Block nodes, which should be perfectly straight, now renders with a slight downward deviation.

To enhance the diagram's readability, we will also take this opportunity to add a descriptive text label to this specific type of connection.

Goal
The primary goal is to restore the correct visual appearance of the connection line on IBD diagrams, making it straight again. Additionally, we need to improve the user's understanding of the diagram by adding a clear label to the connection between IBD blocks.

Acceptance Criteria
✅ The animated, dashed connection line between two IBD Block nodes on an IBD diagram is rendered as a perfectly straight horizontal line, removing the current downward curve.

✅ A text label with the content "IBD Blocks" appears on the connection line.

✅ The label is positioned above the line.

✅ The label is horizontally aligned so that the end of the text (the "s" in "Blocks") is located at the horizontal center of the connection line.

✅ The functionality of creating and deleting these connections remains unchanged.

Technical Implementation Details
This task involves modifications within the frontend, primarily related to the custom edge components used by React Flow.

1. Fix the Line Deviation (Bug Fix)
File to Investigate: Locate the custom edge component responsible for rendering the connection between IBD blocks. This is likely in frontend/src/components/edges/ (e.g., AnimatedDashedEdge.tsx or a similar name).

Probable Cause: The issue is almost certainly in the CSS or the SVG path calculation.

Action:

Review the CSS properties applied to the edge's SVG path and its container. Check for any recent changes to transform, positioning, or flexbox properties that could cause this misalignment.

Inspect the getSmoothStepPath or a similar utility function from React Flow if you are using it to calculate the path. Ensure the parameters passed to it are correct and haven't been altered.

2. Add the Edge Label (Feature Enhancement)
Adding the Label Prop:

In the logic where the edge is created (e.g., in the onConnect handler in DiagramWorkspace.tsx or a Zustand store action), modify the new edge object to include the label property.

Example:

TypeScript

const newEdge = {
  id: `e${source}-${target}`,
  source,
  target,
  type: 'animatedDashed', // or your custom type
  animated: true,
  label: 'IBD Blocks' // <-- Add this property
};
Positioning the Label:

React Flow's default label position is centered. To achieve the specific "end-of-text at center" alignment, you will need to use a custom solution.

Recommended Approach: Use the EdgeLabelRenderer component provided by React Flow. This gives you full control over the label's rendering and styling.

Example within your custom edge component:

TypeScript

import { EdgeLabelRenderer, getSmoothStepPath, BaseEdge } from 'reactflow';

// ... inside your custom edge component
<>
  <BaseEdge path={edgePath} ... />
  <EdgeLabelRenderer>
    <div
      style={{
        position: 'absolute',
        transform: `translate(-50%, -100%) translate(-50%, -5px)`, // Center, then move up
        // The key part is the inner transform to shift it left
        // The exact transform might need tweaking
        left: '50%',
        top: '50%',
        fontSize: 12,
        pointerEvents: 'all',
      }}
      className="nodrag nopan"
    >
      <span style={{ transform: 'translateX(-50%)' }}>IBD Blocks</span>
    </div>
  </EdgeLabelRenderer>
</>
The key will be to find the center point of the edge and then apply a CSS transform to shift the label element appropriately to the left. transform: translateX(-100%) on an inner element often works for right-aligning text to a point. For this, you might need translateX(-50%) to shift it halfway. Experimentation will be needed.