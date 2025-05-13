import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 260;

// Styled components for the processor node
const ProcessorPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #ccc',
  backgroundColor: '#fff8e1', // Light yellow background for processors
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const ProcessorHeader = styled(Box)(({ theme }) => ({
  borderBottom: '1px solid #ccc',
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(1),
}));

const ProcessorTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
}));

const ProcessorDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
}));

const ProcessorProperties = styled(Box)(({ theme }) => ({
  fontSize: '12px',
  marginTop: theme.spacing(1),
  '& > div': {
    marginBottom: theme.spacing(0.5),
  },
}));

// Define the ProcessorNode component
const ProcessorNode = ({ data, selected }: NodeProps) => {
  const { label, description, properties = {} } = data;
  
  return (
    <ProcessorPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #f57f17' : '1px solid #ccc',
      }}
    >
      {/* Input handle at the top */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      <ProcessorHeader>
        <ProcessorTitle variant="subtitle1">
          {label || 'Unnamed Processor'}
        </ProcessorTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «processor»
        </Typography>
      </ProcessorHeader>
      
      {description && (
        <ProcessorDescription variant="body2">
          {description}
        </ProcessorDescription>
      )}
      
      {Object.keys(properties).length > 0 && (
        <ProcessorProperties>
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
        </ProcessorProperties>
      )}
      
      {/* Output handle at the bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
      
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
    </ProcessorPaper>
  );
};

export default memo(ProcessorNode);
