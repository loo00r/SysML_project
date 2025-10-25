import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, styled } from '@mui/material';
import ArrowHeadOverlay from '../shared/ArrowHeadOverlay';
import useSmdInboundSides from '../../hooks/useSmdInboundSides';
import ValidationBadge from '../overlays/ValidationBadge';
import useDiagramStore from '../../store/diagramStore';

const Container = styled(Box)({
  position: 'relative',
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const OuterRing = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  width: 26,
  height: 26,
  borderRadius: '50%',
  border: '2px solid #37474f',
  backgroundColor: '#fafafa',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.25)',
  outline: selected ? '2px solid #64b5f6' : 'none',
  outlineOffset: 3,
}));

const InnerRing = styled(Box)({
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '2px solid #37474f',
  backgroundColor: '#eceff1',
});

const handleStyle = {
  background: '#37474f',
  width: 10,
  height: 10,
};

const SmdFinalNode: React.FC<NodeProps> = ({ selected, id }) => {
  const inboundSides = useSmdInboundSides(id);

  // Get validation results for this node
  const activeDiagramId = useDiagramStore(state => state.activeDiagramId);
  const getSmdValidationResults = useDiagramStore(state => state.getSmdValidationResults);
  const validationResults = activeDiagramId
    ? getSmdValidationResults(activeDiagramId).filter(r => r.kind === 'node' && r.id === id)
    : [];

  return (
    <Container>
    <Handle id="in-top" type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} />
      <Handle id="in-left" type="target" position={Position.Left} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <OuterRing selected={selected}>
        <InnerRing />
      </OuterRing>

      {inboundSides.map((side) => (
        <ArrowHeadOverlay key={side} side={side} offset={16} color="#37474f" size={12} />
      ))}

      {/* Validation Badge */}
      {validationResults.length > 0 && (
        <ValidationBadge results={validationResults} position="top-right" size={16} />
      )}
    </Container>
  );
};

export default memo(SmdFinalNode);
