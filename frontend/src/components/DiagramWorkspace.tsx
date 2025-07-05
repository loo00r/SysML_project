import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Snackbar, Alert, Typography, Button, IconButton, styled } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { nodeTypes } from './nodes';
import useDiagramStore from '../store/diagramStore';
import PropertiesPanel from './PropertiesPanel';
import ValidationPanel from './ValidationPanel';
import { validateSysMLDiagram, generateXMI, downloadXMI } from '../utils/xmiExport';

// Styled components
const WorkspaceContainer = styled(Box)({
  display: 'flex',
  height: '100%',
  width: '100%',
  position: 'relative',
  flex: 1,
});

const FlowContainer = styled(Box)({
  flex: 1,
  height: '100%',
});

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.secondary,
  padding: theme.spacing(4),
}));

const ToolbarPanel = styled(Panel)({
  display: 'flex',
  gap: '8px',
  padding: '8px',
  background: 'white',
  borderRadius: '4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
});

const DiagramWorkspace: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
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
  
  const [isExportEnabled, setIsExportEnabled] = useState(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false,
    errors: []
  });

  // Access the diagram store
  const {
    openDiagrams,
    activeDiagramId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setSelectedNodes,
    setSelectedEdges,
    undo,
    redo,
    clearDiagram,
    validationErrors,
    showValidationPanel,
    toggleValidationPanel,
    addNode,
  } = useDiagramStore();

  // Get ReactFlow instance methods
  const { fitView, zoomIn, zoomOut, project } = useReactFlow();

  // Get the active diagram
  const activeDiagram = openDiagrams.find(d => d.id === activeDiagramId);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    setShowPropertiesPanel(true);
  }, []);

  // Handle background click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowPropertiesPanel(false);
    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [setSelectedNodes, setSelectedEdges]);

  // Handle node selection changes
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: any[]; edges: any[] }) => {
      setSelectedNodes(nodes.map((node) => node.id));
      setSelectedEdges(edges.map((edge) => edge.id));

      if (nodes.length === 1) {
        setSelectedNodeId(nodes[0].id);
        setShowPropertiesPanel(true);
      } else if (nodes.length === 0) {
        setSelectedNodeId(null);
        setShowPropertiesPanel(false);
      }
    },
    [setSelectedNodes, setSelectedEdges]
  );

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
  const handleSave = async () => {
    if (!activeDiagram) return;

    try {
      // Save to localStorage as backup
      localStorage.setItem('sysml-diagram', JSON.stringify({ nodes, edges }));
      localStorage.setItem('sysml-diagram-timestamp', Date.now().toString());
      
      // Get diagram type from nodes (default to 'block' if not found)
      const diagramType = nodes.length > 0 && nodes[0].type ? nodes[0].type : 'block';
      
      // Generate a description from the diagram
      const description = `Diagram with ${nodes.length} nodes and ${edges.length} connections`;
      
      // Get the original text from the store if available
      const { generationPrompt, diagramDescription } = useDiagramStore.getState();
      
      // Use the original generation prompt if available, otherwise use diagram description or a default
      const originalText = generationPrompt || diagramDescription || description;
      
      // Save to backend and update RAG database
      const response = await fetch('/api/v1/rag/diagrams/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: activeDiagram.name,
          description: description,
          raw_text: originalText,
          diagram_type: diagramType,
          diagram_json: { nodes, edges }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error saving diagram: ${response.statusText}`);
      }
      
      showNotification('Diagram saved successfully and added to knowledge base', 'success');
    } catch (error) {
      console.error('Error saving diagram:', error);
      showNotification(`Failed to save diagram: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle validation
  const handleValidate = () => {
    // Get diagram type from nodes (default to 'block' if not found)
    const diagramType = nodes.length > 0 && nodes[0].type ? nodes[0].type.split('-')[0] : 'block';
    
    // Validate the diagram
    const result = validateSysMLDiagram(nodes, edges, diagramType);
    setValidationResult(result);
    
    // Enable or disable export based on validation result
    setIsExportEnabled(result.isValid);
    
    if (result.isValid) {
      showNotification('Diagram validation successful. Export is now enabled.', 'success');
    } else {
      // Show validation panel with errors
      if (!showValidationPanel) {
        toggleValidationPanel();
      }
      showNotification(`Validation failed with ${result.errors.length} issues. Please fix them before exporting.`, 'warning');
    }
  };
  
  // Handle XMI export
  const handleExport = async () => {
    if (!activeDiagram) return;

    try {
      // Get diagram type from nodes (default to 'block' if not found)
      const diagramType = nodes.length > 0 && nodes[0].type ? nodes[0].type.split('-')[0] : 'block';
      
      // First validate the diagram
      const validationResults = validateSysMLDiagram(nodes, edges, diagramType);
      setValidationResult(validationResults);
      
      if (!validationResults.isValid) {
        showNotification(`Cannot export: ${validationResults.errors.join(', ')}`, 'error');
        return;
      }
      
      // Generate XMI
      const xmiContent = generateXMI(nodes, edges, diagramType);
      
      // Download the XMI file
      downloadXMI(xmiContent, `${activeDiagram.name.replace(/\s+/g, '_')}.xmi`);
      
      showNotification('XMI exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting XMI:', error);
      showNotification(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle drag over event
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop event
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      try {
        // Get the data from the drag event
        const dataStr = event.dataTransfer.getData('application/reactflow');
        if (!dataStr) {
          console.error('No data found in drag event');
          return;
        }
        
        const data = JSON.parse(dataStr);
        
        // Calculate drop position
        const x = event.clientX - reactFlowBounds.left;
        const y = event.clientY - reactFlowBounds.top;
        
        // Convert to ReactFlow coordinates
        const position = project({
          x: x,
          y: y,
        });

        // Create a new node with the correct type
        const nodeType = data.type === 'block' || data.type === 'sensor' || data.type === 'processor' ? 
          data.type : 'block';

        const newNode = {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          position,
          data: { 
            ...data.data,
            type: nodeType,
          },
        };
        
        // Add the node to the diagram
        addNode(newNode);
        showNotification(`Added new ${nodeType} node`, 'success');
      } catch (error) {
        console.error('Error adding new node:', error);
        showNotification('Failed to add node', 'error');
      }
    },
    [addNode, showNotification, project]
  );

  // Render empty state when no diagram is active
  if (!activeDiagram) {
    return (
      <EmptyState>
        <Typography variant="h6" gutterBottom>
          No diagram open
        </Typography>
        <Typography variant="body2">
          Create a new diagram by clicking the + button in the tab bar
        </Typography>
      </EmptyState>
    );
  }

  return (
    <WorkspaceContainer>
      <FlowContainer ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionOnDrag
          snapToGrid
          snapGrid={[15, 15]}
        >
          {/* Background grid */}
          <Background color="#aaa" gap={16} />
          
          {/* Mini map for navigation */}
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'block') return '#0041d0';
              if (n.type === 'sensor') return '#ff0072';
              if (n.type === 'processor') return '#ff9500';
              return '#0041d0';
            }}
            nodeColor={(n) => {
              if (n.type === 'block') return '#e3f2fd';
              if (n.type === 'sensor') return '#ffebee';
              if (n.type === 'processor') return '#fff8e1';
              return '#e3f2fd';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          
          {/* Toolbar */}
          <ToolbarPanel position="top-center">
            <IconButton onClick={undo} size="small" title="Undo">
              <UndoIcon />
            </IconButton>
            <IconButton onClick={redo} size="small" title="Redo">
              <RedoIcon />
            </IconButton>
            <IconButton onClick={() => zoomIn()} size="small" title="Zoom In">
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={() => zoomOut()} size="small" title="Zoom Out">
              <ZoomOutIcon />
            </IconButton>
            <IconButton onClick={() => fitView()} size="small" title="Fit View">
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
              {validationErrors.length > 0 ? `Validation Issues (${validationErrors.length})` : 'VALIDATE'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              disabled={!isExportEnabled}
              color="warning"
              sx={{ minWidth: '80px' }}
            >
              EXPORT
            </Button>
          </ToolbarPanel>
          
          {/* Status panel */}
          <Panel position="bottom-left">
            <Paper sx={{ padding: '4px 8px', opacity: 0.8 }}>
              <Typography variant="caption">
                {activeDiagram.name} | {nodes.length} nodes | {edges.length} connections
              </Typography>
            </Paper>
          </Panel>
        </ReactFlow>
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
    </WorkspaceContainer>
  );
};

export default DiagramWorkspace;