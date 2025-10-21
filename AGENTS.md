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

# SMD-03-FIX — Composite must grow (never shrink) on palette child add

## Goal
When a user drags **Initial / State / Choice / Final** from the Diagram Elements panel **into** a Composite, the Composite must **increase** its size to include the new child with padding. It must **not shrink** on add. (Shrinking is allowed only on delete or explicit auto-layout.)

## Context
Current behavior: on the **first** palette drop inside a Composite, the container **shrinks once** and then stops resizing on subsequent adds; after deleting children it stays small. This typically happens due to early measurement (child width/height 0), using world instead of parent-local coordinates, wrong padding/header math, and/or debounced scheduling that swallows the final update.

## Scope
- In scope:
  - Reliable resize scheduling (microtask + double `requestAnimationFrame`, with **flush** on drop/dragEnd).
  - Parent-local bbox calculation with non-zero width/height fallbacks.
  - Correct size math including header and padding, plus **no-shrink guard** for `reason: 'child-add'`.
  - Clamp children **after** resize; batch updates in a single store transaction.
  - Proper behavior for **zero children** (revert to initial size ≥ min).
- Out of scope:
  - Reparenting nodes dragged from canvas over Composite (separate task).
  - Advanced multi-region statechart semantics.

## Implementation Steps
1. **Palette → Composite drop scheduling**
   - In the palette-drop handler (where the child is created):
     - Create the node with `parentNode = composite.id`, **parent-local** position inside the inner workspace.
     - Call:
       ```ts
       scheduleCompositeResize(parentId, { reason: 'child-add', flush: true })
       ```
   - Implement `scheduleCompositeResize` to:
     - `await Promise.resolve()` → `requestAnimationFrame(() => requestAnimationFrame(() => resizeCompositeToChildren(parentId, 'child-add')))`.
     - If `flush: true`, cancel pending debounced jobs for that parent and run the above immediately.

2. **Parent-local bbox with safe sizes**
   - In `resizeCompositeToChildren(parentId, reason)`:
     - Collect **direct children** of types: `smdInitial`, `smdState`, `smdComposite`, `smdFinal`, `smdChoice`.
     - For each child, build bounds in **parent-local** coordinates:
       ```ts
       const x = child.position.x;
       const y = child.position.y;
       const w = child.width  ?? measuredWidthByType(child.type)  ?? DEFAULTS[child.type].w;
       const h = child.height ?? measuredHeightByType(child.type) ?? DEFAULTS[child.type].h;
       ```
       (No viewport/world transforms; avoid 0×0.)
     - Compute `bbox = union(childrenBounds)`; if no children → handle as in step 4.

3. **Resize math + no-shrink guard**
   - Constants:
     ```ts
     const HEADER_H = 28;
     const PAD_X = 16, PAD_Y = 20;
     const MIN_W = 220, MIN_H = 120;
     const INITIAL_W = node.data.initialW ?? 320;
     const INITIAL_H = node.data.initialH ?? 200;
     ```
   - Targets:
     ```ts
     let targetW = Math.max(MIN_W, INITIAL_W, bbox.w + PAD_X * 2);
     let targetH = Math.max(MIN_H, INITIAL_H, HEADER_H + bbox.h + PAD_Y * 2);
     if (reason === 'child-add') {
       targetW = Math.max(targetW, currentW);
       targetH = Math.max(targetH, currentH);
     }
     if (Math.abs(targetW - currentW) < 1 && Math.abs(targetH - currentH) < 1) return; // no-op
     ```
   - Apply the new size in a **single store transaction** together with any clamps (next step).

4. **Clamp children after resize & zero-children behavior**
   - After applying `targetW/H`, clamp all children into:
     ```ts
     const inner = {
       x: PAD_X,
       y: HEADER_H + PAD_Y,
       w: targetW - PAD_X * 2,
       h: targetH - HEADER_H - PAD_Y * 2,
     };
     ```
   - If `children.length === 0`, set size to:
     ```ts
     { w: Math.max(MIN_W, INITIAL_W), h: Math.max(MIN_H, INITIAL_H) }
     ```
     (never smaller than initial size).

5. **Events & debounce policy**
   - **Flush (no debounce)** on: palette drop, dragEnd, delete, auto-layout done, hydrate (one time).
   - **Debounce 150ms** only during **dragging/moving**.
   - Clear pending timers on Composite unmount.

6. **Persistence & hydration**
   - Persist updated `width/height`.
   - On tab open/rehydration call:
     ```ts
     scheduleCompositeResize(parentId, { reason: 'hydrate', flush: true })
     ```
     to re-sync with actual child sizes.

## Acceptance Criteria
- [ ] Dropping any of **Initial / State / Choice / Final** into a Composite increases its size to include the child with padding; it **never shrinks** on add.
- [ ] Subsequent adds keep growing as needed; no “only first time” effect.
- [ ] Deleting children may shrink the Composite but not below **initial size** (and never below min).
- [ ] With zero children, Composite returns to its **initial size** (≥ min).
- [ ] No flicker; updates are immediate on drop/dragEnd; bounding boxes are parent-local and non-zero.

## Testing
- Manual
  1. New Composite → drop 3 States sequentially → Composite grows each time.
  2. Add Initial, then Choice → grows; delete nodes → Composite shrinks but not below initial size; delete all → returns to initial size.
  3. Fast add of 5+ nodes → final size fits all; no missed updates.
  4. Reload tab (hydrate) → size matches children (no unexpected shrink).
- Unit
  - BBox union (parent-local) with default size fallbacks.
  - No-shrink guard for `reason: 'child-add'`.
  - Debounce/flush logic for drop vs drag.

## Files to Touch (indicative)
- `frontend/src/features/smd/composite/resizeService.ts`
- `frontend/src/features/dnd/paletteDrop.ts` (or the module that creates nodes from the palette)
- `frontend/src/store/diagramStore.ts` (scheduler hooks, hydration)
- `frontend/src/utils/geometry.ts`

## Risks & Notes
- Measuring too early causes “shrink once”: enforce microtask + **double RAF** before resize.
- Keep all math strictly **parent-local**. Mixing world/viewport coords leads to negative or tiny bboxes.
- Batch resize + clamp in a single transaction to avoid intermediate layouts.

## Post-merge Checklist
- [ ] `CHANGELOG.md` → **Fixed:** Composite grows on palette child add; stable parent-local auto-resize.
- [ ] Bump patch version and update `.env` (`APP_VERSION`, `VITE_APP_VERSION`).

