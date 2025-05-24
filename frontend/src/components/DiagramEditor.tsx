import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
}from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Snackbar, Alert, Typography, Button, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import DeleteIcon from '@mui/icons-material/Delete';

import { nodeTypes } from './nodes';
import useDiagramStore from '../store/diagramStore';
import Sidebar from './Sidebar';
import PropertiesPanel from './PropertiesPanel';
import ValidationPanel from './ValidationPanel';

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
});

const ToolbarPanel = styled(Panel)({
  display: 'flex',
  gap: '8px',
  padding: '8px',
  background: 'white',
  borderRadius: '4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
});

// The main diagram editor component
const DiagramEditor = () => {
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

  // Access the diagram store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
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
    try {
      // Save to localStorage as backup
      localStorage.setItem('sysml-diagram', JSON.stringify({ nodes, edges }));
      
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
          name: `Saved Diagram - ${new Date().toLocaleString()}`,
          description: description,
          raw_text: originalText, // Use the original text instead of the auto-generated description
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
    if (validationErrors.length > 0) {
      toggleValidationPanel();
    } else {
      showNotification('No validation issues found', 'success');
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
        
        console.log('Drag data:', dataStr);
        const data = JSON.parse(dataStr);
        
        // Calculate drop position
        const x = event.clientX - reactFlowBounds.left;
        const y = event.clientY - reactFlowBounds.top;
        
        console.log('Drop position (screen):', { x, y });
        
        // Convert to ReactFlow coordinates
        const position = project({
          x: x,
          y: y,
        });
        
        console.log('Drop position (flow):', position);

        // Create a new node with the correct type
        // Make sure to use only the types registered in nodeTypes
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

        console.log('Creating new node:', newNode);
        
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

  return (
    <EditorContainer>
      <Sidebar />
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
          onDragOver={onDragOver}          fitView
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionOnDrag
          // Removed invalid selectionMode property
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
              return '#eee';
            }}
            nodeColor={(n) => {
              if (n.type === 'block') return '#e3f2fd';
              if (n.type === 'sensor') return '#ffebee';
              if (n.type === 'processor') return '#fff8e1';
              return '#fff';
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
              {validationErrors.length > 0 ? `Validation Issues (${validationErrors.length})` : 'Validate'}
            </Button>          </ToolbarPanel>
          
          {/* Status panel */}
          <Panel position="bottom-left">
            <Paper sx={{ padding: '4px 8px', opacity: 0.8 }}>
              <Typography variant="caption">
                {nodes.length} nodes | {edges.length} connections
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
    </EditorContainer>
  );
};

// Wrap with ReactFlowProvider to access ReactFlow context
const DiagramEditorWithProvider = () => (
  <ReactFlowProvider>
    <DiagramEditor />
  </ReactFlowProvider>
);

export default DiagramEditorWithProvider;
