from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Severity = Literal["critical", "warning"]
Recommendation = Literal["fail_fast", "refine", "pass"]
Stage = Literal["BDD", "IBD", "SMD", "UNIFIED"]
Criterion = Literal["completeness", "correctness", "standards", "understandability", "terminology"]


class ValidationIssue(BaseModel):
    criterion: Optional[Criterion] = None
    code: str
    severity: Severity
    message: str
    location: Optional[str] = None
    suggestion: Optional[str] = None
    path: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class ValidationReport(BaseModel):
    diagram_type: Optional[str] = None
    diagram_id: Optional[str] = None
    domain: str
    ruleset_version: str
    constraints_version: str
    sar_spec_version: str
    mode: Optional[str] = None
    stage: Stage = "UNIFIED"
    recommendation: Recommendation
    issues: List[ValidationIssue] = Field(default_factory=list)
    counts: Dict[str, int] = Field(default_factory=dict)
    scores_1to5: Dict[str, int] = Field(default_factory=dict)
    justifications: Dict[str, str] = Field(default_factory=dict)
    quality_score: int = 100
    quality_score_0to100: int = 100
    evidence: Dict[str, List[str]] = Field(default_factory=dict)
