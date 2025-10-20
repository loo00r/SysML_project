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

## SMD-Context-Create — Add contextual SMD creation on BDD block

**Branch:** `feat/smd-context-create`

### Goal
Create SMD from a specific **BDD block** via a small plus handle on the **bottom-left edge** of the BDD block (IBD handle remains bottom-right).

### Steps
1. **UI handle (bottom-left)**
   - Add a small “+” action handle anchored to the **bottom-left** of a hovered/selected BDD block.
   - Tooltip: `Create State Machine Diagram`.
   - Ensure proper z-index and pointer-events so it doesn’t conflict with the IBD handle.

2. **Creation behavior**
   - On click, create or focus a diagram tab with metadata:
     ```ts
     {
       type: "SMD",
       title: `SMD for ${blockLabel}`,
       parentBlockId: <BDD block id>,
       parentDiagramId: <current BDD diagram id>
     }
     ```
   - **De-dup rule:** if an SMD for the same `(parentDiagramId, parentBlockId)` exists, **focus** that tab instead of creating a new one.

3. **Initial content (seed)**
   - Create minimal nodes and transitions:
     - Nodes: `Initial`, `State` (label `Idle`), `Final`.
     - Edges: `Initial → State`, `State → Final` (arrowed transitions).
   - Apply auto-layout (LR) if available; otherwise place with sane defaults (non-overlapping, LR flow).

4. **Linking & persistence**
   - Persist `parentBlockId` and `parentDiagramId` with the SMD model.
   - On BDD block context menu, add `Open SMD` when an SMD exists → navigates/focuses its tab.
   - On BDD block rename, update only the SMD **tab title** (optional), not the identifiers.

5. **Visual separation from IBD**
   - Keep IBD handle at **bottom-right** (unchanged).
   - Avoid overlap and provide distinct icons/hover states for SMD vs IBD.

6. **Store/Router integration**
   - Extend diagram store/selectors to query SMD by `(parentDiagramId, parentBlockId)`.
   - Add/open/focus tab helpers for SMD similar to IBD behavior.

### DoD
- Hover a BDD block → a bottom-left “+” with tooltip **Create State Machine Diagram** is visible.
- Click → opens `SMD for <Block>`; repeated click **focuses** existing tab (no duplicates).
- Seeded nodes/edges appear with arrowheads and readable LR layout.
- Save → reload → BDD block context menu shows `Open SMD` and restores the linked SMD.
- IBD handle (bottom-right) remains functional and doesn’t visually collide with the SMD handle.

### Manual test
1. Create/open a BDD, hover a block → see SMD handle bottom-left.
2. Click handle → new `SMD for <Block>` tab with Initial/Idle/Final + transitions.
3. Click handle again → focuses existing SMD tab (no second tab).
4. Rename the BDD block → (optional) tab title updates; identifiers stay stable.
5. Save & reload → `Open SMD` opens the same tab; IBD handle still works.

### Suggested commits
- `feat(smd): contextual SMD create handle on BDD block (bottom-left)`
- `feat(smd): prevent duplicate SMD per (parentDiagramId, parentBlockId)`
- `chore(diagrams): persist SMD parent links and add open/focus helpers`
- `ui(smd): distinct handle icon/hover separate from IBD`
- `test(smd): e2e create/focus SMD from BDD block and persistence`

