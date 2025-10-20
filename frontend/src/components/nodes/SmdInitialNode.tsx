import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, styled } from '@mui/material';

const Container = styled(Box)({
  position: 'relative',
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const InitialCore = styled(Box)<{ selected?: boolean }>(({ selected }) => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: '#111',
  border: '2px solid #111',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.35)',
  outline: selected ? '2px solid #64b5f6' : 'none',
  outlineOffset: 2,
}));

const handleStyle = {
  background: '#37474f',
  width: 10,
  height: 10,
};

const SmdInitialNode: React.FC<NodeProps> = ({ selected }) => (
  <Container>
    <Handle type="target" position={Position.Top} style={handleStyle} />
    <Handle type="source" position={Position.Right} style={handleStyle} />
    <Handle id="in-left" type="target" position={Position.Left} style={handleStyle} />
    <Handle type="source" position={Position.Bottom} style={handleStyle} />
    <InitialCore selected={selected} />
  </Container>
);

export default memo(SmdInitialNode);
