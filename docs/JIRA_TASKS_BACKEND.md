# JIRA Tasks: Chain Prompting Backend Implementation

## Epic Structure

**EPIC-1**: Chain Prompting Architecture Implementation
**Duration**: 4 weeks (4 sprints)
**Team**: Backend
**Priority**: High

---

## Sprint 1: BDD/IBD Refactoring (Week 1)

### TASK-1: Create simplified BDD-only prompt template
**Type**: Task
**Priority**: High
**Story Points**: 3

**Description**:
Remove IBD generation from BDD prompt. Create new `BDD_ONLY_PROMPT_TEMPLATE` that focuses only on block structure and relationships.

**Files to modify**:
- `backend/app/AI/diagram_generation.py`

**Acceptance Criteria**:
- [ ] New `BDD_ONLY_PROMPT_TEMPLATE` created
- [ ] Template does NOT mention internal_diagram
- [ ] Template focuses on blocks, sensors, processors, relationships
- [ ] No IBD nesting in instructions

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (section "Prompt Templates")

**Dependencies**: None

---

### TASK-2: Create dedicated IBD prompt template
**Type**: Task
**Priority**: High
**Story Points**: 3

**Description**:
Create new `IBD_PROMPT_TEMPLATE` for generating Internal Block Diagrams separately from BDD. Include context parameters: block info, system context, parent relationships.

**Files to create**:
- `backend/app/AI/diagram_generation.py` (add new constant)

**Acceptance Criteria**:
- [ ] `IBD_PROMPT_TEMPLATE` created with context placeholders
- [ ] Template accepts: block_id, block_name, block_description, system_context, parent_relationships
- [ ] Template outputs JSON: {nodes: [], edges: []}
- [ ] Instructions focus ONLY on internal structure

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Prompt 2: IBD)

**Dependencies**: TASK-1

---

### TASK-3: Implement generate_ibd_diagram() function
**Type**: Task
**Priority**: High
**Story Points**: 5

**Description**:
Create new function `generate_ibd_diagram()` that generates IBD for a single block using chain prompting with full context from BDD.

**Files to modify**:
- `backend/app/AI/diagram_generation.py`

**Function signature**:
```python
def generate_ibd_diagram(
    block_id: str,
    block_name: str,
    block_description: str,
    block_type: str,
    system_context: str,
    parent_relationships: List[Dict],
    one_shot_examples: List[Dict] = None
) -> Dict[str, Any]
```

**Acceptance Criteria**:
- [ ] Function created with all parameters
- [ ] Uses OpenAI API with IBD_PROMPT_TEMPLATE
- [ ] Returns {ibd_raw, block_id, block_name, model_used, rag_used}
- [ ] Error handling included
- [ ] Validates output has nodes and edges

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Backend Changes, section 1)

**Dependencies**: TASK-2

---

### TASK-4: Test IBD quality improvement
**Type**: Testing
**Priority**: High
**Story Points**: 3

**Description**:
Test new IBD generation vs old nested approach. Measure quality, detail level, and correctness.

**Test cases**:
- Battery Pack IBD (automotive domain)
- Flight Controller IBD (aerospace domain)
- Server IBD (IT domain)

**Acceptance Criteria**:
- [ ] 3+ test cases documented
- [ ] Quality comparison: nested vs chain (target: 70% → 90%+)
- [ ] IBD has 3-7 components (vs 1-3 in nested)
- [ ] Edges have meaningful labels
- [ ] Components have descriptions and properties

**Reference**: `docs/CHAIN_PROMPTING_COMPARISON.md` (Real-World Example)

**Dependencies**: TASK-3

---

### TASK-5: Update generate_sysml_diagram() to use BDD_ONLY template
**Type**: Task
**Priority**: Medium
**Story Points**: 2

**Description**:
Modify `generate_sysml_diagram()` to use new `BDD_ONLY_PROMPT_TEMPLATE` when diagram_type="bdd". Remove IBD nesting logic.

**Files to modify**:
- `backend/app/AI/diagram_generation.py`

**Acceptance Criteria**:
- [ ] BDD generation uses BDD_ONLY_PROMPT_TEMPLATE
- [ ] No "internal_diagram" in BDD output
- [ ] Existing "bdd_enhanced" type marked as deprecated
- [ ] Tests pass

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Prompt 1: BDD Only)

