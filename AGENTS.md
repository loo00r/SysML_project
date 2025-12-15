# Repository Guidelines

## Project Structure & Module Organization
- Backend (Python 3.12) lives in `backend/app/`:
  - `app/main.py`: FastAPI app, CORS, includes routers, exposes `settings.APP_VERSION` as the app version.
  - `app/api/api_v1.py`: Aggregates routers under `settings.API_PREFIX` (from `.env`, usually `/api/v1`).
  - `app/core/config.py`: Pydantic Settings (loads `.env`) for API prefix/version, OpenAI, DB, and Redis.
  - `app/core/redis_client.py`: Redis cache for async generation results with TTL (`settings.REDIS_TTL`).
  - `app/AI/diagram_generation.py`: OpenAI generation + prompt templates for BDD/IBD/SMD; `DiagramPositioning` auto-layout.
  - `app/database/models.py`: SQLAlchemy models + Pydantic API models (keep here to avoid circular imports).
  - `app/database/embeddings.py`: Embedding generation + pgvector similarity search + persistence helpers.
  - `app/database/rag_router.py`: RAG + async “unified chain prompting” endpoints (BDD/IBD/SMD generation and Redis-backed polling).
  - `app/diagrams/create_diagram.py`: “Generate and persist immediately” flow (stores BDD, syncs blocks, upserts IBDs).
  - `app/diagrams/ibd_router.py`: IBD fetch/upsert endpoints for manual editing.
  - `app/crud/*`: Async CRUD helpers for `bdd_blocks`, `internal_block_diagrams`, `state_machine_diagrams`.
  - `app/db/*`: SQLAlchemy async engine/session + FastAPI dependency.

- Database/migrations:
  - Docker initializes schema via `backend/app/database/init.sql` (tables + indexes + sample seed data; enables `pgvector`).
  - Alembic migrations live in `backend/alembic/` and use `DB_URL_SYNC` (configured in `backend/alembic/env.py`).

- Frontend React/TypeScript source is under `frontend/src/` and builds into `frontend/dist`.
- `docker-compose.yml` orchestrates FastAPI, PostgreSQL+pgvector, Redis, and the frontend container.

## Build, Test, and Development Commands
- `docker-compose up --build`: rebuilds and starts the full stack.
- `cd backend && poetry install`: install backend dependencies.
- `poetry run uvicorn app.main:app --reload --port 8000`: run the FastAPI app with auto-reload.
- `poetry run alembic upgrade head`: apply migrations (uses `DB_URL_SYNC`).
- `poetry run pytest`: execute backend unit and async tests (DB/Redis-backed tests require services running).
- `cd frontend && npm install`: install web dependencies.
- `npm run dev`: launch the Vite dev server on http://localhost:5173/.
- `npm run build`: output production assets to `frontend/dist/`.

## Coding Style & Naming Conventions
Use 4-space indentation and snake_case files for Python, keeping Pydantic models and SQLAlchemy types inside `database` to avoid circular imports. Group routers inside `api` with PascalCase tags and explicit prefixes. For React, use 2-space indentation, PascalCase for components in `src/components`, and `useX` names for hooks in `src/hooks`. Store app-wide state in `src/store` and keep helpers in `src/utils` pure and typed.

## Testing Guidelines
Place backend tests under `backend/app/test/` using `test_*.py` names and `pytest-asyncio` for coroutine endpoints. Prefer fixtures that start the FastAPI `TestClient` and seed Redis/Postgres with minimal data. Aim for smoke coverage on new routers and services before merging. Frontend tests are not yet enforced; if you add them, use Vitest with React Testing Library and mirror component paths in `src/__tests__/`.

## Backend API Notes (Current)
- All endpoints are mounted under `API_PREFIX` (usually `/api/v1`).
- Health/version:
  - `GET /ping/`: returns `{message:"pong"}`.
  - `GET /version/`: returns `{version: settings.APP_VERSION}`.
- “Immediate persist” flow:
  - `POST /create-diagram/`: generates a BDD (or `bdd_enhanced`), applies positioning, stores into `diagram_embeddings`, syncs `bdd_blocks`, and upserts related `internal_block_diagrams`.
- IBD endpoints:
  - `GET /diagrams/ibd/{parent_block_id}`: fetches latest IBD for a block id and applies positioning to nodes.
  - `POST /diagrams/ibd/`: upserts IBD for a given `(parent_bdd_diagram_id, parent_block_id)`.
- RAG/async flows (Redis-backed polling):
  - `POST /rag/generate-diagram-with-context/`: generates BDD (optionally with one-shot example via pgvector), stores result in Redis, returns `diagramId`.
  - `POST /rag/generate-diagram-unified/`: starts background chain prompting (BDD → optional IBD + SMD), stores partial/final results in Redis, returns `diagramId`.
  - `GET /rag/diagram-result/{diagram_id}`: polls Redis result (expires per `REDIS_TTL`).
  - `POST /rag/save-diagram/`: persists a completed Redis result into Postgres and upserts IBD/SMD records.

## Persistence & RAG Notes (Current)
- Primary RAG index is `diagram_embeddings.embedding` (pgvector cosine distance), generated from `raw_text`.
- `bdd_blocks` provides a stable catalog of blocks per persisted BDD; IBDs/SMDs can reference this via `parent_block_ref_id`.
- Redis is used as a short-lived “generation workspace” for async results; Postgres is the system of record.

## Commit & Pull Request Guidelines
Match recent history with imperative commit titles and, when helpful, Conventional Commit prefixes (`feat:`, `fix:`, `chore:`). Pull requests should outline intent, summarize changes, link to issues, and call out migrations or environment tweaks. Attach screenshots or sample payloads for UI or API changes, and confirm `poetry run pytest` plus `npm run build` before requesting review.

## Environment & Configuration
- Copy `.env.example` to `.env` and supply OpenAI keys plus database URLs before launching services.
- Required for backend boot (no defaults):
  - `API_PREFIX` (e.g. `/api/v1`)
  - `OPENAI_API_KEY`, `OPENAI_GENERATIVE_MODEL`
- Commonly set in `.env` / Docker (defaults exist in code, but override for local/dev/prod):
  - `DB_URL` (async SQLAlchemy URL for runtime), `DB_URL_SYNC` (sync URL for Alembic)
  - `REDIS_URL`, `REDIS_TTL`
  - `APP_VERSION` (used by FastAPI and `GET /version/`)
- Docker expects Postgres on `db:5432` and Redis on `redis:6379` (compose service names).
- Port note: `docker-compose.yml` maps `BACKEND_PORT`, but `backend/launch.sh` reads `PORT` for the uvicorn port (defaults to 8000). If changing ports, keep these aligned (set `PORT` and `BACKEND_PORT`, or update `launch.sh`/compose).
- Never commit secrets or generated `.env` files—use environment overrides or a secret manager instead.

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

### Notes
- `CLAUDE.md` contains a longer-form architecture + endpoint overview; keep `AGENTS.md` concise and “how to work in the repo” focused.
