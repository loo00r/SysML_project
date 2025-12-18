import asyncio
import time
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Callable, List, Dict, Tuple, Optional
import json

from app.db.dependencies import get_db
from app.core.config import settings
from app.core.redis_client import redis_client
from app.core.payload_merge import merge_payload
from app.database.models import (
    DiagramEmbeddingCreate,
    DiagramEmbeddingResponse,
    TemplateResponse,
    ComponentResponse,
    SimilarDiagramRequest,
    InternalBlockDiagram,
    InternalBlockDiagramCreate,
    StateMachineDiagramCreate
)
from app.database.embeddings import (
    store_diagram_with_embedding,
    find_similar_diagrams,
    find_similar_ibds,
    get_template_by_type,
    get_components_by_type
)
from app.AI.diagram_generation import (
    generate_diagram,
    generate_sysml_diagram,
    generate_ibd_diagram,
    generate_state_machine_diagram,
    DiagramPositioning
)
from app.crud import crud_ibd, crud_smd, crud_bdd_block
from app.domain.constraints import build_domain_context
from app.domain.detector import detect_domain_and_mode
from app.validation.deterministic import validate_sar_unified_payload
from app.validation.llm_validator import llm_validate_sysml
from app.validation.refinement import build_refinement_prompt

router = APIRouter(prefix="/rag", tags=["RAG"])

def _make_event(event_type: str, msg: str, **extra: Any) -> Dict[str, Any]:
    event: Dict[str, Any] = {"ts": time.time(), "type": event_type, "msg": msg}
    event.update(extra)
    return event


def _progress_detail(
    *,
    stage: str,
    current_step: str,
    done: Optional[int] = None,
    total: Optional[int] = None,
) -> Dict[str, Any]:
    detail: Dict[str, Any] = {"stage": stage, "current_step": current_step}
    if done is not None:
        detail["done"] = done
    if total is not None:
        detail["total"] = total
    return detail


def _store_diagram_merged(diagram_id: str, payload: Dict[str, Any]) -> None:
    existing = redis_client.get_diagram(diagram_id) or {}
    merged_payload = merge_payload(existing, payload)
    redis_client.store_diagram(merged_payload, diagram_id=diagram_id)


def build_ibd_one_shot_example(
    block_name: str,
    ibd: InternalBlockDiagram
) -> Optional[Dict[str, Any]]:
    """
    Normalize persisted IBD data into the one-shot format expected by generate_ibd_diagram.
    Returns None when stored diagrams lack usable node/edge data.
    """
    if ibd is None:
        return None

    nodes = ibd.nodes or []
    edges = ibd.edges or []
    if not nodes or not edges:
        return None

    return {
        "input": block_name,
        "output": {
            "nodes": nodes,
            "edges": edges
        }
    }

