import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import useDiagramStore from '../store/diagramStore';
import type { SmdTransitionDraft } from '../utils/smdTransition';
import {
  ensureSmdTransitionData,
  composeSmdTransitionLabel,
} from '../utils/smdTransition';

const LABEL_PLACEHOLDER = 'event [guard] / action';

const PanelContainer = styled(Paper)(({ theme }) => ({
  width: 300,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRadius: 0,
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const PanelContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowY: 'auto',
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const SAVE_DEBOUNCE_MS = 150;

interface TransitionPanelProps {
  edgeId: string;
  onClose: () => void;
}

const TransitionPanel: React.FC<TransitionPanelProps> = ({ edgeId, onClose }) => {
  const { edges, updateSmdTransitionEdge } = useDiagramStore();
  const targetEdge = edges.find((edge) => edge.id === edgeId);

  const transitionData = useMemo(
    () => ensureSmdTransitionData(targetEdge?.data as SmdTransitionDraft),
    [targetEdge],
  );

  const [form, setForm] = useState<SmdTransitionDraft>(transitionData);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!targetEdge) {
      onClose();
    }
  }, [targetEdge, onClose]);

  useEffect(() => {
    if (targetEdge) {
      setForm(transitionData);
    }
  }, [targetEdge, transitionData]);

  useEffect(() => () => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
  }, []);

  const scheduleUpdate = useCallback((draft: SmdTransitionDraft) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      updateSmdTransitionEdge(edgeId, draft);
      debounceRef.current = null;
    }, SAVE_DEBOUNCE_MS);
  }, [edgeId, updateSmdTransitionEdge]);

  const commit = useCallback((draft: SmdTransitionDraft) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    updateSmdTransitionEdge(edgeId, draft);
  }, [edgeId, updateSmdTransitionEdge]);

  const handleChange = useCallback((field: keyof SmdTransitionDraft) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      scheduleUpdate(next);
      return next;
    });
  }, [scheduleUpdate]);

  const handleBlur = useCallback(() => {
    commit(form);
  }, [commit, form]);

  if (!targetEdge) {
    return null;
  }

  const preview = composeSmdTransitionLabel(form);

  return (
    <PanelContainer square elevation={3}>
      <PanelHeader>
        <Typography variant="subtitle1" fontWeight="bold">
          Transition
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="Close transition properties">
          <CloseIcon fontSize="small" />
        </IconButton>
      </PanelHeader>

      <PanelContent>
        <Box display="flex" flexDirection="column" gap={1}>
          <Typography variant="caption" color="text.secondary">
            Transition ID
          </Typography>
          <Typography variant="body2" style={{ wordBreak: 'break-all' }}>
            {edgeId}
          </Typography>
        </Box>

        <Divider />

        <TextField
          label="Event"
          placeholder="event"
          value={form.event ?? ''}
          onChange={handleChange('event')}
          onBlur={handleBlur}
          size="small"
          autoComplete="off"
        />

        <TextField
          label="Guard"
          placeholder="guard"
          value={form.guard ?? ''}
          onChange={handleChange('guard')}
          onBlur={handleBlur}
          size="small"
          autoComplete="off"
        />

        <TextField
          label="Action"
          placeholder="action"
          value={form.action ?? ''}
          onChange={handleChange('action')}
          onBlur={handleBlur}
          size="small"
          autoComplete="off"
        />

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary">
            Preview
          </Typography>
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              fontStyle: preview ? 'normal' : 'italic',
              color: preview ? 'text.primary' : 'text.disabled',
            }}
          >
            {preview || LABEL_PLACEHOLDER}
          </Typography>
        </Box>
      </PanelContent>
    </PanelContainer>
  );
};

export default TransitionPanel;
