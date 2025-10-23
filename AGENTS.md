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

Task SMD-04b — Fix arrow side on the auto-seeded SMD template

GoalWhen a new SMD is auto-seeded (Initial → State → Final), both transitions should show the arrow on the target node’s top side (as the template connects into top handles). Today, the arrow sometimes appears on the left side only for this seeded example, while manually created edges behave correctly.

HypothesisThe seeded transitions do not set explicit targetHandle/targetPosition, or they’re normalized after mount with a default fallback (“left”), so the node-level arrow overlay picks the wrong side. Manual edges carry the correct metadata, hence they render fine.

Scope of work

1.  Seed data: set explicit handle metadata
    

*   In the SMD scaffold builder that creates Initial → State and State → Final, set both:
    
    *   targetHandle: "top"
        
    *   targetPosition: Position.Top
        
*   Also set the source side explicitly (e.g., sourceHandle: "right", sourcePosition: Position.Right) to keep the graph fully deterministic.
    

2.  Normalization guard (store/utils)
    

*   In the SMD transition normalizer (the code path that runs on create/rehydrate), add:
    
    *   If targetHandle is set to "top"|"right"|"bottom"|"left" and targetPosition is missing, derive Position.\* from the handle.
        
    *   If neither is present, derive the side from the target node’s nearest handle (distance check) and persist it.This ensures older diagrams or partial data can’t regress to “left”.
        

3.  Node overlay side resolution (arrow renderer)
    

*   Side detection priority:
    
    1.  from targetHandle (if one of "top"|"right"|"bottom"|"left")
        
    2.  else from targetPosition (Position.Top|Right|Bottom|Left)
        
    3.  else compute by geometry (endpoint vs. node center → pick nearest side)
        
*   Keep pointer-events: none, and ensure overlays re-evaluate on edge add/update/rehydrate.
    

4.  Mount timing
    

*   After seeding the diagram, schedule a one-tick RAF to ensure edges are mounted before computing inbound-sides for overlays. This avoids reading undefined positions on first paint.
    

Acceptance criteria

*   Creating a fresh SMD shows arrows on the top edge of State and Final in the seed (Initial → State → Final).
    
*   Manually drawn transitions continue to show correct arrows for left/right/top/bottom and self-loops.
    
*   After reload (rehydrate), the seed still shows top arrows (no fallback to left).
    
*   No visual regressions inside composites or across different tabs.
    

Manual test plan

1.  Create a new SMD: verify both seeded transitions point to the target node’s top side.
    
2.  Draw new transitions into each side of a State: arrows appear on matching sides.
    
3.  Reload the page (rehydrate): seeded arrows remain on top.
    
4.  Undo/redo movements of the State/Final: arrows keep correct sides.
    
5.  Repeat inside a Composite to confirm overlays stay above internals.
    

Files likely touched

*   frontend/src/services/smdScaffold.ts (or wherever the seed SMD is built)
    
*   frontend/src/utils/smdTransition.ts (normalizer/derivation helpers)
    
*   frontend/src/components/shared/ArrowHeadOverlay.tsx (side resolution tweak)
    
*   frontend/src/store/diagramStore.ts (if normalization lives here)
    

Changelog (prepare)Version: 1.2.9 - 2025-10-23 Fixed

*   Seeded SMD template now renders arrowheads on the correct top side of target nodes; added robust target side derivation and rehydrate-safe normalization.