def identify_diagram_candidates(
    elements: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Identify blocks that should feed IBD and SMD generation steps (see docs/UNIFIED_CHAIN_PROMPTING_PLAN.md).
    """
    ibd_candidates = [element for element in elements if element.get("type") in {"block", "processor"}]
    smd_candidates = [element for element in elements if element.get("type") in {"block", "processor"}]
    return ibd_candidates, smd_candidates


async def generate_smd_for_block_async(
    block: Dict[str, Any],
    system_context: str,
    db: Optional[AsyncSession],
    use_rag: bool,
    domain: str = "generic",
    command_mode: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Async helper to generate a State Machine Diagram for a single block."""
    block_id = block.get("id")
    if not block_id:
        print("generate_smd_for_block_async: Skipping block without 'id'")
        return None

    block_name = block.get("name", "Unnamed Block")
    block_type = block.get("type", "block")
    block_description = block.get("description", "")

    try:
        one_shot_examples: List[Dict[str, Any]] = []
        if use_rag:
            # Placeholder for future RAG lookup (e.g., find_similar_smds)
            pass

        smd_result = await asyncio.to_thread(
            generate_state_machine_diagram,
            block_id=block_id,
            block_name=block_name,
            block_description=block_description,
            block_type=block_type,
            system_context=system_context,
            one_shot_examples=one_shot_examples or None,
            domain=domain,
            command_mode=command_mode,
        )

        if smd_result.get("error"):
            print(f"generate_smd_for_block_async: SMD generation failed for {block_name}: {smd_result['error']}")
            return None

        smd_raw = smd_result.get("smd_raw") or {}
        nodes = smd_raw.get("nodes") or []
        edges = smd_raw.get("edges") or []

        if not nodes:
            print(f"generate_smd_for_block_async: No nodes returned for {block_name}, skipping")
            return None

        return {
            "parent_block_id": block_id,
            "parent_block_name": block_name,
            "nodes": nodes,
            "edges": edges
        }

    except Exception as exc:
        print(f"generate_smd_for_block_async: Unexpected error for {block_name}: {exc}")
        return None


async def generate_ibd_for_block_async(
    block: Dict[str, Any],
    system_context: str,
    relationships: List[Dict[str, Any]],
    db: Optional[AsyncSession],
    use_rag: bool,
    db_session_factory: Optional[Callable[[], Any]] = None,
    domain: str = "generic",
    command_mode: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Async helper to generate an Internal Block Diagram for a single block.
    """
    block_id = block.get("id")
    if not block_id:
        print("generate_ibd_for_block_async: Skipping block without 'id'")
        return None

    block_name = block.get("name", "Unnamed Block")
    block_type = block.get("type", "block")
    block_description = block.get("description", "")

    try:
        # Focus the parent relationships on the current block only.
        block_relationships: List[Dict[str, Any]] = []
        for rel in relationships or []:
            source_id = rel.get("source_id") or rel.get("source")
            target_id = rel.get("target_id") or rel.get("target")
            if block_id in {source_id, target_id}:
                block_relationships.append({
                    "source": source_id,
                    "target": target_id,
                    "label": rel.get("name") or rel.get("label") or ""
                })

        one_shot_examples: List[Dict[str, Any]] = []
        if use_rag:
            try:
                if db_session_factory is not None:
                    async with db_session_factory() as rag_db:
                        similar_ibds = await find_similar_ibds(
                            db=rag_db,
                            block_name=block_name,
                            block_type=block_type,
                            limit=2,
                        )
                else:
                    similar_ibds = await find_similar_ibds(
                        db=db,
                        block_name=block_name,
                        block_type=block_type,
                        limit=2,
                    )
            except Exception as rag_error:
                print(f"generate_ibd_for_block_async: RAG lookup failed for {block_name}: {rag_error}")
                similar_ibds = []

            if similar_ibds:
                for existing_ibd in similar_ibds:
                    example = build_ibd_one_shot_example(block_name, existing_ibd)
                    if example:
                        one_shot_examples.append(example)
                if one_shot_examples:
                    print(f"Using {len(one_shot_examples)} IBD RAG example(s) for {block_name}")
            else:
                print(f"No similar IBDs found for {block_name}, proceeding without RAG examples")

        ibd_result = await asyncio.to_thread(
            generate_ibd_diagram,
            block_id=block_id,
            block_name=block_name,
            block_description=block_description,
            block_type=block_type,
            system_context=system_context,
            parent_relationships=block_relationships,
            one_shot_examples=one_shot_examples or None,
            domain=domain,
            command_mode=command_mode,
        )

        if ibd_result.get("error"):
            print(f"generate_ibd_for_block_async: IBD generation failed for {block_name}: {ibd_result['error']}")
            return None

        ibd_raw = ibd_result.get("ibd_raw") or {}
        nodes = ibd_raw.get("nodes") or []
        edges = ibd_raw.get("edges") or []

        if not nodes:
            print(f"generate_ibd_for_block_async: No nodes returned for {block_name}, skipping result")
            return None

        return {
            "parent_block_id": block_id,
            "nodes": nodes,
            "edges": edges
        }

    except Exception as exc:
        print(f"generate_ibd_for_block_async: Unexpected error for {block_name}: {exc}")
        return None


@router.post("/diagrams/", response_model=DiagramEmbeddingResponse)
async def create_diagram_embedding(
    diagram: DiagramEmbeddingCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Store a new diagram with its embedding in the database
    """
    db_diagram = await store_diagram_with_embedding(
        db=db,
        name=diagram.name,
        description=diagram.description or "",
        raw_text=diagram.raw_text,
        diagram_type=diagram.diagram_type,
        diagram_json=diagram.diagram_json
    )
    return db_diagram

@router.post("/similar-diagrams/", response_model=List[DiagramEmbeddingResponse])
async def find_similar_diagrams_endpoint(
    request: SimilarDiagramRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Find similar diagrams based on text query
    """
    similar_diagrams = await find_similar_diagrams(
        db=db,
        query_text=request.query_text,
        limit=request.limit,
        diagram_type=request.diagram_type
    )
    return similar_diagrams

@router.get("/templates/{template_type}", response_model=List[TemplateResponse])
async def get_templates(
    template_type: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all templates for a specific diagram type
    """
    templates = await get_template_by_type(db, template_type)
    return templates

@router.get("/components/{component_type}", response_model=List[ComponentResponse])
async def get_components(
    component_type: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all UAV components of a specific type
    """
    components = await get_components_by_type(db, component_type)
    return components

async def _generate_diagram_in_background(
    diagram_id: str,
    text: str,
    use_rag: bool,
    generate_ibd: bool,
    generate_smd: bool,
    name: str,
    domain: str,
    command_mode: Optional[str],
):
    """
    Background task to generate BDD, IBD, and SMD diagrams.
    Stores the final result in Redis under the given diagram_id.
    """
    from app.db.session import AsyncSessionLocal

    try:
        print(f"\n==== BACKGROUND GENERATION START for {diagram_id} ====")
        print(f"Input excerpt: {text[:120]}")
        print(f"Options -> RAG: {use_rag}, IBD: {generate_ibd}, SMD: {generate_smd}, domain: {domain}, mode: {command_mode}")

        # Create new DB session for background task
        async with AsyncSessionLocal() as db:
            if not domain:
                domain = "generic"

            if domain == "generic" or (domain == "sar" and command_mode is None):
                detection = await asyncio.to_thread(detect_domain_and_mode, text)
                if detection is not None:
                    if domain == "generic":
                        domain = detection.domain
                    if command_mode is None and detection.command_mode is not None:
                        command_mode = detection.command_mode

                    detected_payload = {
                        "status": "processing",
                        "stage": "DETECTED",
                        "message": "Domain detected; starting generation",
                        "domain": domain,
                        "command_mode": command_mode,
                        "progress_detail": _progress_detail(stage="DETECTED", current_step="Domain detected"),
                        "events": [
                            _make_event(
                                "DOMAIN_DETECTED",
                                "Domain detected; starting generation",
                                domain=domain,
                                command_mode=command_mode,
                                confidence=getattr(detection, "confidence", None),
                            )
                        ],
                    }
                    _store_diagram_merged(diagram_id, detected_payload)
                    print(
                        f"Background: Domain detection -> domain={domain}, mode={command_mode}, confidence={detection.confidence}"
                    )

            bdd_version = 1
            max_bdd_iterations = 2

            # Step 1: Generate BDD with optional RAG support.
            bdd_examples: List[Dict[str, Any]] = []
            if use_rag:
                try:
                    similar_bdds = await find_similar_diagrams(
                        db=db,
                        query_text=text,
                        limit=1,
                        diagram_type="bdd",
                        include_scores=True
                    )
                except Exception as rag_error:
                    print(f"Background: BDD RAG lookup failed: {rag_error}")
                else:
                    if similar_bdds:
                        best_match = similar_bdds[0]
                        print(f"Background: Using BDD example '{best_match.name}'")
                        bdd_examples.append({
                            "input": best_match.raw_text,
                            "output": best_match.diagram_json
                        })
                    else:
                        print("Background: No similar BDD examples found")

            bdd_result = await asyncio.to_thread(
                generate_sysml_diagram,
                prompt=text,
                diagram_type="bdd",
                one_shot_examples=bdd_examples or None,
                domain=domain,
                command_mode=command_mode,
            )

            if bdd_result.get("error"):
                error_payload = {
                    "status": "error",
                    "stage": "ERROR",
                    "error": bdd_result["error"]
                }
                error_payload["progress_detail"] = _progress_detail(stage="ERROR", current_step="BDD generation failed")
                error_payload["events"] = [_make_event("ERROR", "BDD generation failed", error=bdd_result["error"])]
                _store_diagram_merged(diagram_id, error_payload)
                print(f"Background: Error stored for {diagram_id}")
                return

            raw_bdd = bdd_result.get("diagram_raw", {})
            positioned_bdd = DiagramPositioning.apply_positioning(raw_bdd)
            elements = raw_bdd.get("elements", [])
            relationships = raw_bdd.get("relationships", [])

            validation_report = None
            quality_score = None
            if domain == "sar":
                report = validate_sar_unified_payload(
                    text=text,
                    bdd_diagram=raw_bdd,
                    ibd_data=None,
                    smd_data=None,
                    mode=command_mode,
                    stage="BDD",
                )
                validation_report = report.model_dump()
                quality_score = report.quality_score

                # Update Redis with BDD result immediately (partial result)
                validation_report_payload = validation_report or {}
                partial_payload = {
                    "status": "processing",
                    "stage": "BDD",
                    "message": "BDD generated, generating IBD and SMD...",
                    "diagram": positioned_bdd,
                    "raw_text": text,
                    "progress": "bdd_complete",
                    "progress_detail": _progress_detail(stage="BDD", current_step=f"BDD v{bdd_version} generated"),
                    "validation_report": validation_report_payload,
                    "quality_score": quality_score,
                    "domain": domain,
                    "command_mode": command_mode,
                    "bdd_version": bdd_version,
                    "events": [_make_event("BDD_GENERATED", f"BDD v{bdd_version} generated", version=bdd_version)],
                }
                if validation_report:
                    partial_payload["events"].append(
                        _make_event(
                            "BDD_VALIDATED",
                            f"BDD v{bdd_version} validated: {validation_report.get('recommendation')}, score={quality_score}",
                            version=bdd_version,
                            score=quality_score,
                            recommendation=validation_report.get("recommendation"),
                        )
                    )
                _store_diagram_merged(diagram_id, partial_payload)
                print(f"Background: BDD completed and stored for {diagram_id}")

                if domain == "sar" and validation_report and validation_report.get("recommendation") == "fail_fast":
                    fail_fast_payload = {
                        "status": "completed",
                        "stage": "FAILED_FAST",
                        "message": "Fail-fast validation triggered; skipping downstream generation.",
                        "diagram": positioned_bdd,
                        "raw_text": text,
                        "model_used": bdd_result.get("model_used"),
                        "saved_to_rag": False,
                        "used_rag": use_rag and bool(bdd_examples),
                        "examples_count": len(bdd_examples),
                        "ibd_data": [],
                        "smd_data": [],
                        "validation_report": validation_report or {},
                        "quality_score": quality_score,
                        "domain": domain,
                        "command_mode": command_mode,
                        "bdd_version": bdd_version,
                        "progress_detail": _progress_detail(stage="FAILED_FAST", current_step="Fail-fast: skipping downstream"),
                        "events": [_make_event("FAIL_FAST", "Fail-fast validation triggered; skipping downstream generation.")],
                    }
                    _store_diagram_merged(diagram_id, fail_fast_payload)
                    print(f"Background: Fail-fast validation stored for {diagram_id}")
                    return

            if domain == "sar" and validation_report and validation_report.get("recommendation") == "refine":
                iterations_used = 0
                while iterations_used < max_bdd_iterations and validation_report.get("recommendation") == "refine":
                    refinement_prompt = build_refinement_prompt(
                        original_text=text,
                        diagram_json=raw_bdd,
                        validation_report=report,
                        diagram_kind="bdd",
                    )

                    refining_payload = {
                        "status": "processing",
                        "stage": "BDD_REFINING",
                        "message": f"Refining BDD... (attempt {iterations_used + 1}/{max_bdd_iterations})",
                        "diagram": positioned_bdd,
                        "raw_text": text,
                        "progress": "bdd_refining",
                        "validation_report": validation_report or {},
                        "quality_score": quality_score,
                        "domain": domain,
                        "command_mode": command_mode,
                        "bdd_version": bdd_version,
                        "progress_detail": _progress_detail(
                            stage="BDD_REFINING",
                            current_step=f"Refining BDD v{bdd_version} (attempt {iterations_used + 1}/{max_bdd_iterations})",
                        ),
                        "events": [
                            _make_event(
                                "BDD_REFINING",
                                f"Starting refinement for BDD v{bdd_version} (attempt {iterations_used + 1})",
                                version=bdd_version,
                                attempt=iterations_used + 1,
                                max_attempts=max_bdd_iterations,
                            )
                        ],
                    }
                    _store_diagram_merged(diagram_id, refining_payload)

                    bdd_result = await asyncio.to_thread(
                        generate_sysml_diagram,
                        prompt=refinement_prompt,
                        diagram_type="bdd",
                        one_shot_examples=bdd_examples or None,
                        domain=domain,
                        command_mode=command_mode,
                    )
                    if bdd_result.get("error"):
                        error_payload = {
                            "status": "error",
                            "stage": "ERROR",
                            "error": bdd_result["error"],
                            "domain": domain,
                            "command_mode": command_mode,
                        }
                        error_payload["progress_detail"] = _progress_detail(stage="ERROR", current_step="BDD refinement failed")
                        error_payload["events"] = [_make_event("ERROR", "BDD refinement failed", error=bdd_result["error"])]
                        _store_diagram_merged(diagram_id, error_payload)
                        return

                    raw_bdd = bdd_result.get("diagram_raw", {})
                    positioned_bdd = DiagramPositioning.apply_positioning(raw_bdd)
                    elements = raw_bdd.get("elements", [])
                    relationships = raw_bdd.get("relationships", [])
                    bdd_version += 1

                    report = validate_sar_unified_payload(
                        text=text,
                        bdd_diagram=raw_bdd,
                        ibd_data=None,
                        smd_data=None,
                        mode=command_mode,
                        stage="BDD",
                    )
                    validation_report = report.model_dump()
                    quality_score = report.quality_score

                    partial_payload = {
                        "status": "processing",
                        "stage": "BDD",
                        "message": "BDD refined, generating IBD and SMD...",
                        "diagram": positioned_bdd,
                        "raw_text": text,
                        "progress": "bdd_complete",
                        "progress_detail": _progress_detail(stage="BDD", current_step=f"BDD v{bdd_version} refined"),
                        "validation_report": validation_report or {},
                        "quality_score": quality_score,
                        "domain": domain,
                        "command_mode": command_mode,
                        "bdd_version": bdd_version,
                        "events": [
                            _make_event("BDD_REFINED", f"BDD v{bdd_version} generated", version=bdd_version),
                            _make_event(
                                "BDD_VALIDATED",
                                f"BDD v{bdd_version} validated: {validation_report.get('recommendation')}, score={quality_score}",
                                version=bdd_version,
                                score=quality_score,
                                recommendation=validation_report.get("recommendation"),
                            ),
                        ],
                    }
                    _store_diagram_merged(diagram_id, partial_payload)

                    if validation_report.get("recommendation") == "fail_fast":
                        fail_fast_payload = {
                            "status": "completed",
                            "stage": "FAILED_FAST",
                            "message": "Fail-fast validation triggered; skipping downstream generation.",
                            "diagram": positioned_bdd,
                            "raw_text": text,
                            "model_used": bdd_result.get("model_used"),
                            "saved_to_rag": False,
                            "used_rag": use_rag and bool(bdd_examples),
                            "examples_count": len(bdd_examples),
                            "ibd_data": [],
                            "smd_data": [],
                            "validation_report": validation_report or {},
                            "quality_score": quality_score,
                            "domain": domain,
                            "command_mode": command_mode,
                            "bdd_version": bdd_version,
                            "progress_detail": _progress_detail(
                                stage="FAILED_FAST",
                                current_step="Fail-fast: skipping downstream",
                            ),
                            "events": [
                                _make_event(
                                    "FAIL_FAST",
                                    "Fail-fast validation triggered; skipping downstream generation.",
                                )
                            ],
                        }
                        _store_diagram_merged(diagram_id, fail_fast_payload)
                        return

                    iterations_used += 1

                if iterations_used >= max_bdd_iterations and validation_report.get("recommendation") == "refine":
                    limit_payload = {
                        "status": "processing",
                        "stage": "BDD",
                        "message": f"Max BDD refinement attempts reached ({max_bdd_iterations}); continuing with best-effort result.",
                        "diagram": positioned_bdd,
                        "raw_text": text,
                        "progress": "bdd_refine_limit",
                        "progress_detail": _progress_detail(
                            stage="BDD",
                            current_step=f"Max refinement attempts reached ({max_bdd_iterations}); continuing",
                        ),
                        "validation_report": validation_report or {},
                        "quality_score": quality_score,
                        "domain": domain,
                        "command_mode": command_mode,
                        "bdd_version": bdd_version,
                        "events": [
                            _make_event(
                                "BDD_MAX_ITERATIONS",
                                f"Reached max refinement attempts ({max_bdd_iterations}); continuing with best-effort BDD.",
                                version=bdd_version,
                                max_iterations=max_bdd_iterations,
                            )
                        ],
                    }
                    _store_diagram_merged(diagram_id, limit_payload)
                    partial_payload = limit_payload

            # Step 2: Identify candidate blocks.
            ibd_candidates: List[Dict[str, Any]] = []
            smd_candidates: List[Dict[str, Any]] = []
            if elements:
                ibd_candidates, smd_candidates = identify_diagram_candidates(elements)
            print(f"Background: Identified {len(ibd_candidates)} IBD candidates and {len(smd_candidates)} SMD candidates")

            # Respect caller toggles.
            if not generate_ibd:
                ibd_candidates = []
            if not generate_smd:
                smd_candidates = []

            # Step 3: Parallel generation for IBD and SMD
            ibd_to_create: List[Dict[str, Any]] = []
            smd_to_create: List[Dict[str, Any]] = []

            total_tasks = len(ibd_candidates) + len(smd_candidates)
            done_tasks = 0

            async def run_ibd(block: Dict[str, Any]) -> Tuple[str, Optional[Dict[str, Any]]]:
                return (
                    "ibd",
                    await generate_ibd_for_block_async(
                        block=block,
                        system_context=text,
                        relationships=relationships,
                        db=None,
                        use_rag=use_rag,
                        db_session_factory=AsyncSessionLocal,
                        domain=domain,
                        command_mode=command_mode,
                    ),
                )

            async def run_smd(block: Dict[str, Any]) -> Tuple[str, Optional[Dict[str, Any]]]:
                return (
                    "smd",
                    await generate_smd_for_block_async(
                        block=block,
                        system_context=text,
                        db=None,
                        use_rag=use_rag,
                        domain=domain,
                        command_mode=command_mode,
                    ),
                )

            tasks = [asyncio.create_task(run_ibd(block)) for block in ibd_candidates] + [
                asyncio.create_task(run_smd(block)) for block in smd_candidates
            ]

            if tasks:
                print(f"Background: Launching {len(tasks)} IBD/SMD tasks in PARALLEL using asyncio.gather")
                for completed in asyncio.as_completed(tasks):
                    try:
                        kind, result = await completed
                    except Exception as task_error:
                        print(f"Background: Subtask raised exception: {task_error}")
                        kind, result = ("unknown", None)

                    done_tasks += 1
                    if isinstance(result, dict):
                        fail_fast_triggered = False
                        fail_fast_reason = None
                        fail_fast_report: Optional[Dict[str, Any]] = None
                        subdiagram_validation_update: Dict[str, Any] = {}
                        if kind == "ibd":
                            ibd_to_create.append(result)
                            if domain == "sar":
                                parent_block_id = str(result.get("parent_block_id") or "")
                                if parent_block_id:
                                    report = validate_sar_unified_payload(
                                        text=text,
                                        bdd_diagram=raw_bdd,
                                        ibd_data=[result],
                                        smd_data=None,
                                        mode=command_mode,
                                        stage="IBD",
                                    )
                                    report_payload = report.model_dump()
                                    subdiagram_validation_update[f"ibd:{parent_block_id}"] = report_payload
                                    if report_payload.get("recommendation") == "fail_fast":
                                        fail_fast_triggered = True
                                        fail_fast_reason = f"IBD validation failed for block '{parent_block_id}'"
                                        fail_fast_report = report_payload
                        elif kind == "smd":
                            smd_to_create.append(result)
                            if domain == "sar":
                                parent_block_id = str(result.get("parent_block_id") or "")
                                if parent_block_id:
                                    report = validate_sar_unified_payload(
                                        text=text,
                                        bdd_diagram=raw_bdd,
                                        ibd_data=None,
                                        smd_data=[result],
                                        mode=command_mode,
                                        stage="SMD",
                                    )
                                    report_payload = report.model_dump()
                                    subdiagram_validation_update[f"smd:{parent_block_id}"] = report_payload
                                    if report_payload.get("recommendation") == "fail_fast":
                                        fail_fast_triggered = True
                                        fail_fast_reason = f"SMD validation failed for block '{parent_block_id}'"
                                        fail_fast_report = report_payload

                        progress_payload = {
                            "status": "processing",
                            "stage": "SUBDIAGRAMS",
                            "message": f"Generating IBD and SMD... ({done_tasks}/{total_tasks})",
                            "diagram": positioned_bdd,
                            "raw_text": text,
                            "progress": "subdiagrams_generating",
                            "progress_detail": _progress_detail(
                                stage="SUBDIAGRAMS",
                                current_step=f"Generating subdiagrams ({done_tasks}/{total_tasks})",
                                done=done_tasks,
                                total=total_tasks,
                            ),
                            "ibd_data": ibd_to_create,
                            "smd_data": smd_to_create,
                            "validation_report": validation_report or {},
                            "quality_score": quality_score,
                            "domain": domain,
                            "command_mode": command_mode,
                            "bdd_version": bdd_version,
                            "subdiagram_validation": subdiagram_validation_update,
                            "events": [
                                _make_event(
                                    "SUBDIAGRAM_PROGRESS",
                                    f"{done_tasks}/{total_tasks} subdiagrams completed",
                                    done=done_tasks,
                                    total=total_tasks,
                                )
                            ],
                        }
                        _store_diagram_merged(diagram_id, progress_payload)

                        if fail_fast_triggered:
                            for pending in tasks:
                                if not pending.done():
                                    pending.cancel()
                            await asyncio.gather(*tasks, return_exceptions=True)

                            final_validation_report = validation_report or {}
                            final_quality_score = quality_score
                            if domain == "sar":
                                final_report = validate_sar_unified_payload(
                                    text=text,
                                    bdd_diagram=raw_bdd,
                                    ibd_data=ibd_to_create if generate_ibd else None,
                                    smd_data=smd_to_create if generate_smd else None,
                                    mode=command_mode,
                                    stage="UNIFIED",
                                )
                                final_validation_report = final_report.model_dump()
                                final_quality_score = final_report.quality_score

                            fail_fast_payload = {
                                "status": "completed",
                                "stage": "FAILED_FAST",
                                "message": fail_fast_reason or "Fail-fast validation triggered; stopping downstream generation.",
                                "diagram": positioned_bdd,
                                "raw_text": text,
                                "model_used": bdd_result.get("model_used"),
                                "saved_to_rag": False,
                                "used_rag": use_rag and bool(bdd_examples),
                                "examples_count": len(bdd_examples),
                                "ibd_data": ibd_to_create,
                                "smd_data": smd_to_create,
                                "validation_report": final_validation_report or {},
                                "quality_score": final_quality_score,
                                "domain": domain,
                                "command_mode": command_mode,
                                "bdd_version": bdd_version,
                                "progress_detail": _progress_detail(
                                    stage="FAILED_FAST",
                                    current_step="Fail-fast: invalid subdiagram detected; stopping",
                                    done=done_tasks,
                                    total=total_tasks,
                                ),
                                "subdiagram_validation": subdiagram_validation_update,
                                "events": [
                                    _make_event(
                                        "FAIL_FAST",
                                        "Fail-fast validation triggered during subdiagram generation; stopping.",
                                        reason=fail_fast_reason,
                                        report=fail_fast_report,
                                    )
                                ],
                            }
                            _store_diagram_merged(diagram_id, fail_fast_payload)
                            print(f"Background: Fail-fast triggered during subdiagram generation for {diagram_id}")
                            return
            else:
                print("Background: No generation tasks to execute")

            print(f"Background: Generated {len(ibd_to_create)} IBD diagrams and {len(smd_to_create)} SMD diagrams")

            llm_validation = None
            if domain == "sar":
                final_report = validate_sar_unified_payload(
                    text=text,
                    bdd_diagram=raw_bdd,
                    ibd_data=ibd_to_create if generate_ibd else None,
                    smd_data=smd_to_create if generate_smd else None,
                    mode=command_mode,
                    stage="UNIFIED",
                )
                validation_report = final_report.model_dump()
                quality_score = final_report.quality_score

                if settings.VALIDATION_ENABLE_LLM:
                    domain_context = build_domain_context(domain, command_mode)
                    llm_validation = llm_validate_sysml(
                        text=text,
                        domain_context=domain_context,
                        diagram={
                            "bdd": raw_bdd,
                            "ibd_data": ibd_to_create if generate_ibd else [],
                            "smd_data": smd_to_create if generate_smd else [],
                        },
                        deterministic_report=validation_report,
                        model=settings.OPENAI_VALIDATOR_MODEL,
                    )

            # Step 4: Store final payload in Redis.
            redis_payload = {
                "diagram": positioned_bdd,
                "raw_text": text,
                "model_used": bdd_result.get("model_used"),
                "saved_to_rag": False,
                "used_rag": use_rag and bool(bdd_examples),
                "examples_count": len(bdd_examples),
                "ibd_data": ibd_to_create,
                "smd_data": smd_to_create,
                "status": "completed",
                "stage": "COMPLETED",
                "validation_report": validation_report or {},
                "quality_score": quality_score,
                "llm_validation": llm_validation,
                "llm_quality_score": (llm_validation or {}).get("score_total") if isinstance(llm_validation, dict) else None,
                "domain": domain,
                "command_mode": command_mode,
                "bdd_version": bdd_version,
                "progress_detail": _progress_detail(stage="COMPLETED", current_step="Generation completed"),
                "events": [_make_event("COMPLETED", "Generation completed")],
            }
            _store_diagram_merged(diagram_id, redis_payload)

            print(f"Background: Stored completed result under ID {diagram_id}")
    
    except Exception as e:
        print(f"Background: Fatal error for {diagram_id}: {e}")
        error_payload = {
            "status": "error",
            "stage": "ERROR",
            "error": f"Background generation failed: {str(e)}",
            "progress_detail": _progress_detail(stage="ERROR", current_step="Background generation failed"),
            "events": [_make_event("ERROR", "Background generation failed", error=str(e))],
        }
        _store_diagram_merged(diagram_id, error_payload)


@router.post("/generate-diagram-unified/", status_code=202)
async def generate_diagram_unified(
    background_tasks: BackgroundTasks,
    text: str = Body(..., embed=True),
    use_rag: bool = Body(True, embed=True),
    generate_ibd: bool = Body(True, embed=True),
    generate_smd: bool = Body(False, embed=True),
    domain: str = Body("generic", embed=True),
    command_mode: Optional[str] = Body(None, embed=True),
    name: str = Body("Generated Diagram", embed=True)
):
    """
    Unified chain prompting workflow - TRULY ASYNC:
    1. Generate diagram ID immediately
    2. Return diagramId to client (202 Accepted)
    3. Generate BDD, IBD, SMD in background
    4. Store final result in Redis when done

    Client polls /api/v1/rag/diagram-result/{diagramId} for status
    """
    # Generate diagram ID immediately
    diagram_id = redis_client.generate_diagram_id()

    if not domain:
        domain = "generic"

    # Store initial "processing" status in Redis immediately to avoid early 404s during polling.
    initial_payload = {
        "status": "processing",
        "stage": "STARTED",
        "message": "Diagram generation started",
        "domain": domain,
        "command_mode": command_mode,
        "progress_detail": _progress_detail(stage="STARTED", current_step="Diagram generation started"),
        "events": [_make_event("STARTED", "Diagram generation started")],
    }
    _store_diagram_merged(diagram_id, initial_payload)

    print(f"\n==== UNIFIED ASYNC: Created {diagram_id}, starting background task ====")

    # Launch background task
    background_tasks.add_task(
        _generate_diagram_in_background,
        diagram_id=diagram_id,
        text=text,
        use_rag=use_rag,
        generate_ibd=generate_ibd,
        generate_smd=generate_smd,
        name=name,
        domain=domain,
        command_mode=command_mode,
    )

    # Return immediately
    return {
        "status": "processing",
        "diagramId": diagram_id,
        "message": "Diagram generation started in background",
        "domain": domain,
        "command_mode": command_mode,
    }

@router.post("/generate-diagram-with-context/", status_code=202)
async def generate_diagram_with_context(
    text: str = Body(..., embed=True),
    diagram_type: str = Body("bdd", embed=True),
    use_rag: bool = Body(True, embed=True),
    name: str = Body("Generated Diagram", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a diagram using context from the database if use_rag is True.
    Supports both 'bdd' and 'bdd_enhanced' diagram types with full IBD parsing.
    Returns diagram ID immediately and stores result in Redis with TTL.
    """
    one_shot_examples = []
    
    print(f"\n==== Generating {diagram_type} diagram with RAG: {use_rag} ====")
    print(f"Input text: {text[:100]}...")
    
    # TEMPORARY: Bootstrap example with connected IBD components for better AI training
    if diagram_type == "bdd_enhanced":
        bootstrap_example = {
            "input": "Create a UAV flight controller with CPU and memory connected internally, plus GPS sensor",
            "output": {
                "diagram_type": "bdd",
                "elements": [
                    {
                        "id": "flight-controller",
                        "type": "block", 
                        "name": "Flight Controller",
                        "internal_diagram": {
                            "nodes": [
                                {"id": "cpu-unit", "type": "ibd_block", "name": "Central Processing Unit"},
                                {"id": "memory-unit", "type": "ibd_block", "name": "Memory Module"},
                                {"id": "io-unit", "type": "ibd_block", "name": "I/O Controller"}
                            ],
                            "edges": [
                                {"id": "cpu-memory-bus", "source": "cpu-unit", "target": "memory-unit", "label": "Data Bus"},
                                {"id": "cpu-io-control", "source": "cpu-unit", "target": "io-unit", "label": "Control Signals"},
                                {"id": "memory-io-access", "source": "memory-unit", "target": "io-unit", "label": "Memory Access"}
                            ]
                        }
                    },
                    {
                        "id": "gps-sensor",
                        "type": "sensor",
                        "name": "GPS"
                    }
                ],
                "relationships": [
                    {"source_id": "gps-sensor", "target_id": "flight-controller", "name": "Provides data"}
                ]
            }
        }
        one_shot_examples.append(bootstrap_example)
        print(f"Added bootstrap example with {len(bootstrap_example['output']['elements'][0]['internal_diagram']['edges'])} connected IBD edges")
    
    if use_rag:
        try:
            # For enhanced diagrams, search for both bdd and bdd_enhanced examples
            search_type = diagram_type if diagram_type != "bdd_enhanced" else "bdd"
            similar_diagrams = await find_similar_diagrams(
                db=db, 
                query_text=text, 
                limit=1,  
                diagram_type=search_type,
                include_scores=True
            )
            
            if not similar_diagrams:
                print(f"No diagrams of type '{search_type}' found, will proceed without RAG context")
            
            if similar_diagrams:
                best_match = similar_diagrams[0]
                similarity_score = getattr(best_match, "similarity_score", None)
                
                print(f"Found best match: {best_match.name} (type: {best_match.diagram_type}) with similarity score: {similarity_score:.4f}")
                
                # Always use the best match regardless of score
                one_shot_examples.append({
                    "input": best_match.raw_text,
                    "output": best_match.diagram_json
                })
                
                print(f"Using one-shot example with {len(best_match.raw_text)} chars of text and {len(json.dumps(best_match.diagram_json))} chars of JSON")
            else:
                print("No similar diagrams found for RAG context at all")
                
        except Exception as e:
            print(f"Error during RAG context retrieval: {str(e)}")
            use_rag = False
    
    try:
        # Use the new generation function that supports enhanced diagrams
        generation_result = generate_sysml_diagram(
            prompt=text,
            diagram_type=diagram_type,
            one_shot_examples=one_shot_examples
        )
        
        if "error" in generation_result:
            return {"error": generation_result["error"]}
        
        raw_diagram = generation_result["diagram_raw"]
        
        # Handle enhanced diagrams with IBD parsing
        ibd_to_create = []
        if diagram_type == "bdd_enhanced" and "elements" in raw_diagram:
            for element in raw_diagram["elements"]:
                if "internal_diagram" in element:
                    # Mark the element as having an IBD for the frontend
                    if "data" not in element:
                        element["data"] = {}
                    element["data"]["has_ibd"] = True
                    
                    # Prepare IBD for creation later
                    ibd_data = element.pop("internal_diagram")  # Remove IBD from main diagram
                    
                    # DEBUG: Log what edges were found in the AI response
                    edges_found = ibd_data.get("edges", [])
                    print(f"DEBUG: IBD for block {element['id']} has {len(edges_found)} edges in AI response")
                    if edges_found:
                        print(f"DEBUG: Edges content: {edges_found}")
                    else:
                        print(f"DEBUG: No edges found in internal_diagram for {element['id']}")
                    
                    ibd_to_create.append({
                        "parent_block_id": element["id"],
                        "nodes": ibd_data.get("nodes", []),
                        "edges": edges_found,
                    })
        
        # Apply positioning to the clean diagram
        positioned_diagram = DiagramPositioning.apply_positioning(raw_diagram)
        
        # Prepare final result for Redis storage (without saving to database)
        result = {
            "diagram": positioned_diagram,
            "raw_text": text,
            "model_used": generation_result["model_used"],
            "saved_to_rag": False,  # Not saved automatically anymore
            "used_rag": use_rag and len(one_shot_examples) > 0,
            "examples_count": len(one_shot_examples),
            "ibd_data": ibd_to_create,  # Store IBD data for later saving if needed
            "status": "completed"
        }
        
        # Store result in Redis and return only diagram ID
        diagram_id = redis_client.store_diagram(result)
        
        return {
            "status": "processing",
            "diagramId": diagram_id
        }
        
    except Exception as e:
        print(f"Error in unified RAG generation: {str(e)}")
        
        # Store error in Redis for retrieval
        error_result = {
            "status": "error",
            "error": str(e)
        }
        diagram_id = redis_client.store_diagram(error_result)
        
        return {
            "status": "processing", 
            "diagramId": diagram_id
        }

@router.get("/diagram-result/{diagram_id}")
async def get_diagram_result(diagram_id: str):
    """
    Retrieve the generated diagram result from Redis cache
    """
    try:
        result = redis_client.get_diagram(diagram_id)
        
        if result is None:
            raise HTTPException(status_code=404, detail="Diagram not found or expired")
        
        return result
        
    except Exception as e:
        print(f"Error retrieving diagram {diagram_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving diagram result")

@router.post("/save-diagram/")
async def save_diagram_to_database(
    diagram_id: str = Body(..., embed=True),
    name: str = Body("Generated Diagram", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """
    Save a generated diagram from Redis cache to the database
    """
    try:
        # Get diagram from Redis
        cached_diagram = redis_client.get_diagram(diagram_id)
        
        if cached_diagram is None:
            raise HTTPException(status_code=404, detail="Diagram not found or expired in cache")
        
        if cached_diagram.get("status") != "completed":
            raise HTTPException(status_code=400, detail="Diagram generation not completed")
        
        # Save the main diagram to database
        db_diagram = await store_diagram_with_embedding(
            db=db,
            name=name,
            description=f"Generated diagram",
            raw_text=cached_diagram["raw_text"],
            diagram_type="bdd",  # Always save as 'bdd' for RAG consistency
            diagram_json=cached_diagram["diagram"]
        )

        # Sync BDD blocks table for structured reuse
        diagram_elements = (cached_diagram.get("diagram") or {}).get("elements", [])
        bdd_block_map = await crud_bdd_block.sync_bdd_blocks(
            db=db,
            parent_bdd_diagram_id=db_diagram.id,
            elements=diagram_elements
        )

        # Normalize IBD payloads (supports both unified ibd_data list and legacy nested format)
        normalized_ibds: List[Dict[str, Any]] = []
        raw_diagram = cached_diagram.get("diagram") or {}
        cached_ibd_data = cached_diagram.get("ibd_data")

        if isinstance(cached_ibd_data, list) and cached_ibd_data:
            for item in cached_ibd_data:
                if not isinstance(item, dict):
                    continue
                parent_block_id = item.get("parent_block_id")
                if not parent_block_id:
                    continue
                nodes = item.get("nodes", [])
                edges = item.get("edges", [])
                normalized_ibds.append({
                    "parent_block_id": parent_block_id,
                    "nodes": nodes,
                    "edges": edges
                })

        if not normalized_ibds and isinstance(raw_diagram, dict):
            # Legacy fallback: extract IBDs nested inside the BDD diagram
            for element in raw_diagram.get("elements", []):
                if not isinstance(element, dict):
                    continue
                internal_diagram = element.get("internal_diagram")
                if not isinstance(internal_diagram, dict):
                    continue
                parent_block_id = element.get("id")
                nodes = internal_diagram.get("nodes", [])
                edges = internal_diagram.get("edges", [])
                if parent_block_id:
                    normalized_ibds.append({
                        "parent_block_id": parent_block_id,
                        "nodes": nodes,
                        "edges": edges
                    })

        saved_ibd_count = 0

        for ibd_data in normalized_ibds:
            parent_block_id = ibd_data["parent_block_id"]
            block_ref = bdd_block_map.get(parent_block_id)
            if block_ref is None:
                block_ref = await crud_bdd_block.get_block_by_parent_and_id(
                    db=db,
                    parent_bdd_diagram_id=db_diagram.id,
                    block_id=parent_block_id
                )

            existing_ibd = await crud_ibd.get_ibd_by_parent_and_block(
                db=db,
                parent_bdd_id=db_diagram.id,
                block_id=parent_block_id
            )

            parent_block_ref_id = getattr(block_ref, "id", None)

            if existing_ibd:
                # IBD already exists -> UPDATE it
                print(f"DEBUG: Found existing IBD for block {parent_block_id}. Updating...")
                await crud_ibd.update_ibd(
                    db=db,
                    db_ibd=existing_ibd,
                    nodes=ibd_data["nodes"],
                    edges=ibd_data["edges"],
                    parent_block_ref_id=parent_block_ref_id
                )
            else:
                # IBD does not exist -> CREATE it
                print(f"DEBUG: No existing IBD for block {parent_block_id}. Creating new...")
                new_ibd = InternalBlockDiagramCreate(
                    parent_bdd_diagram_id=db_diagram.id,
                    parent_block_id=parent_block_id,
                    parent_block_ref_id=parent_block_ref_id,
                    nodes=ibd_data["nodes"],
                    edges=ibd_data["edges"],
                    source="ai"
                )
                await crud_ibd.create_ibd(db=db, ibd=new_ibd)
            saved_ibd_count += 1

        # Save SMDs if they exist
        smd_data_list = cached_diagram.get("smd_data", [])
        saved_smd_count = 0
        for smd_data in smd_data_list or []:
            parent_block_id = smd_data.get("parent_block_id")
            if not parent_block_id:
                print("DEBUG: Skipping SMD entry without parent_block_id")
                continue

            nodes = smd_data.get("nodes", [])
            edges = smd_data.get("edges", [])
            parent_block_name = smd_data.get("parent_block_name")

            block_ref = bdd_block_map.get(parent_block_id)
            if block_ref is None:
                block_ref = await crud_bdd_block.get_block_by_parent_and_id(
                    db=db,
                    parent_bdd_diagram_id=db_diagram.id,
                    block_id=parent_block_id
                )
            parent_block_ref_id = getattr(block_ref, "id", None)

            if parent_block_name is None and block_ref is not None:
                parent_block_name = block_ref.block_name

            existing_smd = await crud_smd.get_smd_by_parent_and_block(
                db=db,
                parent_bdd_id=db_diagram.id,
                block_id=parent_block_id
            )

            if existing_smd:
                print(f"DEBUG: Updating existing SMD for block {parent_block_id}")
                await crud_smd.update_smd(
                    db=db,
                    db_smd=existing_smd,
                    states=nodes,
                    transitions=edges,
                    parent_block_name=parent_block_name,
                    parent_block_ref_id=parent_block_ref_id
                )
            else:
                print(f"DEBUG: Creating new SMD for block {parent_block_id}")
                new_smd = StateMachineDiagramCreate(
                    parent_bdd_diagram_id=db_diagram.id,
                    parent_block_id=parent_block_id,
                    parent_block_ref_id=parent_block_ref_id,
                    parent_block_name=parent_block_name,
                    states=nodes,
                    transitions=edges,
                    source="ai"
                )
                await crud_smd.create_smd(db=db, smd=new_smd)
            saved_smd_count += 1
        
        return {
            "message": "Diagram saved successfully",
            "diagram_id": db_diagram.id,
            "saved_to_rag": True,
            "ibd_count": saved_ibd_count,
            "smd_count": saved_smd_count
        }
        
    except Exception as e:
        print(f"Error saving diagram {diagram_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error saving diagram to database")
