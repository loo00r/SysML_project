from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

from app.domain.constraints import load_sar_constraints
from app.validation.schemas import ValidationIssue, ValidationReport

CRITERIA = ("completeness", "correctness", "standards", "understandability", "terminology")
GENERIC_NAME_PATTERN = re.compile(r"^(module|component|block|subsystem|element|node|part|unit|system)([-_ ]?\d+|[a-z])?$", re.IGNORECASE)


def _normalize_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _walk_strings(value: Any) -> Iterable[str]:
    if value is None:
        return
    if isinstance(value, str):
        yield value
        return
    if isinstance(value, dict):
        for item in value.values():
            yield from _walk_strings(item)
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            yield from _walk_strings(item)


def _contains_term(strings: Sequence[str], term: str) -> bool:
    needle = term.lower()
    return any(needle in s.lower() for s in strings if isinstance(s, str))


def _contains_normalized(strings: Sequence[str], term: str) -> bool:
    needle = _normalize_token(term)
    return any(needle in _normalize_token(s) for s in strings if isinstance(s, str))


def _issue_severity(code: str, constraints: Dict[str, Any]) -> str:
    severity = constraints.get("severity") or {}
    if code in (severity.get("critical") or []):
        return "critical"
    if code in (severity.get("warning") or []):
        return "warning"
    return "warning"


def _score_by_criterion(issues: List[ValidationIssue]) -> Dict[str, int]:
    scores = {criterion: 5 for criterion in CRITERIA}
    for issue in issues:
        criterion = issue.criterion
        if not criterion:
            continue
        penalty = 2 if issue.severity == "critical" else 1
        scores[criterion] = max(1, scores[criterion] - penalty)
    return scores


def _quality_score_from_scores(scores: Dict[str, int]) -> int:
    if not scores:
        return 100
    avg = sum(scores.values()) / len(CRITERIA)
    return round(((avg - 1) / 4) * 100)


def _recommendation_for_scores(
    *,
    issues: List[ValidationIssue],
    scores: Dict[str, int],
    quality_score: int,
    counts: Dict[str, int],
) -> str:
    if any(issue.severity == "critical" for issue in issues):
        return "fail_fast"
    if scores.get("correctness", 5) <= 2 or scores.get("standards", 5) <= 2:
        return "fail_fast"
    if counts.get("warning", 0) > 0:
        return "refine"
    if quality_score < 70:
        return "refine"
    return "pass"


def _get_nodes(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    nodes = diagram.get("elements")
    if isinstance(nodes, list):
        return nodes
    nodes = diagram.get("nodes")
    if isinstance(nodes, list):
        return nodes
    return []


def _get_edges(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    edges = diagram.get("relationships")
    if isinstance(edges, list):
        return edges
    edges = diagram.get("edges")
    if isinstance(edges, list):
        return edges
    return []


def _diagram_type_from_stage(stage: str, bdd_diagram: Dict[str, Any]) -> Optional[str]:
    if stage in {"BDD", "IBD", "SMD"}:
        return stage
    raw_type = bdd_diagram.get("diagram_type")
    if isinstance(raw_type, str) and raw_type:
        return raw_type.upper()
    return None


def _add_standards_issues(
    *,
    issues: List[ValidationIssue],
    stage: str,
    bdd_diagram: Dict[str, Any],
    ibd_data: Optional[List[Dict[str, Any]]],
    smd_data: Optional[List[Dict[str, Any]]],
) -> None:
    if stage in {"BDD", "UNIFIED"}:
        elements = bdd_diagram.get("elements")
        relationships = bdd_diagram.get("relationships")
        if not isinstance(elements, list) or not elements:
            issues.append(
                ValidationIssue(
                    criterion="standards",
                    code="INVALID_BDD_STRUCTURE",
                    severity="critical",
                    message="BDD elements are missing or not a list.",
                    location="bdd.elements",
                )
            )
            return
        for element in elements:
            if not isinstance(element, dict):
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_BDD_ELEMENT",
                        severity="critical",
                        message="BDD element is not an object.",
                        location="bdd.elements",
                    )
                )
                break
            if not element.get("id") or not element.get("type") or not element.get("name"):
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_BDD_ELEMENT_FIELDS",
                        severity="critical",
                        message="BDD elements must include id/type/name.",
                        location=f"bdd.elements.{element.get('id') or 'unknown'}",
                    )
                )
                break
        if relationships is not None and not isinstance(relationships, list):
            issues.append(
                ValidationIssue(
                    criterion="standards",
                    code="INVALID_BDD_RELATIONSHIPS",
                    severity="critical",
                    message="BDD relationships must be a list.",
                    location="bdd.relationships",
                )
            )

    if stage in {"IBD", "UNIFIED"} and ibd_data is not None:
        for ibd in ibd_data:
            if not isinstance(ibd, dict):
                continue
            nodes = ibd.get("nodes")
            if not isinstance(nodes, list) or not nodes:
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_IBD_STRUCTURE",
                        severity="critical",
                        message="IBD nodes are missing or not a list.",
                        location="ibd.nodes",
                    )
                )
                break
            for node in nodes:
                if not isinstance(node, dict) or not node.get("id"):
                    issues.append(
                        ValidationIssue(
                            criterion="standards",
                            code="INVALID_IBD_NODE",
                            severity="critical",
                            message="IBD nodes must include id.",
                            location="ibd.nodes",
                        )
                    )
                    break

    if stage in {"SMD", "UNIFIED"} and smd_data is not None:
        for smd in smd_data:
            if not isinstance(smd, dict):
                continue
            nodes = smd.get("nodes")
            edges = smd.get("edges")
            if not isinstance(nodes, list) or not nodes:
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_SMD_STRUCTURE",
                        severity="critical",
                        message="SMD nodes are missing or not a list.",
                        location="smd.nodes",
                    )
                )
                break
            if edges is not None and not isinstance(edges, list):
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_SMD_EDGES",
                        severity="critical",
                        message="SMD edges must be a list.",
                        location="smd.edges",
                    )
                )
                break


