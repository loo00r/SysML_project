import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, styled } from '@mui/material';

const Container = styled(Box)({
  position: 'relative',
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const Diamond = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  width: 26,
  height: 26,
  transform: 'rotate(45deg)',
  borderRadius: 6,
  border: `2px solid ${selected ? '#1976d2' : '#455a64'}`,
  backgroundColor: '#eceff1',
  boxShadow: selected
    ? '0 4px 12px rgba(25, 118, 210, 0.25)'
    : '0 2px 6px rgba(0, 0, 0, 0.18)',
}));

const handleStyle = {
  background: '#37474f',
  width: 10,
  height: 10,
};

const SmdChoiceNode: React.FC<NodeProps> = ({ selected }) => (
  <Container>
    <Handle type="target" position={Position.Top} style={handleStyle} />
    <Handle id="in-left" type="target" position={Position.Left} style={handleStyle} />
    <Handle type="source" position={Position.Right} style={handleStyle} />
    <Handle type="source" position={Position.Bottom} style={handleStyle} />
    <Diamond selected={selected} />
  </Container>
);

export default memo(SmdChoiceNode);