**Dependencies**: TASK-1

---

## Sprint 2: Parallel Execution (Week 2)

### TASK-6: Add block analysis logic
**Type**: Task
**Priority**: High
**Story Points**: 3

**Description**:
Create function to analyze BDD blocks and identify candidates for IBD and SMD generation based on block type.

**Files to modify**:
- `backend/app/database/rag_router.py`

**Logic**:
```python
def identify_diagram_candidates(elements):
    ibd_candidates = [e for e in elements if e['type'] in ['block', 'processor']]
    smd_candidates = [e for e in elements if e['type'] in ['block', 'processor']]
    return ibd_candidates, smd_candidates
```

**Acceptance Criteria**:
- [ ] Function identifies IBD candidates (blocks, processors)
- [ ] Function identifies SMD candidates (blocks, processors)
- [ ] Sensors excluded from IBD/SMD
- [ ] Returns lists of candidate blocks

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Step 2: Block Analysis)

**Dependencies**: TASK-5

---

### TASK-7: Implement async IBD generation wrapper
**Type**: Task
**Priority**: High
**Story Points**: 5

**Description**:
Create async wrapper for `generate_ibd_diagram()` to enable parallel execution with asyncio.gather().

**Files to modify**:
- `backend/app/database/rag_router.py`

**Implementation**:
```python
async def generate_ibd_for_block_async(
    block: Dict,
    system_context: str,
    relationships: List[Dict],
    db: AsyncSession,
    use_rag: bool
) -> Optional[Dict]:
    # Extract relationships for this block
    # RAG search for similar IBDs (if use_rag)
    # Call generate_ibd_diagram()
    # Return result
```

**Acceptance Criteria**:
- [ ] Async function created
- [ ] Extracts relevant relationships for block
- [ ] Performs RAG search if use_rag=True
- [ ] Calls generate_ibd_diagram() with full context
- [ ] Returns {parent_block_id, nodes, edges} or None
- [ ] Error handling with try/except

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Backend Changes, section 2)

**Dependencies**: TASK-3, TASK-6

---

### TASK-8: Create new unified generation endpoint
**Type**: Task
**Priority**: High
**Story Points**: 8

**Description**:
Create new endpoint `/api/v1/rag/generate-diagram-unified/` that implements full chain prompting workflow with parallel execution.

**Files to modify**:
- `backend/app/database/rag_router.py`

**Endpoint flow**:
1. Generate BDD (single AI call)
2. Analyze blocks for IBD/SMD candidates
3. Generate IBD+SMD in parallel (asyncio.gather)
4. Store in Redis
5. Return diagram_id

**Parameters**:
- `text: str`
- `use_rag: bool = True`
- `generate_ibd: bool = True`
- `generate_smd: bool = False`
- `name: str`

**Acceptance Criteria**:
- [ ] Endpoint `/generate-diagram-unified/` created
- [ ] Step 1: BDD generation works
- [ ] Step 2: Block analysis works
- [ ] Step 3: Parallel IBD generation works
- [ ] asyncio.gather() used for parallel execution
- [ ] Result stored in Redis
- [ ] Returns {status, diagramId, preview}
- [ ] Preview shows: bdd_blocks, ibd_count, smd_count

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Backend Changes, section 2, full code)

**Dependencies**: TASK-7

---

### TASK-9: Test parallel execution performance
**Type**: Testing
**Priority**: High
**Story Points**: 3

**Description**:
Measure performance of parallel vs sequential generation. Target: 6 diagrams in <15s.

**Test scenarios**:
- 3 blocks (3 IBD): Sequential vs Parallel
- 6 blocks (3 IBD + 3 SMD): Sequential vs Parallel
- Single block (1 IBD): Baseline

**Acceptance Criteria**:
- [ ] Performance tests documented
- [ ] Sequential time measured (baseline)
- [ ] Parallel time measured (asyncio.gather)
- [ ] Speedup calculated (target: 2-4x)
- [ ] 6 diagrams generated in <15s
- [ ] No OpenAI rate limit errors

**Reference**: `docs/CHAIN_PROMPTING_COMPARISON.md` (Performance Comparison)

**Dependencies**: TASK-8

---

### TASK-10: Update save endpoint for unified diagrams
**Type**: Task
**Priority**: Medium
**Story Points**: 3

