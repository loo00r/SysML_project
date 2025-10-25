import React, { useCallback, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Connection,
  MiniMap,
  Panel,
  useReactFlow,
} from 'reactflow';
import type { Node as FlowNode } from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Paper, Snackbar, Alert, Typography, Button, IconButton, styled } from '@mui/material';
import DiagramTabs from './DiagramTabs';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

import { BlockNode, SensorNode, ProcessorNode, PortNode, ConnectionNode, IBDNode, SmdInitialNode, SmdFinalNode, SmdStateNode, SmdChoiceNode } from './nodes';
import SmdTransitionEdge from './edges/SmdTransitionEdge';
import useDiagramStore, { DiagramType, type NodeData } from '../store/diagramStore';
import PropertiesPanel from './PropertiesPanel';
import TransitionPanel from './TransitionPanel';
import ValidationPanel from './ValidationPanel';
import { validateSysMLDiagram, generateXMI, downloadXMI, collectRelatedDiagrams } from '../utils/xmiExport';
import { SMD_EDGE_MARKER_ID, SMD_EDGE_MARKER_URL, USE_SMD_EDGE_MARKERS } from '../utils/smdTransition';
import { validateSmd, getValidationSummary } from '../services/validation/smdValidator';

// Unified node types object - includes all node components to prevent rendering issues
const unifiedNodeTypes = {
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  port: PortNode,
  connection: ConnectionNode,
  ibd: IBDNode,
  ibd_block: IBDNode, // Map backend 'ibd_block' type to IBDNode component
  smdInitial: SmdInitialNode,
  smdFinal: SmdFinalNode,
  smdState: SmdStateNode,
  smdChoice: SmdChoiceNode,
  defaultNode: BlockNode
};

const edgeTypes = {
  smdTransition: SmdTransitionEdge,
};

// Styled components
const WorkspaceContainer = styled(Box)({
  display: 'flex',
  height: '100%',
  width: '100%',
  position: 'relative',
  flex: 1,
  minWidth: 0, // Allow flex shrinking
});

const FlowContainer = styled(Box)({
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative', // Important for absolute positioning of floating panel
});

const TopContainer = styled(Box)({
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16,
  zIndex: 1000,
  display: 'flex',
  gap: '16px', // Increased space between tabs and toolbar
  alignItems: 'flex-start',
});

const FloatingTabPanel = styled(Paper)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden', // Hide overflow for scrolling
  maxWidth: 'calc(100vw - 400px)', // Leave more space for toolbar and gap
  minWidth: 0, // Allow shrinking
}));

const ToolbarPanel = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  flexShrink: 0, // Don't shrink the toolbar
}));

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


