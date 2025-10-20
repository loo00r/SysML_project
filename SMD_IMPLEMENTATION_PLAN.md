# State Machine Diagram (SMD) Implementation Plan

## Executive Summary

This document outlines the implementation plan for adding State Machine Diagram (SMD) generation to the SysML diagram generator. SMD will show behavioral states and transitions for specific blocks from BDD, generated through **chain prompting** architecture.

**Key Innovation**: Sequential AI generation pipeline: `BDD → Identify blocks → Generate SMD for each block`

---

## 1. Current System Analysis

### 1.1 Existing Architecture

**Current Generation Flow (BDD + IBD)**:
```
User Input → Single AI Call → BDD with embedded IBD → Parse & Split → Save to DB
                                      ↓
                            "internal_diagram" nested in elements
```

**Characteristics**:
- ✅ Single AI call generates both BDD and IBD
- ✅ IBD nested inside BDD elements
- ✅ Backend parses and separates into tables
- ❌ No sequential/chain prompting
- ❌ No behavioral modeling (states/transitions)

### 1.2 RAG System Components

**Vector Search Flow**:
```
User Query → Generate Embedding (1536-dim) → Cosine Similarity Search → Retrieve Similar Diagrams → One-Shot Examples → AI Generation
```

**Key Files**:
- `backend/app/database/embeddings.py`: Vector generation & search
- `backend/app/database/rag_router.py`: RAG endpoints & orchestration
- `backend/app/AI/diagram_generation.py`: AI prompt templates & generation
- `backend/app/core/redis_client.py`: Two-step save with TTL

### 1.3 Database Schema

**Current Tables**:
- `diagram_embeddings`: Main BDD diagrams with vector embeddings
- `internal_block_diagrams`: IBD data linked to parent BDD
  - `parent_bdd_diagram_id` (FK to diagram_embeddings)
  - `parent_block_id` (block ID from BDD)

---

## 2. SysML State Machine Diagram (SMD) Specification

### 2.1 What is SMD?

**Purpose**: Model behavioral aspects of a system showing how a block transitions between different states over time in response to events.

**Example - Tesla Autopilot Block**:
```
[Off] ──(ignition)──▶ [Standby]
                        ├─(engage)──▶ [Active]
                        │              ├─(manual_override)──▶ [Manual Control]
                        │              ├─(obstacle_detected)──▶ [Emergency Brake]
                        │              └─(destination_reached)──▶ [Parking]
                        └─(shutdown)──▶ [Off]
```

### 2.2 SMD Components (SysML/UML Standard)

#### **States**:
```json
{
  "id": "state-active",
  "type": "state",        // "initial" | "state" | "final"
  "name": "Active",
  "entry_action": "activate_sensors()",
  "do_action": "monitor_road()",
  "exit_action": "deactivate_sensors()"
}
```

#### **Transitions**:
```json
{
  "id": "trans-1",
  "source": "state-standby",
  "target": "state-active",
  "trigger": "engage",           // Event that triggers transition
  "guard": "speed > 30",         // Condition (optional)
  "effect": "log_activation()"   // Action on transition (optional)
}
```

#### **Composite States** (optional):
States can contain sub-states for complex behavior modeling.

### 2.3 JSON Schema for SMD

```json
{
  "diagram_type": "smd",
  "parent_block_id": "autopilot-system",
  "parent_block_name": "Autopilot",
  "states": [
    {
      "id": "initial",
      "type": "initial",
      "name": null
    },
    {
      "id": "state-off",
      "type": "state",
      "name": "Off",
      "description": "System powered down",
      "entry_action": null,
      "do_action": null,
      "exit_action": "initialize()"
    },
    {
      "id": "state-active",
      "type": "state",
      "name": "Active",
      "description": "Autopilot engaged and controlling vehicle",
      "entry_action": "activate_sensors()",
      "do_action": "monitor_environment()",
      "exit_action": "save_logs()"
    },
    {
      "id": "final",
      "type": "final",
      "name": null
    }
  ],
  "transitions": [
    {
      "id": "trans-init",
      "source": "initial",
      "target": "state-off",
      "trigger": null,
      "guard": null,
      "effect": null
    },
    {
      "id": "trans-engage",
      "source": "state-off",
      "target": "state-active",
      "trigger": "driver_engages",
      "guard": "speed > 30 && lane_detected",
      "effect": "notify_driver('Autopilot Active')"
    }
  ]
}
```

---

## 3. Chain Prompting Architecture

### 3.1 Why Chain Prompting?