**Description**:
Modify `/api/v1/rag/save-diagram/` to handle IBD data from unified chain prompting (not nested in BDD).

**Files to modify**:
- `backend/app/database/rag_router.py`

**Changes**:
- Read `ibd_data` from Redis (list of IBDs)
- Save each IBD with upsert logic
- Maintain backward compatibility with old format

**Acceptance Criteria**:
- [ ] Reads ibd_data from Redis
- [ ] Saves each IBD to internal_block_diagrams table
- [ ] Uses upsert (update if exists, create if not)
- [ ] Returns ibd_count in response
- [ ] Backward compatible with nested IBD format

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Save endpoint modification)

**Dependencies**: TASK-8

---

## Sprint 3: SMD & RAG Enhancement (Week 3)

### TASK-11: Create state_machine_diagrams table
**Type**: Task
**Priority**: High
**Story Points**: 3

**Description**:
Create new database table for State Machine Diagrams with foreign key to BDD diagrams.

**Files to create**:
- `backend/alembic/versions/xxx_add_smd_table.py`

**Schema**:
```sql
state_machine_diagrams (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP,
    parent_bdd_diagram_id INTEGER REFERENCES diagram_embeddings(id),
    parent_block_id VARCHAR,
    parent_block_name VARCHAR,
    states JSON,
    transitions JSON,
    source VARCHAR DEFAULT 'ai',
    UNIQUE(parent_bdd_diagram_id, parent_block_id)
)
```

**Acceptance Criteria**:
- [ ] Migration file created
- [ ] Table schema matches specification
- [ ] Foreign key constraint to diagram_embeddings
- [ ] Unique constraint on (parent_bdd_diagram_id, parent_block_id)
- [ ] Indexes created (parent_bdd_diagram_id, parent_block_id)
- [ ] Migration tested (upgrade & downgrade)

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 4.1)

**Dependencies**: None

---

### TASK-12: Add StateMachineDiagram SQLAlchemy model
**Type**: Task
**Priority**: High
**Story Points**: 2

**Description**:
Create SQLAlchemy model and Pydantic schemas for State Machine Diagrams.

**Files to modify**:
- `backend/app/database/models.py`

**Models to add**:
- `StateMachineDiagram` (SQLAlchemy)
- `StateMachineDiagramCreate` (Pydantic)
- `StateMachineDiagramResponse` (Pydantic)

**Acceptance Criteria**:
- [ ] StateMachineDiagram model created
- [ ] All columns defined with correct types
- [ ] Pydantic models for Create and Response
- [ ] orm_mode = True in Config
- [ ] Model imported in __init__.py

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 4.2)

**Dependencies**: TASK-11

---

### TASK-13: Create SMD CRUD operations
**Type**: Task
**Priority**: High
**Story Points**: 3

**Description**:
Implement CRUD operations for State Machine Diagrams.

**Files to create**:
- `backend/app/crud/crud_smd.py`

**Functions**:
- `get_smd_by_parent_and_block()`
- `get_smds_by_parent_bdd()`
- `create_smd()`
- `update_smd()`

**Acceptance Criteria**:
- [ ] All 4 CRUD functions implemented
- [ ] Async/await pattern used
- [ ] Proper error handling
- [ ] Type hints included
- [ ] Functions tested

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 6.1)

**Dependencies**: TASK-12

---

### TASK-14: Create SMD prompt template
**Type**: Task
**Priority**: High
**Story Points**: 5

**Description**:
Create AI prompt template for State Machine Diagram generation with states and transitions.

**Files to modify**:
- `backend/app/AI/diagram_generation.py`

**Template content**:
- Context parameters (system, block, description)
- Output format (states: [], transitions: [])
- State types: initial, state, final
- Transition structure: source, target, trigger, guard, effect
- Rules and examples

**Acceptance Criteria**:
- [ ] SMD_PROMPT_TEMPLATE constant created
- [ ] Template accepts context placeholders
- [ ] Output format clearly defined (JSON structure)
- [ ] Rules for states and transitions included
- [ ] Domain examples provided (automotive, aerospace, etc.)
- [ ] Emphasizes behavioral modeling

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 5.1)

**Dependencies**: None

---

