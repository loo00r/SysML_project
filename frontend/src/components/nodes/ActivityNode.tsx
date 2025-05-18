import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 220;

// Styled components for the activity node
const ActivityPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '16px', // More rounded for activities
  border: '1px solid #ccc',
  backgroundColor: '#e8f5e9', // Light green background for activities
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const ActivityHeader = styled(Box)(({ theme }) => ({
  borderBottom: '1px solid #ccc',
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(1),
}));

const ActivityTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
}));

const ActivityDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
}));

// Define the ActivityNode component
const ActivityNode = ({ data, selected, id }: NodeProps) => {
  const { label, description } = data;
  
  // Check if this node has any incoming or outgoing connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  const hasOutgoingConnections = edges.some((edge) => edge.source === id);
  
  return (
    <ActivityPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      }}
    >
      {/* Input handle at the top */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      <ActivityHeader>
        <ActivityTitle variant="subtitle1">
          {label || 'Unnamed Activity'}
        </ActivityTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «activity»
        </Typography>
      </ActivityHeader>
      
      {description && (
        <ActivityDescription variant="body2">
          {description}
        </ActivityDescription>
      )}
      
      {/* Output handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
      
      {/* Arrow indicators for flow */}
      {hasIncomingConnections && (
        <div style={{ 
          position: 'absolute', 
          top: -10, 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '6px solid #555'
        }} />
      )}
      
      {hasOutgoingConnections && (
        <div style={{ 
          position: 'absolute', 
          bottom: -10, 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #555'
        }} />
      )}
    </ActivityPaper>
  );
};

export default memo(ActivityNode);
