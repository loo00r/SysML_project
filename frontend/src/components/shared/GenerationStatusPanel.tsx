import React from 'react';
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import {
  type UnifiedGenerationPayload,
  getCurrentStepLabel,
  normalizeEvents,
  normalizeIssues,
  normalizeRecommendation,
} from '../../utils/unifiedGeneration';

interface GenerationStatusPanelProps {
  payload: UnifiedGenerationPayload | null;
}

const scoreColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

const severityColor = (severity: string): 'error' | 'warning' | 'default' => {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'error') return 'error';
  if (s === 'warning') return 'warning';
  return 'default';
};

const formatTime = (seconds: number) => {
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString();
};

const GenerationStatusPanel: React.FC<GenerationStatusPanelProps> = ({ payload }) => {
  if (!payload) {
    return null;
  }

  const stage = payload.progress_detail?.stage || payload.stage || '';
  const currentStep = getCurrentStepLabel(payload);
  const events = normalizeEvents(payload.events).slice(-12).reverse();
  const recommendation = normalizeRecommendation(payload.validation_report);
  const issues = normalizeIssues(payload.validation_report);

  const weightedScore =
    typeof payload.quality_score_weighted === 'number' && Number.isFinite(payload.quality_score_weighted)
      ? payload.quality_score_weighted
      : null;
  const deterministicScore =
    typeof payload.quality_score === 'number' && Number.isFinite(payload.quality_score)
      ? payload.quality_score
      : null;
  const llmScore =
    typeof payload.llm_quality_score === 'number' && Number.isFinite(payload.llm_quality_score)
      ? payload.llm_quality_score
      : typeof payload.llm_quality_score_bdd === 'number' && Number.isFinite(payload.llm_quality_score_bdd)
      ? payload.llm_quality_score_bdd
      : null;
  const primaryScore = weightedScore ?? deterministicScore;

  const counts = payload.validation_report && typeof payload.validation_report === 'object'
    ? (payload.validation_report as Record<string, unknown>).counts as Record<string, unknown> | undefined
    : undefined;
  const criticalCount = typeof counts?.critical === 'number' ? counts?.critical : undefined;
  const warningCount = typeof counts?.warning === 'number' ? counts?.warning : undefined;

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 380,
        maxWidth: 'calc(100% - 32px)',
        maxHeight: 'calc(100% - 32px)',
        overflow: 'auto',
        p: 2,
        bgcolor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Generation
          </Typography>
          {stage ? <Chip size="small" label={stage} /> : null}
          <Chip size="small" label={payload.status} variant="outlined" />
          {payload.domain ? <Chip size="small" label={`domain: ${payload.domain}`} /> : null}
          {payload.command_mode ? <Chip size="small" label={`mode: ${payload.command_mode}`} /> : null}
        </Stack>

        {currentStep ? (
          <Typography variant="body2" color="text.secondary">
            {currentStep}
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {primaryScore !== null ? (
            <Chip
              size="small"
              color={scoreColor(primaryScore)}
              label={`${weightedScore !== null ? 'Score (hybrid)' : 'Score'}: ${primaryScore}/100`}
            />
          ) : (
            <Chip size="small" label="Score: —" variant="outlined" />
          )}
          {weightedScore !== null && deterministicScore !== null ? (
            <Chip size="small" variant="outlined" label={`Rules: ${deterministicScore}/100`} />
          ) : null}
          {weightedScore !== null && llmScore !== null ? (
            <Chip size="small" variant="outlined" label={`LLM: ${llmScore}/100`} />
          ) : null}
          {recommendation ? (
            <Chip size="small" label={`Recommendation: ${recommendation}`} />
          ) : null}
          {typeof criticalCount === 'number' ? (
            <Chip size="small" color="error" label={`Critical: ${criticalCount}`} />
          ) : null}
          {typeof warningCount === 'number' ? (
            <Chip size="small" color="warning" label={`Warnings: ${warningCount}`} />
          ) : null}
        </Stack>

        {issues.length > 0 ? (
          <>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Issues
            </Typography>
            <List dense disablePadding>
              {issues.slice(0, 8).map((issue, index) => (
                <ListItem key={`${issue.code}-${index}`} disableGutters sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Chip size="small" color={severityColor(issue.severity)} label={issue.severity} />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {issue.code}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {issue.message}
                        {issue.suggestion ? ` (suggestion: ${issue.suggestion})` : ''}
                        {issue.criterion ? ` • ${issue.criterion}` : ''}
                        {issue.location ? ` • ${issue.location}` : ''}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
              {issues.length > 8 ? (
                <Typography variant="caption" color="text.secondary">
                  +{issues.length - 8} more…
                </Typography>
              ) : null}
            </List>
          </>
        ) : null}

        {events.length > 0 ? (
          <>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Timeline
            </Typography>
            <List dense disablePadding>
              {events.map((event, index) => (
                <ListItem key={`${event.ts}-${event.type}-${index}`} disableGutters sx={{ py: 0.25 }}>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <Typography component="span" variant="caption" color="text.secondary">
                          {formatTime(event.ts)}{' '}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
                          {event.type}
                        </Typography>
                      </Typography>
                    }
                    secondary={
                      event.msg ? (
                        <Typography variant="caption" color="text.secondary">
                          {event.msg}
                        </Typography>
                      ) : null
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}
      </Stack>
    </Paper>
  );
};

export default GenerationStatusPanel;
