import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

const STANDARD_NODE_WIDTH = 150;

// Styled components for the actor node
const ActorPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #ccc',
  backgroundColor: '#f5f5f5', // Light grey background for actors
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const ActorTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
  marginTop: theme.spacing(1),
}));

const ActorDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
  textAlign: 'center',
}));

const IconContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#e0e0e0',
  borderRadius: '50%',
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
}));

// Define the ActorNode component
const ActorNode = ({ data, selected }: NodeProps) => {
  const { label, description } = data;
  
  return (
    <ActorPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      }}
    >
      <IconContainer>
        <PersonIcon fontSize="large" />
      </IconContainer>
      
      <ActorTitle variant="subtitle1">
        {label || 'Unnamed Actor'}
      </ActorTitle>
      
      <Typography variant="caption" display="block" textAlign="center">
        «actor»
      </Typography>
      
      {description && (
        <ActorDescription variant="body2">
          {description}
        </ActorDescription>
      )}
      
      {/* Right handle for connections to use cases */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />
    </ActorPaper>
  );
};

export default memo(ActorNode);
