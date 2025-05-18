import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 150;

// Styled components for the use case node
const UseCasePaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '50px', // Very rounded for use cases (elliptical shape)
  border: '1px solid #ccc',
  backgroundColor: '#fff8e1', // Light amber background for use cases
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const UseCaseTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
}));

const UseCaseDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
  textAlign: 'center',
}));

// Define the UseCaseNode component
const UseCaseNode = ({ data, selected }: NodeProps) => {
  const { label, description } = data;
  
  return (
    <UseCasePaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      }}
    >
      {/* Left handle for actor connections */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />
      
      <Box>
        <UseCaseTitle variant="subtitle1">
          {label || 'Unnamed Use Case'}
        </UseCaseTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «use case»
        </Typography>
      </Box>
      
      {description && (
        <UseCaseDescription variant="body2">
          {description}
        </UseCaseDescription>
      )}
      
      {/* Right handle for connections to other use cases */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
      
      {/* Bottom handle for include/extend relationships */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: '#555' }}
      />
      
      {/* Top handle for include/extend relationships */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: '#555' }}
      />
    </UseCasePaper>
  );
};

export default memo(UseCaseNode);
