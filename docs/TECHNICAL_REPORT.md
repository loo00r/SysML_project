# Technical Report - refach vs develop

Date: 2025-12-21
Branch: refach
Base branch: develop (27ba253663953977dd52f97ed715a07cf9cd0518)
Head commit: 6d84ce67ad2636d34222249171a14426ed362f45

## 1) Scope and inputs
This report documents every completed chapter of work on branch refach and explains what changed, how it works, and why it was done. It is based on:
- Current plan: docs/CURRENT_UPDATE_IMPLEMENTATION_PLAN.md
- Change history: CHANGELOG.md
- Code diff against develop
- UI behavior observed in the generator flow

## 2) Change inventory with intent

### Added (what and why)
- backend/app/core/payload_merge.py: merges Redis payload updates without losing timeline events or per-diagram validation data; needed for stable polling UI updates.
- backend/app/domain/constraints.py: builds domain context strings used in prompts; needed to inject SAR constraints without overengineering.
- backend/app/domain/detector.py: optional LLM classifier for domain/command_mode; keeps the pipeline robust when users do not pass domain/mode explicitly.
- backend/app/domain/sar_constraints.json: machine-readable SAR rules; used by validator and prompt injection to keep logic consistent.
- backend/app/validation/schemas.py: Pydantic models for validation output; needed for consistent UI + API contract.
- backend/app/validation/deterministic.py: deterministic validator for SAR; primary scoring and pass/refine/fail logic.
- backend/app/validation/llm_validator.py: optional LLM semantic evaluator; provides secondary signals without replacing rule-based scoring.
- backend/app/validation/refinement.py: prompt builder for refinement loops; keeps regen instructions consistent.
- backend/app/test/test_*: tests for deterministic rules, payload merge, and unified flow safety.
- docs/CURRENT_UPDATE_IMPLEMENTATION_PLAN.md: unified plan that replaces older scattered docs.
- docs/SAR_DOMAIN_SPEC.md: formal SAR domain spec used to drive constraints.
- frontend/src/components/shared/GenerationStatusPanel.tsx: UI panel for timeline, score, issues, and navigation.
- frontend/src/utils/unifiedGeneration.ts: typed payload parsing, issue-location routing, progress utilities.
- Current_update.docx: upstream research input for the plan.

### Modified (what and why)
- backend/app/database/rag_router.py: core unified pipeline; integrates domain injection, validation, refinement, and progress updates.
- backend/app/AI/diagram_generation.py: adds SAR domain context into prompts for BDD/IBD/SMD.
- backend/app/core/config.py: feature flags and model settings for detector + validator.
- frontend/src/components/DiagramGeneratorNew.tsx: exposes issues list + click-to-navigate.
- frontend/src/components/LoadingAnimation.tsx: aligned to new progress UX.
- frontend/src/hooks/useAIGeneration.ts: uses unified payload and converts IBD/SMD into drawable diagrams.
- AGENTS.md: expanded task checklist for validator/quality scoring implementation.
- CHANGELOG.md: full stepwise release history aligned with changes.
- .env.example: updated version markers.

### Removed (why)
- Deprecated or superseded docs: replaced by docs/CURRENT_UPDATE_IMPLEMENTATION_PLAN.md as a single source of truth.
- Outdated reports (Technical report.docx, SMD_IMPLEMENTATION_PLAN.md): replaced by the living plan and this report.

## 3) Chapter: Domain research and constraints (Plan Phase 1-2)

### What changed
- docs/SAR_DOMAIN_SPEC.md codifies Flood Rescue/SAR actors, constraints, and required behaviors.
- backend/app/domain/sar_constraints.json converts the spec into structured, machine-readable rules.
- backend/app/domain/constraints.py loads constraints and produces a compact prompt appendix.
- backend/app/domain/detector.py optionally identifies SAR + command_mode from raw text.