### TASK-15: Implement generate_state_machine_diagram() function
**Type**: Task
**Priority**: High
**Story Points**: 5

**Description**:
Create function to generate State Machine Diagrams for specific blocks using chain prompting.

**Files to modify**:
- `backend/app/AI/diagram_generation.py`

**Function signature**:
```python
def generate_state_machine_diagram(
    block_id: str,
    block_name: str,
    block_description: str,
    block_type: str,
    system_context: str,
    one_shot_examples: List[Dict] = None
) -> Dict[str, Any]
```

**Acceptance Criteria**:
- [ ] Function created with all parameters
- [ ] Uses SMD_PROMPT_TEMPLATE
- [ ] Calls OpenAI API with JSON response format
- [ ] Validates output (states and transitions present)
- [ ] Returns {smd_raw, block_id, block_name, model_used}
- [ ] Error handling included

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 5.2)

**Dependencies**: TASK-14

---

### TASK-16: Add SMD generation to unified endpoint
**Type**: Task
**Priority**: High
**Story Points**: 5

**Description**:
Integrate SMD generation into `/generate-diagram-unified/` endpoint with parallel execution.

**Files to modify**:
- `backend/app/database/rag_router.py`

**Changes**:
- Add `generate_smd: bool` parameter
- Identify SMD candidates in Step 2
- Create async wrapper for SMD generation
- Add SMD tasks to asyncio.gather()
- Store smd_data in Redis

**Acceptance Criteria**:
- [ ] `generate_smd` parameter added to endpoint
- [ ] SMD candidates identified (blocks, processors)
- [ ] Async SMD generation function created
- [ ] SMD tasks added to parallel execution
- [ ] smd_data stored in Redis result
- [ ] Preview includes smd_count
- [ ] SMD generation works alongside IBD

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Modified RAG Router)

**Dependencies**: TASK-15, TASK-8

---

### TASK-17: Update save endpoint for SMD
**Type**: Task
**Priority**: Medium
**Story Points**: 3

**Description**:
Extend `/save-diagram/` endpoint to save State Machine Diagrams from Redis cache.

**Files to modify**:
- `backend/app/database/rag_router.py`

**Changes**:
- Read `smd_data` from Redis
- Loop through SMD data
- Check if SMD exists (upsert)
- Save to state_machine_diagrams table
- Return smd_count

**Acceptance Criteria**:
- [ ] Reads smd_data from Redis
- [ ] Upsert logic (update if exists, create if new)
- [ ] Uses crud_smd functions
- [ ] Returns smd_count in response
- [ ] Error handling for SMD save failures

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Save endpoint modification)

**Dependencies**: TASK-13, TASK-16

---

### TASK-18: Create smd_embeddings table (optional)
**Type**: Task
**Priority**: Low
**Story Points**: 3

**Description**:
Create separate embeddings table for SMD RAG search (optional - can use diagram_embeddings with filter).

**Files to create**:
- `backend/alembic/versions/xxx_add_smd_embeddings.py`

**Schema**:
```sql
smd_embeddings (
    id SERIAL PRIMARY KEY,
    smd_id INTEGER REFERENCES state_machine_diagrams(id),
    block_name VARCHAR,
    block_type VARCHAR,
    domain VARCHAR,
    embedding vector(1536),
    created_at TIMESTAMP
)
```

**Acceptance Criteria**:
- [ ] Migration created
- [ ] Foreign key to state_machine_diagrams
- [ ] vector(1536) column for pgvector
- [ ] Indexes on smd_id, block_type, domain
- [ ] Migration tested

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 7.1)

**Dependencies**: TASK-12

---

### TASK-19: Implement find_similar_ibds() for IBD RAG
**Type**: Task
**Priority**: Medium
**Story Points**: 5

**Description**:
Create vector search function to find similar IBDs for one-shot learning.

**Files to modify**:
- `backend/app/database/embeddings.py`

**Function signature**:
```python
async def find_similar_ibds(
    db: AsyncSession,
    block_name: str,
    block_type: str = None,
    limit: int = 3
) -> List[InternalBlockDiagram]
```

**Implementation options**:
- Option A: Use diagram_embeddings with type filter
- Option B: Create ibd_embeddings table

