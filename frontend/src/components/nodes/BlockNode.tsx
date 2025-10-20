import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import { styled } from '@mui/material/styles';
import { Paper, Typography, Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import { AddCircleOutline, ChangeCircle } from '@mui/icons-material';
import { AdaptiveIbdIcon } from '../icons/AdaptiveIbdIcon';
import { nodeColors } from '../icons/nodeColors';
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

// New container that creates the hover area and prevents hover trap
const NodeContainer = styled(Box)({
  position: 'relative',
  display: 'inline-block',
  // KEY FIX: Creates an invisible hover area below the node
  paddingBottom: '48px',
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

const SMDIndicatorIcon = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  bottom: '5px',
  left: '10px',
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  padding: '4px',
  boxShadow: theme.shadows[2],
  zIndex: 999,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[4],
  },
  '&.add-smd': {
    display: 'none',
  },
  '&.view-smd': {
    display: 'flex',
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: theme.palette.secondary.main,
    '&:hover': {
      filter: 'brightness(0.85)',
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
  '&:hover .add-smd': {
    display: 'flex',
  },
});

// Define the BlockNode component
const BlockNode = ({ data, selected, id }: NodeProps) => {
  // Safe destructuring with fallbacks
  const { 
    label = 'Unnamed Block', 
    description = '', 
    properties = {} 
  } = data || {};
  const { openDiagrams, openIbdForBlock, openSmdForBlock, diagramsData, activeDiagramId } = useDiagramStore();
  
  // Check if this node has any incoming connections
  const edges = useStore((state) => state.edges);
  const hasIncomingConnections = edges.some((edge) => edge.target === id);
  
  // Check if there's already an IBD diagram for this block in the current diagram context
  const ibdId = activeDiagramId ? `ibd-for-${activeDiagramId}-${id}` : null;
  const activeDiagram = activeDiagramId ? openDiagrams.find(diagram => diagram.id === activeDiagramId) : undefined;
  const isBddContext = activeDiagram?.type === 'bdd' || activeDiagram?.type === 'bdd_enhanced';

  const ibdExistsManually = ibdId && (
    openDiagrams.some(diagram => 
      diagram.type === 'ibd' && 
      diagram.id === ibdId
    ) || !!diagramsData[ibdId]
  );
  
  // The key change: check for the new flag from the node's data prop
  const hasIbd = ibdExistsManually || data.has_ibd;

  const smdId = activeDiagramId ? `smd-for-${activeDiagramId}-${id}` : null;
  const hasSmd = smdId ? (
    openDiagrams.some(diagram => diagram.id === smdId || (diagram.type === 'smd' && diagram.parentBlockId === id && diagram.parentDiagramId === activeDiagramId)) ||
    !!diagramsData[smdId]
  ) : false;

  const [contextMenuAnchor, setContextMenuAnchor] = React.useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  
  const handleOpenIBD = async (e: React.MouseEvent) => {
    setContextMenuAnchor(null);
    console.log('🖱️ [BlockNode] IBD button clicked for block:', id);
    console.log('📊 [BlockNode] Current state - hasIbd:', hasIbd, 'has_ibd flag:', data.has_ibd, 'ibdExistsManually:', ibdExistsManually);
    
    e.stopPropagation();
    
    try {
      console.log('📞 [BlockNode] Calling openIbdForBlock...');
      await openIbdForBlock(id);
      console.log('✅ [BlockNode] openIbdForBlock completed successfully');
    } catch (error) {
      console.error('❌ [BlockNode] Error in openIbdForBlock:', error);
      console.error('❌ [BlockNode] Error stack:', error instanceof Error ? error.stack : 'No stack available');
      
      // Re-throw to let React error boundary handle it
      throw error;
    }
  };

  const handleOpenSMD = (e: React.MouseEvent) => {
    setContextMenuAnchor(null);
    e.stopPropagation();
    openSmdForBlock(id);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuAnchor(
      contextMenuAnchor === null
        ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenuAnchor(null);
  };

  const handleContextOpenSmd = () => {
    openSmdForBlock(id);
    handleCloseContextMenu();
  };
  
  return (
    <StyledNodeContainer onContextMenu={handleContextMenu}>
      <NodeWrapper>
        <BlockPaper
          elevation={selected ? 3 : 1}
          sx={{
            border: selected ? '2px solid #1976d2' : '1px solid #ccc',
          }}
        >
          {/* Output handle at the top */}
          <Handle
            type="source"
            position={Position.Top}
            style={{ background: '#555' }}
          />
          
          <BlockHeader>
            <BlockTitle variant="subtitle1">
              {label || 'Unnamed Block'}
            </BlockTitle>
          </BlockHeader>
          
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
          </BlockProperties>        )}        {/* Input handle at the bottom - positioned at the border */}        <div style={{ position: 'relative' }}>          {/* Нижня точка з'єднання - зміщена вниз для правильного позиціонування */}
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
          {hasIncomingConnections && (            <svg
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
          )}        </div>
        </BlockPaper>
      </NodeWrapper>
      
      {/* Smart IBD Indicator Icon - Now positioned as sibling to NodeWrapper */}
      {hasIbd ? (
        // State 1: IBD EXISTS. Icon is always visible.
        <Tooltip title="View Internal Block Diagram" placement="top">
          <IBDIndicatorIcon 
            className="view-ibd" 
            onClick={handleOpenIBD}
          >
            <AdaptiveIbdIcon color={nodeColors.block} size={16} />
          </IBDIndicatorIcon>
        </Tooltip>
      ) : (
        // State 2: IBD DOES NOT EXIST. Icon appears on hover.
        <Tooltip title="Create Internal Block Diagram" placement="top">
          <IBDIndicatorIcon 
            className="add-ibd" 
            onClick={handleOpenIBD}
          >
            <AddCircleOutline fontSize="small" />
          </IBDIndicatorIcon>
        </Tooltip>
      )}

      {isBddContext && (hasSmd ? (
        <Tooltip title="View State Machine Diagram" placement="top">
          <SMDIndicatorIcon
            className="view-smd"
            onClick={handleOpenSMD}
          >
            <ChangeCircle fontSize="small" />
          </SMDIndicatorIcon>
        </Tooltip>
      ) : (
        <Tooltip title="Create State Machine Diagram" placement="top">
          <SMDIndicatorIcon
            className="add-smd"
            onClick={handleOpenSMD}
          >
            <AddCircleOutline fontSize="small" />
          </SMDIndicatorIcon>
        </Tooltip>
      ))}

      <Menu
        open={contextMenuAnchor !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenuAnchor !== null
            ? { top: contextMenuAnchor.mouseY, left: contextMenuAnchor.mouseX }
            : undefined
        }
      >
      <MenuItem onClick={handleOpenIBD}>
        {hasIbd ? 'View IBD' : 'Create IBD'}
      </MenuItem>
        {hasSmd && isBddContext && (
          <MenuItem onClick={handleContextOpenSmd}>
            Open SMD
          </MenuItem>
        )}
      </Menu>
    </StyledNodeContainer>
  );
};

export default memo(BlockNode);
