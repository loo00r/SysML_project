from __future__ import annotations

import json
from typing import Any, Dict

from app.validation.schemas import ValidationReport


def build_refinement_prompt(
    *,
    original_text: str,
    diagram_json: Dict[str, Any],
    validation_report: ValidationReport,
    diagram_kind: str,
) -> str:
    issues = validation_report.issues or []
    issues_str = "\n".join(
        [f"- [{issue.severity.upper()}] {issue.code}: {issue.message}" for issue in issues[:25]]
    )

    previous_diagram = json.dumps(diagram_json, ensure_ascii=False)
    if len(previous_diagram) > 6000:
        previous_diagram = previous_diagram[:6000] + "…"

    original_excerpt = (original_text or "").strip()
    if len(original_excerpt) > 1500:
        original_excerpt = original_excerpt[:1500] + "…"

    return (
        f"Regenerate a corrected SysML {diagram_kind.upper()} diagram in JSON.\n\n"
        f"Original user request:\n{original_excerpt}\n\n"
        "Validation issues to fix (do not ignore):\n"
        f"{issues_str}\n\n"
        "Previous diagram (has issues):\n"
        f"{previous_diagram}\n\n"
        "Return ONLY one valid JSON object of the requested diagram type."
    )

