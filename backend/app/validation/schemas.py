from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["critical", "warning"]
Recommendation = Literal["fail_fast", "refine", "pass"]


class ValidationIssue(BaseModel):
    code: str
    severity: Severity
    message: str
    suggestion: Optional[str] = None
    path: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class ValidationReport(BaseModel):
    domain: str
    ruleset_version: str
    mode: Optional[str] = None
    recommendation: Recommendation
    issues: List[ValidationIssue] = Field(default_factory=list)
    counts: Dict[str, int] = Field(default_factory=dict)
    quality_score: int = 100

