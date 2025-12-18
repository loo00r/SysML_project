from __future__ import annotations

import json
from typing import Any, Dict, Optional

from app.core.config import settings


def _truncate_json(value: Any, max_chars: int = 6000) -> str:
    try:
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except TypeError:
        raw = json.dumps(str(value), ensure_ascii=False)
    if len(raw) <= max_chars:
        return raw
    return raw[:max_chars] + "…"


def llm_validate_sysml(
    *,
    text: str,
    domain_context: str,
    diagram: Dict[str, Any],
    deterministic_report: Optional[Dict[str, Any]] = None,
    model: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Minimal feature-flagged semantic validator (LLM3).

    - Returns None when disabled.
    - Returns a dict with `score_total`, `score_by_category`, and `issues` when enabled.
    """
    if not settings.VALIDATION_ENABLE_LLM:
        return None

    if not settings.OPENAI_API_KEY:
        return None

    validator_model = model or settings.OPENAI_VALIDATOR_MODEL or settings.OPENAI_GENERATIVE_MODEL

    try:
        from openai import OpenAI
    except Exception:
        return None

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    report_excerpt = _truncate_json(deterministic_report or {}, max_chars=2000)
    diagram_excerpt = _truncate_json(diagram, max_chars=6000)

    system_prompt = (
        "You are a strict SysML/SAR validation agent.\n"
        "Return ONLY one valid JSON object matching the required schema."
    )

    user_prompt = (
        "Evaluate the diagram quality (0-100) using these categories:\n"
        "- completeness\n"
        "- correctness\n"
        "- standards\n"
        "- terminology\n"
        "- understandability\n\n"
        "Output JSON schema:\n"
        "{\n"
        '  "score_total": 0-100,\n'
        '  "score_by_category": {\n'
        '    "completeness":0-100,\n'
        '    "correctness":0-100,\n'
        '    "standards":0-100,\n'
        '    "terminology":0-100,\n'
        '    "understandability":0-100\n'
        "  },\n"
        '  "issues": [ {"code": "...", "severity": "critical|warning", "message": "..."} ]\n'
        "}\n\n"
        f"DOMAIN CONTEXT:\n{domain_context}\n\n"
        f"USER REQUEST:\n{text[:1500]}\n\n"
        f"DETERMINISTIC REPORT (for reference):\n{report_excerpt}\n\n"
        f"DIAGRAM:\n{diagram_excerpt}\n"
    )

    try:
        response = client.chat.completions.create(
            model=validator_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
        content = response.choices[0].message.content
        parsed = json.loads(content or "{}")
        if not isinstance(parsed, dict):
            return None
        parsed["validator_model"] = validator_model
        return parsed
    except Exception:
        return None