**Acceptance Criteria**:
- [ ] Function created
- [ ] Generates query embedding from block_name
- [ ] Vector search using cosine distance
- [ ] Filters by block_type if provided
- [ ] Returns top N similar IBDs
- [ ] Tested with sample data

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (IBD RAG Functions)

**Dependencies**: TASK-3

---

### TASK-20: Implement find_similar_smds() for SMD RAG
**Type**: Task
**Priority**: Medium
**Story Points**: 5

**Description**:
Create vector search function to find similar SMDs for one-shot learning.

**Files to modify**:
- `backend/app/database/embeddings.py`

**Function signature**:
```python
async def find_similar_smds(
    db: AsyncSession,
    block_name: str,
    block_type: str = None,
    limit: int = 3
) -> List[StateMachineDiagram]
```

**Acceptance Criteria**:
- [ ] Function created
- [ ] Generates query: "State machine for {block_name}"
- [ ] Vector search in smd_embeddings or diagram_embeddings
- [ ] Filters by block_type if provided
- [ ] Returns top N similar SMDs
- [ ] Tested with sample data

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 7.2)

**Dependencies**: TASK-18 (if using separate table), TASK-15

---

### TASK-21: Integrate RAG into IBD generation
**Type**: Task
**Priority**: Medium
**Story Points**: 3

**Description**:
Add RAG search to async IBD generation wrapper to use similar IBDs as one-shot examples.

**Files to modify**:
- `backend/app/database/rag_router.py` (async IBD wrapper)

**Changes**:
- Call find_similar_ibds() if use_rag=True
- Format result as one_shot_examples
- Pass to generate_ibd_diagram()

**Acceptance Criteria**:
- [ ] RAG search called before IBD generation
- [ ] Similar IBD used as one-shot example
- [ ] Example formatted correctly for prompt
- [ ] Falls back gracefully if no matches
- [ ] RAG improves IBD quality by 15%+

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (IBD RAG integration)

**Dependencies**: TASK-19, TASK-7

---

### TASK-22: Integrate RAG into SMD generation
**Type**: Task
**Priority**: Medium
**Story Points**: 3

**Description**:
Add RAG search to SMD generation to use similar SMDs as one-shot examples.

**Files to modify**:
- `backend/app/database/rag_router.py` (async SMD wrapper)

**Changes**:
- Call find_similar_smds() if use_rag=True
- Format result as one_shot_examples
- Pass to generate_state_machine_diagram()

**Acceptance Criteria**:
- [ ] RAG search called before SMD generation
- [ ] Similar SMD used as one-shot example
- [ ] Example formatted correctly
- [ ] Falls back gracefully if no matches
- [ ] RAG improves SMD quality by 15%+

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (RAG Integration)

**Dependencies**: TASK-20, TASK-16

---

## Sprint 4: API, Testing & Documentation (Week 4)

### TASK-23: Create SMD router with CRUD endpoints
**Type**: Task
**Priority**: Medium
**Story Points**: 5

**Description**:
Create REST API router for State Machine Diagram CRUD operations.

**Files to create**:
- `backend/app/diagrams/smd_router.py`

**Endpoints**:
- `GET /diagrams/smd/{parent_block_id}` - Get SMD by block ID
- `GET /diagrams/smd/parent/{parent_bdd_id}` - Get all SMDs for BDD
- `POST /diagrams/smd/` - Create/update SMD (upsert)

**Acceptance Criteria**:
- [ ] Router file created
- [ ] 3 endpoints implemented
- [ ] Uses crud_smd functions
- [ ] Proper error handling (404, 500)
- [ ] Response models used
- [ ] OpenAPI docs generated
- [ ] Router added to api_v1.py

**Reference**: `docs/SMD_IMPLEMENTATION_PLAN.md` (section 6.2)

**Dependencies**: TASK-13

---

### TASK-24: Write integration tests for unified endpoint
**Type**: Testing
**Priority**: High
**Story Points**: 5

**Description**:
Create comprehensive integration tests for `/generate-diagram-unified/` endpoint.

**Files to create**:
- `backend/app/test/test_unified_generation.py`

**Test cases**:
- BDD only (generate_ibd=False, generate_smd=False)
- BDD + IBD (generate_ibd=True)
- BDD + SMD (generate_smd=True)
- BDD + IBD + SMD (both True)
- Parallel execution (6 diagrams)
- RAG enabled vs disabled
- Error handling

