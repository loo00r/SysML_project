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

# SMD-03-TUNE — Deterministic composite growth on child add (+5%), never on drag

## Goal
Make **Composite** resizing predictable:
- **No growth on drag/move** of children — drag only clamps.
- On **palette drop inside Composite**:
  - If this is the **first** child → size stays unchanged.
  - For **every next** child (2nd, 3rd, …) → Composite **grows by +5%** from its current width/height.
- On **delete** → Composite may shrink (to fit or to initial/min), as it already does.

## Rationale
Current auto-resize sometimes grows during drag and inconsistently on add. We want a stable rule: growth happens **only** on add, by a fixed step, and never as a side-effect of moving nodes.

## Scope
- In scope: resize scheduler gating by event `reason`, fixed-step growth (+5%) on `child-add` when `childCount >= 2`, no growth on `move/drag`.
- Out of scope: geometry-based “fit-to-children” growth on add (keep for future mode), reparenting from canvas, multi-region logic.

## Implementation Steps

1. **Resize policy switch**
   - Add a policy flag in composite data (or service constant):  
     `AUTO_RESIZE_POLICY = 'incrementalOnAdd'`.
   - The service will branch on policy; default to this policy for SMD composites.

2. **Scheduler gating**
   - Ensure all resize scheduling calls pass a `reason`:
     - `child-add`, `child-delete`, `dragging`, `drag-end`, `layout-done`, `hydrate`.
   - Update the central scheduler:
     - **Ignore growth** for `dragging` and `drag-end`. (Still run **clamp** without size change.)
     - Allow resize for `child-delete`, `layout-done`, `hydrate` (shrink or normalize).
     - For `child-add` → delegate to the new incremental rule (Step 3) and **flush** (no debounce).

3. **Incremental growth rule (+5%)**
   - In `resizeCompositeToChildren(parentId, reason)`:
     - Get `children = directChildren(parentId)`.
     - If `reason === 'child-add'`:
       - If `children.length === 1`: **no-op** (first child doesn’t change size).
       - Else (length ≥ 2):
         ```ts
         const GROW = 1.05; // +5%
         const nextW = Math.ceil(currentW * GROW);
         const nextH = Math.ceil(currentH * GROW);
         // Clamp to sensible bounds:
         const MIN_W = 220, MIN_H = 120;
         const INITIAL_W = node.data.initialW ?? 320;
         const INITIAL_H = node.data.initialH ?? 200;
         const MAX_W = (node.data.maxW ?? INITIAL_W * 4);
         const MAX_H = (node.data.maxH ?? INITIAL_H * 4);

         targetW = Math.min(Math.max(nextW, Math.max(MIN_W, INITIAL_W)), MAX_W);
         targetH = Math.min(Math.max(nextH, Math.max(MIN_H, INITIAL_H)), MAX_H);
         ```
         - Apply resize in a **single store transaction**, then run **clampChildren** to keep nodes inside the new innerRect.
     - If `reason === 'child-delete'` or `layout-done` or `hydrate`:
       - Allow **shrink-to-fit** or **normalize** to:
         ```ts
         targetW = Math.max(MIN_W, INITIAL_W, bboxFitW);
         targetH = Math.max(MIN_H, INITIAL_H, HEADER_H + bboxFitH);
         ```
       - (This preserves your current “shrink works” behavior.)

4. **Disable drag-driven growth**
   - For `reason === 'dragging'` and `reason === 'drag-end'`:
     - **Do not** change width/height.
     - Only compute `innerRect` from the **current** composite size and **clamp** child positions.
     - Keep debounce for performance but it should **not** call resize.

5. **Events wiring (palette drop path)**
   - In the palette drop handler (child creation with `parentNode` already set and parent-local position):
     - `scheduleCompositeResize(parentId, { reason: 'child-add', flush: true })`.

6. **Zero-children stabilization**
   - When `children.length === 0`, keep:
     ```ts
     targetW = Math.max(MIN_W, INITIAL_W);
     targetH = Math.max(MIN_H, INITIAL_H);
     ```
   - This prevents lingering tiny sizes.

## Acceptance Criteria
- [ ] Adding the **first** child to a Composite: size unchanged.
- [ ] Adding the **second and every subsequent** child via palette drop inside the Composite: width & height grow by **exactly +5%** of the current size (bounded by MAX).
- [ ] **Drag/move** inside Composite never changes Composite size; only clamping occurs.
- [ ] Deleting children can shrink the Composite, but not below initial/min; deleting all returns to initial (≥ min).
- [ ] Behavior is consistent across sessions (after refresh/hydration).

## Testing
- Manual:
  1. New Composite → add first child → size unchanged.
  2. Add a second child → size grows by ~5%; add third → +5% again; etc.
  3. Drag children to borders → Composite size remains fixed; nodes get clamped.
  4. Delete one child → size may shrink to fit; delete all → size returns to initial/min.
  5. Reload tab → sizes persist and rules remain consistent.
- Unit:
  - Incremental growth math (+5% with min/initial/max clamps).
  - Scheduler gating: `child-add` grows; `dragging/drag-end` don’t.
  - Zero-children normalization.

## Files to Touch (indicative)
- `frontend/src/features/smd/composite/resizeService.ts` (policy, incremental rule, zero-children)
- `frontend/src/features/dnd/paletteDrop.ts` (reason: `child-add`, flush)
- `frontend/src/store/diagramStore.ts` (scheduler gating, reasons propagation)
- `frontend/src/utils/geometry.ts` (innerRect calc + clamp)

## Risks & Notes
- Fixed-step growth trades exact fit for determinism; set `MAX_W/H` to prevent runaway growth when adding many nodes.
- Ensure all palette adds carry `reason: 'child-add'`. Reparenting flows remain out of scope.

## Post-merge Checklist
- [ ] `CHANGELOG.md` → **Changed:** Composite grows deterministically by +5% on child add; drag no longer drives growth.
- [ ] Bump patch version and update `.env` (`APP_VERSION`, `VITE_APP_VERSION`).


