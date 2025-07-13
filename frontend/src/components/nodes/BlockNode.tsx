import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box, IconButton, Tooltip, Badge } from '@mui/material';
import { ZoomIn } from '@mui/icons-material';
import useDiagramStore from '../../store/diagramStore';

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
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
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
  const { openNewDiagramTab, openDiagrams } = useDiagramStore();
  
  // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  // Check if there's already an IBD diagram for this block
  const hasIBD = openDiagrams.some(diagram => 
    diagram.type === 'ibd' && 
    diagram.name.includes(`${label || 'Block'} - IBD`)
  );
  
  const handleOpenIBD = (e: React.MouseEvent) => {
    e.stopPropagation();
    openNewDiagramTab({
      name: `${label || 'Block'} - IBD`,
      type: 'ibd',
      nodes: [],
      edges: [],
      description: `Internal Block Diagram for ${label || 'Block'}`
    });
  };
  
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
        <BlockTitle variant="subtitle1" sx={{ flex: 1, textAlign: 'center' }}>
          {label || 'Unnamed Block'}
        </BlockTitle>
        <Tooltip title={hasIBD ? "IBD exists - Click to open" : "Open Internal Block Diagram"}>
          <Badge 
            variant="dot" 
            color="success" 
            invisible={!hasIBD}
            sx={{
              '& .MuiBadge-dot': {
                width: 8,
                height: 8,
                borderRadius: '50%',
              }
            }}
          >
            <IconButton 
              size="small" 
              onClick={handleOpenIBD}
              sx={{ 
                padding: '2px',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.1)'
                }
              }}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </Badge>
        </Tooltip>
      </BlockHeader>
      
      {Object.keys(properties).length > 0 && (
        <BlockProperties>
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