**Acceptance Criteria**:
- [ ] 7+ test cases created
- [ ] All test cases pass
- [ ] Tests use pytest async
- [ ] Mock OpenAI API calls
- [ ] Assert correct Redis structure
- [ ] Assert parallel execution works
- [ ] Coverage > 80%

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Testing section)

**Dependencies**: TASK-8, TASK-16

---

### TASK-25: Write unit tests for chain prompting functions
**Type**: Testing
**Priority**: High
**Story Points**: 5

**Description**:
Create unit tests for IBD and SMD generation functions.

**Files to create**:
- `backend/app/test/test_ibd_generation.py`
- `backend/app/test/test_smd_generation.py`

**Test cases**:
- generate_ibd_diagram() with various inputs
- generate_state_machine_diagram() with various inputs
- Prompt formatting
- Error handling
- JSON validation

**Acceptance Criteria**:
- [ ] IBD generation tests created (5+ cases)
- [ ] SMD generation tests created (5+ cases)
- [ ] Mock OpenAI API responses
- [ ] Test prompt context injection
- [ ] Test error scenarios
- [ ] Coverage > 85%

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Implementation Phases)

**Dependencies**: TASK-3, TASK-15

---

### TASK-26: Performance optimization and monitoring
**Type**: Task
**Priority**: Medium
**Story Points**: 3

**Description**:
Add performance monitoring and optimize parallel execution for production.

**Files to modify**:
- `backend/app/database/rag_router.py`
- `backend/app/core/config.py`

**Optimizations**:
- Add timing logs for each step
- Optimize asyncio.gather() concurrency
- Add timeout handling (max 60s per diagram)
- Monitor OpenAI API rate limits
- Cache prompt templates

**Acceptance Criteria**:
- [ ] Timing logs added for each generation step
- [ ] Timeout handling (60s per diagram)
- [ ] OpenAI rate limit monitoring
- [ ] Parallel execution optimized
- [ ] Total time < 15s for 6 diagrams
- [ ] Logs include: bdd_time, ibd_time, smd_time, total_time

**Reference**: `docs/CHAIN_PROMPTING_COMPARISON.md` (Performance section)

**Dependencies**: TASK-9, TASK-24

---

### TASK-27: Create API documentation
**Type**: Documentation
**Priority**: Medium
**Story Points**: 2

**Description**:
Document new unified endpoint and SMD endpoints in OpenAPI/Swagger.

**Files to modify**:
- Docstrings in router files
- OpenAPI tags and descriptions

**Documentation to add**:
- `/generate-diagram-unified/` full description
- Request/response examples
- Parameter descriptions
- SMD endpoints documentation
- Migration guide from old endpoint

**Acceptance Criteria**:
- [ ] All endpoints have detailed docstrings
- [ ] Request examples provided
- [ ] Response examples provided
- [ ] Parameter descriptions clear
- [ ] Swagger UI displays correctly
- [ ] Migration guide in docs/

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (API section)

**Dependencies**: TASK-8, TASK-23

---

### TASK-28: Add configuration for chain prompting
**Type**: Task
**Priority**: Low
**Story Points**: 2

**Description**:
Add configuration options for chain prompting features.

**Files to modify**:
- `backend/app/core/config.py`
- `.env.example`

**Config options**:
```python
ENABLE_CHAIN_PROMPTING: bool = True
PARALLEL_GENERATION_ENABLED: bool = True
MAX_PARALLEL_DIAGRAMS: int = 10
DIAGRAM_GENERATION_TIMEOUT: int = 60
DEFAULT_GENERATE_IBD: bool = True
DEFAULT_GENERATE_SMD: bool = False
```

**Acceptance Criteria**:
- [ ] Config options added to Settings class
- [ ] Environment variables in .env.example
- [ ] Default values set
- [ ] Used in generation logic
- [ ] Documented in README

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Configuration)

**Dependencies**: None

---

### TASK-29: Deprecate old bdd_enhanced endpoint
**Type**: Task
**Priority**: Low
**Story Points**: 2

**Description**:
Mark old `bdd_enhanced` diagram type as deprecated and add migration warnings.

**Files to modify**:
- `backend/app/database/rag_router.py`
- `backend/app/AI/diagram_generation.py`

