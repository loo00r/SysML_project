import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 260;

// Styled components for the IBD node - with green styling
const IBDPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #4caf50', // Green border
  backgroundColor: '#e8f5e8', // Light green background for IBD blocks
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const IBDHeader = styled(Box)(({ theme }) => ({
  borderBottom: '1px solid #4caf50', // Green border
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(1),
}));

const IBDTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
  color: '#000000', // Black color for title, same as BDD blocks
}));

const IBDDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
}));

const IBDProperties = styled(Box)(({ theme }) => ({
  fontSize: '12px',
  marginTop: theme.spacing(1),
  '& > div': {
    marginBottom: theme.spacing(0.5),
  },
}));

// New container that creates the hover area and prevents hover trap
const NodeContainer = styled(Box)({
  position: 'relative',
  display: 'inline-block',
  // KEY FIX: Creates an invisible hover area below the node
  paddingBottom: '40px',
});

// Styled wrapper for the actual node content
const NodeWrapper = styled(Box)({
  position: 'relative',
  display: 'inline-block',
});

// No IBD functionality for IBD nodes - they can't create sub-IBDs
const StyledNodeContainer = styled(NodeContainer)({});

// Define the IBDNode component  
const IBDNode = ({ data, selected, id }: NodeProps) => {
  // Safe destructuring with fallbacks
  const { 
    label = 'Unnamed IBD Block', 
    description = '', 
    properties = {} 
  } = data || {};
  
  return (
    <StyledNodeContainer>
      <NodeWrapper>
        <IBDPaper
          elevation={selected ? 3 : 1}
          sx={{
            border: selected ? '2px solid #4caf50' : '1px solid #4caf50', // Green border for selection
          }}
        >
          {/* Left side handle - for inputs and outputs */}
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            style={{ background: '#4caf50' }}
          />
          
          {/* Right side handle - for inputs and outputs */}  
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            style={{ background: '#4caf50' }}
          />
          
          <IBDHeader>
            <IBDTitle variant="subtitle1">
              {label || 'Unnamed IBD Block'}
            </IBDTitle>
          </IBDHeader>
          
          {/* Description text */}
          {description && (
            <div style={{
              fontSize: '11px',
              fontStyle: 'italic',
              opacity: 0.8,
              marginTop: '4px',
              marginBottom: '8px',
              whiteSpace: 'pre-wrap',
              color: '#555',
            }}>
              {description}
            </div>
          )}
        
        {Object.keys(properties).length > 0 && (
          <IBDProperties>
            {Object.entries(properties)
              .filter(([key]) => key.toLowerCase() !== 'name')
              .map(([key, value]) => (
                <div key={key}>
                  <Typography variant="caption" component="span" fontWeight="bold">
                    {key}:
                  </Typography>{' '}
                  <Typography variant="caption" component="span">
                    {String(value)}
                  </Typography>
                </div>
              ))}
          </IBDProperties>        )}
        </IBDPaper>
      </NodeWrapper>
    </StyledNodeContainer>
  );
};

export default memo(IBDNode);