import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { AdaptiveIbdIcon } from '../icons/AdaptiveIbdIcon';
import { nodeColors } from '../icons/nodeColors';
import useDiagramStore from '../../store/diagramStore';

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

// Styled component for the IBD indicator icon
const IBDIndicatorIcon = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: '5px', // Adjusted position relative to the new container
  right: '10px', // Aligns the icon 10px from the right edge
  left: 'auto', // Unset old properties for clean override
  transform: 'none', // Unset old properties for clean override
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  padding: '4px',
  boxShadow: theme.shadows[2],
  zIndex: 1000,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[4],
  },
  // Base styles for ADD button: hidden by default
  '&.add-ibd': {
    display: 'none',
  },
  // Style for VIEW button: always visible
  '&.view-ibd': {
    display: 'flex',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: theme.palette.primary.main,
    '&:hover': {
      filter: 'brightness(0.8)',
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      boxShadow: theme.shadows[1],
    },
  },
}));

// THE CRITICAL CHANGE: The hover selector is now on the parent container
const StyledNodeContainer = styled(NodeContainer)({
  '&:hover .add-ibd': {
    display: 'flex',
  },
});

// Define the ProcessorNode component
const ProcessorNode = ({ data, selected, id }: NodeProps) => {
  const { label, description, properties = {} } = data;
  const { openDiagrams, setActiveDiagram, openIbdForBlock, diagramsData, activeDiagramId } = useDiagramStore();
  
  // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  // Check if there's already an IBD diagram for this processor in the current diagram context
  const ibdId = activeDiagramId ? `ibd-for-${activeDiagramId}-${id}` : null;
  const ibdExists = ibdId && (
    openDiagrams.some(diagram => 
      diagram.type === 'ibd' && 
      diagram.id === ibdId
    ) || !!diagramsData[ibdId]
  );
  
  const handleOpenIBD = (e: React.MouseEvent) => {
    e.stopPropagation();
    openIbdForBlock(id);
  };
  
  return (
    <StyledNodeContainer>
      <NodeWrapper>
        <ProcessorPaper
          elevation={selected ? 3 : 1}
          sx={{
            border: selected ? '2px solid #f57f17' : '1px solid #ccc',
          }}
        >
          {/* Output handle at the top */}
          <Handle
            type="source"
            position={Position.Top}
            style={{ background: '#555' }}
          />
          
          <ProcessorHeader>
            <ProcessorTitle variant="subtitle1">
              {label || 'Unnamed Processor'}
            </ProcessorTitle>
          </ProcessorHeader>
          
          {Object.keys(properties).length > 0 && (
            <ProcessorProperties>
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
            </ProcessorProperties>          )}          {/* Input handle at the bottom - positioned at the border */}          <div style={{ position: 'relative' }}>            {/* Нижня точка з'єднання - зміщена вниз для правильного позиціонування */}
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
            {hasIncomingConnections && (              <svg
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
            )}          </div>
        </ProcessorPaper>
      </NodeWrapper>
      
      {/* Smart IBD Indicator Icon - Now positioned as sibling to NodeWrapper */}
      {ibdExists ? (
        // State 1: IBD EXISTS. Icon is always visible.
        <IBDIndicatorIcon 
          className="view-ibd" 
          onClick={handleOpenIBD}
          title="View Internal Block Diagram"
        >
          <AdaptiveIbdIcon color={nodeColors.processor} size={16} />
        </IBDIndicatorIcon>
      ) : (
        // State 2: IBD DOES NOT EXIST. Icon appears on hover.
        <IBDIndicatorIcon 
          className="add-ibd" 
          onClick={handleOpenIBD}
          title="Create Internal Block Diagram"
        >
          <AddCircleOutline fontSize="small" />
        </IBDIndicatorIcon>
      )}
    </StyledNodeContainer>
  );
};

export default memo(ProcessorNode);
