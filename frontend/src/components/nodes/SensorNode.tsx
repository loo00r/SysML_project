import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box, IconButton } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { AdaptiveIbdIcon } from '../icons/AdaptiveIbdIcon';
import { nodeColors } from '../icons/nodeColors';
import useDiagramStore from '../../store/diagramStore';

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

// Define the SensorNode component
const SensorNode = ({ data, selected, id }: NodeProps) => {
  // Safe destructuring with fallbacks
  const { 
    label = 'Unnamed Sensor', 
    description = '', 
    properties = {} 
  } = data || {};
  const { openDiagrams, setActiveDiagram, openIbdForBlock, diagramsData, activeDiagramId } = useDiagramStore();
  
  // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  // Check if there's already an IBD diagram for this sensor in the current diagram context
  const ibdId = activeDiagramId ? `ibd-for-${activeDiagramId}-${id}` : null;
  const ibdExistsManually = ibdId && (
    openDiagrams.some(diagram => 
      diagram.type === 'ibd' && 
      diagram.id === ibdId
    ) || !!diagramsData[ibdId]
  );
  
  // The key change: check for the new flag from the node's data prop
  const hasIbd = ibdExistsManually || data.has_ibd;
  
  const handleOpenIBD = async (e: React.MouseEvent) => {
    console.log('🖱️ [SensorNode] IBD button clicked for sensor:', id);
    console.log('📊 [SensorNode] Current state - hasIbd:', hasIbd, 'has_ibd flag:', data.has_ibd, 'ibdExistsManually:', ibdExistsManually);
    
    e.stopPropagation();
    
    try {
      console.log('📞 [SensorNode] Calling openIbdForBlock...');
      await openIbdForBlock(id);
      console.log('✅ [SensorNode] openIbdForBlock completed successfully');
    } catch (error) {
      console.error('❌ [SensorNode] Error in openIbdForBlock:', error);
      console.error('❌ [SensorNode] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      // Re-throw to let React error boundary handle it
      throw error;
    }
  };
  
  return (
    <StyledNodeContainer>
      <NodeWrapper>
        <SensorPaper
          elevation={selected ? 3 : 1}
          sx={{
            border: selected ? '2px solid #c62828' : '1px solid #ccc',
          }}
        >
          {/* Output handle at the top */}
          <Handle
            type="source"
            position={Position.Top}
            style={{ background: '#555' }}
          />
          
          <SensorHeader>
            <SensorTitle variant="subtitle1">
              {label || 'Unnamed Sensor'}
            </SensorTitle>
          </SensorHeader>
          
          {Object.keys(properties).length > 0 && (
            <SensorProperties>
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
            </SensorProperties>          )}          {/* Input handle at the bottom - positioned at the border */}          <div style={{ position: 'relative' }}>            {/* Нижня точка з'єднання - зміщена вниз для правильного позиціонування */}
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
        </SensorPaper>
      </NodeWrapper>
      
      {/* Smart IBD Indicator Icon - Now positioned as sibling to NodeWrapper */}
      {hasIbd ? (
        // State 1: IBD EXISTS. Icon is always visible.
        <IBDIndicatorIcon 
          className="view-ibd" 
          onClick={handleOpenIBD}
          title="View Internal Block Diagram"
        >
          <AdaptiveIbdIcon color={nodeColors.sensor} size={16} />
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

export default memo(SensorNode);
