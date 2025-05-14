import React, { useState, useRef, useEffect } from 'react';
import { 
  DiagramEngine, 
  DefaultNodeModel, 
  DiagramModel, 
  DefaultLinkModel,
  DefaultLinkFactory
} from '@projectstorm/react-diagrams';
import { 
  CanvasWidget,
  InputType
} from '@projectstorm/react-canvas-core';
import { Box, Paper, Snackbar, Alert, Typography, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import DeleteIcon from '@mui/icons-material/Delete';

import useDiagramStore from '../store/newDiagramStore';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import ValidationPanel from './ValidationPanel';
import { createDiagramEngine } from '../utils/diagramEngineUtils';

// Styled components
const EditorContainer = styled(Box)({
  display: 'flex',
  height: 'calc(100vh - 64px)', // Adjust based on your app's header height
  width: '100%',
  position: 'relative',
});

const FlowContainer = styled(Box)({
  flex: 1,
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
});

const CanvasContainer = styled('div')({
  width: '100%',
  height: '100%',
  background: '#f8f8f8',
});

const ToolbarPanel = styled(Paper)({
  position: 'absolute',
  top: 10,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '8px',
  padding: '8px',
  background: 'white',
  borderRadius: '4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  zIndex: 10,
});

const StatusPanel = styled(Paper)({
  position: 'absolute',
  bottom: 10,
  left: 10,
  padding: '4px 8px',
  opacity: 0.8,
  zIndex: 10,
});

// The main diagram editor component
const NewDiagramEditor = () => {
  const [engine] = useState(() => createDiagramEngine());
  const [model] = useState(() => new DiagramModel());
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Access the diagram store
  const {
    nodes, 
    edges,
    undo,
    redo,
    clearDiagram,
    validationErrors,
    showValidationPanel,
    toggleValidationPanel,
    addNode,
  } = useDiagramStore();

  // Initialize the engine and model
  useEffect(() => {
    engine.setModel(model);    // Event listener for node selection
    model.registerListener({
      selectionChanged: (e: any) => {
        const selectedEntities = e.entity ? {[e.entity.id]: e.entity} : {};
        const selectedNodes = Object.values(selectedEntities).filter(entity => entity instanceof DefaultNodeModel);
        
        if (selectedNodes.length === 1) {
          const node = selectedNodes[0] as DefaultNodeModel;
          setSelectedNodeId(node.getID());
          setShowPropertiesPanel(true);
        } else {
          setSelectedNodeId(null);
          setShowPropertiesPanel(false);
        }
      }
    });
    
    // Convert store nodes to diagram nodes
    convertAndRenderDiagram();
    
    return () => {
      engine.setModel(new DiagramModel());
    };
  }, []);
  
  // Re-render the diagram when nodes or edges change
  useEffect(() => {
    convertAndRenderDiagram();
  }, [nodes, edges]);

  // Convert store nodes to diagram nodes
  const convertAndRenderDiagram = () => {
    model.getNodes().forEach(node => model.removeNode(node));
    model.getLinks().forEach(link => model.removeLink(link));
    
    // Map to keep track of created nodes for linking later
    const nodeMap = new Map();
    
    // Create nodes
    nodes.forEach(node => {
      const { id, position, data } = node;
      const diagramNode = new DefaultNodeModel({
        id,
        name: data.label || 'Unnamed',
        color: getNodeColor(data.type)
      });
      
      diagramNode.setPosition(position.x, position.y);
      
      // Add ports based on node type
      diagramNode.addOutPort('out');
      diagramNode.addInPort('in');
      
      model.addNode(diagramNode);
      nodeMap.set(id, diagramNode);
    });
    
    // Create links
    edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        const sourcePort = sourceNode.getPort('out');
        const targetPort = targetNode.getPort('in');
        
        if (sourcePort && targetPort) {
          const link = sourcePort.link(targetPort);
          link.addLabel(edge.label || '');
        }
      }
    });
    
    engine.repaintCanvas();
  };
  
  // Get color based on node type
  const getNodeColor = (type: string) => {
    switch(type) {
      case 'block':
        return 'rgb(0, 192, 255)';
      case 'sensor':
        return 'rgb(255, 0, 114)';
      case 'processor':
        return 'rgb(255, 149, 0)';
      default:
        return 'rgb(100, 100, 100)';
    }
  };

  // Show notification
  const showNotification = (message: string, severity: 'success' | 'info' | 'warning' | 'error') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Handle diagram save
  const handleSave = () => {
    // In a real app, this would save to a backend
    localStorage.setItem('sysml-diagram', JSON.stringify({ nodes, edges }));
    showNotification('Diagram saved successfully', 'success');
  };

  // Handle validation
  const handleValidate = () => {
    if (validationErrors.length > 0) {
      toggleValidationPanel();
    } else {
      showNotification('No validation issues found', 'success');
    }
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    engine.getModel().setZoomLevel(engine.getModel().getZoomLevel() * 1.1);
    engine.repaintCanvas();
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    engine.getModel().setZoomLevel(engine.getModel().getZoomLevel() * 0.9);
    engine.repaintCanvas();
  };
  
  // Handle fit view
  const handleFitView = () => {
    engine.zoomToFit();
  };

  return (
    <EditorContainer>
      <Sidebar />
      <FlowContainer ref={diagramContainerRef}>
        <CanvasContainer>
          <CanvasWidget engine={engine} />
        </CanvasContainer>
        
        {/* Toolbar */}
        <ToolbarPanel>
          <IconButton onClick={undo} size="small" title="Undo">
            <UndoIcon />
          </IconButton>
          <IconButton onClick={redo} size="small" title="Redo">
            <RedoIcon />
          </IconButton>
          <IconButton onClick={handleZoomIn} size="small" title="Zoom In">
            <ZoomInIcon />
          </IconButton>
          <IconButton onClick={handleZoomOut} size="small" title="Zoom Out">
            <ZoomOutIcon />
          </IconButton>
          <IconButton onClick={handleFitView} size="small" title="Fit View">
            <FitScreenIcon />
          </IconButton>
          <IconButton onClick={clearDiagram} size="small" title="Clear Diagram">
            <DeleteIcon />
          </IconButton>
          <IconButton onClick={handleSave} size="small" title="Save Diagram">
            <SaveIcon />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            onClick={handleValidate}
            color={validationErrors.length > 0 ? 'warning' : 'primary'}
          >
            {validationErrors.length > 0 ? `Validation Issues (${validationErrors.length})` : 'Validate'}
          </Button>
        </ToolbarPanel>
        
        {/* Status panel */}
        <StatusPanel>
          <Typography variant="caption">
            {nodes.length} nodes | {edges.length} connections
          </Typography>
        </StatusPanel>
      </FlowContainer>
      
      {/* Properties panel */}
      {showPropertiesPanel && selectedNodeId && (
        <PropertiesPanel
          nodeId={selectedNodeId}
          onClose={() => setShowPropertiesPanel(false)}
        />
      )}
      
      {/* Validation panel */}
      {showValidationPanel && validationErrors.length > 0 && (
        <ValidationPanel errors={validationErrors} />
      )}
      
      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </EditorContainer>
  );
};

export default NewDiagramEditor;