### How it works
- sar_constraints.json defines:
  - terminology (must-use terms, synonyms)
  - BDD requirements (required blocks, scaling indicators, volunteer presence)
  - IBD comms requirements (PACE, required interfaces, critical roles)
  - SMD rules (required phases, forbidden transitions, RTH link-loss, buffering, fault taxonomy)
  - asset rules (Type B motor, Type D restrictions, drone RTH)
- build_domain_context(domain, command_mode) reads the JSON and produces concise text appended to LLM system prompts.
- detect_domain_and_mode(text) uses a strict JSON classifier to return sar/generic and ICS/GSB when enabled.

### Why we did it
- The validator and scoring must be grounded in domain rules, not guessed.
- Domain injection is the cheapest way to steer generation toward valid SAR outputs.
- Auto-detection avoids forcing clients to pass domain/mode every time.

## 4) Chapter: Deterministic validation (Plan Phase 3)

### What changed
- Added schemas for ValidationIssue/ValidationReport.
- Implemented deterministic SAR validator with structured issue locations and severity.

### How it works
- Structural rules validate JSON shapes for BDD/IBD/SMD.
- SAR rules are applied by scanning:
  - bdd/ibd/smd strings
  - node names and properties
  - edge triggers and relationships
- Results include:
  - issues list with code, severity, message, and location
  - counts for critical/warning
  - scores_1to5 and quality_score

### Why we did it
- Deterministic rules are the primary, reproducible scoring gate.
- These rules directly implement the five evaluation categories from the plan.
- The UI needs stable issue locations to allow navigation.

### Rule groups and intent
- Standards: enforce valid JSON structure and required fields (prevents invalid diagrams).
- Completeness: detect missing required blocks or phases (e.g., MISSING_REQUIRED_BDD_BLOCK, MISSING_MISSION_PHASE).
- Correctness: detect invalid transitions and mode mixing (e.g., MODE_MIXED_ICS_GSB, FORBIDDEN_TRANSITION).
- Terminology: enforce canonical SAR language (TERMINOLOGY_SYNONYM_USED).
- Understandability: avoid generic names and vague fault handling (GENERIC_NAMING, FAULT_TAXONOMY_MISSING).
- Safety/operational rules: RTH on link loss, buffering under degraded comms, PACE, and asset requirements.

## 5) Chapter: Optional LLM semantic validator (Plan Phase 4)

### What changed
- Added backend/app/validation/llm_validator.py.
- Added feature flag and model settings for LLM evaluation.
- Added hybrid score support (deterministic + LLM).

### How it works
- LLM evaluation runs only when VALIDATION_ENABLE_LLM is true.
- The LLM receives the user text, domain context, diagram excerpt, and deterministic report.
- It returns 1-5 category scores, a 0-100 score, issues, and a recommendation.
- The LLM can only raise strictness (escalate refine/fail) and never replace the deterministic gate.

### Why we did it
- We keep deterministic scoring as the core evaluation to avoid “GPT judging itself”.
- The LLM adds semantic nuance for ambiguous cases without becoming the main evaluator.
- The hybrid score is optional and can be disabled at runtime.

## 6) Chapter: Refinement loops and fail-fast policy (Plan Phase 5)

### What changed
- Added BDD refinement loop with max 4 attempts.
- Added minimal IBD/SMD refinement loop with max 2 attempts.
- Fail-fast is downgraded to refine to avoid full pipeline termination.
- Subdiagram retries now happen only when issues are tied to that specific block.

### How it works
- BDD is generated, validated, and refined up to max_bdd_iterations.
- Each IBD/SMD is validated and refined only if its report includes issues with a matching location prefix (ibd:<block_id> or smd:<block_id>).
- If a subdiagram has no matching issues, it is not re-generated.
- The pipeline continues even when the recommendation is fail_fast, returning best-effort outputs and issues.

### Why we did it
- Avoids wasting tokens on already-valid subdiagrams.
- Keeps the UI responsive and reduces “max attempts reached” loops.
- Allows MVP demos to complete even when minor issues persist.

## 7) Chapter: Unified async pipeline (rag_router)

