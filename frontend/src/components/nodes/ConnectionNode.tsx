import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_CONNECTION_WIDTH = 100;

// Styled components for the connection node
const ConnectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(0.8),
  borderRadius: '50%',
  border: '2px solid #ff9800',
  backgroundColor: '#fff8e1',
  width: STANDARD_CONNECTION_WIDTH,
  height: STANDARD_CONNECTION_WIDTH,
  minWidth: STANDARD_CONNECTION_WIDTH,
  maxWidth: STANDARD_CONNECTION_WIDTH,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const ConnectionContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
});

const ConnectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '11px',
  color: '#f57c00',
  lineHeight: 1.2,
}));

const ConnectionType = styled(Typography)(({ theme }) => ({
  fontSize: '9px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.2),
}));

// Define the ConnectionNode component
const ConnectionNode = ({ data, selected, id }: NodeProps) => {
  const { label, type = 'connection', description } = data;
  
  return (
    <ConnectionPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #f57c00' : '2px solid #ff9800',
      }}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#f57c00', top: -6 }}
      />
      
      {/* Left handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#f57c00', left: -6 }}
      />
      
      <ConnectionContent>
        <ConnectionTitle variant="subtitle2">
          {label || 'Conn'}
        </ConnectionTitle>
        {description && (
          <ConnectionType variant="caption">
            {description}
          </ConnectionType>
        )}
      </ConnectionContent>
      
      {/* Right handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#f57c00', right: -6 }}
      />
      
      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#f57c00', bottom: -6 }}
      />
    </ConnectionPaper>
  );
};

export default memo(ConnectionNode);