**Benefits over Single-Prompt Approach**:
1. ✅ **Separation of Concerns**: BDD focuses on structure, SMD on behavior
2. ✅ **Context Awareness**: SMD generation uses actual BDD block data as input
3. ✅ **Better Quality**: Specialized prompts yield better results than multi-task prompts
4. ✅ **Flexibility**: Generate SMD only for specific blocks (user-selected)
5. ✅ **Scalability**: Can add more diagram types (Sequence, Activity) later

**Research-Backed Approach** (2024 Best Practices):
- Each prompt should be specific and direct
- Output of one prompt → Input for next
- Sequential execution with context passing
- Improved transparency and debuggability

### 3.2 Proposed Generation Pipeline

#### **Flow Diagram**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: BDD Generation (existing)                               │
│ User: "Create Tesla car system"                                 │
│   ↓                                                              │
│ AI generates BDD with blocks: [Battery, Motor, Autopilot, ...]  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: Block Identification                                    │
│ Parse BDD elements → Identify blocks suitable for SMD           │
│ Criteria: type = "block" OR "processor" (has behavior)          │
│ Result: ["Autopilot", "Battery Management System"]              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: SMD Generation (NEW - Chain Prompt)                     │
│ For each identified block:                                      │
│   Input: {                                                       │
│     "block_id": "autopilot-system",                             │
│     "block_name": "Autopilot",                                  │
│     "block_description": "...",                                 │
│     "system_context": "Tesla car system"                        │
│   }                                                              │
│   ↓                                                              │
│ AI Call 2: Generate SMD for this block                          │
│ Result: States + Transitions JSON                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: Parallel IBD Generation (existing)                      │
│ Generate IBD for blocks with internal_diagram                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: Save to Database                                        │
│ - BDD → diagram_embeddings                                      │
│ - IBD → internal_block_diagrams                                 │
│ - SMD → state_machine_diagrams (NEW TABLE)                      │
└─────────────────────────────────────────────────────────────────┘
```

#### **User Experience**:
```
User: "Create SysML diagrams for Tesla car"

System Response:
✅ Generated BDD with 5 blocks
✅ Generated IBD for: Battery, Motor
✅ Generated SMD for: Autopilot, Battery Management System

Tabs created:
[BDD: Tesla Car] [IBD: Battery] [IBD: Motor] [SMD: Autopilot] [SMD: BMS]
```

### 3.3 Chain Prompt Implementation Details

#### **Prompt 1: BDD Generation** (unchanged)
```python
# Existing SYSML_PROMPT_TEMPLATE or BDD_ENHANCED_PROMPT_TEMPLATE
generate_sysml_diagram(
    prompt="Create Tesla car system",
    diagram_type="bdd_enhanced"
)
# Output: BDD structure
```

#### **Prompt 2: SMD Generation** (NEW)
```python
generate_state_machine_diagram(
    block_id="autopilot-system",
    block_name="Autopilot",
    block_description="Advanced driver assistance system",
    system_context="Tesla electric vehicle",
    one_shot_examples=[...]  # RAG examples
)
# Output: SMD structure with states & transitions
```

**Key Context Passing**:
- Block information from BDD feeds into SMD prompt
- System context provides domain understanding
- One-shot examples from RAG (similar SMDs)

---

## 4. Database Schema Design

### 4.1 New Table: `state_machine_diagrams`

```sql
CREATE TABLE state_machine_diagrams (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Foreign key to parent BDD diagram
    parent_bdd_diagram_id INTEGER NOT NULL REFERENCES diagram_embeddings(id) ON DELETE CASCADE,

    -- Reference to the block this SMD describes
    parent_block_id VARCHAR NOT NULL,  -- e.g., "autopilot-system"
    parent_block_name VARCHAR NOT NULL, -- e.g., "Autopilot"

    -- SMD data
    states JSON NOT NULL,      -- Array of state objects
    transitions JSON NOT NULL, -- Array of transition objects

    -- Metadata
    source VARCHAR DEFAULT 'ai',  -- 'ai' or 'manual'
    description TEXT,

    -- Indexing for fast lookups
    CONSTRAINT unique_smd_per_block UNIQUE(parent_bdd_diagram_id, parent_block_id)
);

CREATE INDEX idx_smd_parent_bdd ON state_machine_diagrams(parent_bdd_diagram_id);
CREATE INDEX idx_smd_parent_block ON state_machine_diagrams(parent_block_id);
```

### 4.2 SQLAlchemy Model

**File**: `backend/app/database/models.py`

```python
class StateMachineDiagram(Base):
    __tablename__ = "state_machine_diagrams"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    parent_bdd_diagram_id = Column(Integer, ForeignKey("diagram_embeddings.id"), nullable=False)
    parent_block_id = Column(String, nullable=False, index=True)
    parent_block_name = Column(String, nullable=False)

    states = Column(JSON, nullable=False)
    transitions = Column(JSON, nullable=False)

    source = Column(String, default='ai', nullable=False)
    description = Column(Text, nullable=True)


