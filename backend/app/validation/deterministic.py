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


def _node_display_name(node: Dict[str, Any]) -> str:
    name = node.get("name") or node.get("label") or ""
    return str(name)


def _node_id(node: Dict[str, Any]) -> str:
    return str(node.get("id") or "")


def _iter_nodes_with_location_bdd(bdd_diagram: Dict[str, Any]) -> Iterable[Tuple[str, str]]:
    for node in _get_nodes(bdd_diagram):
        if not isinstance(node, dict):
            continue
        node_id = _node_id(node)
        node_name = _node_display_name(node).strip()
        if node_id and node_name:
            yield f"bdd.elements.{node_id}", node_name


def _iter_nodes_with_location_sub(
    diagrams: Optional[List[Dict[str, Any]]],
    prefix: str,
) -> Iterable[Tuple[str, str]]:
    for diagram in diagrams or []:
        if not isinstance(diagram, dict):
            continue
        parent_block_id = str(diagram.get("parent_block_id") or "")
        location_prefix = f"{prefix}:{parent_block_id}" if parent_block_id else prefix
        for node in _get_nodes(diagram):
            if not isinstance(node, dict):
                continue
            node_id = _node_id(node)
            node_name = _node_display_name(node).strip()
            if node_id and node_name:
                yield f"{location_prefix}.nodes.{node_id}", node_name


def _name_matches_terms(name: str, terms: Sequence[str]) -> bool:
    if not name:
        return False
    for term in terms:
        if _contains_normalized([name], term) or _contains_term([name], term):
            return True
    return False


def _first_location_for_terms(
    *,
    terms: Sequence[str],
    bdd_diagram: Dict[str, Any],
    ibd_data: Optional[List[Dict[str, Any]]],
    smd_data: Optional[List[Dict[str, Any]]],
    prefer: Sequence[str] = ("bdd", "ibd", "smd"),
) -> Optional[str]:
    sources = {
        "bdd": _iter_nodes_with_location_bdd(bdd_diagram),
        "ibd": _iter_nodes_with_location_sub(ibd_data, "ibd"),
        "smd": _iter_nodes_with_location_sub(smd_data, "smd"),
    }
    for kind in prefer:
        for location, name in sources.get(kind, []):
            if _name_matches_terms(name, terms):
                return location
    return None


def _text_has_trigger(text: str, triggers: Sequence[str]) -> bool:
    if not text or not triggers:
        return False
    text_lower = text.lower()
    return any(trigger.lower() in text_lower for trigger in triggers if trigger)


def _extract_property_keys(diagram: Dict[str, Any]) -> Set[str]:
    keys: Set[str] = set()
    for node in _get_nodes(diagram):
        if not isinstance(node, dict):
            continue
        properties = node.get("properties")
        if isinstance(properties, dict):
            for key in properties.keys():
                if isinstance(key, str) and key:
                    keys.add(key.lower())
    return keys


def _collect_property_keys(
    bdd_diagram: Dict[str, Any],
    ibd_data: Optional[List[Dict[str, Any]]],
) -> Set[str]:
    keys = _extract_property_keys(bdd_diagram)
    for ibd in ibd_data or []:
        if isinstance(ibd, dict):
            keys.update(_extract_property_keys(ibd))
    return keys


