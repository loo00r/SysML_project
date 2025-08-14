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

# TICKET: DIAG-007

**Task:** Refactor Diagram Generation Flow to Use Redis for Temporary Storage

- **Reporter:** Programming Assistant
- **Assignee:** [Developer's Name]
- **Priority:** High
- **Status:** To Do

---

### **1. The Problem (The "Why")**

The current `/rag/generate-diagram-with-context/` endpoint is doing too much work: it generates data, applies positioning logic, and modifies the JSON object "on the fly." This approach (using "hacks" or workarounds) leads to:

-   **Unpredictability:** The object's state changes within the controller, making it difficult to track.
-   **Complex Debugging:** Finding the source of an error in this complex data flow is a significant challenge.
-   **Violation of Architectural Principles (SRP):** The controller should not be responsible for such complex business logic.

---

### **2. Proposed Solution (The "What")**

We will migrate to a more robust, two-step architecture:

1.  **Initiation:** The client sends a generation request. The server creates the diagram, stores it in **Redis** with a short Time-To-Live (TTL), and immediately returns a unique identifier (`diagramId`).
2.  **Retrieval:** The client uses the `diagramId` to fetch the completed diagram via a separate, new endpoint.

This approach separates the "command" (create a diagram) from the "query" (get a diagram), which is a clean and scalable practice.

---

### **3. Implementation Plan (The "How")**

-   [ ] **Step 1: Integrate Redis**
    -   [ ] Add the Redis service to `docker-compose.yml`.
    -   [ ] Install the Redis client library for the backend (e.g., `redis-py` for Python/FastAPI).
    -   [ ] Configure the Redis connection in the project's settings.

-   [ ] **Step 2: Refactor the Generation Endpoint (`POST /rag/generate-diagram-with-context/`)**
    -   [ ] Keep the existing logic for generating the JSON from GPT and processing it (`DiagramPositioning.apply_positioning`).
    -   [ ] Generate a unique ID for the diagram (recommending `uuid.uuid4()`).
    -   [ ] Save the final diagram JSON object to Redis. The **key** is the `diagramId`, and the **value** is the JSON string.
    -   [ ] **Crucially**, set a TTL (Time-To-Live) for the key (e.g., 10-15 minutes) to prevent memory leaks.
    -   [ ] Change the endpoint's response. It should now only return: `{"status": "processing", "diagramId": "your-unique-id"}` with an HTTP status of `202 Accepted`.

-   [ ] **Step 3: Create a New Endpoint for Result Retrieval (`GET /api/v1/diagrams/result/{diagramId}`)**
    -   [ ] The endpoint must accept `diagramId` as a path parameter.
    -   [ ] It should query Redis using the received `diagramId`.
    -   [ ] **If the key is found:** return the full diagram JSON with a `200 OK` status.
    -   [ ] **If the key is not found:** return an error response: `{"status": "not_found", "message": "Diagram not found or has expired."}` with a `404 Not Found` status.

-   [ ] **Step 4: Remove Old Code**
    -   [ ] Clean up and remove all "hacks" and on-the-fly data modification logic from the controller, as it is now encapsulated in the new flow.

-   [ ] **Step 5: Update Documentation (If applicable)**
    -   [ ] Update the API documentation (Swagger/OpenAPI) to reflect the changes to the old endpoint and describe the new one.

---

### **4. Acceptance Criteria (Definition of Done)**

-   [ ] A request to `POST /rag/generate-diagram-with-context/` returns a `diagramId` and a `202` status.
-   [ ] The new `GET /api/v1/diagrams/result/{diagramId}` endpoint is created and functional.
-   [ ] When requesting the `GET` endpoint with a valid `diagramId`, the full diagram JSON is returned.
-   [ ] When requesting the `GET` endpoint with an invalid or expired `diagramId`, a `404` error is returned.
-   [ ] Diagrams are stored in Redis and are automatically deleted after their TTL expires.
-   [ ] The old code that modified JSON on the fly within the controller has been completely removed.