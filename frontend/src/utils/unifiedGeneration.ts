export type GenerationStatus = 'processing' | 'completed' | 'error';

export type ValidationSeverity = 'critical' | 'warning' | 'info' | string;

export interface ValidationIssue {
  criterion?: string;
  code: string;
  severity: ValidationSeverity;
  message: string;
  location?: string;
  suggestion?: string;
  details?: unknown;
}

export interface ValidationCounts {
  critical?: number;
  warning?: number;
  total?: number;
}

export interface ValidationReport {
  recommendation?: 'pass' | 'refine' | 'fail_fast' | string;
  issues?: ValidationIssue[];
  counts?: ValidationCounts;
  stage?: string;
  mode?: string | null;
  scores_1to5?: Record<string, number>;
  justifications?: Record<string, string>;
  quality_score_0to100?: number;
}

export interface LlmValidationReport {
  scores_1to5?: Record<string, number>;
  quality_score_0to100?: number;
  justifications?: Record<string, string>;
  issues?: ValidationIssue[];
  recommendation?: string;
  validator_model?: string;
}

export interface GenerationEvent {
  ts: number;
  type: string;
  msg: string;
  [key: string]: unknown;
}

export interface ProgressDetail {
  stage?: string;
  current_step?: string;
  done?: number;
  total?: number;
}

export interface UnifiedGenerationPayload {
  status: GenerationStatus;
  stage?: string;
  message?: string;
  error?: string;
  domain?: string;
  command_mode?: string | null;
  progress?: string;
  progress_detail?: ProgressDetail;
  events?: GenerationEvent[];
  validation_report?: ValidationReport | Record<string, unknown>;
  quality_score?: number | null;
  quality_score_weighted?: number | null;
  llm_validation?: LlmValidationReport | Record<string, unknown>;
  llm_quality_score?: number | null;
  llm_validation_bdd?: LlmValidationReport | Record<string, unknown>;
  llm_quality_score_bdd?: number | null;
  llm_subdiagram_validation?: Record<string, LlmValidationReport | Record<string, unknown>>;
  subdiagram_validation?: Record<string, ValidationReport | Record<string, unknown>>;
  diagram?: unknown;
  ibd_data?: unknown[];
  smd_data?: unknown[];
}

export const normalizeEvents = (value: unknown): GenerationEvent[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((event) => ({
      ts: typeof event.ts === 'number' ? event.ts : 0,
      type: typeof event.type === 'string' ? event.type : 'EVENT',
      msg: typeof event.msg === 'string' ? event.msg : '',
      ...event,
    }))
    .filter((event) => Number.isFinite(event.ts));
};

export const normalizeIssues = (value: unknown): ValidationIssue[] => {
  const report = value as Record<string, unknown> | null;
  const issues = report && Array.isArray(report.issues) ? report.issues : [];
  return (issues as unknown[])
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((issue) => ({
      criterion: typeof issue.criterion === 'string' ? issue.criterion : undefined,
      code: typeof issue.code === 'string' ? issue.code : 'UNKNOWN',
      severity: typeof issue.severity === 'string' ? issue.severity : 'warning',
      message: typeof issue.message === 'string' ? issue.message : '',
      location: typeof issue.location === 'string' ? issue.location : undefined,
      suggestion: typeof issue.suggestion === 'string' ? issue.suggestion : undefined,
      details: issue.details,
    }))
    .filter((issue) => issue.message.length > 0 || issue.code !== 'UNKNOWN');
};

export const normalizeRecommendation = (value: unknown): string | undefined => {
  const report = value as Record<string, unknown> | null;
  if (!report) {
    return undefined;
  }
  const recommendation = report.recommendation;
  return typeof recommendation === 'string' && recommendation.length > 0 ? recommendation : undefined;
};

export const getCurrentStepLabel = (payload: UnifiedGenerationPayload | null): string | undefined => {
  if (!payload) {
    return undefined;
  }
  const detail = payload.progress_detail;
  if (detail && typeof detail.current_step === 'string' && detail.current_step.trim().length > 0) {
    return detail.current_step.trim();
  }
  if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message.trim();
  }
  if (typeof payload.stage === 'string' && payload.stage.trim().length > 0) {
    return payload.stage.trim();
  }
  return undefined;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const computeProgressPercent = (
  payload: UnifiedGenerationPayload | null,
  fallbackPercent?: number
): number => {
  const fallback = typeof fallbackPercent === 'number' ? fallbackPercent : 0;
  if (!payload) {
    return clamp(fallback, 0, 100);
  }

  if (payload.status === 'completed') {
    return 100;
  }
  if (payload.status === 'error') {
    return clamp(fallback, 0, 100);
  }

  const detail = payload.progress_detail;
  if (
    detail &&
    typeof detail.done === 'number' &&
    typeof detail.total === 'number' &&
    Number.isFinite(detail.done) &&
    Number.isFinite(detail.total) &&
    detail.total > 0
  ) {
    return clamp((detail.done / detail.total) * 100, 0, 99);
  }

  const stage = (payload.stage || detail?.stage || '').toUpperCase();
  const stageMap: Record<string, number> = {
    STARTED: 5,
    DETECTED: 10,
    BDD: 40,
    BDD_REFINING: 55,
    SUBDIAGRAMS: 75,
    FAILED_FAST: 95,
  };
  if (stage in stageMap) {
    return clamp(stageMap[stage], 0, 99);
  }

  return clamp(fallback, 0, 99);
};
