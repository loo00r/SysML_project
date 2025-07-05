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


## New task
# Feature: Implement Tabbed Interface for Diagram Management

## 1. User Story

As a systems engineer, I want to open multiple diagrams (like BDDs and IBDs) in a tabbed interface, similar to a web browser, so I can easily switch between them and manage my workspace efficiently.

## 2. Acceptance Criteria

- **Tab Display:** A tab bar is visible at the top of the main diagram workspace.
- **Opening Diagrams:** When a user decides to view a diagram, it opens in a new tab in the tab bar.
- **Tab Content:** Each tab must display the name of the diagram (e.g., "Charging Context", "SysML Diagrams").
- **Active Tab:**
    - Only one tab can be active at a time.
    - The active tab is visually distinct from other tabs (e.g., different background color or an underline).
    - The main workspace area displays the React Flow editor corresponding to the active tab's diagram.
- **Switching Tabs:** Clicking on an inactive tab makes it the active tab and updates the workspace to show its content.
- **Closing Tabs:**
    - Each tab has an 'x' icon to close it.
    - Closing an active tab should switch the view to another available tab (e.g., the one to its right or left).
    - If the last tab is closed, the workspace should return to a default state (e.g., a welcome screen or a "Create a new diagram" prompt).
- **New Tab Button:** A `+` button should be present next to the tabs to initiate the creation of a new, empty diagram.

## 3. Technical Implementation Plan (Frontend)

This is a frontend-only task. You will primarily work within the `frontend/` directory, modifying React components and the Zustand store.

### 3.1. State Management (Zustand - `src/store/diagramStore.ts`)

The current state management needs to be extended to handle multiple open diagrams.

1.  **Define a new type for an open diagram instance:**
    ```typescript
    // In src/store/diagramStore.ts
    export interface DiagramInstance {
      id: string; // Unique identifier for this tab/instance
      name: string;
      type: 'BDD' | 'IBD' | 'Untitled'; // Block Definition, Internal Block, etc.
      nodes: Node[];
      edges: Edge[];
      // Add any other diagram-specific state here
    }
    ```

2.  **Update the store's state:**
    - Replace single-diagram state with an array of open diagrams.
    - Add a reference to the currently active diagram's ID.

    ```typescript
    // In src/store/diagramStore.ts
    interface DiagramState {
      openDiagrams: DiagramInstance[];
      activeDiagramId: string | null;
      // ... other state properties
    }
    ```

3.  **Create new actions in the store:**
    - `openDiagram(diagramData: Omit<DiagramInstance, 'id'>): void`: Adds a new diagram to the `openDiagrams` array, generates a unique ID, and sets it as the `activeDiagramId`.
    - `closeDiagram(diagramId: string): void`: Removes a diagram from the `openDiagrams` array. It must contain logic to select a new `activeDiagramId` if the closed tab was active.
    - `setActiveDiagram(diagramId: string): void`: Sets the `activeDiagramId`.
    - `updateActiveDiagram(payload: { nodes: Node[], edges: Edge[] }): void`: Updates the `nodes` and `edges` for the currently active diagram.

### 3.2. Component Structure

Create new components in `frontend/src/components/`.

1.  **`DiagramTabs.tsx` (Container Component)**
    - **Responsibility:** Render the entire tab bar.
    - **Logic:**
        - Get `openDiagrams` and `activeDiagramId` from the `diagramStore`.
        - Use Material-UI's `<Tabs>` component to render the list of tabs.
        - Map over `openDiagrams` to render a `DiagramTab` for each.
        - The `value` prop of the `<Tabs>` component should be `activeDiagramId`.
        - The `onChange` handler should call the `setActiveDiagram` action from the store.
        - Render the `+` button for creating a new tab.

2.  **`DiagramTab.tsx` (Individual Tab)**
    - This can be implemented using MUI's `<Tab>` component.
    - **Responsibility:** Display a single tab with its name and a close button.
    - **Props:** `diagram: DiagramInstance`.
    - **Logic:**
        - The `label` prop of the `<Tab>` component should be a custom element containing the diagram name and an `IconButton` with a `CloseIcon`.
        - The `onClick` handler of the close button should call the `closeDiagram(diagram.id)` action. Prevent the click from propagating to the tab itself.

3.  **`DiagramWorkspace.tsx` (Main Content Area)**
    - **Responsibility:** Render the React Flow instance for the currently active diagram.
    - **Logic:**
        - Get `openDiagrams` and `activeDiagramId` from the store.
        - Find the active diagram object: `const activeDiagram = openDiagrams.find(d => d.id === activeDiagramId);`
        - If `activeDiagram` exists, pass its `nodes` and `edges` to the `<ReactFlow>` component.
        - All interactions within React Flow (like `onNodesChange`, `onEdgesChange`) should now call the `updateActiveDiagram` action in the store.
        - If no `activeDiagram` exists, render a placeholder/welcome component.

