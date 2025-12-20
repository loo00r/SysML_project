from __future__ import annotations

import json
from typing import Any, Dict, List, Mapping


def _safe_event_list(value: Any) -> List[Dict[str, Any]]:
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    return []


def _dedupe_events(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []
    for event in events:
        try:
            key = json.dumps(event, sort_keys=True, default=str)
        except TypeError:
            key = str(event)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(event)
    return deduped


def merge_payload(existing: Mapping[str, Any], payload: Mapping[str, Any]) -> Dict[str, Any]:
    """
    Shallow-merge payloads with stable `events` accumulation and a small deep-merge
    for `subdiagram_validation`.
    """
    existing_dict = dict(existing or {})
    payload_dict = dict(payload or {})

    existing_events = _safe_event_list(existing_dict.get("events"))
    payload_events = _safe_event_list(payload_dict.get("events"))
    merged_events = _dedupe_events(existing_events + payload_events)

    merged_payload: Dict[str, Any] = {**existing_dict, **payload_dict, "events": merged_events}

    validation_report = merged_payload.get("validation_report")
    if validation_report is None or not isinstance(validation_report, dict):
        merged_payload["validation_report"] = {}

    existing_sub = existing_dict.get("subdiagram_validation")
    payload_sub = payload_dict.get("subdiagram_validation")
    if isinstance(existing_sub, dict) or isinstance(payload_sub, dict):
        merged_sub: Dict[str, Any] = {}
        if isinstance(existing_sub, dict):
            merged_sub.update(existing_sub)
        if isinstance(payload_sub, dict):
            merged_sub.update(payload_sub)
        merged_payload["subdiagram_validation"] = merged_sub

    existing_llm_sub = existing_dict.get("llm_subdiagram_validation")
    payload_llm_sub = payload_dict.get("llm_subdiagram_validation")
    if isinstance(existing_llm_sub, dict) or isinstance(payload_llm_sub, dict):
        merged_llm_sub: Dict[str, Any] = {}
        if isinstance(existing_llm_sub, dict):
            merged_llm_sub.update(existing_llm_sub)
        if isinstance(payload_llm_sub, dict):
            merged_llm_sub.update(payload_llm_sub)
        merged_payload["llm_subdiagram_validation"] = merged_llm_sub

    return merged_payload
