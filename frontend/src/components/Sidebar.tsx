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
  const { diagramType } = useDiagramStore();

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

  // Get the appropriate node palette based on diagram type
  const renderNodePalette = () => {
    switch (diagramType) {
      case 'block':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              Block Diagram Elements
            </Typography>
            <List disablePadding>
              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="System Block - Main component with inputs and outputs" placement="right">
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
                </Tooltip>
              </ListItem>

              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Sensor - Data collection component" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'sensor', {
                        type: 'sensor',
                        label: 'Sensor',
                        description: 'Data collection component',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#ffebee" />
                    <SensorsIcon fontSize="small" color="error" />
                    <Typography variant="body2">Sensor</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>

              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Processor - Data processing unit" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'processor', {
                        type: 'processor',
                        label: 'Processor',
                        description: 'Data processing unit',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#fff8e1" />
                    <MemoryIcon fontSize="small" color="warning" />
                    <Typography variant="body2">Processor</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>
            </List>
          </>
        );

      case 'activity':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              Activity Diagram Elements
            </Typography>
            <List disablePadding>
              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Activity - Process or action" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'activity', {
                        type: 'activity',
                        label: 'Activity',
                        description: 'Process or action',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#e8f5e9" />
                    <AccountTreeIcon fontSize="small" color="success" />
                    <Typography variant="body2">Activity</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>
            </List>
          </>
        );

      case 'requirement':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              Requirement Diagram Elements
            </Typography>
            <List disablePadding>
              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Requirement - System requirement" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'requirement', {
                        type: 'requirement',
                        label: 'Requirement',
                        description: 'System requirement',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#e0f7fa" />
                    <AssignmentIcon fontSize="small" color="info" />
                    <Typography variant="body2">Requirement</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>
            </List>
          </>
        );

      case 'use_case':
        return (
          <>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
              Use Case Diagram Elements
            </Typography>
            <List disablePadding>
              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Use Case - System functionality" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'useCase', {
                        type: 'useCase',
                        label: 'Use Case',
                        description: 'System functionality',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#f3e5f5" />
                    <AccountTreeIcon fontSize="small" color="secondary" />
                    <Typography variant="body2">Use Case</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>

              <ListItem disablePadding sx={{ display: 'block', mb: 1 }}>
                <Tooltip title="Actor - External entity interacting with the system" placement="right">
                  <DraggableItem
                    draggable
                    onDragStart={(e) =>
                      onDragStart(e, 'actor', {
                        type: 'actor',
                        label: 'Actor',
                        description: 'External entity interacting with the system',
                      })
                    }
                  >
                    <ColorIndicator bgcolor="#fce4ec" />
                    <PersonIcon fontSize="small" />
                    <Typography variant="body2">Actor</Typography>
                  </DraggableItem>
                </Tooltip>
              </ListItem>
            </List>
          </>
        );

      default:
        return null;
    }
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
              This tool supports four SysML diagram types:
            </Typography>
            <List dense disablePadding>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DeviceHubIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText primary="Block Diagram" secondary="Structure and components" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AccountTreeIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText primary="Activity Diagram" secondary="Behaviors and processes" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AssignmentIcon fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText primary="Requirement Diagram" secondary="System requirements" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <AccountTreeIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText primary="Use Case Diagram" secondary="System functionality" />
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
                <ListItemText primary="Use keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Delete (Remove selected)" />
              </ListItem>
            </List>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          SysML AI Modeling Tool v1.0
        </Typography>
      </Box>
    </SidebarContainer>
  );
};

export default Sidebar;