def _add_understandability_issues(
    *,
    issues: List[ValidationIssue],
    diagram_strings: Sequence[str],
) -> None:
    generic_hits = []
    for value in diagram_strings:
        if not isinstance(value, str):
            continue
        if GENERIC_NAME_PATTERN.match(value.strip()):
            generic_hits.append(value.strip())
    if generic_hits:
        issues.append(
            ValidationIssue(
                criterion="understandability",
                code="GENERIC_NAMING",
                severity="warning",
                message="Generic naming reduces diagram clarity.",
                details={"examples": sorted(set(generic_hits))[:5]},
            )
        )


def validate_sar_unified_payload(
    *,
    text: str,
    bdd_diagram: Dict[str, Any],
    ibd_data: Optional[List[Dict[str, Any]]] = None,
    smd_data: Optional[List[Dict[str, Any]]] = None,
    mode: Optional[str] = None,
    stage: str = "UNIFIED",
    constraints: Optional[Dict[str, Any]] = None,
) -> ValidationReport:
    constraints = constraints or load_sar_constraints()
    issues: List[ValidationIssue] = []

    if stage not in {"BDD", "IBD", "SMD", "UNIFIED"}:
        stage = "UNIFIED"

    all_strings = list(_walk_strings({"text": text, "bdd": bdd_diagram, "ibd": ibd_data, "smd": smd_data}))
    diagram_strings = list(_walk_strings({"bdd": bdd_diagram, "ibd": ibd_data, "smd": smd_data}))

    _add_standards_issues(
        issues=issues,
        stage=stage,
        bdd_diagram=bdd_diagram,
        ibd_data=ibd_data,
        smd_data=smd_data,
    )
    _add_understandability_issues(issues=issues, diagram_strings=diagram_strings)

    # 1) Terminology: synonyms warnings
    terminology = constraints.get("terminology") or {}
    synonyms = terminology.get("synonyms") or {}
    for synonym, canonical in synonyms.items():
        if _contains_term(all_strings, synonym):
            issues.append(
                ValidationIssue(
                    criterion="terminology",
                    code="TERMINOLOGY_SYNONYM_USED",
                    severity=_issue_severity("TERMINOLOGY_SYNONYM_USED", constraints),
                    message=f"Synonym '{synonym}' used; prefer canonical term '{canonical}'.",
                    suggestion=canonical,
                )
            )

    # 2) Mode checks: fail-fast if ICS and GSB roles are mixed
    bdd_rules = constraints.get("bdd") or {}
    mode_requirements = bdd_rules.get("mode_requirements") or {}
    ics_roles = set(mode_requirements.get("ICS", {}).get("required_roles", []))
    gsb_roles = set(mode_requirements.get("GSB", {}).get("required_roles", []))

    found_ics_roles = {role for role in ics_roles if _contains_term(all_strings, role)}
    found_gsb_roles = {role for role in gsb_roles if _contains_term(all_strings, role)}
    if found_ics_roles and found_gsb_roles:
        if mode is None:
            severity = "warning"
        else:
            severity = _issue_severity("MODE_MIXED_ICS_GSB", constraints)
        issues.append(
            ValidationIssue(
                criterion="correctness",
                code="MODE_MIXED_ICS_GSB",
                severity=severity,
                message="ICS and GSB roles appear together; choose exactly one command mode.",
                suggestion="Set command_mode to 'ICS' or 'GSB'.",
                details={"ics_roles": sorted(found_ics_roles), "gsb_roles": sorted(found_gsb_roles)},
            )
        )

    if mode in mode_requirements:
        forbidden = mode_requirements.get(mode, {}).get("forbidden_roles", []) or []
        forbidden_found = [role for role in forbidden if _contains_term(all_strings, role)]
        if forbidden_found:
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="MODE_MIXED_ICS_GSB",
                    severity=_issue_severity("MODE_MIXED_ICS_GSB", constraints),
                    message=f"Mode '{mode}' forbids roles present in the model.",
                    details={"mode": mode, "forbidden_roles_present": forbidden_found},
                )
            )

    # 3) BDD required blocks (fail-fast)
    # Run only for BDD/UNIFIED stages; otherwise per-subdiagram validation would
    # repeat foundation checks for every IBD/SMD block.
    required_blocks = bdd_rules.get("required_blocks") or []
    if stage in {"BDD", "UNIFIED"} and required_blocks:
        bdd_nodes = _get_nodes(bdd_diagram)
        element_names = [str(el.get("name") or "") for el in bdd_nodes if isinstance(el, dict)]
        for block in required_blocks:
            if not _contains_normalized(element_names, block):
                issues.append(
                    ValidationIssue(
                        criterion="completeness",
                        code="MISSING_REQUIRED_BDD_BLOCK",
                        severity=_issue_severity("MISSING_REQUIRED_BDD_BLOCK", constraints),
                        message=f"BDD is missing required block '{block}'.",
                        details={"missing_block": block},
                    )
                )

    # 4) IBD comms redundancy (minimal PACE)
    ibd_rules = constraints.get("ibd") or {}
    comms_rules = ibd_rules.get("communications") or {}
    critical_roles = comms_rules.get("critical_roles") or []
    required_interfaces = comms_rules.get("required_interfaces") or []
    cellular_only_tokens = comms_rules.get("forbidden_single_points_of_failure") or []

    if ibd_data is not None:
        critical_roles_present = [role for role in critical_roles if _contains_term(all_strings, role)]
        if critical_roles_present:
            missing_interfaces = [iface for iface in required_interfaces if not _contains_normalized(diagram_strings, iface)]
            if missing_interfaces:
                issues.append(
                    ValidationIssue(
                        criterion="correctness",
                        code="COMMS_NO_BACKUP_FOR_CRITICAL_ROLE",
                        severity=_issue_severity("COMMS_NO_BACKUP_FOR_CRITICAL_ROLE", constraints),
                        message="Critical SAR roles require redundant communications (PrimaryComms + BackupComms).",
                        details={"critical_roles_present": critical_roles_present, "missing_interfaces": missing_interfaces},
                    )
                )

            if any(_contains_normalized(diagram_strings, token) for token in cellular_only_tokens) and missing_interfaces:
                issues.append(
                    ValidationIssue(
                        criterion="correctness",
                        code="COMMS_NO_BACKUP_FOR_CRITICAL_ROLE",
                        severity=_issue_severity("COMMS_NO_BACKUP_FOR_CRITICAL_ROLE", constraints),
                        message="Cellular-only comms detected for critical roles without a backup channel.",
                        details={"critical_roles_present": critical_roles_present},
                    )
                )

    # 5) SMD mission phases and forbidden transitions (if SMD exists)
    smd_rules = constraints.get("smd") or {}
    required_phases = smd_rules.get("required_phases") or []
    forbidden_transitions = smd_rules.get("forbidden_transitions") or []

    smd_data = smd_data or []
    if smd_data:
        phase_found = set()
        for smd in smd_data:
            if not isinstance(smd, dict):
                continue
            nodes = _get_nodes(smd)
            edges = _get_edges(smd)
            node_name_by_id = {
                str(node.get("id")): str(node.get("name") or node.get("id") or "")
                for node in nodes
                if isinstance(node, dict) and node.get("id")
            }
            node_ids_by_phase: Dict[str, Set[str]] = {phase: set() for phase in required_phases}
            for node_id, node_name in node_name_by_id.items():
                for phase in required_phases:
                    if _contains_normalized([node_name], phase):
                        phase_found.add(phase)
                        node_ids_by_phase[phase].add(node_id)

            # Forbidden transitions (only when both ends exist)
            for rule in forbidden_transitions:
                if not isinstance(rule, dict):
                    continue
                from_phase = rule.get("from")
                to_phase = rule.get("to")
                condition = rule.get("condition")
                if not from_phase or not to_phase:
                    continue

                from_ids = node_ids_by_phase.get(from_phase) or set()
                to_ids = node_ids_by_phase.get(to_phase) or set()
                if not from_ids or not to_ids:
                    continue

                triage_missing = condition == "triage_missing" and "Triage" not in phase_found
                if condition == "triage_missing" and not triage_missing:
                    continue

                if any(
                    isinstance(edge, dict)
                    and str(edge.get("source")) in from_ids
                    and str(edge.get("target")) in to_ids
                    for edge in edges
                ):
                    issues.append(
                        ValidationIssue(
                            criterion="correctness",
                            code="FORBIDDEN_TRANSITION",
                            severity=_issue_severity("FORBIDDEN_TRANSITION", constraints),
                            message=f"Forbidden SMD transition detected: {from_phase} → {to_phase}.",
                            details={"from": from_phase, "to": to_phase, "condition": condition},
                        )
                    )

        missing_phases = [phase for phase in required_phases if phase not in phase_found]
        if missing_phases:
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="MISSING_MISSION_PHASE",
                    severity=_issue_severity("MISSING_MISSION_PHASE", constraints),
                    message="SMD is missing required SAR mission phases.",
                    details={"missing_phases": missing_phases},
                )
            )

    # 6) Asset typing rules
    assets = constraints.get("assets") or {}
    team_types = assets.get("team_types") or {}
    type_b = team_types.get("Type_B_Boat_Team") or {}
    type_d = team_types.get("Type_D_First_Responder") or {}

    type_b_present = _contains_normalized(all_strings, "Type_B_Boat_Team") or _contains_term(all_strings, "Boat Team")
    if type_b_present:
        required_components = type_b.get("required_components") or []
        nested_required = type_b.get("nested_required") or {}
        motorized_boat = required_components[0] if required_components else "MotorizedRescueBoat"

        motorized_present = _contains_normalized(diagram_strings, motorized_boat)
        motor_required = nested_required.get(motorized_boat, ["Motor"])
        motor_present = any(_contains_normalized(diagram_strings, component) for component in motor_required)
        if not motorized_present or not motor_present:
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="TYPE_B_NO_MOTOR",
                    severity=_issue_severity("TYPE_B_NO_MOTOR", constraints),
                    message="Type B Boat Team requires a MotorizedRescueBoat with a Motor.",
                )
            )

    type_d_present = _contains_normalized(all_strings, "Type_D_First_Responder") or _contains_normalized(all_strings, "First Responder")
    if type_d_present:
        prohibited_actions = type_d.get("prohibited_actions") or []
        prohibited_found = [action for action in prohibited_actions if _contains_normalized(all_strings, action)]
        if prohibited_found:
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="TYPE_D_IN_WATER_RESCUE",
                    severity=_issue_severity("TYPE_D_IN_WATER_RESCUE", constraints),
                    message="Type D First Responder must not perform in-water rescue actions.",
                    details={"prohibited_actions_present": prohibited_found},
                )
            )

    # 7) Drone safety: require ReturnToHome behavior if drone present
    drone_rules = assets.get("drone_rules") or {}
    drone_present = _contains_normalized(all_strings, "Drone") or _contains_normalized(all_strings, "UAV")
    if drone_present:
        required_behaviors = drone_rules.get("if_present_requires_behavior") or ["ReturnToHome"]
        missing_behaviors = [b for b in required_behaviors if not _contains_normalized(diagram_strings, b)]
        if missing_behaviors:
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="DRONE_NO_RTH",
                    severity=_issue_severity("DRONE_NO_RTH", constraints),
                    message="Drone present without required ReturnToHome (RTH) behavior.",
                    details={"missing_behaviors": missing_behaviors},
                )
            )

    counts = {
        "critical": sum(1 for issue in issues if issue.severity == "critical"),
        "warning": sum(1 for issue in issues if issue.severity == "warning"),
        "total": len(issues),
    }

    scores_1to5 = _score_by_criterion(issues)
    quality_score = _quality_score_from_scores(scores_1to5)
    recommendation = _recommendation_for_scores(
        issues=issues,
        scores=scores_1to5,
        quality_score=quality_score,
        counts=counts,
    )
    justifications: Dict[str, str] = {}
    for criterion in CRITERIA:
        criterion_issues = [issue.code for issue in issues if issue.criterion == criterion]
        if not criterion_issues:
            justifications[criterion] = "No issues detected."
        else:
            summary = ", ".join(sorted(set(criterion_issues))[:4])
            justifications[criterion] = f"Issues detected: {summary}."

    version = str(constraints.get("version") or "0.1")
    return ValidationReport(
        diagram_type=_diagram_type_from_stage(stage, bdd_diagram),
        domain=constraints.get("domain") or "Flood_Rescue_SAR",
        ruleset_version=version,
        constraints_version=version,
        sar_spec_version=version,
        mode=mode,
        stage=stage,  # type: ignore[arg-type]
        recommendation=recommendation,  # type: ignore[arg-type]
        issues=issues,
        counts=counts,
        scores_1to5=scores_1to5,
        justifications=justifications,
        quality_score=quality_score,
        quality_score_0to100=quality_score,
        evidence={"deterministic_checks": [issue.code for issue in issues], "llm_checks": []},
    )
