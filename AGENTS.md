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

Task SMD-05 — Auto-layout children inside CompositeState (basic)

Goal
Automatically arrange children of an SMD CompositeState from left to right using a Dagre profile (rankdir = LR), producing compact columns with a stable horizontal step and minimal crossings. This runs automatically (no UI control).

Approach 
Use dagre to compute ranks/order only for nodes that are direct children of a given composite and for transitions whose source and target are both those children. Convert the result to parent-local positions, snap to a fixed grid/step, write positions back to the store, and then call the existing resizeCompositeToChildren() to fit the container.

Scope of Work

1.  Layout service
    

*   Add layoutSmdComposite(parentId: string, opts?) → Promise.
    
*   Build a dagre.graphlib.Graph({ multigraph: true, compound: false }).
    
*   Graph config: rankdir: "LR", nodesep: 48, ranksep: 96. Add a deterministic “stepX” of 180 to quantize x positions later for stability.
    
*   Filter children = nodes where node.parentNode === parentId and allowed types: initial, state, composite, final, choice.
    
*   Filter internal edges = edges with type === "smdTransition" and both endpoints in children.
    
*   For each child, provide width/height using measured node sizes from the store; if missing, use defaults: initial/final: 40×40; state: 160×64; composite: current measured or 220×150; choice: 28×28.
    
*   Run dagre.layout(g), read computed x/y for each child.
    
*   Convert to parent-local coordinates with padding: left/top = 24. Snap x to stepX multiples, y to 8px grid. Maintain deterministic ordering within the same rank by child.id (stable sort) before snapping.
    
*   Write back positions via a batched store update; afterwards call resizeCompositeToChildren(parentId).
    

2.  Event wiring (no UI button)
    

*   Automatically run layoutSmdComposite(parentId) after:
a. child add/remove,
b. child move end,
c. connect/disconnect internal transitions,
d. undo/redo involving the composite’s internals,e. composite open/rehydrate (run once after children measured).
    
*   Debounce per-parent 150 ms and coalesce multiple triggers. Guard against re-entrancy (ignore triggers while a layout run is pending).
    

3.  Safety/edge cases
    

*   If dagre detects cycles, allow its acyclic pass; do not throw. Still produce a layout.
    
*   If there are zero or one internal edges, still arrange children in left-to-right columns by id order.
    
*   Ignore edges that cross the composite boundary (child ↔ outside) for ranking to avoid false constraints.
    
*   Do not move the composite itself; only children inside it.
    
*   Preserve user manual placement if an explicit “lockPosition” flag is set on a child (future-proofing). For now, all children are auto-placed.
    

4.  Interop with existing features
    

*   Ensure overlay arrows and edge labels reflow correctly after node position updates.
    
*   After layout, call resizeCompositeToChildren(parentId) so the container grows/shrinks to fit.
    
*   Keep pointer events and selection state intact (no flicker).
    

Acceptance Criteria

1.  On a representative example, children inside a CompositeState are arranged left → right with compact columns and no edge crossings in the common cases.
    
2.  Layout runs automatically after adding/moving/deleting children, changing internal transitions, undo/redo, and on initial open after measurement.
    
3.  Horizontal spacing is stable and deterministic between runs (quantized to the fixed step).
    
4.  Composite resizes to fit the new arrangement (padding respected, no overlaps, children clamped inside).
    
5.  No regressions for SMD labels, arrows, or composite interactions.
    

Manual Test Plan

*   Use the provided input (VehicleSystem): ensure the top-level flow is left → right (init → off → driving → charging → final). Inside “Driving”, its children (“Manual”, “Autopilot”, “Parking”) are arranged left → right with minimal crossings.
    
*   Add an extra transition inside Driving that could cause crossings; verify Dagre reduces crossings and positions remain stable.
    
*   Drag a child; on drag-end, auto-layout re-applies and composite resizes.
    
*   Add/remove a child; verify layout updates and remains deterministic across reload (rehydrate).
    
*   Create a child transition to an outside node; confirm it does not distort the internal layout.
    

Files Likely Touched

*   frontend/src/services/layout/smdDagre.ts (new)
    
*   frontend/src/store/diagramStore.ts (layout triggers and batched updates)
    
*   frontend/src/components/nodes/smdComposite/\* (subscribe to measurement and fire initial layout)
    
*   frontend/src/utils/geometry.ts (parent-local snaps / quantization helpers)
    
*   package.json: add dependency “dagre” if not already present
    

Changelog (prepare after merge)Version: 1.3.0 - 2025-10-23 Added

*   Automatic Dagre-based layout for children inside SMD CompositeState (LR ranks, compact columns, stable horizontal spacing).Improved
    
*   Composite containers now reflow automatically after child/edge edits with no manual UI action.