def _edge_trigger_text(edge: Dict[str, Any]) -> str:
    parts = [
        edge.get("label"),
        edge.get("event"),
        edge.get("trigger"),
        edge.get("name"),
        edge.get("guard"),
        edge.get("action"),
    ]
    return " ".join(str(part) for part in parts if part)


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
            parent_block_id = str(ibd.get("parent_block_id") or "")
            ibd_prefix = f"ibd:{parent_block_id}" if parent_block_id else "ibd"
            nodes = ibd.get("nodes")
            if not isinstance(nodes, list) or not nodes:
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_IBD_STRUCTURE",
                        severity="critical",
                        message="IBD nodes are missing or not a list.",
                        location=f"{ibd_prefix}.nodes",
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
                            location=f"{ibd_prefix}.nodes",
                        )
                    )
                    break

    if stage in {"SMD", "UNIFIED"} and smd_data is not None:
        for smd in smd_data:
            if not isinstance(smd, dict):
                continue
            parent_block_id = str(smd.get("parent_block_id") or "")
            smd_prefix = f"smd:{parent_block_id}" if parent_block_id else "smd"
            nodes = smd.get("nodes")
            edges = smd.get("edges")
            if not isinstance(nodes, list) or not nodes:
                issues.append(
                    ValidationIssue(
                        criterion="standards",
                        code="INVALID_SMD_STRUCTURE",
                        severity="critical",
                        message="SMD nodes are missing or not a list.",
                        location=f"{smd_prefix}.nodes",
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
                        location=f"{smd_prefix}.edges",
                    )
                )
                break


