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

Task SMD-04 — Transition label and direction style

Goal
Render smdTransition labels in the canonical “event \[guard\] / action” format and make these fields editable both inline (on the label) and in the right-side inspector. Also, ensure the transition direction is visually explicit by adding an arrow marker at the edge’s target endpoint.

Scope of Work

1.  Data model (TypeScript)
    

*   Extend the SMD transition edge data to carry structured fields:interface SmdTransitionData {event?: string; // default: ""guard?: string; // default: ""action?: string; // default: ""}
    
*   Migrate existing SMD edges: if any of these fields are undefined, initialize them to empty strings to avoid build-time union issues and to keep rendering deterministic.
    
*   Ensure persistence/rehydration includes these fields in the diagram JSON.
    

2.  Label rendering rules
    

*   Computed label text uses this template (spaces matter):event \[guard\] / action
    
*   Omit optional parts cleanly:
    
    *   If guard is empty: render just “event” or “event / action” (no brackets).
        
    *   If action is empty: render “event \[guard\]”.
        
    *   If both guard and action are empty: render “event” or empty if event is also empty.
        
*   Never render stray “\[\]” or a lone slash; collapse multiple spaces.
    
*   Keep the current SMD visual style (rounded state nodes, existing edge stroke). No extra BDD-specific stripes for now.
    

3.  Edge component and arrow direction
    

*   Use React Flow’s BaseEdge for the path and EdgeLabelRenderer for the label (consistent with our previous fixes).
    
*   Add a markerEnd arrow on the path that visually points to the target handle. Use a dedicated marker id (e.g., url(#smdArrowHead)) and ensure:
    
    *   It rotates with the edge so the direction is unambiguous.
        
    *   It remains visible above composites and nodes (z-index/pointer-events as we already do for labels/edges).
        
    *   For self-loops, the arrow appears on the segment closest to the target anchor and does not overlap the node border excessively.
        
*   Keep existing hit-testing (pointerEvents) consistent so labels are clickable without breaking edge interactions.
    

4.  Inline editing (label)
    

*   Clicking (or double-clicking) the label enters an inline edit mode.
    
*   Provide three small inputs or a segmented editor that maps to: Event, Guard, Action.
    
    *   Simple, frictionless UX: Enter/Blur saves, Escape cancels, Tab moves between fields.
        
    *   Debounce saves lightly (e.g., 150 ms) to avoid thrashing.
        
*   On save, update edge data (event/guard/action) and recompute the label string.
    

5.  Inspector editing (right panel)
    

*   When an smdTransition is selected, the Properties panel shows a “Transition” section with three fields:
    
    *   Event (text)
        
    *   Guard (text)
        
    *   Action (text)
        
*   Two-way binding with the inline editor:
    
    *   Editing in the inspector immediately updates the on-canvas label.
        
    *   Editing inline immediately reflects in the inspector inputs.
        
*   Optionally display a read-only “Preview” of the composed label string under the fields.
    

6.  Accessibility and UX consistency
    

*   Provide a subtle placeholder in empty fields (e.g., “event”, “guard”, “action”) but do not serialize placeholders—only actual user text.
    
*   Keep current fonts, paddings, rounded label capsule etc., to match the existing SMD aesthetics.
    
*   Keyboard: Enter saves the active field; Shift+Enter inserts a newline is NOT needed here—single-line inputs only.
    

Acceptance Criteria

1.  An smdTransition shows a label in the format “event \[guard\] / action”, with optional parts omitted gracefully when empty.
    
2.  Editing Event/Guard/Action inline immediately updates the rendered label and stays in sync with the inspector fields.
    
3.  Editing Event/Guard/Action in the inspector immediately updates the on-canvas label (two-way sync).
    
4.  The edge clearly displays an arrow marker at its target endpoint. Direction is obvious even when the path is curved or for self-loops.
    
5.  No regressions to existing SMD visuals and interactions (dragging, selecting, composite internals).
    
6.  Diagram save/rehydrate preserves the three fields and the label renders identically after reload.
    

Manual Test Plan

1.  Create a simple SMD: Initial -> State. Confirm the transition shows an arrow pointing into the State.
    
2.  Inline-edit the label to set:
    
    *   event = “tick”, guard = “x > 0”, action = “inc()”Expect: “tick \[x > 0\] / inc()”.
        
3.  Clear guard: Expect: “tick / inc()” (no brackets).
    
4.  Clear action: Expect: “tick \[x > 0\]”.
    
5.  Clear event: Expect:
    
    *   If guard only: “\[x > 0\]” (no leading space or slash).
        
    *   If action only: “/ inc()”.
        
    *   If all empty: label area renders minimal empty capsule or nothing, but selection/inspector still work.
        
6.  Select the edge and edit fields in the inspector. Verify real-time sync with the canvas label and that persistence survives page reload.
    
7.  Create a self-loop on a State and a transition crossing a Composite. Verify arrow head visibility and correct orientation in both cases.
    

Files Likely Touched

*   frontend/src/edges/smdTransition/SmdTransitionEdge.tsx (or equivalent component)
    
*   frontend/src/edges/smdTransition/utils.ts (label formatter, optional)
    
*   frontend/src/types/smd.ts (or wherever the edge data interface lives)
    
*   frontend/src/store/diagramStore.ts (data updates, persist)
    
*   frontend/src/components/inspector/TransitionInspector.tsx (or existing inspector module)
    
*   frontend/src/styles/smd.css (only if minor tweaks needed)
    
*   Any edge factory or adapter that maps persisted JSON to React Flow edges
    

Changelog (prepare after merge)Version: 1.2.7Added

*   Structured Event/Guard/Action fields for smdTransition with two-way editing (inline label and inspector).
    
*   Arrow marker at the transition’s target endpoint to make direction explicit.Improved
    
*   Robust label composition: clean omission of optional parts, no stray brackets or slashes.Persistence
    
*   Event/Guard/Action serialized in diagram JSON and restored on rehydrate.
