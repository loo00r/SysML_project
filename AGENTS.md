# Repository Guidelines

## Project Structure & Module Organization
The backend (Python 3.12) lives in `backend/app/` with `api` routers, `core` config, `crud` persistence, `AI` OpenAI flows, `database` models, and `db` migration helpers. Alembic migrations sit in `backend/alembic`. Frontend React/TypeScript source is under `frontend/src/` (components, hooks, store, styles, utils) and builds into `frontend/dist`. `docker-compose.yml` orchestrates FastAPI, PostgreSQL + pgvector, Redis, and Vite.

## Build, Test, and Development Commands
- `docker-compose up --build`: rebuilds and starts the full stack.
- `cd backend && poetry install`: install backend dependencies.
- `poetry run uvicorn app.main:app --reload`: run the FastAPI app with auto-reload.
- `poetry run pytest`: execute backend unit and async tests.
- `cd frontend && npm install`: install web dependencies.
- `npm run dev`: launch the Vite dev server on http://localhost:5173/.
- `npm run build`: output production assets to `frontend/dist/`.

## Coding Style & Naming Conventions
Use 4-space indentation and snake_case files for Python, keeping Pydantic models and SQLAlchemy types inside `database` to avoid circular imports. Group routers inside `api` with PascalCase tags and explicit prefixes. For React, use 2-space indentation, PascalCase for components in `src/components`, and `useX` names for hooks in `src/hooks`. Store app-wide state in `src/store` and keep helpers in `src/utils` pure and typed.

## Testing Guidelines
Place backend tests under `backend/app/test/` using `test_*.py` names and `pytest-asyncio` for coroutine endpoints. Prefer fixtures that start the FastAPI `TestClient` and seed Redis/Postgres with minimal data. Aim for smoke coverage on new routers and services before merging. Frontend tests are not yet enforced; if you add them, use Vitest with React Testing Library and mirror component paths in `src/__tests__/`.

## Commit & Pull Request Guidelines
Match recent history with imperative commit titles and, when helpful, Conventional Commit prefixes (`feat:`, `fix:`, `chore:`). Pull requests should outline intent, summarize changes, link to issues, and call out migrations or environment tweaks. Attach screenshots or sample payloads for UI or API changes, and confirm `poetry run pytest` plus `npm run build` before requesting review.

## Environment & Configuration
Copy `.env.example` to `.env` and supply OpenAI keys plus database URLs before launching services. Docker expects Postgres on `db:5432`; adjust `docker-compose.yml` if you run databases locally. Never commit secrets or generated `.env` files—use environment overrides or a secret manager instead.

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

### new task

Task SMD-03a - SMD for Sensor & Processor on BDD
================================================

Goal
----

Enable creating/opening SMD diagrams for **Sensor** and **Processor** blocks directly from the BDD canvas with the same UX already implemented for **System Block**:

*   a hover-revealed **“+”** affordance at the **bottom-left** of the block opens SMD;
    
*   the SMD tab is **reused** per **(parentDiagramId, blockId)** pair rather than creating duplicates.
    

Scope of Work
-------------

### 1. Node components (frontend)

*   Update SensorNode.tsx and ProcessorNode.tsx:
    
    *   Add the bottom-left **“+”** trigger for SMD with the same hover/reveal behavior and styling as in SystemBlockNode.
        
    *   On click, call openSmdForBlock({ parentDiagramId, blockId, blockName }).
        
    *   Optionally show a small indicator (e.g., “View SMD” icon) when an SMD already exists for this block.
        

### 2. State store (Zustand)

*   In diagramStore.ts:
    
    *   Ensure the openSmdForBlock action exists or add it.
        
    *   The SMD diagram **ID** must be deterministic and namespaced per parent:smd-for-{parentDiagramId}-{blockId}.
        
    *   If such a tab is already open, **activate** it.If a saved diagram exists, **rehydrate** it.Otherwise, **create an empty SMD** scaffold (Initial/State/Composite/Final available in palette).
        
    *   Diagram type must be 'smd'.
        
    *   Reuse tabs consistently for the **(parentDiagramId, blockId)** pair.
        

### 3. Type registrations

*   Verify DiagramWorkspace (React Flow setup) always registers SMD node/edge types:
    
    *   smdInitial, smdState, smdComposite, smdFinal, and smdTransition.
        
*   Ensure nothing conditionally disables these when switching diagram types.
    

### 4. UX polish

*   Optional tooltip for the button: “Add SMD”.
    
*   Tab title format:
    
    *   SMD for {blockName} or SMD for {parentName} · {blockName} (follow the existing naming convention).
        

Acceptance Criteria
-------------------

1.  **Sensor** and **Processor** blocks on BDD show the **bottom-left “+”** SMD affordance on hover.
    
2.  Clicking the affordance opens a **single** SMD tab per **(parentDiagramId, blockId)**. Repeated clicks switch to the existing tab (no duplicates).
    
3.  The opened diagram has type = "smd" and the standard SMD scaffold/palette is available.
    
4.  After closing the SMD tab, clicking the affordance again reopens the **same** diagram state via persistence.
    
5.  A small indicator denotes that an SMD already exists for the block (optional but recommended).
    
6.  No regressions for **System Block** SMD behavior.
    

Manual Test Plan
----------------

1.  Open the BDD containing **System Block**, **Sensor**, **Processor**.
    
2.  Hover **Sensor** → click SMD “+” → a tab SMD for Sensor opens.
    
3.  Add a node inside SMD, switch tabs, return → changes persist (rehydrated).
    
4.  Close SMD for Sensor tab, click “+” again → the same diagram reopens with your previous changes.
    
5.  Repeat steps 2–4 for **Processor** (tab SMD for Processor).
    
6.  Verify **System Block** SMD still works as before (no regressions).
    
7.  Open all three SMD tabs and switch between them → rendering is correct, no crashes, node/edge types load properly.
    

Files Likely Affected
---------------------

*   frontend/src/components/nodes/SensorNode.tsx
    
*   frontend/src/components/nodes/ProcessorNode.tsx
    
*   frontend/src/store/diagramStore.ts
    
*   frontend/src/components/DiagramWorkspace.tsx (only if needed)
    
*   Styles/icons for the SMD affordance (only if needed)

Changelog prepare after merge
## [1.2.6] - 2025-10-22
### Added
- Enabled SMD creation/open for Sensor and Processor blocks on BDD (tab reuse per parent/block pair; deterministic IDs).
### Improved
- Consistent SMD affordances across all BDD block types with a hover “+” trigger on the bottom-left corner.

Version bump

APP_VERSION=1.2.6
VITE_APP_VERSION=1.2.6