class StateMachineDiagramCreate(BaseModel):
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_name: str
    states: List[Dict[str, Any]]
    transitions: List[Dict[str, Any]]
    source: str = 'ai'
    description: Optional[str] = None


class StateMachineDiagramResponse(BaseModel):
    id: int
    parent_bdd_diagram_id: int
    parent_block_id: str
    parent_block_name: str
    states: List[Dict[str, Any]]
    transitions: List[Dict[str, Any]]
    source: str
    description: Optional[str]
    created_at: datetime

    class Config:
        orm_mode = True
```

### 4.3 Alembic Migration

**File**: `backend/alembic/versions/xxx_add_state_machine_diagrams.py`

```python
"""Add state_machine_diagrams table

Revision ID: xxx
Revises: yyy
Create Date: 2025-10-20
"""

def upgrade():
    op.create_table(
        'state_machine_diagrams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('parent_bdd_diagram_id', sa.Integer(), nullable=False),
        sa.Column('parent_block_id', sa.String(), nullable=False),
        sa.Column('parent_block_name', sa.String(), nullable=False),
        sa.Column('states', sa.JSON(), nullable=False),
        sa.Column('transitions', sa.JSON(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['parent_bdd_diagram_id'], ['diagram_embeddings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('parent_bdd_diagram_id', 'parent_block_id', name='unique_smd_per_block')
    )
    op.create_index('idx_smd_parent_bdd', 'state_machine_diagrams', ['parent_bdd_diagram_id'])
    op.create_index('idx_smd_parent_block', 'state_machine_diagrams', ['parent_block_id'])

def downgrade():
    op.drop_index('idx_smd_parent_block', 'state_machine_diagrams')
    op.drop_index('idx_smd_parent_bdd', 'state_machine_diagrams')
    op.drop_table('state_machine_diagrams')
```

---

## 5. AI Prompt Engineering for SMD

### 5.1 SMD Prompt Template

**File**: `backend/app/AI/diagram_generation.py`

```python
SMD_PROMPT_TEMPLATE = """
You are an expert SysML behavioral modeling specialist. Your task is to generate a State Machine Diagram (SMD)
in JSON format for a specific system block, showing its behavioral states and transitions over time.

CONTEXT:
- Parent System: {system_context}
- Block Name: {block_name}
- Block Description: {block_description}
- Block Type: {block_type}

TASK:
Generate a comprehensive state machine showing:
1. All significant behavioral states this block can be in
2. Transitions between states triggered by events
3. Entry/exit/do actions for states (optional)
4. Guards (conditions) for transitions (optional)
5. Effects (actions) executed during transitions (optional)

Required output format:
{{
  "diagram_type": "smd",
  "parent_block_id": "{block_id}",
  "parent_block_name": "{block_name}",
  "states": [
    {{
      "id": "initial",
      "type": "initial",
      "name": null,
      "description": "Initial pseudostate"
    }},
    {{
      "id": "state-1",
      "type": "state",
      "name": "State Name",
      "description": "What this state represents",
      "entry_action": "action_on_entry()",
      "do_action": "continuous_activity()",
      "exit_action": "action_on_exit()"
    }},
    {{
      "id": "final",
      "type": "final",
      "name": null,
      "description": "Final state (optional)"
    }}
  ],
  "transitions": [
    {{
      "id": "trans-1",
      "source": "initial",
      "target": "state-1",
      "trigger": null,
      "guard": null,
      "effect": null,
      "description": "Initial transition"
    }},
    {{
      "id": "trans-2",
      "source": "state-1",
      "target": "state-2",
      "trigger": "event_name",
      "guard": "condition_expression",
      "effect": "action_to_execute()",
      "description": "Triggered when event occurs and guard is true"
    }}
  ]
}}

RULES:
1. **Always include** an "initial" state (type: "initial") as the entry point
2. **State types**: "initial", "state", "final"
3. **State IDs**: Use format "state-{name-lowercase}" (e.g., "state-active")
4. **Transition IDs**: Use format "trans-{number}" or descriptive names
5. **Triggers**: Events that cause transitions (null for automatic transitions)
6. **Guards**: Boolean conditions (null if always true)
7. **Effects**: Actions executed during transition (null if none)
8. **Entry/Do/Exit actions**: Optional, set to null if not applicable
9. **Descriptions**: Brief explanation of each state and transition
10. **Realistic behavior**: Model actual system behavior, not just examples
11. **Complete cycles**: Ensure states can transition back (loops) if appropriate
12. **Do NOT include position data** - positioning handled separately

EXAMPLE DOMAINS:
- Autopilot: Off → Standby → Active → Manual Override / Emergency Brake → Parking
- Battery: Idle → Charging → Discharging → Balancing → Fault
- Motor: Stopped → Starting → Running → Braking → Stopped
- Sensor: Inactive → Calibrating → Active → Error → Inactive

Generate a realistic state machine for the given block. Think about the lifecycle and operational modes.
"""
```

### 5.2 SMD Generation Function

**File**: `backend/app/AI/diagram_generation.py`

```python
def generate_state_machine_diagram(
    block_id: str,
    block_name: str,
    block_description: str,
    block_type: str,
    system_context: str,
    one_shot_examples: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Generate a State Machine Diagram for a specific block using chain prompting.

    This is the SECOND step in chain prompting architecture:
    BDD Generation → SMD Generation (this function)

    Args:
        block_id: Unique identifier of the block from BDD
        block_name: Human-readable name of the block
        block_description: Description of the block's purpose
        block_type: Type of block ("block", "processor", etc.)
        system_context: Overall system description for context
        one_shot_examples: Optional RAG examples of similar SMDs

    Returns:
        Dictionary containing SMD structure and metadata
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Format the prompt with block context
    system_prompt = SMD_PROMPT_TEMPLATE.format(
        system_context=system_context,
        block_name=block_name,
        block_description=block_description,
        block_type=block_type,
        block_id=block_id
    )

    messages = [{"role": "system", "content": system_prompt}]

    # Add one-shot examples from RAG if available
    if one_shot_examples and len(one_shot_examples) > 0:
        print(f"\n==== Using {len(one_shot_examples)} RAG examples for SMD ====")
        for example in one_shot_examples:
            example_input = f"Generate SMD for block: {example['input']}"
            messages.append({"role": "user", "content": example_input})
            example_output = json.dumps(example['output'], indent=2)
            messages.append({"role": "assistant", "content": example_output})

    # Final user prompt
    user_prompt = f"Generate a state machine diagram for the '{block_name}' block."
    messages.append({"role": "user", "content": user_prompt})

    print(f"\n==== Generating SMD for block: {block_name} ====")

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_GENERATIVE_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1
        )

        response_text = response.choices[0].message.content
        smd_data = json.loads(response_text)

        # Validate basic structure
        if "states" not in smd_data or "transitions" not in smd_data:
            raise ValueError("SMD must contain 'states' and 'transitions'")

        result = {
            "smd_raw": smd_data,
            "block_id": block_id,
            "block_name": block_name,
            "model_used": settings.OPENAI_GENERATIVE_MODEL,
            "rag_used": bool(one_shot_examples),
            "examples_count": len(one_shot_examples) if one_shot_examples else 0
        }

        print(f"\n==== SMD Generation Successful for {block_name} ====")
        return result

    except Exception as e:
        print(f"\n==== ERROR generating SMD for {block_name}: {str(e)} ====")
        return {"error": str(e), "smd_raw": {}}
```

---

## 6. Backend API Implementation

### 6.1 CRUD Operations

**File**: `backend/app/crud/crud_smd.py` (NEW)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import models
from app.database.models import StateMachineDiagramCreate
from typing import List, Optional

async def get_smd_by_parent_and_block(
    db: AsyncSession,
    parent_bdd_id: int,
    block_id: str
) -> Optional[models.StateMachineDiagram]:
    """Get SMD for a specific block in a specific BDD."""
    stmt = select(models.StateMachineDiagram).filter_by(
        parent_bdd_diagram_id=parent_bdd_id,
        parent_block_id=block_id
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_smds_by_parent_bdd(
    db: AsyncSession,
    parent_bdd_id: int
) -> List[models.StateMachineDiagram]:
    """Get all SMDs for a BDD."""
    stmt = select(models.StateMachineDiagram).filter_by(
        parent_bdd_diagram_id=parent_bdd_id
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def create_smd(
    db: AsyncSession,
    smd: StateMachineDiagramCreate
) -> models.StateMachineDiagram:
    """Create a new SMD."""
    db_smd = models.StateMachineDiagram(**smd.model_dump())
    db.add(db_smd)
    await db.commit()
    await db.refresh(db_smd)
    return db_smd


async def update_smd(
    db: AsyncSession,
    db_smd: models.StateMachineDiagram,
    states: List[Dict],
    transitions: List[Dict]
) -> models.StateMachineDiagram:
    """Update existing SMD."""
    db_smd.states = states
    db_smd.transitions = transitions
    await db.commit()
    await db.refresh(db_smd)
    return db_smd
```

### 6.2 SMD Router

**File**: `backend/app/diagrams/smd_router.py` (NEW)

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud import crud_smd
from app.database.models import StateMachineDiagramResponse, StateMachineDiagramCreate
from app.db.dependencies import get_db

router = APIRouter(prefix="/diagrams", tags=["SMD Diagrams"])


@router.get("/smd/{parent_block_id}", response_model=StateMachineDiagramResponse)
async def read_smd_by_block_id(
    parent_block_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get State Machine Diagram by parent block ID.
    """
    db_smd = await crud_smd.get_smd_by_block_id(db, block_id=parent_block_id)
    if db_smd is None:
        raise HTTPException(status_code=404, detail="State Machine Diagram not found")

    return db_smd


@router.get("/smd/parent/{parent_bdd_id}", response_model=List[StateMachineDiagramResponse])
async def read_smds_by_parent_bdd(
    parent_bdd_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all State Machine Diagrams for a parent BDD.
    """
    smds = await crud_smd.get_smds_by_parent_bdd(db, parent_bdd_id=parent_bdd_id)
    return smds


@router.post("/smd/", response_model=StateMachineDiagramResponse)
async def create_smd_diagram(
    smd_data: StateMachineDiagramCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update a State Machine Diagram (upsert).
    """
    try:
        # Check if SMD already exists
        existing_smd = await crud_smd.get_smd_by_parent_and_block(
            db=db,
            parent_bdd_id=smd_data.parent_bdd_diagram_id,
            block_id=smd_data.parent_block_id
        )

        if existing_smd:
            # Update existing SMD
            print(f"Updating existing SMD for block {smd_data.parent_block_id}")
            updated_smd = await crud_smd.update_smd(
                db=db,
                db_smd=existing_smd,
                states=smd_data.states,
                transitions=smd_data.transitions
            )
            return updated_smd
        else:
            # Create new SMD
            print(f"Creating new SMD for block {smd_data.parent_block_id}")
            new_smd = await crud_smd.create_smd(db=db, smd=smd_data)
            return new_smd

    except Exception as e:
        print(f"Error creating/updating SMD: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating SMD: {str(e)}")
```

### 6.3 Integration with RAG Router

**File**: `backend/app/database/rag_router.py` (MODIFY)

Add SMD generation to the enhanced workflow:

```python
@router.post("/generate-diagram-with-context/", status_code=202)
async def generate_diagram_with_context(
    text: str = Body(..., embed=True),
    diagram_type: str = Body("bdd_enhanced", embed=True),
    use_rag: bool = Body(True, embed=True),
    generate_smd: bool = Body(False, embed=True),  # NEW: Option to generate SMD
    name: str = Body("Generated Diagram", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Enhanced generation with optional SMD chain prompting.

    Flow:
    1. Generate BDD (with optional IBD)
    2. If generate_smd=True, chain prompt to create SMD for each block
    3. Store all in Redis
    4. Return diagram ID
    """
    # ... existing BDD generation code ...

    # NEW: Chain prompting for SMD
    smd_to_create = []
    if generate_smd and "elements" in raw_diagram:
        print("\n==== Chain Prompting: Generating SMDs ====")

        # Identify blocks suitable for SMD
        smd_candidates = [
            elem for elem in raw_diagram["elements"]
            if elem.get("type") in ["block", "processor"]  # Only behavioral blocks
        ]

        print(f"Found {len(smd_candidates)} blocks for SMD generation")

        # Generate SMD for each candidate
        for block in smd_candidates:
            # Search RAG for similar SMDs (optional)
            smd_examples = []
            if use_rag:
                similar_smds = await find_similar_smds(
                    db=db,
                    block_name=block["name"],
                    limit=1
                )
                if similar_smds:
                    smd_examples = [{"input": block["name"], "output": similar_smds[0].to_dict()}]

            # Chain prompt: Generate SMD using block context
            smd_result = generate_state_machine_diagram(
                block_id=block["id"],
                block_name=block["name"],
                block_description=block.get("description", ""),
                block_type=block["type"],
                system_context=text,  # Original user input as context
                one_shot_examples=smd_examples
            )

            if "error" not in smd_result:
                smd_to_create.append({
                    "parent_block_id": block["id"],
                    "parent_block_name": block["name"],
                    "states": smd_result["smd_raw"]["states"],
                    "transitions": smd_result["smd_raw"]["transitions"]
                })

    # Store in Redis (add smd_data to result)
    result = {
        "diagram": positioned_diagram,
        "raw_text": text,
        "model_used": generation_result["model_used"],
        "saved_to_rag": False,
        "used_rag": use_rag and len(one_shot_examples) > 0,
        "examples_count": len(one_shot_examples),
        "ibd_data": ibd_to_create,
        "smd_data": smd_to_create,  # NEW: SMD data
        "status": "completed"
    }

    diagram_id = redis_client.store_diagram(result)
    return {"status": "processing", "diagramId": diagram_id}
```

**Save endpoint modification**:

```python
@router.post("/save-diagram/")
async def save_diagram_to_database(
    diagram_id: str = Body(..., embed=True),
    name: str = Body("Generated Diagram", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """Save BDD, IBD, and SMD from Redis to database."""
    cached_diagram = redis_client.get_diagram(diagram_id)

    # ... existing BDD save code ...

    # Save SMDs if they exist
    smd_data_list = cached_diagram.get("smd_data", [])
    for smd_data in smd_data_list:
        existing_smd = await crud_smd.get_smd_by_parent_and_block(
            db=db,
            parent_bdd_id=db_diagram.id,
            block_id=smd_data["parent_block_id"]
        )

        if existing_smd:
            await crud_smd.update_smd(
                db=db,
                db_smd=existing_smd,
                states=smd_data["states"],
                transitions=smd_data["transitions"]
            )
        else:
            new_smd = StateMachineDiagramCreate(
                parent_bdd_diagram_id=db_diagram.id,
                parent_block_id=smd_data["parent_block_id"],
                parent_block_name=smd_data["parent_block_name"],
                states=smd_data["states"],
                transitions=smd_data["transitions"],
                source="ai"
            )
            await crud_smd.create_smd(db=db, smd=new_smd)

    return {
        "message": "Diagram saved successfully",
        "diagram_id": db_diagram.id,
        "saved_to_rag": True,
        "ibd_count": len(cached_diagram.get("ibd_data", [])),
        "smd_count": len(smd_data_list)
    }
```

---

## 7. RAG Integration for SMD

### 7.1 SMD-Specific Vector Search

Since SMDs are fundamentally different from BDDs, they should have separate RAG retrieval.

**Option 1: Separate Embeddings Table** (Recommended)
```sql
CREATE TABLE smd_embeddings (
    id SERIAL PRIMARY KEY,
    smd_id INTEGER REFERENCES state_machine_diagrams(id) ON DELETE CASCADE,
    block_name VARCHAR,
    block_type VARCHAR,
    domain VARCHAR,  -- e.g., "automotive", "aerospace"
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Option 2: Reuse diagram_embeddings with type filter**
- Store SMDs as `diagram_type = "smd"`
- Use type filtering in vector search

**Recommended**: Option 1 for better separation and targeted search.

### 7.2 SMD Embedding Generation

**File**: `backend/app/database/embeddings.py` (ADD)

```python
async def generate_smd_embedding_text(smd_data: Dict) -> str:
    """
    Generate searchable text from SMD for embedding.
    Combines block name, states, and transitions.
    """
    block_name = smd_data.get("parent_block_name", "")
    states = smd_data.get("states", [])
    transitions = smd_data.get("transitions", [])

    # Build descriptive text
    text_parts = [f"State machine for {block_name}"]

    # Add states
    state_names = [s["name"] for s in states if s.get("name")]
    if state_names:
        text_parts.append(f"States: {', '.join(state_names)}")

    # Add transition triggers
    triggers = [t["trigger"] for t in transitions if t.get("trigger")]
    if triggers:
        text_parts.append(f"Events: {', '.join(triggers)}")

    return ". ".join(text_parts)


async def store_smd_with_embedding(
    db: AsyncSession,
    smd_id: int,
    smd_data: Dict,
    block_name: str,
    block_type: str,
    domain: str = "general"
) -> SMDEmbedding:
    """Store SMD embedding for RAG."""
    # Generate text representation
    embedding_text = await generate_smd_embedding_text(smd_data)

    # Generate embedding vector
    embedding_vector = await generate_embedding(embedding_text)

    # Store in smd_embeddings table
    db_embedding = SMDEmbedding(
        smd_id=smd_id,
        block_name=block_name,
        block_type=block_type,
        domain=domain,
        embedding=embedding_vector
    )

    db.add(db_embedding)
    await db.commit()
    await db.refresh(db_embedding)

    return db_embedding


async def find_similar_smds(
    db: AsyncSession,
    block_name: str,
    block_type: str = None,
    limit: int = 3
) -> List[StateMachineDiagram]:
    """
    Find similar SMDs using vector search.
    Search query: "State machine for {block_name}"
    """
    query_text = f"State machine for {block_name}"
    query_embedding = await generate_embedding(query_text)

    stmt = select(SMDEmbedding).order_by(
        SMDEmbedding.embedding.cosine_distance(np.array(query_embedding))
    )

    if block_type:
        stmt = stmt.filter(SMDEmbedding.block_type == block_type)

    stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    embeddings = result.scalars().all()

    # Fetch actual SMD data
    smd_ids = [e.smd_id for e in embeddings]
    smds = await db.execute(
        select(StateMachineDiagram).filter(StateMachineDiagram.id.in_(smd_ids))
    )

    return smds.scalars().all()
```

---

## 8. Frontend Integration (High-Level)

### 8.1 SMD Visualization Components

**File**: `frontend/src/components/nodes/SMDNode.tsx`

```typescript
// State node component
interface SMDStateNodeProps {
  data: {
    label: string;
    type: 'initial' | 'state' | 'final';
    entry_action?: string;
    do_action?: string;
    exit_action?: string;
    description?: string;
  };
}

// Transition edge component with trigger/guard labels
interface SMDTransitionProps {
  data: {
    trigger?: string;
    guard?: string;
    effect?: string;
  };
}
```

### 8.2 Tab Management

Add SMD tabs alongside BDD and IBD:

```typescript
// In DiagramStore
interface DiagramInstance {
  id: string;
  name: string;
  type: 'bdd' | 'ibd' | 'smd';  // Add 'smd'
  nodes: Node[];
  edges: Edge[];
  // For SMD
  parentBlockId?: string;
  states?: SMDState[];
  transitions?: SMDTransition[];
}

// When opening SMD from BDD block
const openSMDForBlock = (blockId: string, blockName: string) => {
  // Fetch SMD from backend
  const smd = await fetchSMD(blockId);

  // Convert to ReactFlow format
  const nodes = convertSMDStatesToNodes(smd.states);
  const edges = convertSMDTransitionsToEdges(smd.transitions);

  // Open as new tab
  openDiagram({
    id: `smd-${blockId}`,
    name: `SMD: ${blockName}`,
    type: 'smd',
    nodes,
    edges,
    parentBlockId: blockId
  });
};
```

### 8.3 UI/UX Flow

**User clicks "Generate Enhanced Diagram with SMD"**:
1. Modal: "Which blocks should have SMD? [x] Autopilot [x] Battery [ ] GPS"
2. Backend generates BDD → IBD → SMD (chain)
3. Frontend receives result, creates tabs:
   - `[BDD: Tesla]`
   - `[IBD: Battery]`
   - `[SMD: Autopilot]`
   - `[SMD: Battery]`

**Visual indicators on BDD**:
- Blocks with IBD: 🔧 icon
- Blocks with SMD: ⚡ icon
- Click icon to open respective diagram

---

## 9. Implementation Phases

### Phase 1: Database & Models (Week 1)
- [ ] Create `state_machine_diagrams` table
- [ ] Add SQLAlchemy models
- [ ] Write Alembic migration
- [ ] Add CRUD operations (`crud_smd.py`)
- [ ] Test database operations

**Deliverables**:
- Migration file
- CRUD tests
- Database schema validated

### Phase 2: AI Prompt Engineering (Week 1-2)
- [ ] Write SMD_PROMPT_TEMPLATE
- [ ] Implement `generate_state_machine_diagram()`
- [ ] Test AI generation with various block types
- [ ] Refine prompt based on output quality
- [ ] Add validation for SMD structure

**Deliverables**:
- SMD prompt template
- Generation function
- Test cases (Autopilot, Battery, Motor, Sensor)

### Phase 3: Chain Prompting Integration (Week 2)
- [ ] Modify RAG router to support chain prompting
- [ ] Add `generate_smd` parameter to endpoints
- [ ] Implement block identification logic
- [ ] Integrate SMD generation into workflow
- [ ] Update Redis storage to include SMD data

**Deliverables**:
- Modified `rag_router.py`
- Chain prompting working end-to-end
- Redis structure updated

### Phase 4: API Endpoints (Week 2-3)
- [ ] Create `smd_router.py`
- [ ] Add GET/POST endpoints for SMD
- [ ] Implement upsert logic
- [ ] Add to `api_v1.py` router
- [ ] Write API tests

**Deliverables**:
- SMD router
- API documentation
- Postman collection

### Phase 5: RAG for SMD (Week 3)
- [ ] Create `smd_embeddings` table (optional)
- [ ] Implement SMD embedding generation
- [ ] Add `find_similar_smds()` function
- [ ] Integrate SMD RAG into chain prompting
- [ ] Test one-shot learning for SMD

**Deliverables**:
- SMD RAG working
- Embedding storage
- Vector search functional

### Phase 6: Frontend Components (Week 3-4)
- [ ] Create SMD node components
- [ ] Create SMD transition/edge components
- [ ] Add SMD tab support to DiagramStore
- [ ] Implement SMD visualization layout
- [ ] Add UI controls (zoom, pan, etc.)

**Deliverables**:
- SMD visualization
- Tab management
- UI components

### Phase 7: Integration & Testing (Week 4)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User acceptance testing
- [ ] Documentation
- [ ] Bug fixes

**Deliverables**:
- Working SMD feature
- Documentation
- Test coverage > 80%

---

## 10. Technical Challenges & Solutions

### Challenge 1: SMD Complexity vs. Quality
**Problem**: AI might generate oversimplified or overly complex state machines.

**Solution**:
- Use domain-specific examples in RAG
- Add validation rules (min 2 states, max 15 states)
- Iterative prompt refinement
- User feedback loop

### Challenge 2: Chain Prompting Latency
**Problem**: Sequential AI calls increase response time.

**Solution**:
- Parallel SMD generation for multiple blocks (asyncio)
- Redis caching for intermediate results
- Frontend loading indicators with progress
- Optional SMD generation (user choice)

### Challenge 3: State Positioning
**Problem**: Automatic layout for state machines differs from BDD.

**Solution**:
- Implement layered layout algorithm (initial → intermediate → final)
- Use ReactFlow's Dagre layout with custom settings
- Allow manual repositioning

### Challenge 4: RAG Quality for SMD
**Problem**: Limited SMD examples in database initially.

**Solution**:
- Seed database with curated SMD templates
- Domain categorization (automotive, aerospace, IoT)
- Fallback to structural similarity if no semantic match

---

## 11. Success Metrics

### Functional Metrics
- ✅ SMD generated for >80% of blocks
- ✅ Average 3-7 states per SMD
- ✅ All SMDs have valid initial state
- ✅ Transitions connect logically

### Performance Metrics
- ⏱️ SMD generation < 5s per block
- ⏱️ Chain prompting total < 30s for complex system
- ⏱️ Frontend rendering < 2s

### Quality Metrics
- 📊 User satisfaction > 4/5
- 📊 SMD correctness (manual review) > 85%
- 📊 RAG improves quality by 20%

---

## 12. Future Enhancements

### Phase 2 Features (Post-MVP)
1. **Hierarchical State Machines**: Nested states (composite states)
2. **Concurrent Regions**: Parallel state execution
3. **History States**: Remember previous state
4. **Sequence Diagrams**: Add another chain prompt for interactions
5. **Activity Diagrams**: Workflow modeling
6. **Export to PlantUML/Mermaid**: Code generation

### Advanced AI Features
1. **Multi-turn refinement**: User feedback → regenerate SMD
2. **Constraint-based generation**: User specifies states, AI fills transitions
3. **SMD validation**: Check for deadlocks, unreachable states
4. **Automatic test case generation**: From SMD to test scenarios

---

## 13. References & Resources

### SysML Standards
- [SysML v2 Specification (OMG)](https://www.omg.org/sysml/)
- [UML State Machine Specification](https://www.uml-diagrams.org/state-machine-diagrams.html)
- [SysML State Machine Tutorial](https://sysml.org/tutorials/sysml-diagram-tutorial/)

### Prompt Engineering
- [Prompt Chaining Guide (2024)](https://www.promptingguide.ai/techniques/prompt_chaining)
- [Chain-of-Thought Prompting](https://www.datacamp.com/tutorial/chain-of-thought-prompting)
- [LangChain Sequential Chains](https://python.langchain.com/docs/modules/chains/)

### Implementation Examples
- [ReactFlow State Machine Example](https://reactflow.dev/examples/edges/edge-types)
- [SysML v2 API Services (GitHub)](https://github.com/Systems-Modeling/SysML-v2-API-Services)

---

## 14. Conclusion

This implementation plan provides a comprehensive, research-backed approach to adding State Machine Diagrams to the SysML generator using **chain prompting architecture**.

**Key Innovations**:
1. ✅ Sequential AI generation (BDD → SMD)
2. ✅ Context passing between prompts
3. ✅ RAG-enhanced SMD generation
4. ✅ Separate storage and visualization
5. ✅ Scalable architecture for future diagram types

**Estimated Timeline**: 4 weeks for full implementation

**Next Steps**:
1. Review and approve plan
2. Begin Phase 1 (Database schema)
3. Iterate on prompt engineering
4. Build incrementally with testing

This design ensures high-quality behavioral modeling while maintaining system performance and user experience.

---

**Document Version**: 1.0
**Date**: 2025-10-20
**Author**: AI Architecture Team
**Status**: READY FOR REVIEW
