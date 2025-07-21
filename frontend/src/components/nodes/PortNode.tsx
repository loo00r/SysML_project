import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_PORT_WIDTH = 120;

// Styled components for the port node
const PortPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  borderRadius: '4px',
  border: '2px solid #2196f3',
  backgroundColor: '#f3f9ff',
  width: STANDARD_PORT_WIDTH,
  minWidth: STANDARD_PORT_WIDTH,
  maxWidth: STANDARD_PORT_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const PortHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const PortTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '12px',
  textAlign: 'center',
  color: '#1976d2',
}));

const PortType = styled(Typography)(({ theme }) => ({
  fontSize: '10px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  textAlign: 'center',
}));

// Define the PortNode component
const PortNode = ({ data, selected, id }: NodeProps) => {
  // Safe destructuring with fallbacks
  const { 
    label = 'Unnamed Port', 
    type = 'port', 
    description = '' 
  } = data || {};
  
  return (
    <PortPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #1976d2' : '2px solid #2196f3',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#1976d2', left: -6 }}
      />
      
      <PortHeader>
        <PortTitle variant="subtitle2">
          {label || 'Port'}
        </PortTitle>
      </PortHeader>
      
      {description && (
        <PortType variant="caption">
          {description}
        </PortType>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#1976d2', right: -6 }}
      />
    </PortPaper>
  );
};

export default memo(PortNode);