### 3.3. Integration

-   Place the `<DiagramTabs />` component in your main layout file (e.g., `App.tsx`) above the `<DiagramWorkspace />`.
-   Refactor the existing diagram view to become the new `<DiagramWorkspace />`.
-   Connect the "Create Diagram" logic (from AI generation or sidebar) to call the `openDiagram` action in your Zustand store.

### 3.4. Suggested File Structure

frontend/src/
├── components/
│ ├── DiagramTabs.tsx # New: Tab bar container
│ ├── DiagramWorkspace.tsx # New or refactored: Holds the React Flow instance
│ └── ... (other components)
├── store/
│ └── diagramStore.ts # To be modified
└── App.tsx # To be modified to include new components


## 4. Final Notes
-   **Use Material-UI:** Leverage `<Box>`, `<Tabs>`, `<Tab>`, `<IconButton>`, and `<CloseIcon />` for a consistent look and feel.
-   **Unique IDs:** Use a library like `uuid` or a simple counter to ensure each tab has a unique `id`.
-   **State Synchronization:** Be careful to ensure that all diagram modifications are saved to the correct diagram instance within the `openDiagrams` array in the Zustand store. The link is the `activeDiagramId`.

## ✅ COMPLETED: Tabbed Interface Implementation (2025-01-05)

### Successfully Implemented Features:

1. **Enhanced Diagram Store** (`src/store/diagramStore.ts`):
   - Added `DiagramInstance` interface with id, name, type, nodes, edges, description, timestamps
   - Modified state to handle `openDiagrams` array and `activeDiagramId`
   - Implemented new actions: `openDiagram`, `closeDiagram`, `setActiveDiagram`, `updateActiveDiagram`
   - Updated all existing node/edge operations to work with multi-diagram structure
   - Maintained backward compatibility with legacy actions

2. **DiagramTabs Component** (`src/components/DiagramTabs.tsx`):
   - Material-UI styled tab bar with scrollable tabs
   - Individual tabs with diagram names and close buttons (x)
   - Add new diagram button (+) 
   - Proper tab switching and closing logic
   - Empty state handling when no diagrams are open
   - Responsive design with proper styling

3. **DiagramWorkspace Component** (`src/components/DiagramWorkspace.tsx`):
   - Main ReactFlow canvas area for active diagram
   - All toolbar functionality preserved (undo, redo, zoom, save, validate, export)
   - Properties and validation panels integration
   - Empty state with guidance when no diagram is active
   - Proper sizing constraints (not full page width)
   - Drag & drop functionality for adding nodes

4. **Updated App Layout** (`src/App.tsx`):
   - Integrated tabbed interface with proper layout structure
   - Tab bar positioned at top of workspace
   - Sidebar and generator panel maintain positions
   - Workspace area properly constrained with flexbox layout
   - ReactFlowProvider wrapper for diagram functionality

5. **Enhanced AI Generation** (`src/hooks/useAIGeneration.ts`):
   - Modified to create new diagram tabs automatically
   - Intelligent diagram naming based on prompt content
   - Integration with multi-diagram state management
   - Form reset and UI cleanup after generation

6. **Updated Generator Component** (`src/components/DiagramGeneratorNew.tsx`):
   - Works seamlessly with new tabbed interface
   - Automatically creates new tabs for generated diagrams
   - Form resets and collapses after successful generation

### Key Features Delivered:
- ✅ Multiple diagram tabs (browser-like experience)
- ✅ Tab switching with visual active state indication
- ✅ Close tabs with 'x' button and smart tab selection
- ✅ Add new diagram with '+' button
- ✅ Proper workspace sizing (canvas-sized, not full width)
- ✅ Empty state handling with user guidance
- ✅ AI generation automatically creates new tabs
- ✅ All original functionality preserved (save, export, validation, etc.)
- ✅ Responsive design with Material-UI consistency
- ✅ State synchronization across all diagram operations

### Files Modified/Created:
- `src/store/diagramStore.ts` - Enhanced with multi-diagram support
- `src/components/DiagramTabs.tsx` - New tabbed interface component
- `src/components/DiagramWorkspace.tsx` - New main workspace component  
- `src/App.tsx` - Updated layout integration
- `src/hooks/useAIGeneration.ts` - Enhanced for tab creation
- `src/components/DiagramGeneratorNew.tsx` - Updated for tab integration

