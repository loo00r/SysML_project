import React, { useCallback, useRef, useState } from 'react';
import { useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Snackbar, Alert, styled } from '@mui/material';

import useDiagramStore from '../store/diagramStore';
import PropertiesPanel from './PropertiesPanel';
import ValidationPanel from './ValidationPanel';
import { validateSysMLDiagram, generateXMI, downloadXMI } from '../utils/xmiExport';
import {
  WorkspaceToolbar,
  EmptyWorkspaceState,
  StatusPanel,
  FloatingTabPanel,
  ReactFlowCanvas,
} from './workspace';

const WorkspaceContainer = styled(Box)({
  display: 'flex',
  height: '100%',
  width: '100%',
  position: 'relative',
  flex: 1,
  minWidth: 0, // Allow flex shrinking
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
      <WorkspaceContainer>
        <FloatingTabPanel />
        <EmptyWorkspaceState />
      </WorkspaceContainer>
    );
  }

  return (
    <WorkspaceContainer>
      <ReactFlowCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <FloatingTabPanel />
        
        <WorkspaceToolbar
          onUndo={undo}
          onRedo={redo}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          onFitView={() => fitView()}
          onClear={clearDiagram}
          onSave={handleSave}
          onValidate={handleValidate}
          onExport={handleExport}
          validationErrors={validationErrors}
          isExportEnabled={isExportEnabled}
        />
        
        <StatusPanel
          diagramName={activeDiagram.name}
          nodeCount={nodes.length}
          edgeCount={edges.length}
        />
      </ReactFlowCanvas>
      
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