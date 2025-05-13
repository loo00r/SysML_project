import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 260;

// Styled components for the sensor node
const SensorPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #ccc',
  backgroundColor: '#ffebee', // Light red background for sensors
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const SensorHeader = styled(Box)(({ theme }) => ({
  borderBottom: '1px solid #ccc',
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(1),
}));

const SensorTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
}));

const SensorDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
}));

const SensorProperties = styled(Box)(({ theme }) => ({
  fontSize: '12px',
  marginTop: theme.spacing(1),
  '& > div': {
    marginBottom: theme.spacing(0.5),
  },
}));

// Define the SensorNode component
const SensorNode = ({ data, selected, id }: NodeProps) => {
  const { label, description, properties = {} } = data;
    // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  return (
    <SensorPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #c62828' : '1px solid #ccc',
      }}
    >      {/* Output handle at the top */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      <SensorHeader>
        <SensorTitle variant="subtitle1">
          {label || 'Unnamed Sensor'}
        </SensorTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «sensor»
        </Typography>
      </SensorHeader>
      
      {description && (
        <SensorDescription variant="body2">
          {description}
        </SensorDescription>
      )}
      
      {Object.keys(properties).length > 0 && (
        <SensorProperties>
          {Object.entries(properties).map(([key, value]) => (
            <div key={key}>
              <Typography variant="caption" component="span" fontWeight="bold">
                {key}:
              </Typography>{' '}
              <Typography variant="caption" component="span">
                {String(value)}
              </Typography>
            </div>
          ))}
        </SensorProperties>      )}      {/* Input handle at the bottom */}
      <div style={{ position: 'relative', width: '100%', height: 10 }}>
        <Handle
          type="target"
          position={Position.Bottom}
          style={{ background: '#555' }}
        />
        {/* Triangle arrow indicator - only shown if the node has incoming connections */}
        {hasIncomingConnections && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{
            position: 'absolute', 
            left: '50%', 
            bottom: '-18px', // Moved further down to be completely outside
            transform: 'translateX(-50%)' 
          }}
        >
          <polygon points="7,0 14,14 0,14" fill="#555" />        </svg>
        )}
      </div>
      
      {/* Left handle for additional connections */}
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: '#555' }}
      />
      
      {/* Right handle for additional connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ background: '#555' }}
      />
    </SensorPaper>
  );
};

export default memo(SensorNode);