The implementation fully meets all acceptance criteria and maintains the existing codebase patterns and functionality while adding the requested tabbed interface for efficient diagram management.

### New task
# Refactor: Integrate Diagram Tabs as a Floating Panel within the Canvas

## 1. User Story

As a systems engineer, I want the diagram tabs to be a floating panel located *inside* the main canvas area, rather than being part of the main application header. This will create a more immersive and focused modeling environment where all diagram-related controls are contained within the workspace itself.

## 2. Acceptance Criteria

- **Location Change:** The tab bar (`Diagram 1 [x] [+]`) is no longer displayed at the very top of the application window.
- **New Location:** The tab bar is now rendered as a floating panel *inside* the React Flow canvas area, positioned at the top-left corner.
- **Floating Behavior:**
    - The tab panel must remain in a fixed position relative to the canvas viewport. It should **not** pan or zoom along with the diagram nodes.
    - Its behavior should be similar to the existing React Flow controls (like the zoom buttons or the minimap).
- **Functionality:** All existing tab functionalities (creating a new tab with `+`, switching between tabs, closing a tab with `x`) must work exactly as before.
- **Styling:** The floating panel should have a distinct background (e.g., using Material-UI's `Paper` component) with a subtle shadow and padding to visually separate it from the canvas grid behind it.
- **Responsiveness:** The panel should not interfere with nodes that might be dragged "underneath" it. It must always stay on top with a proper `z-index`.

## 3. Visual Reference

The final result should look conceptually like this, where the tabs are inside the canvas boundary:
+----------------------------------------------------------------------+
| Left Sidebar | MAIN CANVAS AREA | Right Sidebar |
| | | |
| | +-------------------------+ | |
| | | [Diagram 1 X] [Diagram 2 X] [+] | <-- FLOATING TABS HERE | |
| | +-------------------------+ | |
| | | |
| | +--------+ | |
| | | Node 1 | | |
| | +--------+ | |
| | | |
| | | |
| | +---------+ | |
| | | Minimap | | |
| | +---------+ | |
+----------------------------------------------------------------------+

## 4. Technical Implementation Plan (Frontend)

This task involves changing the component hierarchy and applying CSS for positioning. The state logic in Zustand should remain unchanged.

1.  **Relocate the `DiagramTabs` Component:**
    -   Currently, `<DiagramTabs />` is likely rendered in a top-level layout component (like `App.tsx` or a custom `Layout.tsx`).
    -   You need to **move** the rendering of `<DiagramTabs />` so it becomes a child of the component that contains the `<ReactFlow />` instance (let's call it `DiagramWorkspace.tsx`).

2.  **Create a Floating Panel Wrapper:**
    -   Inside `DiagramWorkspace.tsx`, wrap the `<DiagramTabs />` component in a new container. This container will be responsible for the floating behavior.
    -   Use a Material-UI `<Paper>` or `<Box>` component for this wrapper to easily apply styling.

    ```tsx
    // In DiagramWorkspace.tsx

    import { Box, Paper } from '@mui/material';
    import DiagramTabs from './DiagramTabs';
    // ... other imports

    const DiagramWorkspace = () => {
      // ... existing logic
      
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlow
            // ... all your React Flow props
          >
            {/* ... other controls like MiniMap */}
          </ReactFlow>

          {/* NEW: Floating Tab Panel */}
          <Box
            component={Paper}
            elevation={3}
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 10, // Ensure it's above the canvas elements
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <DiagramTabs />
          </Box>
        </div>
      );
    };
    ```

3.  **Adjust Component Hierarchy:**
    -   **`DiagramWorkspace.tsx` (or equivalent):** This component must have `position: 'relative'` on its root element so that the absolute positioning of the tab panel works correctly.
    -   **`App.tsx` (or main layout):** Remove the `<DiagramTabs />` component from here. The page layout will simplify to just the sidebars and the main workspace container.

4.  **Refine `DiagramTabs.tsx` Styling (If Needed):**
    -   The `DiagramTabs` component itself might need minor style adjustments. For example, you might want to remove any background or shadow it has, as the new `Paper` wrapper will now handle that. The goal is for the tabs to look seamlessly integrated into their new floating panel.

## 5. Summary of Changes

-   **No changes** to the Zustand store (`src/store/diagramStore.ts`).
-   **Move** `<DiagramTabs />` from the main layout file into the React Flow workspace component.
-   **Wrap** `<DiagramTabs />` in a new, absolutely positioned MUI `<Box>` or `<Paper>` to create the floating panel.
-   **Apply** CSS (`position: absolute`, `top`, `left`, `z-index`) to the new wrapper.
-   **Ensure** the parent container of React Flow has `position: 'relative'`.