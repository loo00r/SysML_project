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
    - Returns a dict with 1-5 scores, justifications, issues, and recommendation when enabled.
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
        "Evaluate the diagram quality using the 5 ModRE criteria on a 1-5 ordinal scale:\n"
        "- completeness\n"
        "- correctness\n"
        "- standards\n"
        "- understandability\n"
        "- terminology\n\n"
        "Output JSON schema:\n"
        "{\n"
        '  "scores_1to5": {\n'
        '    "completeness": 1-5,\n'
        '    "correctness": 1-5,\n'
        '    "standards": 1-5,\n'
        '    "understandability": 1-5,\n'
        '    "terminology": 1-5\n'
        "  },\n"
        '  "quality_score_0to100": 0-100,\n'
        '  "justifications": {\n'
        '    "completeness": "...",\n'
        '    "correctness": "...",\n'
        '    "standards": "...",\n'
        '    "understandability": "...",\n'
        '    "terminology": "..."\n'
        "  },\n"
        '  "issues": [ {"criterion":"...", "code": "...", "severity": "critical|warning", "message": "..."} ],\n'
        '  "recommendation": "pass|refine|fail_fast"\n'
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
