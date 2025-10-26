import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Paper, Typography, styled } from '@mui/material';
import { NodeData } from '../../store/diagramStore';
import ArrowHeadOverlay from '../shared/ArrowHeadOverlay';
import useSmdInboundSides from '../../hooks/useSmdInboundSides';
import ValidationBadge from '../overlays/ValidationBadge';
import useDiagramStore from '../../store/diagramStore';

const Container = styled(Box)({
  position: 'relative',
  minWidth: 140,
  maxWidth: 220,
  padding: '0px 0px 8px 0px',
});

const StateCard = styled(Paper)<{ selected?: boolean }>(({ selected, theme }) => ({
  padding: theme.spacing(1),
  borderRadius: 12,
  border: `2px solid ${selected ? theme.palette.primary.main : '#90a4ae'}`,
  backgroundColor: '#fafafa',
  boxShadow: selected ? '0 4px 14px rgba(25, 118, 210, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.12)',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
}));

const Section = styled(Box)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(0.5),
  paddingTop: theme.spacing(0.5),
}));

const handleStyle = {
  background: '#37474f',
  width: 10,
  height: 10,
};

const LabelTypography = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#263238',
  textAlign: 'center',
  marginBottom: theme.spacing(0.5),
}));

const MetaTypography = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  fontFamily: 'Roboto Mono, monospace',
  whiteSpace: 'pre-wrap',
}));

const SmdStateNode: React.FC<NodeProps<NodeData>> = ({ data, selected, id }) => {
  const name = data?.name || data?.label || 'State';
  const entry = data?.entry;
  const exit = data?.exit;
  const doActivity = data?.do;
  const inboundSides = useSmdInboundSides(id);

  // Get validation results for this node
  const activeDiagramId = useDiagramStore(state => state.activeDiagramId);
  const getSmdValidationResults = useDiagramStore(state => state.getSmdValidationResults);
  const validationResults = activeDiagramId
    ? getSmdValidationResults(activeDiagramId).filter(r => r.kind === 'node' && r.id === id)
    : [];

  const hasBehavior =
    (entry && entry.trim().length > 0) ||
    (exit && exit.trim().length > 0) ||
    (doActivity && doActivity.trim().length > 0);

  return (
    <Container>
      {/* State nodes expose LEFT/TOP targets and RIGHT/BOTTOM sources */}
      <Handle id="in-top" type="target" position={Position.Top} style={handleStyle} isConnectable />
      <Handle id="in-left" type="target" position={Position.Left} style={handleStyle} isConnectable />
      <Handle id="out-right" type="source" position={Position.Right} style={handleStyle} isConnectable />
      <Handle id="out-bottom" type="source" position={Position.Bottom} style={handleStyle} isConnectable />

      <StateCard elevation={selected ? 6 : 2} selected={selected}>
        <LabelTypography>{name}</LabelTypography>

        {hasBehavior && (
          <Section>
            {entry && entry.trim() !== '' && (
              <MetaTypography variant="body2">entry / {entry}</MetaTypography>
            )}
            {doActivity && doActivity.trim() !== '' && (
              <MetaTypography variant="body2">do / {doActivity}</MetaTypography>
            )}
            {exit && exit.trim() !== '' && (
              <MetaTypography variant="body2">exit / {exit}</MetaTypography>
            )}
          </Section>
        )}
      </StateCard>

      {inboundSides.map((side) => (
        <ArrowHeadOverlay key={side} side={side} offset={16} color="#37474f" size={12} />
      ))}

      {/* Validation Badge */}
      {validationResults.length > 0 && (
        <ValidationBadge results={validationResults} position="top-right" />
      )}
    </Container>
  );
};

export default memo(SmdStateNode);