const DiagramWorkspace: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
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

  const typeDisplayNames: Record<string, string> = {
    block: 'block node',
    sensor: 'sensor node',
    processor: 'processor node',
    port: 'port node',
    connection: 'connection node',
    ibd: 'IBD block',
    ibd_block: 'IBD block',
    smdInitial: 'initial pseudo-state',
    smdFinal: 'final state',
    smdState: 'state node',
    smdChoice: 'choice pseudo-state',
  };

  // Access the diagram store
  const {
    openDiagrams,
    activeDiagramId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect: storeOnConnect,
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
    onViewportChange,
    clearCenteringFlag,
    setSmdValidationResults,
    getSmdValidationResults,
  } = useDiagramStore();

  // Get ReactFlow instance methods
  const { fitView, zoomIn, zoomOut, project } = useReactFlow();

  // Get the active diagram
  const activeDiagram = openDiagrams.find(d => d.id === activeDiagramId);
  
  // Handle conditional fitView for new diagrams
  useEffect(() => {
    if (activeDiagram?.needsCentering && activeDiagramId) {
      // Use setTimeout to ensure ReactFlow is fully mounted
      const timer = setTimeout(() => {
        fitView();
        clearCenteringFlag(activeDiagramId);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeDiagram?.needsCentering, activeDiagramId, fitView, clearCenteringFlag]);

  // Define edge styles based on diagram type and node count
  const defaultEdgeOptions = (() => {
    if (activeDiagram?.type === 'ibd') {
      return {
        style: {
          stroke: '#555',
          strokeWidth: 2,
          strokeDasharray: '8 4', // Dashed line pattern
        },
        type: nodes.length <= 2 ? 'straight' : 'smoothstep',
        animated: true, // Animated dashed line for IBD
        className: 'ibd-animated-edge',
      };
    }

    if (activeDiagram?.type === 'smd') {
      return {
        style: {
          stroke: '#37474f',
          strokeWidth: 2,
        },
        type: 'smdTransition' as const,
        animated: false,
        markerEnd: USE_SMD_EDGE_MARKERS ? SMD_EDGE_MARKER_URL : undefined,
      };
    }

    return {
      style: { stroke: '#555', strokeWidth: 1 }, // Solid gray for BDD
      type: 'smoothstep' as const,
      animated: false,
    };
  })();

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
    setShowPropertiesPanel(true);
  }, [setSelectedEdgeId, setShowPropertiesPanel]);

  // Handle background click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowPropertiesPanel(false);
    setSelectedNodes([]);
    setSelectedEdges([]);
  }, [setSelectedEdgeId, setSelectedEdges, setSelectedNodes, setShowPropertiesPanel]);

  // Handle node selection changes
  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: any[]; edges: any[] }) => {
      setSelectedNodes(nodes.map((node) => node.id));
      setSelectedEdges(edges.map((edge) => edge.id));

      if (nodes.length === 1 && edges.length === 0) {
        setSelectedNodeId(nodes[0].id);
        setSelectedEdgeId(null);
        setShowPropertiesPanel(true);
      } else if (edges.length === 1 && nodes.length === 0) {
        setSelectedEdgeId(edges[0].id);
        setSelectedNodeId(null);
        setShowPropertiesPanel(true);
      } else if (nodes.length === 0 && edges.length === 0) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setShowPropertiesPanel(false);
      } else {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setShowPropertiesPanel(false);
      }
    },
    [setSelectedEdges, setSelectedNodes, setSelectedEdgeId, setSelectedNodeId, setShowPropertiesPanel]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: any) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setShowPropertiesPanel(true);
  }, [setSelectedEdgeId, setSelectedNodeId, setShowPropertiesPanel]);

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

  // Clean diagram data for RAG storage (remove only manual IBD-specific information)
  const cleanDiagramForRAG = (nodes: any[], edges: any[], diagramType: DiagramType) => {
    const serializedType =
      diagramType === 'bdd_enhanced'
        ? 'BDD_ENHANCED'
        : diagramType.toUpperCase();

    if (diagramType !== 'bdd' && diagramType !== 'bdd_enhanced') {
      return { type: serializedType, nodes, edges };
    }

    const { diagramsData } = useDiagramStore.getState();
    
    // Only include BDD elements - filter out IBD blocks and manual IBD-related content
    const cleanNodes = nodes
      .filter(node => node.type !== 'ibd') // Remove IBD block nodes
      .map(node => {
        // Create a clean copy of the node data
        const cleanNode = {
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            label: node.data.label,
            description: node.data.description,
            type: node.data.type,
            // Only include basic properties, exclude manual IBD-related metadata
            properties: node.data.properties ? 
              Object.fromEntries(
                Object.entries(node.data.properties).filter(([key, value]) => 
                  !key.toLowerCase().includes('ibd') && 
                  !key.toLowerCase().includes('internal') &&
                  (typeof value === 'string' || typeof value === 'number')
                )
              ) : {}
          }
        };
        return cleanNode;
      });
    
    // Filter edges to exclude manual IBD edges but allow AI-created IBD edges in the future
    const cleanEdges = edges
      .filter(edge => {
        // Always exclude edges with IBD labels (these are manual)
        if (edge.label?.includes('IBD')) return false;
        if (edge.id?.includes('ibd')) return false;
        
        // For straight edges (IBD style), check if they're from manual creation
        if (edge.type === 'straight') {
          // This would be from manual IBD creation, exclude it
          return false;
        }
        
        return true;
      })
      .map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label
      }));
    
    // Also clean the current diagramsData to only include AI-created IBDs in the future
    const cleanDiagramsData = Object.fromEntries(
      Object.entries(diagramsData).filter(([key, value]) => 
        value.source === 'ai' // Only keep AI-created IBDs for RAG
      )
    );
    
    console.log(`Cleaned diagram: ${nodes.length} -> ${cleanNodes.length} nodes, ${edges.length} -> ${cleanEdges.length} edges`);
    console.log(`Filtered manual IBDs from diagramsData: ${Object.keys(diagramsData).length} -> ${Object.keys(cleanDiagramsData).length} IBDs`);
    
    return { type: serializedType, nodes: cleanNodes, edges: cleanEdges };
  };

  // Handle diagram save
  const handleSave = async () => {
    if (!activeDiagram) return;

    try {
      // Save to localStorage as backup
      localStorage.setItem('sysml-diagram', JSON.stringify({ nodes, edges }));
      localStorage.setItem('sysml-diagram-timestamp', Date.now().toString());
      
      // Check if this is an AI-generated diagram with a Redis ID
      if (activeDiagram.generatedDiagramId) {
        // Use the new save endpoint for AI-generated diagrams
        const response = await fetch('/api/v1/rag/save-diagram/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            diagram_id: activeDiagram.generatedDiagramId,
            name: activeDiagram.name
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error saving AI diagram: ${response.statusText}`);
        }
        
        showNotification('AI-generated diagram saved successfully to database', 'success');
      } else {
        // For manual diagrams, use the original save logic
        const diagramType = activeDiagram.type as DiagramType;
        const description = `Diagram with ${nodes.length} nodes and ${edges.length} connections`;
        
        // Get the original text from the store if available
        const { generationPrompt, diagramDescription, openDiagrams, diagramsData } = useDiagramStore.getState();
        const originalText = generationPrompt || diagramDescription || description;
        
        // Clean the diagram data to remove IBD contamination from RAG
        const cleanDiagramData = cleanDiagramForRAG(nodes, edges, diagramType);
        
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
            diagram_json: cleanDiagramData
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error saving manual diagram: ${response.statusText}`);
        }

        const savedDiagramResponse = await response.json();
        const parentBddId = savedDiagramResponse.id;

        // Save any related IBD diagrams that exist for this BDD
        const relatedIbdDiagrams = openDiagrams.filter(diagram => 
          diagram.type === 'ibd' && 
          diagram.id.startsWith(`ibd-for-${activeDiagram.id}-`)
        );

        console.log(`🔧 Found ${relatedIbdDiagrams.length} related IBD diagrams to save`);

        for (const ibdDiagram of relatedIbdDiagrams) {
          try {
            // Extract block ID from IBD diagram ID
            const blockId = ibdDiagram.id.replace(`ibd-for-${activeDiagram.id}-`, '');
            
            // Get IBD data (either from openDiagrams or diagramsData)
            const ibdNodes = ibdDiagram.nodes || [];
            const ibdEdges = ibdDiagram.edges || [];
            
            console.log(`💾 Saving IBD for block ${blockId} with ${ibdNodes.length} nodes and ${ibdEdges.length} edges`);

            // Save IBD to database via backend endpoint
            const ibdResponse = await fetch('/api/v1/diagrams/ibd/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                parent_bdd_diagram_id: parentBddId,
                parent_block_id: blockId,
                nodes: ibdNodes.map(node => ({
                  id: node.id,
                  name: node.data.label,
                  type: node.type,
                  description: node.data.description || '',
                  properties: node.data.properties || {},
                  position: node.position
                })),
                edges: ibdEdges.map(edge => ({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  label: edge.label || 'IBD Connection'
                })),
                source: 'manual'
              }),
            });

            if (!ibdResponse.ok) {
              console.error(`Failed to save IBD for block ${blockId}: ${ibdResponse.statusText}`);
            } else {
              console.log(`✅ Successfully saved IBD for block ${blockId}`);
            }
          } catch (ibdError) {
            console.error(`Error saving IBD diagram ${ibdDiagram.id}:`, ibdError);
          }
        }
        
        showNotification(`Manual diagram saved successfully with ${relatedIbdDiagrams.length} IBD diagrams`, 'success');
      }
    } catch (error) {
      console.error('Error saving diagram:', error);
      showNotification(`Failed to save diagram: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  // Handle validation
  const handleValidate = () => {
    // Check if this is an SMD diagram
    if (activeDiagram?.type === 'smd') {
      // Run SMD validation
      const results = validateSmd(nodes, edges);
      const summary = getValidationSummary(results);

      // Store results in state
      if (activeDiagramId) {
        setSmdValidationResults(activeDiagramId, results);
      }

      // Show appropriate notification
      if (results.length === 0) {
        showNotification('No issues found.', 'success');
      } else {
        const message = `Validation: ${summary.errors} error${summary.errors !== 1 ? 's' : ''}, ${summary.warnings} warning${summary.warnings !== 1 ? 's' : ''}`;
        showNotification(message, summary.errors > 0 ? 'error' : 'warning');
      }
    } else {
      // Original validation for non-SMD diagrams (BDD, IBD, etc.)
      const diagramType = nodes.length > 0 && nodes[0].type ? nodes[0].type.split('-')[0] : 'block';

      // Collect related diagrams (SMD and IBD) if this is a BDD diagram
      let relatedDiagrams: any[] = [];
      if (activeDiagram?.type === 'bdd' && activeDiagramId) {
        relatedDiagrams = collectRelatedDiagrams(activeDiagramId, openDiagrams);
      }

      const result = validateSysMLDiagram(nodes, edges, diagramType, relatedDiagrams);
      setValidationResult(result);
      setIsExportEnabled(result.isValid);

      if (result.isValid) {
        const relatedCount = relatedDiagrams.length;
        const message = relatedCount > 0
          ? `Diagram validation successful (including ${relatedCount} related diagram${relatedCount > 1 ? 's' : ''}). Export is now enabled.`
          : 'Diagram validation successful. Export is now enabled.';
        showNotification(message, 'success');
      } else {
        if (!showValidationPanel) {
          toggleValidationPanel();
        }
        showNotification(`Validation failed with ${result.errors.length} issues. Please fix them before exporting.`, 'warning');
      }
    }
  };
  
  // Handle XMI export
  const handleExport = async () => {
    if (!activeDiagram) return;

    try {
      // Get diagram type from nodes (default to 'block' if not found)
      const diagramType = nodes.length > 0 && nodes[0].type ? nodes[0].type.split('-')[0] : 'block';

      // Collect related diagrams (SMD and IBD) if this is a BDD diagram
      let relatedDiagrams: any[] = [];
      if (activeDiagram?.type === 'bdd' && activeDiagramId) {
        relatedDiagrams = collectRelatedDiagrams(activeDiagramId, openDiagrams);
      }

      // First validate the diagram
      const validationResults = validateSysMLDiagram(nodes, edges, diagramType, relatedDiagrams);
      setValidationResult(validationResults);

      if (!validationResults.isValid) {
        showNotification(`Cannot export: ${validationResults.errors.join(', ')}`, 'error');
        return;
      }

      // Generate XMI (including related diagrams)
      const xmiContent = generateXMI(nodes, edges, diagramType, relatedDiagrams);
      
      // Download the XMI file
      downloadXMI(xmiContent, `${activeDiagram.name.replace(/\s+/g, '_')}.xmi`);

      const relatedCount = relatedDiagrams.length;
      const message = relatedCount > 0
        ? `XMI exported successfully (including ${relatedCount} related diagram${relatedCount > 1 ? 's' : ''})`
        : 'XMI exported successfully';
      showNotification(message, 'success');
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

        // Create a new node with the correct type based on diagram type
        let nodeType: string | null = null;

        if (activeDiagram?.type === 'smd') {
          const allowedSmdTypes = ['smdInitial', 'smdFinal', 'smdState', 'smdChoice'];
          if (!allowedSmdTypes.includes(data.type)) {
            showNotification('Only state machine elements can be added to SMD diagrams.', 'warning');
            return;
          }
          nodeType = data.type;
        } else if (activeDiagram?.type === 'ibd') {
          // For IBD diagrams, prefer port and connection types
          nodeType = ['port', 'connection', 'block', 'ibd'].includes(data.type) ? data.type : 'port';
        } else {
          // For other diagrams, use traditional types (but not IBD blocks for BDD)
          if (data.type === 'ibd' && activeDiagram?.type === 'bdd') {
            // Don't allow IBD blocks in BDD diagrams
            return;
          }
          nodeType = ['block', 'sensor', 'processor', 'ibd'].includes(data.type) ? data.type : 'block';
        }

        if (!nodeType) {
          return;
        }

        const newNode: any = {
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
        const displayName = typeDisplayNames[nodeType] || `${nodeType} node`;
        const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        showNotification(`Added ${capitalizedName}`, 'success');
      } catch (error) {
        console.error('Error adding new node:', error);
        showNotification('Failed to add node', 'error');
      }
    },
    [addNode, showNotification, project, activeDiagram?.type, nodes]
  );

  const handleConnect = useCallback((connection: Connection) => {
    // SMD Policy: Reject connections targeting RIGHT or BOTTOM
    if (activeDiagram?.type === 'smd') {
      const targetNode = nodes.find(n => n.id === connection.target);

      // Initial node cannot receive any inbound transitions
      if (targetNode?.type === 'smdInitial') {
        showNotification('Initial state cannot receive inbound transitions. It is the entry point of the state machine.', 'warning');
        return;
      }

      const targetHandle = connection.targetHandle?.toLowerCase() || '';

      // Check if target handle is RIGHT or BOTTOM (disallowed globally)
      if (targetHandle.includes('right') || targetHandle.includes('bottom')) {
        showNotification('SMD nodes can only receive transitions on LEFT or TOP sides. RIGHT and BOTTOM are source-only.', 'warning');
        return;
      }

      // Additional check for State/Choice: they can ONLY accept LEFT (not even TOP)
      if (targetNode?.type === 'smdState' || targetNode?.type === 'smdChoice') {
        if (targetHandle.includes('top')) {
          showNotification('State and Choice nodes can only receive transitions on the LEFT side.', 'warning');
          return;
        }

        // Also check by position if no explicit handle
        if (!connection.targetHandle) {
          const sourceNode = nodes.find(n => n.id === connection.source);

          if (targetNode && sourceNode) {
            const dx = sourceNode.position.x - targetNode.position.x;
            const dy = sourceNode.position.y - targetNode.position.y;

            // Infer target side from geometry
            const isHorizontalDominant = Math.abs(dx) >= Math.abs(dy);
            const inferredSide = isHorizontalDominant
              ? (dx > 0 ? 'right' : 'left')
              : (dy > 0 ? 'bottom' : 'top');

            if (inferredSide !== 'left') {
              showNotification('State and Choice nodes can only receive transitions on the LEFT side.', 'warning');
              return;
            }
          }
        }
      } else {
        // For Initial/Final nodes, check by position if no explicit handle
        if (!connection.targetHandle) {
          const sourceNode = nodes.find(n => n.id === connection.source);

          if (targetNode && sourceNode) {
            const dx = sourceNode.position.x - targetNode.position.x;
            const dy = sourceNode.position.y - targetNode.position.y;

            // Infer target side from geometry
            const isHorizontalDominant = Math.abs(dx) >= Math.abs(dy);
            const inferredSide = isHorizontalDominant
              ? (dx > 0 ? 'right' : 'left')
              : (dy > 0 ? 'bottom' : 'top');

            if (inferredSide === 'right' || inferredSide === 'bottom') {
              showNotification('SMD nodes can only receive transitions on LEFT or TOP sides.', 'warning');
              return;
            }
          }
        }
      }
    }

    storeOnConnect(connection);
  }, [storeOnConnect, activeDiagram?.type, nodes, showNotification]);

  // Render empty state when no diagram is active
  if (!activeDiagram) {
    return (
      <WorkspaceContainer>
        <FlowContainer>
          {/* Top Container with tabs and toolbar */}
          <TopContainer>
            <FloatingTabPanel elevation={3}>
              <DiagramTabs />
            </FloatingTabPanel>
            
            <ToolbarPanel elevation={3}>
              <IconButton onClick={undo} size="small" title="Undo" disabled>
                <UndoIcon />
              </IconButton>
              <IconButton onClick={redo} size="small" title="Redo" disabled>
                <RedoIcon />
              </IconButton>
              <IconButton onClick={() => zoomIn()} size="small" title="Zoom In" disabled>
                <ZoomInIcon />
              </IconButton>
              <IconButton onClick={() => zoomOut()} size="small" title="Zoom Out" disabled>
                <ZoomOutIcon />
              </IconButton>
              <IconButton onClick={() => fitView()} size="small" title="Fit View" disabled>
                <FitScreenIcon />
              </IconButton>
              <IconButton onClick={clearDiagram} size="small" title="Clear Diagram" disabled>
                <DeleteIcon />
              </IconButton>
              <IconButton onClick={handleSave} size="small" title="Save Diagram" disabled>
                <SaveIcon />
              </IconButton>
              <Button
                variant="outlined"
                size="small"
                onClick={handleValidate}
                disabled
                color="primary"
              >
                VALIDATE
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleExport}
                disabled
                color="warning"
                sx={{ minWidth: '80px' }}
              >
                EXPORT
              </Button>
            </ToolbarPanel>
          </TopContainer>
          
          <EmptyState>
            <Typography variant="h6" gutterBottom>
              No diagram open
            </Typography>
            <Typography variant="body2">
              Create a new diagram by clicking the + button in the tab bar above
            </Typography>
          </EmptyState>
        </FlowContainer>
      </WorkspaceContainer>
    );
  }

  return (
    <WorkspaceContainer>
      <FlowContainer ref={reactFlowWrapper}>
        {/* Top Container with tabs and toolbar */}
        <TopContainer>
          <FloatingTabPanel elevation={3}>
            <DiagramTabs />
          </FloatingTabPanel>
          
          <ToolbarPanel elevation={3}>
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
        </TopContainer>
        
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onSelectionChange={onSelectionChange}
          onEdgeClick={onEdgeClick}
          nodeTypes={unifiedNodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onDrop={onDrop}
          onDragOver={onDragOver}
          defaultViewport={activeDiagram?.viewport}
          onMove={(_, viewport) => onViewportChange(viewport)}
          key={activeDiagram?.id}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionOnDrag
          snapToGrid
          snapGrid={[15, 15]}
        >
          <defs>
            <marker
              id={SMD_EDGE_MARKER_ID}
              markerWidth="12"
              markerHeight="12"
              viewBox="0 0 12 12"
              refX="10"
              refY="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L12,6 L0,12 z" fill="#37474f" />
            </marker>
          </defs>

          {/* Background grid */}
          <Background color="#aaa" gap={16} />
          
          {/* Mini map for navigation */}
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'block') return '#0041d0';
              if (n.type === 'sensor') return '#ff0072';
              if (n.type === 'processor') return '#ff9500';
              if (n.type === 'ibd') return '#4caf50';
              if (n.type === 'smdInitial') return '#212121';
              if (n.type === 'smdFinal') return '#37474f';
              if (n.type === 'smdState') return '#1565c0';
              if (n.type === 'smdChoice') return '#455a64';
              return '#0041d0';
            }}
            nodeColor={(n) => {
              if (n.type === 'block') return '#e3f2fd';
              if (n.type === 'sensor') return '#ffebee';
              if (n.type === 'processor') return '#fff8e1';
              if (n.type === 'ibd') return '#e8f5e8';
              if (n.type === 'smdInitial') return '#212121';
              if (n.type === 'smdFinal') return '#cfd8dc';
              if (n.type === 'smdState') return '#bbdefb';
              if (n.type === 'smdChoice') return '#eceff1';
              return '#e3f2fd';
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
          
          {/* Status panel */}
          <Panel position="bottom-left">
            <Paper sx={{ 
              padding: '4px 8px', 
              opacity: 0.8,
              marginLeft: '8px',
              marginBottom: '8px',
            }}>
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

      {showPropertiesPanel && !selectedNodeId && selectedEdgeId && (
        <TransitionPanel
          edgeId={selectedEdgeId}
          onClose={() => {
            setShowPropertiesPanel(false);
            setSelectedEdgeId(null);
          }}
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
