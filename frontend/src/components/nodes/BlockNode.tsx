import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

const STANDARD_NODE_WIDTH = 260;

// Styled components for the block node
const BlockPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #ccc',
  backgroundColor: '#e3f2fd', // Light blue background for blocks
  width: STANDARD_NODE_WIDTH,
  minWidth: STANDARD_NODE_WIDTH,
  maxWidth: STANDARD_NODE_WIDTH,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
}));

const BlockHeader = styled(Box)(({ theme }) => ({
  borderBottom: '1px solid #ccc',
  paddingBottom: theme.spacing(0.5),
  marginBottom: theme.spacing(1),
}));

const BlockTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '14px',
  textAlign: 'center',
}));

const BlockDescription = styled(Typography)(({ theme }) => ({
  fontSize: '12px',
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(0.5),
  wordBreak: 'break-word',
}));

const BlockProperties = styled(Box)(({ theme }) => ({
  fontSize: '12px',
  marginTop: theme.spacing(1),
  '& > div': {
    marginBottom: theme.spacing(0.5),
  },
}));

// Define the BlockNode component
const BlockNode = ({ data, selected, id }: NodeProps) => {
  const { label, description, properties = {} } = data;
    // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  return (
    <BlockPaper
      elevation={selected ? 3 : 1}
      sx={{
        border: selected ? '2px solid #1976d2' : '1px solid #ccc',
      }}
    >      {/* Output handle at the top */}
      <Handle
        type="source"
        position={Position.Top}
        style={{ background: '#555' }}
      />
        <BlockHeader>
        <BlockTitle variant="subtitle1">
          {label || 'Unnamed Block'}
        </BlockTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «block»
        </Typography>
      </BlockHeader>
      
      {Object.keys(properties).length > 0 && (
        <BlockProperties>
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
        </BlockProperties>      )}      {/* Input handle at the bottom - positioned at the border */}      <div style={{ position: 'relative' }}>        {/* Нижня точка з'єднання - зміщена вниз для правильного позиціонування */}
        <Handle
          type="target"
          position={Position.Bottom}
          style={{ 
            background: '#555',
            bottom: -10, // Розташування нижче границі блока
            top: 'auto'
          }}
        />
        {/* Triangle arrow indicator - only shown if the node has incoming connections */}
        {hasIncomingConnections && (          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{ 
              position: 'absolute', 
              left: '50%', 
              bottom: '-24px', // Розташування нижче під точкою з'єднання
              transform: 'translateX(-50%)' 
            }}
          >
            <polygon points="7,0 14,14 0,14" fill="#555" />
          </svg>
        )}      </div>
    </BlockPaper>
  );
};

export default memo(BlockNode);
