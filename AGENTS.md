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

Task SMD-04a — Target-side arrows for SMD transitions (BDD-parity)

GoalMake SMD transition direction obvious by drawing a small arrowhead at the target node’s connection point, the same way BDD blocks show direction. The arrow should appear whenever a node has at least one incoming smdTransition, aligned to the handle side where the edge lands.

Scope of Work

1.  Reuse the BDD arrow overlay pattern
    

*   Locate the BDD component that draws the target-side arrow (the tiny triangle rendered by the block when it detects an incoming connection).
    
*   Extract it into a reusable component, e.g. ArrowHeadOverlay.tsx, with props:
    
    *   side: 'left' | 'right' | 'top' | 'bottom'
        
    *   offset?: number (pixel nudges away from the node border)
        
    *   className? (for size/theme tweaks)
        
*   Ensure it renders in the **node layer**, with pointer-events: none and a z-index above node chrome, matching the BDD look.
    

2.  Detect inbound edges per side on SMD nodes
    

*   In each SMD node component that can be a transition target (smdState, smdComposite, smdFinal, and choice if present; skip smdInitial), select edges from the store and filter:
    
    *   edge.type === 'smdTransition' && edge.target === node.id
        
*   For every inbound edge, read edge.targetPosition (React Flow side hint). Build a set of sides {left,right,top,bottom} that have at least one inbound.
    
*   Render one ArrowHeadOverlay per occupied side (not per edge) to avoid clutter.
    

3.  Positioning/alignment
    

*   Place the overlay just outside the node border on the selected side (e.g., 6–8px).
    
*   Rotation:
    
    *   right → 0°, left → 180°, top → -90°, bottom → 90°.
        
*   For composites, clamp the arrow within the composite “workspace” frame and ensure it stays visible above child edges (keep pointer-events: none).
    

4.  Reactivity
    

*   When edges move or re-route, the set of inbound sides should recompute and the arrows update immediately (subscribe to edges; avoid heavy computations).
    
*   Self-loops: if the loop targets the node’s right handle, show the right-side arrow, etc.
    

5.  Feature toggle (optional)
    

*   Keep any previous markerEnd work behind a flag (e.g., USE\_SMD\_EDGE\_MARKERS=false) so we can switch approaches later if desired. This task’s acceptance focuses on the node-drawn overlay.
    

Acceptance Criteria

1.  Every smdTransition visibly terminates with a small arrow at the **target node**, aligned to the correct side.
    
2.  Multiple inbound edges to the same side show **one** arrow on that side; inbound edges on different sides show arrows on each occupied side.
    
3.  Arrows update live when edges are created, moved, or deleted, and after undo/redo or rehydrate.
    
4.  Arrows are always visible (no z-index issues), non-interactive (pointer-events: none), and match the BDD arrow look.
    
5.  No regressions to SMD labels, inspector sync, or composite interactions.
    

Manual Test Plan

1.  Initial → State (straight). Expect a right/left/top/bottom arrow on State matching the target handle used.
    
2.  State → Final. Expect arrow on Final at the targeted side.
    
3.  Create two inbound transitions to the same side of a State. Expect a single arrow on that side.
    
4.  Create inbound transitions to two different sides. Expect two arrows (one per side).
    
5.  Make a self-loop on a State targeting its right handle. Expect one right-side arrow.
    
6.  Drag targets around and undo/redo. Arrows should update without flicker.
    
7.  Create transitions inside a Composite. Arrows should render in front of internals and remain visible.
    

Files Likely Touched

*   frontend/src/components/smd/StateNode.tsx
    
*   frontend/src/components/smd/CompositeNode.tsx
    
*   frontend/src/components/smd/FinalNode.tsx
    
*   frontend/src/components/smd/ChoiceNode.tsx (if applicable)
    
*   frontend/src/components/shared/ArrowHeadOverlay.tsx (new; extracted from BDD)
    
*   frontend/src/styles/smd.css (minor positioning helpers, pointer-events: none)
    

Changelog (prepare after merge)Version: 1.2.8Added

*   Target-side arrowheads for SMD transitions (node-drawn overlays), matching BDD direction cues.Improved
    
*   Clear, consistent directionality on SMD edges across straight, curved, and self-loop cases.
    

—