**Changes**:
- Add deprecation warning logs
- Add response header: `X-Deprecated: true`
- Update documentation
- Keep functional for backward compatibility

**Acceptance Criteria**:
- [ ] Deprecation warning in logs
- [ ] Response header added
- [ ] Documentation updated
- [ ] Endpoint still functional
- [ ] Migration guide provided

**Reference**: `docs/UNIFIED_CHAIN_PROMPTING_PLAN.md` (Migration Strategy)

**Dependencies**: TASK-10

---

### TASK-30: End-to-end testing with real OpenAI API
**Type**: Testing
**Priority**: High
**Story Points**: 3

**Description**:
Manual E2E testing with real OpenAI API calls to validate quality improvements.

**Test scenarios**:
1. Tesla Model S system (6 blocks)
2. UAV system (5 blocks)
3. Smart Home system (4 blocks)

**Metrics to measure**:
- IBD quality (detail level, connections)
- SMD quality (states, transitions)
- Generation time
- Parallel speedup
- RAG effectiveness

**Acceptance Criteria**:
- [ ] 3+ real-world systems tested
- [ ] Quality documented (vs baseline)
- [ ] Performance documented
- [ ] IBD quality > 90%
- [ ] SMD quality > 90%
- [ ] Total time < 15s for 6 diagrams
- [ ] RAG improves quality by 15%+

**Reference**: `docs/EXECUTIVE_SUMMARY.md` (Metrics)

**Dependencies**: TASK-24, TASK-25, TASK-26

---

## Dependencies Graph

```
Sprint 1 (Week 1):
TASK-1 → TASK-2 → TASK-3 → TASK-4
    ↓
TASK-5

Sprint 2 (Week 2):
TASK-5 → TASK-6 → TASK-7 → TASK-8 → TASK-9
TASK-8 → TASK-10

Sprint 3 (Week 3):
TASK-11 → TASK-12 → TASK-13
TASK-14 → TASK-15 → TASK-16 → TASK-17
TASK-12 → TASK-18 → TASK-20
TASK-3 → TASK-19 → TASK-21
TASK-20 → TASK-22

Sprint 4 (Week 4):
TASK-13 → TASK-23
TASK-8/16 → TASK-24
TASK-3/15 → TASK-25
TASK-9/24 → TASK-26
TASK-8/23 → TASK-27
TASK-10 → TASK-29
TASK-24/25/26 → TASK-30
```

---

## Story Points Summary

| Sprint | Tasks | Story Points | Focus |
|--------|-------|--------------|-------|
| Sprint 1 | 5 | 16 | BDD/IBD Refactoring |
| Sprint 2 | 5 | 22 | Parallel Execution |
| Sprint 3 | 10 | 36 | SMD & RAG |
| Sprint 4 | 8 | 22 | Testing & Docs |
| **Total** | **28** | **96** | **4 weeks** |

**Average velocity**: 24 points/sprint (1 senior backend dev)

---

## Success Criteria (Epic Level)

### Quality Metrics
- [ ] IBD quality: 70% → 95% (+25%)
- [ ] SMD quality: N/A → 95% (new feature)
- [ ] BDD quality: 85% → 95% (+10%)

### Performance Metrics
- [ ] 6 diagrams generated in < 15s (parallel)
- [ ] Parallel speedup: 2-4x vs sequential
- [ ] No OpenAI rate limit errors

### Functional Metrics
- [ ] BDD generates without nested IBD
- [ ] IBD generated separately with full context
- [ ] SMD generated with states and transitions
- [ ] Parallel execution works (asyncio.gather)
- [ ] RAG works for IBD and SMD
- [ ] All tests passing (>80% coverage)

---

## Related Documents

All documents in `docs/` folder:

- `EXECUTIVE_SUMMARY.md` - Overview and decision
- `CHAIN_PROMPTING_COMPARISON.md` - Current vs Proposed
- `UNIFIED_CHAIN_PROMPTING_PLAN.md` - Full implementation plan
- `SMD_IMPLEMENTATION_PLAN.md` - SMD specification
- `CHAIN_PROMPTING_README.md` - Navigation guide

---

**Created**: 2025-10-20
**Epic Owner**: Backend Team Lead
**Priority**: High
**Target Release**: v2.0.0

**Ready for Sprint Planning** ✅
