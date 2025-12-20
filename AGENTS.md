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

### TASK
Task: Extend Diagram Validator & Quality Scoring (Ferrari/ModRE 2024-aligned)
Goal

Extend our validation phase so that the validator evaluates generated diagrams using the same 5 quality criteria as Ferrari et al. (ModRE 2024) and produces:

scores per criterion on a 1–5 ordinal scale,

a quality_score 0–100,

a text justification per criterion,

a structured issues list (with severity + type),

a validation log object similar to the paper’s evaluation log fields (minimal form).

This must work for our SysML outputs (BDD / IBD / SMD), even if the “diagram type” differs from sequence diagrams in the paper — критерії переносимо як generic model-quality dimensions.

Scope
Must-have (baseline form)

Criteria (1–5 scale) for each diagram:

Completeness

Correctness

Adherence to standard

Understandability

Terminological alignment

Output must contain:

scores: {completeness:1..5, correctness:1..5, standards:1..5, understandability:1..5, terminology:1..5}

quality_score: 0..100 (derived deterministically from the 1–5 scores)

justifications: {criterion: short text}

issues: [{criterion, code, severity, message, location?}]

recommendation: "pass" | "refine" | "fail_fast"

Optional / next iteration

Cross-evaluation agreement (kappa) — not required now.

Thematic analysis taxonomy — not required now (but keep issue codes structured so we can extend later).

Implementation Plan
1) Data model (Pydantic)

Create / extend ValidationReport in backend/app/validation/schemas.py:

{
  "diagram_type": "BDD|IBD|SMD",
  "diagram_id": "...",
  "domain": "generic|sar",
  "scores_1to5": {
    "completeness": 1,
    "correctness": 1,
    "standards": 1,
    "understandability": 1,
    "terminology": 1
  },
  "quality_score_0to100": 0,
  "justifications": {
    "completeness": "...",
    "correctness": "...",
    "standards": "...",
    "understandability": "...",
    "terminology": "..."
  },
  "issues": [
    {"criterion":"completeness","code":"MISSING_ELEMENT","severity":"warning|critical","message":"...","location":"node:id/edge:id/element:id"}
  ],
  "recommendation": "pass|refine|fail_fast",
  "evidence": {
    "deterministic_checks": ["..."],
    "llm_checks": ["..."] 
  }
}

2) Deterministic scoring rules (baseline form)

In backend/app/validation/deterministic.py:

Implement rule checks per diagram type that map into the 5 criteria.

Examples of checks by criterion (baseline version):

Completeness

Missing required elements/modules/actors (domain spec if SAR).

For SMD: missing mandatory phases/states (e.g., SAR mission phases).

For IBD: missing key subsystems from parent BDD.

Correctness

Contradictory relations (e.g., invalid direction, impossible flow).

For SMD: invalid order transitions (e.g., Rescue→Conclusion without Triage/Transport).

For IBD: connections violating declared interfaces (if available).

Adherence to standard

JSON schema validity (elements/nodes/edges required fields).

No orphan nodes (nodes without edges) where not allowed.

Relationship types conform to allowed set (SysML mapping used in project).

Understandability

Excessive redundancy (duplicate nodes names/types).

Generic naming: “Module1”, “ComponentA” (penalize).

Too many edges crossing same nodes (proxy heuristic).

Terminological alignment

Domain term mismatch (SAR vocabulary mapping).

Generic role names when must-use names exist (Incident Commander vs Manager).

Inconsistent naming across diagrams (same concept different labels).

3) Convert 1–5 → 0–100

Define a deterministic mapping:

simplest: average of 5 criteria on 1–5 → scale to 0–100
quality = round(((avg - 1) / 4) * 100)

Add weights only if needed later (keep simple now).

Define thresholds:

fail_fast if any critical issue OR correctness <=2 OR standards <=2

refine if quality_score < X (e.g., 70) OR there are warnings above N

else pass

4) LLM3 validator prompt (extend based on ModRE 2024)

Update the LLM3 prompt template to:

explicitly implement the 5 criteria and the 1–5 scale definitions

require output in strict JSON matching ValidationReport fields

require justification per criterion (1–3 sentences each max)

instruct LLM3 to use deterministic findings as “evidence” and not hallucinate missing checks

Prompt skeleton (high level):

Input:

user_request

diagram_type (BDD/IBD/SMD)

diagram_json

domain_context (optional SAR)

deterministic_issues (list)

Output: strict JSON with:

scores_1to5 (all 5 criteria)

justifications

issues (merge deterministic + semantic)

recommendation

Scale guidance (from Ferrari):
1 = Not fulfilled at all
2 = Minimal extent
3 = Partially fulfilled
4 = Mainly fulfilled
5 = Completely fulfilled

5) Minimal evaluation log object (paper-inspired)

Add an object stored/returned alongside validation (optional in Redis payload):

evaluation_log:

prompt_variant_id (if multiple)

diagram_link_or_id

scores

justifications

notes (free text)

conversation_ref (optional)

(У нас це буде “machine log”, не людський annotator log.)

Acceptance Criteria

For any generated diagram (BDD/IBD/SMD), the API returns validation_report with:

all five criteria scored 1–5

quality_score_0to100

at least 1 justification string per criterion

structured issues with severity

a recommendation (pass/refine/fail_fast)

Reports are stable JSON (parsable, no free-form).

At least 5 unit tests:

missing elements → completeness drops

invalid ordering in SMD → correctness drops + critical issue

invalid JSON structure → standards drops + fail_fast

generic naming → understandability penalty

terminology mismatch → terminology penalty

Notes / Positioning (for thesis)

We adopt Ferrari et al.’s quality dimensions (completeness, correctness, standards, understandability, terminology) and operationalize them into an automated scoring procedure for MBSE diagrams.

Unlike the paper’s manual annotation, our implementation produces consistent evaluation signals for iterative refinement.