def _add_understandability_issues(
    *,
    issues: List[ValidationIssue],
    node_locations: Sequence[Tuple[str, str]],
) -> None:
    generic_hits = []
    locations = []
    for location, name in node_locations:
        if GENERIC_NAME_PATTERN.match(name.strip()):
            generic_hits.append(name.strip())
            locations.append(location)
    if generic_hits:
        issues.append(
            ValidationIssue(
                criterion="understandability",
                code="GENERIC_NAMING",
                severity="warning",
                message="Generic naming reduces diagram clarity.",
                location=locations[0] if locations else None,
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
    node_locations = list(_iter_nodes_with_location_bdd(bdd_diagram))
    node_locations.extend(_iter_nodes_with_location_sub(ibd_data, "ibd"))
    node_locations.extend(_iter_nodes_with_location_sub(smd_data, "smd"))
    property_keys = _collect_property_keys(bdd_diagram, ibd_data)
    bdd_node_name_by_id = {
        str(node.get("id")): str(node.get("name") or "")
        for node in _get_nodes(bdd_diagram)
        if isinstance(node, dict) and node.get("id")
    }

    _add_standards_issues(
        issues=issues,
        stage=stage,
        bdd_diagram=bdd_diagram,
        ibd_data=ibd_data,
        smd_data=smd_data,
    )
    _add_understandability_issues(issues=issues, node_locations=node_locations)

    # 1) Terminology: synonyms warnings
    terminology = constraints.get("terminology") or {}
    synonyms = terminology.get("synonyms") or {}
    for synonym, canonical in synonyms.items():
        if _contains_term(all_strings, synonym):
            location = _first_location_for_terms(
                terms=[synonym],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=smd_data,
                prefer=("bdd", "ibd", "smd"),
            )
            issues.append(
                ValidationIssue(
                    criterion="terminology",
                    code="TERMINOLOGY_SYNONYM_USED",
                    severity=_issue_severity("TERMINOLOGY_SYNONYM_USED", constraints),
                    message=f"Synonym '{synonym}' used; prefer canonical term '{canonical}'.",
                    suggestion=canonical,
                    location=location,
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
        location = _first_location_for_terms(
            terms=sorted(found_ics_roles | found_gsb_roles),
            bdd_diagram=bdd_diagram,
            ibd_data=ibd_data,
            smd_data=smd_data,
            prefer=("bdd", "ibd", "smd"),
        )
        if not location:
            location = "bdd"
        issues.append(
            ValidationIssue(
                criterion="correctness",
                code="MODE_MIXED_ICS_GSB",
                severity=severity,
                message="ICS and GSB roles appear together; choose exactly one command mode.",
                suggestion="Set command_mode to 'ICS' or 'GSB'.",
                location=location,
                details={"ics_roles": sorted(found_ics_roles), "gsb_roles": sorted(found_gsb_roles)},
            )
        )

    if mode in mode_requirements:
        forbidden = mode_requirements.get(mode, {}).get("forbidden_roles", []) or []
        forbidden_found = [role for role in forbidden if _contains_term(all_strings, role)]
        if forbidden_found:
            location = _first_location_for_terms(
                terms=forbidden_found,
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=smd_data,
                prefer=("bdd", "ibd", "smd"),
            )
            if not location:
                location = "bdd"
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="MODE_MIXED_ICS_GSB",
                    severity=_issue_severity("MODE_MIXED_ICS_GSB", constraints),
                    message=f"Mode '{mode}' forbids roles present in the model.",
                    location=location,
                    details={"mode": mode, "forbidden_roles_present": forbidden_found},
                )
            )

    scaling_triggers = bdd_rules.get("scaling_triggers") or []
    scaling_indicators = bdd_rules.get("scaling_indicators") or []
    if _text_has_trigger(text, scaling_triggers) and scaling_indicators:
        if not any(_contains_normalized(diagram_strings, indicator) for indicator in scaling_indicators):
            location = _first_location_for_terms(
                terms=bdd_rules.get("scaling_anchor_terms") or ["CommandAndControl", "Incident Command"],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=smd_data,
                prefer=("bdd", "ibd", "smd"),
            )
            if not location:
                location = "bdd"
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="SCALING_NOT_MODELED",
                    severity=_issue_severity("SCALING_NOT_MODELED", constraints),
                    message="Dynamic scaling was requested but no scaling structure is modeled.",
                    location=location,
                    details={"expected_indicators": scaling_indicators},
                )
            )

    volunteer_triggers = bdd_rules.get("volunteer_triggers") or []
    volunteer_terms = bdd_rules.get("volunteer_terms") or []
    if _text_has_trigger(text, volunteer_triggers) and volunteer_terms:
        if not any(_contains_normalized(diagram_strings, term) for term in volunteer_terms):
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="VOLUNTEER_ROLE_MISSING",
                    severity=_issue_severity("VOLUNTEER_ROLE_MISSING", constraints),
                    message="Volunteer or shore-based response is mentioned but not modeled.",
                    location="bdd",
                    details={"expected_terms": volunteer_terms},
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
                        location="bdd",
                        details={"missing_block": block},
                    )
                )

    # 4) IBD comms redundancy (minimal PACE)
    ibd_rules = constraints.get("ibd") or {}
    comms_rules = ibd_rules.get("communications") or {}
    critical_roles = comms_rules.get("critical_roles") or []
    required_interfaces = comms_rules.get("required_interfaces") or []
    cellular_only_tokens = comms_rules.get("forbidden_single_points_of_failure") or []

    pace_triggers = comms_rules.get("pace_triggers") or []
    pace_indicators = comms_rules.get("pace_indicators") or []
    pace_levels = comms_rules.get("pace_levels") or []
    pace_interfaces = comms_rules.get("pace_interfaces") or []
    pace_triggered = _text_has_trigger(text, pace_triggers)
    pace_missing_levels: List[str] = []
    if not pace_triggered and pace_indicators:
        pace_triggered = any(indicator.lower() in " ".join(sorted(property_keys)) for indicator in pace_indicators)
    if not pace_triggered and pace_indicators:
        pace_triggered = any(_contains_normalized(diagram_strings, indicator) for indicator in pace_indicators)

    if pace_triggered and pace_levels:
        found_levels: Set[str] = set()
        for key in property_keys:
            if "primary" in key:
                found_levels.add("primary")
            if "alternate" in key:
                found_levels.add("alternate")
            if "contingency" in key:
                found_levels.add("contingency")
            if "emergency" in key:
                found_levels.add("emergency")
        for interface in pace_interfaces:
            if _contains_normalized(diagram_strings, interface):
                normalized = _normalize_token(interface)
                if "primary" in normalized:
                    found_levels.add("primary")
                if "alternate" in normalized:
                    found_levels.add("alternate")
                if "contingency" in normalized:
                    found_levels.add("contingency")
                if "emergency" in normalized:
                    found_levels.add("emergency")
        for level in pace_levels:
            if _contains_normalized(diagram_strings, level):
                found_levels.add(level.lower())

        missing_levels = [level for level in pace_levels if level.lower() not in found_levels]
        pace_missing_levels = missing_levels
        if missing_levels:
            location = _first_location_for_terms(
                terms=["CommunicationsSubsystem", "Communications", "Comms"],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=smd_data,
                prefer=("bdd", "ibd"),
            )
            if not location:
                location = "bdd"
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="PACE_LEVELS_MISSING",
                    severity=_issue_severity("PACE_LEVELS_MISSING", constraints),
                    message="PACE communications require Primary/Alternate/Contingency/Emergency levels.",
                    location=location,
                    details={"missing_levels": missing_levels},
                )
            )

    if ibd_data is not None:
        critical_roles_present = [role for role in critical_roles if _contains_term(all_strings, role)]
        if critical_roles_present:
            missing_interfaces = []
            for iface in required_interfaces:
                normalized_iface = _normalize_token(iface)
                in_strings = _contains_normalized(diagram_strings, iface)
                in_keys = any(normalized_iface in _normalize_token(key) for key in property_keys)
                if not in_strings and not in_keys:
                    missing_interfaces.append(iface)
            if missing_interfaces and pace_triggered and not pace_missing_levels:
                missing_interfaces = []
            if missing_interfaces:
                location = _first_location_for_terms(
                    terms=critical_roles_present,
                    bdd_diagram=bdd_diagram,
                    ibd_data=ibd_data,
                    smd_data=None,
                    prefer=("ibd", "bdd"),
                )
                issues.append(
                    ValidationIssue(
                        criterion="correctness",
                        code="COMMS_NO_BACKUP_FOR_CRITICAL_ROLE",
                        severity=_issue_severity("COMMS_NO_BACKUP_FOR_CRITICAL_ROLE", constraints),
                        message="Critical SAR roles require redundant communications (PrimaryComms + BackupComms).",
                        location=location,
                        details={"critical_roles_present": critical_roles_present, "missing_interfaces": missing_interfaces},
                    )
                )

            if any(_contains_normalized(diagram_strings, token) for token in cellular_only_tokens) and missing_interfaces:
                location = _first_location_for_terms(
                    terms=critical_roles_present,
                    bdd_diagram=bdd_diagram,
                    ibd_data=ibd_data,
                    smd_data=None,
                    prefer=("ibd", "bdd"),
                )
                issues.append(
                    ValidationIssue(
                        criterion="correctness",
                        code="COMMS_NO_BACKUP_FOR_CRITICAL_ROLE",
                        severity=_issue_severity("COMMS_NO_BACKUP_FOR_CRITICAL_ROLE", constraints),
                        message="Cellular-only comms detected for critical roles without a backup channel.",
                        location=location,
                        details={"critical_roles_present": critical_roles_present},
                    )
                )

    # 5) SMD mission phases and forbidden transitions (if SMD exists)
    smd_rules = constraints.get("smd") or {}
    required_phases = smd_rules.get("required_phases") or []
    forbidden_transitions = smd_rules.get("forbidden_transitions") or []
    search_assets_terms = smd_rules.get("search_assets_terms") or []
    rth_link_loss_triggers = smd_rules.get("rth_link_loss_triggers") or []
    rth_return_state_terms = smd_rules.get("rth_return_state_terms") or []
    buffering_triggers = smd_rules.get("buffering_required_triggers") or []
    buffering_state_terms = smd_rules.get("buffering_state_terms") or []
    fault_specific_triggers = smd_rules.get("fault_specific_triggers") or []

    smd_data = smd_data or []
    if smd_data:
        phase_found = set()
        for smd in smd_data:
            if not isinstance(smd, dict):
                continue
            parent_block_id = str(smd.get("parent_block_id") or "")
            parent_block_name = str(smd.get("parent_block_name") or bdd_node_name_by_id.get(parent_block_id) or "")
            smd_prefix = f"smd:{parent_block_id}" if parent_block_id else "smd"
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

                matched_edge = None
                for edge in edges:
                    if not isinstance(edge, dict):
                        continue
                    if str(edge.get("source")) in from_ids and str(edge.get("target")) in to_ids:
                        matched_edge = edge
                        break

                if matched_edge:
                    edge_id = matched_edge.get("id")
                    if edge_id:
                        location = f"{smd_prefix}.edges.{edge_id}"
                    else:
                        source = matched_edge.get("source")
                        target = matched_edge.get("target")
                        location = f"{smd_prefix}.edges.{source}->{target}" if source and target else smd_prefix
                    issues.append(
                        ValidationIssue(
                            criterion="correctness",
                            code="FORBIDDEN_TRANSITION",
                            severity=_issue_severity("FORBIDDEN_TRANSITION", constraints),
                            message=f"Forbidden SMD transition detected: {from_phase} → {to_phase}.",
                            location=location,
                            details={"from": from_phase, "to": to_phase, "condition": condition},
                        )
                    )

            is_search_assets = False
            if search_assets_terms:
                is_search_assets = _name_matches_terms(parent_block_name, search_assets_terms)
                if not is_search_assets:
                    is_search_assets = any(
                        _name_matches_terms(node_name, search_assets_terms) for node_name in node_name_by_id.values()
                    )

            if is_search_assets and rth_link_loss_triggers:
                rth_required = _contains_normalized(diagram_strings, "ReturnToHome") or _contains_normalized(
                    diagram_strings, "RTH"
                )
                if rth_required:
                    return_state_ids = {
                        node_id
                        for node_id, node_name in node_name_by_id.items()
                        if _name_matches_terms(node_name, rth_return_state_terms)
                    }
                    link_loss_triggered = False
                    for edge in edges:
                        if not isinstance(edge, dict):
                            continue
                        if str(edge.get("target")) not in return_state_ids:
                            continue
                        trigger_text = _edge_trigger_text(edge)
                        if _text_has_trigger(trigger_text, rth_link_loss_triggers):
                            link_loss_triggered = True
                            break

                    if return_state_ids and not link_loss_triggered:
                        issues.append(
                            ValidationIssue(
                                criterion="correctness",
                                code="RTH_LINK_LOSS_MISSING",
                                severity=_issue_severity("RTH_LINK_LOSS_MISSING", constraints),
                                message="Return-to-home capability requires a link-loss trigger to Returning state.",
                                location=smd_prefix,
                                details={"required_triggers": rth_link_loss_triggers},
                            )
                        )

            if is_search_assets and buffering_triggers and _text_has_trigger(text, buffering_triggers):
                buffering_present = any(
                    _name_matches_terms(node_name, buffering_state_terms)
                    for node_name in node_name_by_id.values()
                )
                if not buffering_present:
                    issues.append(
                        ValidationIssue(
                            criterion="understandability",
                            code="BUFFERING_BEHAVIOR_MISSING",
                            severity=_issue_severity("BUFFERING_BEHAVIOR_MISSING", constraints),
                            message="Intermittent comms require buffering/store-and-forward behavior in the SMD.",
                            location=smd_prefix,
                            details={"expected_terms": buffering_state_terms},
                        )
                    )

            if fault_specific_triggers:
                fault_state_ids = {
                    node_id
                    for node_id, node_name in node_name_by_id.items()
                    if _name_matches_terms(node_name, ["Fault", "Error"])
                }
                if fault_state_ids:
                    edges_to_fault = [
                        edge
                        for edge in edges
                        if isinstance(edge, dict) and str(edge.get("target")) in fault_state_ids
                    ]
                    has_specific_fault = False
                    for edge in edges_to_fault:
                        trigger_text = _edge_trigger_text(edge)
                        if _text_has_trigger(trigger_text, fault_specific_triggers):
                            has_specific_fault = True
                            break
                    if edges_to_fault and not has_specific_fault:
                        first_edge = edges_to_fault[0]
                        edge_id = first_edge.get("id")
                        location = f"{smd_prefix}.edges.{edge_id}" if edge_id else smd_prefix
                        issues.append(
                            ValidationIssue(
                                criterion="understandability",
                                code="FAULT_TAXONOMY_MISSING",
                                severity=_issue_severity("FAULT_TAXONOMY_MISSING", constraints),
                                message="Fault state should include specific fault triggers (e.g., battery_low, link_lost).",
                                location=location,
                                details={"observed_triggers": [_edge_trigger_text(edge) for edge in edges_to_fault]},
                            )
                        )

        missing_phases = [phase for phase in required_phases if phase not in phase_found]
        if missing_phases:
            location = None
            if smd_data:
                parent_block_id = str(smd_data[0].get("parent_block_id") or "")
                location = f"smd:{parent_block_id}" if parent_block_id else "smd"
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="MISSING_MISSION_PHASE",
                    severity=_issue_severity("MISSING_MISSION_PHASE", constraints),
                    message="SMD is missing required SAR mission phases.",
                    location=location,
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
            location = _first_location_for_terms(
                terms=["Type_B_Boat_Team", motorized_boat],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=None,
                prefer=("ibd", "bdd"),
            )
            issues.append(
                ValidationIssue(
                    criterion="completeness",
                    code="TYPE_B_NO_MOTOR",
                    severity=_issue_severity("TYPE_B_NO_MOTOR", constraints),
                    message="Type B Boat Team requires a MotorizedRescueBoat with a Motor.",
                    location=location,
                )
            )

    type_d_present = _contains_normalized(all_strings, "Type_D_First_Responder") or _contains_normalized(all_strings, "First Responder")
    if type_d_present:
        prohibited_actions = type_d.get("prohibited_actions") or []
        prohibited_found = [action for action in prohibited_actions if _contains_normalized(all_strings, action)]
        if prohibited_found:
            location = _first_location_for_terms(
                terms=["Type_D_First_Responder", "First Responder"],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=None,
                prefer=("ibd", "bdd"),
            )
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="TYPE_D_IN_WATER_RESCUE",
                    severity=_issue_severity("TYPE_D_IN_WATER_RESCUE", constraints),
                    message="Type D First Responder must not perform in-water rescue actions.",
                    location=location,
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
            location = _first_location_for_terms(
                terms=["Drone", "UAV"],
                bdd_diagram=bdd_diagram,
                ibd_data=ibd_data,
                smd_data=None,
                prefer=("ibd", "bdd", "smd"),
            )
            issues.append(
                ValidationIssue(
                    criterion="correctness",
                    code="DRONE_NO_RTH",
                    severity=_issue_severity("DRONE_NO_RTH", constraints),
                    message="Drone present without required ReturnToHome (RTH) behavior.",
                    location=location,
                    details={"missing_behaviors": missing_behaviors},
                )
            )

    if stage == "IBD" and ibd_data:
        parent_block_id = ""
        first_ibd = ibd_data[0] if isinstance(ibd_data, list) and ibd_data else None
        if isinstance(first_ibd, dict):
            parent_block_id = str(first_ibd.get("parent_block_id") or "")
        ibd_location = f"ibd:{parent_block_id}" if parent_block_id else "ibd"
        for issue in issues:
            if not issue.location:
                issue.location = ibd_location

    if stage == "SMD" and smd_data:
        parent_block_id = ""
        first_smd = smd_data[0] if isinstance(smd_data, list) and smd_data else None
        if isinstance(first_smd, dict):
            parent_block_id = str(first_smd.get("parent_block_id") or "")
        smd_location = f"smd:{parent_block_id}" if parent_block_id else "smd"
        for issue in issues:
            if not issue.location:
                issue.location = smd_location

    if stage == "BDD":
        for issue in issues:
            if not issue.location:
                issue.location = "bdd"

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
