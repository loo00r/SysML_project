import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box } from '@mui/material';

// Styled components for the block node
const BlockPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '4px',
  border: '1px solid #ccc',
  backgroundColor: '#e3f2fd', // Light blue background for blocks
  minWidth: 150,
  maxWidth: 250,
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
const BlockNode = ({ data, selected }: NodeProps) => {
  const { label, description, properties = {} } = data;
  
  return (
    <BlockPaper
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
      
      <BlockHeader>
        <BlockTitle variant="subtitle1">
          {label || 'Unnamed Block'}
        </BlockTitle>
        <Typography variant="caption" display="block" textAlign="center">
          «block»
        </Typography>
      </BlockHeader>
      
      {description && (
        <BlockDescription variant="body2">
          {description}
        </BlockDescription>
      )}
      
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
        </BlockProperties>
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
    </BlockPaper>
  );
};

export default memo(BlockNode);
