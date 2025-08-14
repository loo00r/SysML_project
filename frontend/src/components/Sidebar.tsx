import React from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import SensorsIcon from '@mui/icons-material/Sensors';
import MemoryIcon from '@mui/icons-material/Memory';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import DataObjectIcon from '@mui/icons-material/DataObject';

import useDiagramStore from '../store/diagramStore';

// Styled components
const SidebarContainer = styled(Box)(({ theme }) => ({
  width: 250,
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  height: '100%',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const DraggableItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'grab',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    boxShadow: theme.shadows[2],
  },
  '&:active': {
    cursor: 'grabbing',
  },
}));

const LockedItem = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  cursor: 'not-allowed',
  opacity: 0.5,
  backgroundColor: theme.palette.action.disabledBackground,
  '& .MuiSvgIcon-root': {
    color: theme.palette.action.disabled,
  },
  '& .MuiTypography-root': {
    color: theme.palette.action.disabled,
  },
}));

interface ColorIndicatorProps {
  bgcolor: string;
}

const ColorIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bgcolor',
})<ColorIndicatorProps>(({ theme, bgcolor }) => ({
  width: 16,
  height: 16,
  backgroundColor: bgcolor,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 2,
}));

const Sidebar: React.FC = () => {
  // Subscribe directly to the active diagram's type to ensure re-rendering on state changes
  const activeDiagramType = useDiagramStore((state) => {
    const activeDiagram = state.openDiagrams.find(d => d.id === state.activeDiagramId);
    return activeDiagram?.type;
  });
  
  const version = import.meta.env.VITE_APP_VERSION || '1.0';

  // Handle drag start for creating new nodes
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string, nodeData: any) => {
    // Set the drag data with node type and initial data
    const dragData = {
      type: nodeType,
      data: {
        ...nodeData,
        type: nodeType, // Ensure type is included in data
        label: nodeData.label || 'New ' + nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
      },
    };
    
    console.log('Setting drag data:', dragData);
    
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify(dragData)
    );
    event.dataTransfer.effectAllowed = 'move';
  };

  // Render the node palette for block diagrams
  const renderNodePalette = () => {
    // Check if IBD block should be locked (when diagram type is BDD or BDD Enhanced)
    const isIBDLocked = activeDiagramType === 'bdd' || activeDiagramType === 'bdd_enhanced';
    // Check if BDD elements should be locked (when diagram type is IBD)
    const areBDDElementsLocked = activeDiagramType === 'ibd';
    
    return (
      <>
        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
          Block Diagram Elements
        </Typography>
        <List disablePadding>
          <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
            <Tooltip title={areBDDElementsLocked ? "System Block - Not available in Internal Block Diagrams" : "System Block - Main component with inputs and outputs"} placement="right">
              {areBDDElementsLocked ? (
                <LockedItem>
                  <ColorIndicator bgcolor="#e3f2fd" />
                  <DeviceHubIcon fontSize="small" />
                  <Typography variant="body2">System Block</Typography>
                </LockedItem>
              ) : (
                <DraggableItem
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, 'block', {
                      type: 'block',
                      label: 'System Block',
                      description: 'Main system component with inputs and outputs',
                    })
                  }
                >
                  <ColorIndicator bgcolor="#e3f2fd" />
                  <DeviceHubIcon fontSize="small" color="primary" />
                  <Typography variant="body2">System Block</Typography>
                </DraggableItem>
              )}
            </Tooltip>
          </ListItem>

          <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
            <Tooltip title={areBDDElementsLocked ? "Sensor - Not available in Internal Block Diagrams" : "Sensor - Data collection component"} placement="right">
              {areBDDElementsLocked ? (
                <LockedItem>
                  <ColorIndicator bgcolor="#ffebee" />
                  <SensorsIcon fontSize="small" />
                  <Typography variant="body2">Sensor</Typography>
                </LockedItem>
              ) : (
                <DraggableItem
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, 'sensor', {
                      type: 'sensor',
                      label: 'Sensor',
                      description: 'Component that collects data from the environment',
                    })
                  }
                >
                  <ColorIndicator bgcolor="#ffebee" />
                  <SensorsIcon fontSize="small" color="error" />
                  <Typography variant="body2">Sensor</Typography>
                </DraggableItem>
              )}
            </Tooltip>
          </ListItem>

          <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
            <Tooltip title={areBDDElementsLocked ? "Processor - Not available in Internal Block Diagrams" : "Processor - Data processing component"} placement="right">
              {areBDDElementsLocked ? (
                <LockedItem>
                  <ColorIndicator bgcolor="#fff8e1" />
                  <MemoryIcon fontSize="small" />
                  <Typography variant="body2">Processor</Typography>
                </LockedItem>
              ) : (
                <DraggableItem
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, 'processor', {
                      type: 'processor',
                      label: 'Processor',
                      description: 'Component that processes data',
                    })
                  }
                >
                  <ColorIndicator bgcolor="#fff8e1" />
                  <MemoryIcon fontSize="small" color="warning" />
                  <Typography variant="body2">Processor</Typography>
                </DraggableItem>
              )}
            </Tooltip>
          </ListItem>

          <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
            <Tooltip title={isIBDLocked ? "IBD Block - Not available in Block Definition Diagrams" : "IBD Block - Internal Block Diagram component"} placement="right">
              {isIBDLocked ? (
                <LockedItem>
                  <ColorIndicator bgcolor="#e8f5e8" />
                  <DataObjectIcon fontSize="small" />
                  <Typography variant="body2">IBD Block</Typography>
                </LockedItem>
              ) : (
                <DraggableItem
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, 'ibd', {
                      type: 'ibd',
                      label: 'IBD Block',
                      description: 'Internal Block Diagram component',
                    })
                  }
                >
                  <ColorIndicator bgcolor="#e8f5e8" />
                  <DataObjectIcon fontSize="small" sx={{ color: '#4caf50' }} />
                  <Typography variant="body2">IBD Block</Typography>
                </DraggableItem>
              )}
            </Tooltip>
          </ListItem>
        </List>
      </>
    );
  };

  return (
    <SidebarContainer>
      <SidebarHeader>
        <Typography variant="h6" fontWeight="bold">
          SysML Modeling Tool
        </Typography>
        <Typography variant="caption" color="text.secondary">
          AI-Powered Diagram Generator
        </Typography>
      </SidebarHeader>

      <Box sx={{ p: 2 }}>
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="medium">Diagram Elements</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderNodePalette()}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Drag elements onto the canvas to create your diagram. Connect nodes by dragging from one handle to another.
            </Typography>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="medium">Diagram Types</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              This tool supports the following diagram types:
            </Typography>
            <List dense disablePadding>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DeviceHubIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Block Definition Diagram (BDD)" secondary="Structure and components" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DataObjectIcon fontSize="small" sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText primary="Internal Block Diagram (IBD)" secondary="Shows internal structure of a block" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="medium">Help</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              <strong>Quick Tips:</strong>
            </Typography>
            <List dense disablePadding>
              <ListItem>
                <ListItemText primary="Drag elements from the sidebar to the canvas" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Connect nodes by dragging from one handle to another" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Use the AI generator to create diagrams from text descriptions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Click on a node to edit its properties" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Use 'Delete' key to remove selected elements" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          SysML AI Modeling Tool v{version}
        </Typography>
      </Box>
    </SidebarContainer>
  );
};

export default Sidebar;