### What changed
- Unified chain prompting pipeline for BDD -> IBD/SMD with validation in between.
- Domain injection and auto-detection integrated.
- Progress events, stage labels, and validation payloads are streamed into Redis.

### How it works
- Step 1: Generate BDD and validate it (stage="BDD").
- Step 2: Identify candidate blocks for IBD/SMD generation.
- Step 3: Run IBD/SMD tasks in parallel (asyncio.gather).
- Step 4: Validate each subdiagram and refine if needed.
- Step 5: Run unified validation and store final results.

### Why we did it
- Enables incremental status updates for the frontend.
- Makes validation and refinement visible during generation.
- Reduces full pipeline failure by keeping best-effort outputs.

## 8) Chapter: Redis payload merge

### What changed
- Added merge_payload to safely combine partial updates.

### How it works
- Events are accumulated and de-duplicated.
- subdiagram_validation and llm_subdiagram_validation are deep-merged.
- The latest payload always contains the full timeline and per-block validation state.

### Why we did it
- Polling UI needs stable, append-only progress data.
- Prevents losing events or per-block validation results on each update.

## 9) Chapter: Diagram generation prompt changes

### What changed
- Domain context now injected into BDD, IBD, and SMD prompts.

### How it works
- build_domain_context(...) creates a compact “domain context” section.
- diagram_generation appends this to system prompts when domain == sar.

### Why we did it
- Ensures LLM sees SAR rules early and generates closer-to-valid diagrams.

## 10) Chapter: Frontend updates

### 10.1 GenerationStatusPanel
- What changed: new overlay panel showing stage, scores, issues, and events.
- How it works: consumes UnifiedGenerationPayload and normalizes events/issues for display.
- Why: gives immediate feedback and allows issue-driven debugging.

### 10.2 DiagramGeneratorNew issues panel
- What changed: issues list with click-to-navigate and severity chips.
- How it works: parses issue.location and targets BDD/IBD/SMD, selects nodes/edges.
- Why: makes validator output actionable for the user.

### 10.3 unifiedGeneration utilities
- What changed: shared types + parsing helpers for validation payloads.
- How it works: parseIssueLocation maps strings to diagram targets.
- Why: keeps UI logic consistent and reduces fragile string parsing in components.

### 10.4 useAIGeneration pipeline
- What changed: uses unified payload to build IBD/SMD diagrams.
- How it works: transforms raw nodes/edges into app-specific diagrams, applies Dagre layout.
- Why: ensures all generated diagrams render consistently without manual rework.

## 11) Chapter: Tests

### What changed
- Added deterministic validation tests, payload merge tests, and unified pipeline safety tests.

### How it works
- test_deterministic_validation*.py: checks SAR rules and locations.
- test_payload_merge_unittest.py: verifies events + subdiagram merges.
- test_unified_fail_fast.py: ensures fail-fast is downgraded and pipeline completes.

### Why we did it
- Validates that core SAR rules work deterministically.
- Protects regression in the polling payload contract.

## 12) Chapter: Documentation

### What changed
- Consolidated plans into docs/CURRENT_UPDATE_IMPLEMENTATION_PLAN.md.
- Added docs/SAR_DOMAIN_SPEC.md as formal requirements.
- Updated AGENTS.md to match the new validator and scoring scope.

### Why we did it
- Keeps a single source of truth for implementation and status.
- Makes client communication and internal onboarding clearer.

## 13) Versioning and changelog
- CHANGELOG.md updated with stepwise entries aligned to implementation milestones.
- .env and .env.example keep APP_VERSION and VITE_APP_VERSION in sync.

## 14) Status vs plan

### Implemented for MVP
- Domain spec and constraints injection.
- Deterministic validation with SAR rules.
- Refinement loops (BDD 4 attempts, IBD/SMD 2 attempts).
- Unified progress payload and UI issue navigation.
- Optional LLM validator with hybrid scoring support.

### Remaining (explicit in plan)
- LLM validator as true validator-in-the-loop for every step.
- Strong schema validation for LLM JSON outputs.
- Dedicated UI sidebar for issues with filters.
- CI runner for automatic tests.

