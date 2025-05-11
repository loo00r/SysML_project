import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AutosaveIndicator } from '../components/custom/AutosaveIndicator';
import styled from 'styled-components';
import KeyboardShortcutsPanel from './custom/KeyboardShortcutsPanel';
import { CSSTransition } from 'react-transition-group';
import createEngine, { 
  DiagramModel, 
  NodeModel
} from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { SysMLBlockModel, SysMLActivityModel, SysMLLinkModel } from '../models/SysMLNodeModels';
import { NODE_TYPES } from '../utils/sysmlUtils';
import { validateDiagram, ValidationError } from '../utils/validationUtils';
import Toolbar from './Toolbar';
import DiagramGenerator from './DiagramGenerator';
import ContextMenu from './custom/ContextMenu';
import NodeEditModal from './custom/NodeEditModal';
import { parseText, generateNodesFromParsedData } from '../utils/diagramGeneratorUtils';
import {
  configureEngineForPerformance,
  optimizeDiagramForLargeGraphs,
  setupDiagramInteractions,
  screenToModelPosition
} from '../utils/renderUtils';
import { LayoutEngine } from '../utils/layoutUtils';
import { DiagramHistory } from '../utils/historyUtils';
import { SysMLBlockFactory, SysMLActivityFactory, SysMLLinkFactory } from '../models/SysMLNodeFactories';

const CanvasWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
`;

const CanvasContainer = styled.div<{ isResizing?: boolean }>`
  flex: 1;
  background: #f8f8f8;
  background-size: 50px 50px;
  background-image:
    linear-gradient(to right, #e4e4e4 1px, transparent 1px),
    linear-gradient(to bottom, #e4e4e4 1px, transparent 1px);
  > * {
    height: 100%;
    width: 100%;
  }
  cursor: ${props => props.isResizing ? 'se-resize' : 'default'};
  position: relative;
  z-index: 1;
  overflow: hidden;
  
  .srd-diagram {
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
    outline: none;
  }
  
  .srd-canvas {
    position: relative;
    cursor: move;
    overflow: visible;
  }

  .node {
    transition: box-shadow 0.3s ease;
    &:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }
  }
    .resize-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #fff;
    border: 2px solid #666;
    border-radius: 50%;
    cursor: s-resize; /* Changed to s-resize to indicate vertical-only resize */
    bottom: -5px;
    right: -5px;
  }

  &.dropzone-active {
    background-color: rgba(0, 115, 230, 0.05);
    border: 2px dashed var(--primary-color);
  }
`;

const ValidationPanel = styled.div`
  position: absolute;
  top: 60px;
  right: 20px;
  width: 300px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const ValidationMessage = styled.div<{ type: 'error' | 'warning' }>`
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  background: ${props => props.type === 'error' ? '#fff2f0' : '#fffbe6'};
  border: 1px solid ${props => props.type === 'error' ? '#ffccc7' : '#ffe58f'};
  color: ${props => props.type === 'error' ? '#cf1322' : '#ad6800'};
  font-size: 14px;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  node: NodeModel | null;
}

// Simple object for DiagramListener to fix errors
const createDiagramListener = (updateLinkPositions: () => void) => ({
  nodesUpdated: updateLinkPositions
});

const Canvas: React.FC = () => {
  const DEFAULT_GRID_SIZE = 15;
  const [engine] = React.useState(() => {
    const engine = createEngine({
      registerDefaultDeleteItemsAction: true
    });
    const model = new DiagramModel();

    // Register custom factories
    engine.getNodeFactories().registerFactory(new SysMLBlockFactory());
    engine.getNodeFactories().registerFactory(new SysMLActivityFactory());
    engine.getLinkFactories().registerFactory(new SysMLLinkFactory());

    // Set model properties
    model.setGridSize(DEFAULT_GRID_SIZE);
    engine.setModel(model);

    // Configure engine with optimizations
    configureEngineForPerformance(engine);
    optimizeDiagramForLargeGraphs(engine);
    setupDiagramInteractions(engine);

    return engine;
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    node: null,
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    node: null as NodeModel | null,
  });
  const [history] = useState(() => new DiagramHistory(engine.getModel(), engine));
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  const [linkDragging, setLinkDragging] = useState({
    isDragging: false,
    sourceNode: null as string | null, 
    sourceConnector: null as string | null,
    tempLink: null as {x1: number, y1: number, x2: number, y2: number} | null,
    isValidDrag: false // Track if this is a valid connector drag
  });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const listenerRef = useRef<any | null>(null);

  const checkDiagramValidity = useCallback(() => {
    const model = engine.getModel();
    const { errors } = validateDiagram(model);
    setValidationErrors(errors);
  }, [engine]);

  const saveState = useCallback(() => {
    const model = engine.getModel();
    setIsAutosaving(true);
    localStorage.setItem('diagram-state', JSON.stringify(model.serialize()));
    setTimeout(() => setIsAutosaving(false), 1000);
  }, [engine]);

  // These functions have been integrated into the model listener below

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Не видаляти вузол, якщо фокус у input, textarea або contentEditable
    const active = document.activeElement;
    if (
      (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) ||
      (active && (active as HTMLElement).isContentEditable)
    ) {
      return;
    }

    if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
      setShowShortcuts(prev => !prev);
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            if (history.canRedo()) {
              history.redo();
              engine.repaintCanvas();
            }
          } else {
            if (history.canUndo()) {
              history.undo();
              engine.repaintCanvas();
            }
          }
          break;
        case 's':
          e.preventDefault();
          saveState();
          break;
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedNodes = engine.getModel().getSelectedEntities();
      if (selectedNodes.length > 0) {
        e.preventDefault();
        selectedNodes.forEach(node => {
          if (node instanceof NodeModel) {
            engine.getModel().removeNode(node);
          }
        });
        engine.repaintCanvas();
        history.saveState();
        checkDiagramValidity();
      }
    }
  }, [engine, history, saveState, checkDiagramValidity]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  useEffect(() => {
    const savedState = localStorage.getItem('diagram-state');
    if (savedState) {
      try {
        const model = engine.getModel();
        model.deserializeModel(JSON.parse(savedState), engine);
        engine.repaintCanvas();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updateLinkPositions();
          });
        });
        checkDiagramValidity();
      } catch (error) {
        console.error('Error loading saved state:', error);
      }
    }
  }, [engine, checkDiagramValidity]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
      // Get canvas bounds
      const rect = event.currentTarget.getBoundingClientRect();
      
      // Use the imported utility function to get accurate model coordinates
      // This ensures consistent coordinate transformation regardless of zoom level
      const model = engine.getModel();
      const modelPosition = screenToModelPosition(event.clientX, event.clientY, rect);

      // Define node options with proper coloring based on node type
      const nodeOptions = {
        name: data.label || '',
        description: data.description || '',
        color: data.label === 'System Block' ? '#e6f3ff' :
              data.label === 'Sensor' ? '#ffe6e6' :
              data.label === 'Processor' ? '#fffbe6' :
              '#e6f3ff'
      };

      // Create appropriate node based on type
      let node;
      switch (data.type) {
        case NODE_TYPES.BLOCK:
          node = new SysMLBlockModel(nodeOptions);
          break;
        case NODE_TYPES.ACTIVITY:
          node = new SysMLActivityModel(nodeOptions);
          break;
        default:
          return;
      }

      // Snap to grid in model coordinates
      const gridSize = DEFAULT_GRID_SIZE;
      const snappedX = Math.round(modelPosition.x / gridSize) * gridSize;
      const snappedY = Math.round(modelPosition.y / gridSize) * gridSize;
      
      // Set the position in model coordinates
      node.setPosition(snappedX, snappedY);

      model.addNode(node);

      engine.repaintCanvas();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateLinkPositions();
        });
      });
      const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
      if (nodeElement) {
        nodeElement.classList.add('node-appear');
      }

      history.saveState();
      checkDiagramValidity();
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [engine, history, checkDiagramValidity]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // This useEffect has been moved after updateLinkPositions is defined - see below

  const clearDiagram = useCallback(() => {
    const model = engine.getModel();
    model.getNodes().forEach(node => {
      model.removeNode(node);
    });
    model.getLinks().forEach(link => {
      model.removeLink(link);
    });
    engine.repaintCanvas();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateLinkPositions();
      });
    });
    history.clear();
  }, [engine, history]);

  const handleDeleteNode = (node: NodeModel) => {
    const model = engine.getModel();
    model.removeNode(node);
    engine.repaintCanvas();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateLinkPositions();
      });
    });
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
    checkDiagramValidity();
  };

  const handleDuplicateNode = (node: NodeModel) => {
    const model = engine.getModel();
    const options = node.getOptions() as any;
    const newNode = node instanceof SysMLBlockModel 
      ? new SysMLBlockModel({ name: `${options.name} (copy)`, color: options.style?.color })
      : new SysMLActivityModel({ name: `${options.name} (copy)`, color: options.style?.color });

    const { x, y } = node.getPosition();
    newNode.setPosition(x + 50, y + 50);

    model.addNode(newNode);
    engine.repaintCanvas();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateLinkPositions();
      });
    });
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
  };

  const handleEditNode = (node: NodeModel) => {
    setEditModal({
      isOpen: true,
      node: node,
    });
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
  };

  const handleSaveNodeEdit = (data: { name: string; description: string }) => {
    if (!editModal.node) return;
    const options = editModal.node ? (editModal.node.getOptions() as any) : {};
    options.name = data.name;
    options.description = data.description;
    engine.repaintCanvas();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateLinkPositions();
      });
    });
    setEditModal({ isOpen: false, node: null });
    checkDiagramValidity();
  };

  const handleValidationMessageClick = (error: ValidationError) => {
    if (error.nodes) {
      error.nodes.forEach((node: NodeModel) => {
        const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
        if (nodeElement) {
          nodeElement.classList.add('highlight-error');
          setTimeout(() => {
            nodeElement.classList.remove('highlight-error');
          }, 2000);
        }
      });
    }
    if (error.links) {
      error.links.forEach(link => {
        const linkElement = document.querySelector(`[data-linkid="${link.getID()}"]`);
        if (linkElement) {
          linkElement.classList.add('highlight-error');
          setTimeout(() => {
            linkElement.classList.remove('highlight-error');
          }, 2000);
        }
      });
    }
  };

  const handleTextGeneration = async (diagramData: any) => {
    try {
      clearDiagram();
      const model = engine.getModel();
      
      // Check if we're receiving raw text or structured data from API
      if (typeof diagramData === 'string') {
        // Legacy text-based processing
        const parsedNodes = parseText(diagramData);
        await generateNodesFromParsedData(parsedNodes, model, engine, (node: NodeModel) => {
          setTimeout(() => {
            const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
            if (nodeElement) {
              nodeElement.classList.add('node-appear');
            }
          }, 0);
        });
      } else {
        // Process structured diagram data from AI backend
        console.log('Received structured diagram data:', diagramData);
        
        // Extract diagram structure from the response
        const diagramStructure = diagramData.diagram || {};
        const elements = diagramStructure.elements || [];
        const relationships = diagramStructure.relationships || [];
        
        // Track created nodes by their element IDs
        const nodeMap = new Map();
        
        // Step 1: Create all nodes first
        for (const element of elements) {
          // Create appropriate node based on element type
          let node;
          if (element.type === 'block' || element.type === 'system') {
            node = new SysMLBlockModel({
              name: element.name,
              description: element.description || '',
              type: NODE_TYPES.BLOCK,
              color: getNodeColor(element)
            });
          } else if (element.type === 'activity' || element.type === 'action') {
            node = new SysMLActivityModel({
              name: element.name,
              description: element.description || '',
              type: NODE_TYPES.ACTIVITY,
              color: getNodeColor(element)
            });
          } else {
            // Default to block for unknown types
            node = new SysMLBlockModel({
              name: element.name,
              description: element.description || '',
              type: NODE_TYPES.BLOCK,
              color: getNodeColor(element)
            });
          }
          
          // Position nodes in a grid layout
          const index = elements.indexOf(element);
          const rowSize = Math.ceil(Math.sqrt(elements.length));
          const x = 100 + (index % rowSize) * 200;
          const y = 100 + Math.floor(index / rowSize) * 150;
          node.setPosition(x, y);
          
          // Add node to model and tracking map
          model.addNode(node);
          nodeMap.set(element.id, node);
          
          // Add animation class
          setTimeout(() => {
            const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
            if (nodeElement) {
              nodeElement.classList.add('node-appear');
            }
          }, 0);
        }
        
        // Step 2: Create all links between nodes
        for (const rel of relationships) {
          const sourceNode = nodeMap.get(rel.source_id);
          const targetNode = nodeMap.get(rel.target_id);
          
          if (sourceNode && targetNode) {
            // Get ports for connection (default to first available port for now)
            const sourcePort = sourceNode.getPort('right') || sourceNode.getPorts()[0];
            const targetPort = targetNode.getPort('left') || targetNode.getPorts()[0];
            
            if (sourcePort && targetPort) {
              // Create link
              const link = new SysMLLinkModel();
              link.setSourcePort(sourcePort);
              link.setTargetPort(targetPort);
              
              // Store relationship data
              link.setData({
                sourceNodeId: sourceNode.getID(),
                sourcePosition: sourcePort.getName(),
                targetNodeId: targetNode.getID(),
                targetPosition: targetPort.getName(),
                relationName: rel.name || '',
                relationType: rel.type || 'dependency'
              });
              
              model.addLink(link);
            }
          }
        }
      }
      
      // Apply the layout optimization using LayoutEngine
      LayoutEngine.optimizeLayout(model);
      
      // Fit the diagram to view all elements and update links
      engine.zoomToFit();
      engine.repaintCanvas();
      
      // Ensure links are properly positioned
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updateLinkPositions();
        });
      });
      
      // Check for any validation issues
      checkDiagramValidity();
      
    } catch (error) {
      console.error('Error generating diagram:', error);
      throw error;
    }
  };
  
  // Helper function to determine node color based on element type
  const getNodeColor = (element: any) => {
    const elementType = element.name?.toLowerCase() || '';
    
    if (elementType.includes('sensor')) {
      return '#ffe6e6';
    } else if (elementType.includes('processor') || elementType.includes('controller')) {
      return '#fffbe6';
    } else if (elementType.includes('system')) {
      return '#e6ffe6';
    } else if (elementType.includes('data') || elementType.includes('storage')) {
      return '#e6f3ff';
    }
    
    return '#ffffff';
  };

  const updateLinkPositions = useCallback(() => {
    const model = engine.getModel();
    
    engine.getModel().getLinks().forEach(link => {
      if (link instanceof SysMLLinkModel) {
        const data = link.getData();
        if (!data) return;
        
        const { sourceNodeId, sourcePosition, targetNodeId, targetPosition } = data;
        
        // Find the actual DOM elements for the connectors
        const sourceConnector = document.querySelector(
          `[data-nodeid="${sourceNodeId}"][data-connector="${sourcePosition}"]`
        );
        const targetConnector = document.querySelector(
          `[data-nodeid="${targetNodeId}"][data-connector="${targetPosition}"]`
        );
        
        if (!sourceConnector || !targetConnector) return;
        
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        
        // Get DOM element positions
        const sourceRect = sourceConnector.getBoundingClientRect();
        const targetRect = targetConnector.getBoundingClientRect();
        
        // Calculate the zoom level and offset
        const zoomLevel = model.getZoomLevel() / 100;
        const offsetX = model.getOffsetX();
        const offsetY = model.getOffsetY();
        
        // Calculate the center of each connector
        const sourceCenterX = sourceRect.left + sourceRect.width / 2;
        const sourceCenterY = sourceRect.top + sourceRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;
        
        // Calculate relative positions to the canvas
        const sourceRelativeX = sourceCenterX - canvasRect.left;
        const sourceRelativeY = sourceCenterY - canvasRect.top;
        const targetRelativeX = targetCenterX - canvasRect.left;
        const targetRelativeY = targetCenterY - canvasRect.top;
        
        // Convert to model coordinates
        const sourceModelX = sourceRelativeX / zoomLevel - offsetX;
        const sourceModelY = sourceRelativeY / zoomLevel - offsetY;
        const targetModelX = targetRelativeX / zoomLevel - offsetX;
        const targetModelY = targetRelativeY / zoomLevel - offsetY;
        
        // Set the link points
        if (link.getPoints().length >= 2) {
          // Source point
          link.getPoints()[0].setPosition(sourceModelX, sourceModelY);
          
          // Target point
          link.getPoints()[link.getPoints().length - 1].setPosition(targetModelX, targetModelY);
        }
      }
    });
    
    // Repaint the canvas
    engine.repaintCanvas();
  }, [engine, canvasRef]);

  // Enhanced function for handling zoom changes that ensures links render correctly
  const handleZoomChange = useCallback(() => {
    try {
      // First update all link positions
      updateLinkPositions();
      
      // Force a re-render of the diagram
      engine.repaintCanvas();
      
      // Schedule a secondary update for links to ensure they're properly rendered
      // This helps fix connection rendering issues after zoom operations
      setTimeout(() => {
        // Force another update of link positions
        updateLinkPositions();
        
        // And repaint one more time
        engine.repaintCanvas();
      }, 50);
    } catch (err) {
      console.warn('Error handling zoom change:', err);
    }
  }, [engine, updateLinkPositions]);

  // Add a handler for zoom changes to update all links
  useEffect(() => {
    // Listen for our custom zoom event
    document.addEventListener('diagram-zoom-changed', handleZoomChange);
    
    return () => {
      document.removeEventListener('diagram-zoom-changed', handleZoomChange);
    };
  }, [handleZoomChange]);
  
  // Add model listener to fix link positions after block text is edited
  useEffect(() => {
    const model = engine.getModel();
    model.registerListener({
      nodesUpdated: () => {
        history.saveState();
      },
      linksUpdated: () => {
        history.saveState();
      },
      labelChanged: () => {
        // When a label changes, update all link positions after a short delay
        // This ensures links stay connected to the block borders instead of jumping to center
        setTimeout(() => {
          updateLinkPositions();
          engine.repaintCanvas();
        }, 50);
        history.saveState();
      },
      descriptionChanged: () => {
        // Also update links after description changes, as this may affect block dimensions
        setTimeout(() => {
          updateLinkPositions();
          engine.repaintCanvas();
        }, 50);
        history.saveState();
      }
    });
  }, [engine, history, updateLinkPositions]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('connector-dot')) {
        const nodeId = target.getAttribute('data-nodeid');
        const connectorType = target.getAttribute('data-connector');
        if (nodeId && connectorType) {
          e.stopPropagation();
          e.preventDefault();
          
          // Get the canvas and connector positions
          const rect = target.getBoundingClientRect();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (canvasRect) {
            // Calculate the initial position for the temporary link
            // These are screen coordinates relative to the canvas
            const x1 = rect.left + rect.width / 2 - canvasRect.left;
            const y1 = rect.top + rect.height / 2 - canvasRect.top;
            
            // Start dragging a new link
            setLinkDragging({
              isDragging: true,
              sourceNode: nodeId,
              sourceConnector: connectorType,
              tempLink: { x1, y1, x2: x1, y2: y1 },
              isValidDrag: true
            });
            
            // Set the cursor to indicate link creation
            document.body.style.cursor = 'crosshair';
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!linkDragging.isDragging || !linkDragging.isValidDrag || !linkDragging.tempLink || !canvasRef.current) return;
      
      // Get canvas position
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Calculate the current mouse position relative to canvas
      const x2 = e.clientX - canvasRect.left;
      const y2 = e.clientY - canvasRect.top;
      
      // Update the temporary link end position
      setLinkDragging(prev => ({
        ...prev,
        tempLink: { ...prev.tempLink!, x2, y2 }
      }));
      
      // Check if we're over a valid target connector
      const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (elemUnder && elemUnder.classList.contains('connector-dot')) {
        const targetNodeId = elemUnder.getAttribute('data-nodeid');
        if (targetNodeId !== linkDragging.sourceNode) {
          document.body.style.cursor = 'pointer'; // Show that we can connect
        }
      } else {
        document.body.style.cursor = 'crosshair'; // Default dragging cursor
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!linkDragging.isDragging || !linkDragging.isValidDrag) return;
      
      // Reset cursor
      document.body.style.cursor = 'default';
      
      // Find the element under the cursor when mouse is released
      const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
      
      // Check if it's a connector dot
      if (elemUnder && elemUnder.classList.contains('connector-dot')) {
        const targetNodeId = elemUnder.getAttribute('data-nodeid');
        const targetConnector = elemUnder.getAttribute('data-connector');
        
        // Make sure we're not connecting a port to itself or another port on the same node
        if (
          targetNodeId &&
          targetConnector &&
          targetNodeId !== linkDragging.sourceNode
        ) {
          // Create the actual link between ports with a small delay to ensure DOM is updated
          setTimeout(() => {
            createLink(
              linkDragging.sourceNode!,
              linkDragging.sourceConnector!,
              targetNodeId,
              targetConnector
            );
          }, 10);
        }
      }
      
      // Reset the dragging state
      setLinkDragging({
        isDragging: false,
        sourceNode: null,
        sourceConnector: null,
        tempLink: null,
        isValidDrag: false
      });
    };

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    const canvasEl = canvasRef.current;
    const resetDragging = () => setLinkDragging({
      isDragging: false,
      sourceNode: null,
      sourceConnector: null,
      tempLink: null,
      isValidDrag: false
    });
    if (canvasEl) {
      canvasEl.addEventListener('mouseleave', resetDragging);
    }
    document.addEventListener('mouseleave', resetDragging);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (canvasEl) {
        canvasEl.removeEventListener('mouseleave', resetDragging);
      }
      document.removeEventListener('mouseleave', resetDragging);
    };
  }, [linkDragging, canvasRef]);
  
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (linkDragging.isDragging && !(e.target as HTMLElement).classList.contains('connector-dot')) {
      setLinkDragging({
        isDragging: false,
        sourceNode: null,
        sourceConnector: null,
        tempLink: null,
        isValidDrag: false
      });
    }
  };

  const createLink = (sourceNodeId: string, sourceConnector: string, targetNodeId: string, targetConnector: string) => {
    const model = engine.getModel();
    const sourceNode = model.getNode(sourceNodeId);
    const targetNode = model.getNode(targetNodeId);
    if (!sourceNode || !targetNode) {
      return;
    }
    const sourcePort = sourceNode.getPort(sourceConnector);
    const targetPort = targetNode.getPort(targetConnector);
    if (!sourcePort || !targetPort) {
      return;
    }
    
    // Create a new link with the SysML model
    const link = new SysMLLinkModel();
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    
    // Store essential data for link positioning
    link.setData({
      sourceNodeId,
      sourcePosition: sourceConnector,
      targetNodeId,
      targetPosition: targetConnector
    });
    
    // Add the link to the model
    model.addLink(link);
    
    // Wait for the DOM to update
    setTimeout(() => {
      // Force a recomputation of all link positions
      updateLinkPositions();
      // Then repaint the canvas
      engine.repaintCanvas();
      
      // Save the diagram state
      history.saveState();
    }, 50);

  };

  useEffect(() => {
    if (!listenerRef.current) {
      // Register and store the listener handle (with .deregister method)
      listenerRef.current = engine.getModel().registerListener(createDiagramListener(updateLinkPositions));
    }
    return () => {
      if (listenerRef.current && typeof listenerRef.current.deregister === 'function') {
        listenerRef.current.deregister();
        listenerRef.current = null;
      }
    };
  }, [engine, updateLinkPositions]);

  return (
    <CanvasWrapper>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#111" />
          </marker>
          <marker
            id="arrowhead-temp"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#888" />
          </marker>
        </defs>
      </svg>
      <Toolbar engine={engine} />
      <CanvasContainer
        ref={canvasRef}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onMouseDown={handleCanvasMouseDown}
      >
        {linkDragging.isDragging && linkDragging.isValidDrag && linkDragging.tempLink && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            <path
              d={`M ${linkDragging.tempLink.x1} ${linkDragging.tempLink.y1} L ${linkDragging.tempLink.x2} ${linkDragging.tempLink.y2}`}
              stroke="#888"
              strokeWidth="2"
              fill="none"
              strokeDasharray="6 4"
              style={{
                animation: 'dashmove 1s linear infinite'
              }}
              markerEnd="url(#arrowhead-temp)"
            />
          </svg>
        )}
        <CanvasWidget engine={engine} />
        {contextMenu.isOpen && (
          <ContextMenu
            position={contextMenu.position}
            onClose={() => setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null })}
            onDelete={() => contextMenu.node && handleDeleteNode(contextMenu.node)}
            onDuplicate={() => contextMenu.node && handleDuplicateNode(contextMenu.node)}
            onEdit={() => contextMenu.node && handleEditNode(contextMenu.node)}
          />
        )}
        {validationErrors.length > 0 && (
          <CSSTransition
            in={showValidationPanel}
            timeout={300}
            classNames="validation-panel"
            unmountOnExit
          >
            <ValidationPanel>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Validation Issues</span>
                <button
                  onClick={() => setShowValidationPanel(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              </div>
              {validationErrors.map((error, index) => (
                <ValidationMessage
                  key={index}
                  type={error.type}
                  onClick={() => handleValidationMessageClick(error)}
                >
                  {error.message}
                  {error.nodes && (
                    <small style={{ display: 'block', marginTop: '4px', opacity: 0.8 }}>
                      Click to highlight affected elements
                    </small>
                  )}
                </ValidationMessage>
              ))}
            </ValidationPanel>
          </CSSTransition>
        )}
        <NodeEditModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal({ isOpen: false, node: null })}
          onSave={handleSaveNodeEdit}
          initialData={{
            name: (editModal.node && (editModal.node.getOptions() as any).name) || '',
            description: (editModal.node && (editModal.node.getOptions() as any).description) || '',
          }}
        />
      </CanvasContainer>
      <DiagramGenerator 
        onGenerate={handleTextGeneration}
        onClear={clearDiagram}
      />
      <AutosaveIndicator isVisible={isAutosaving} />
      <KeyboardShortcutsPanel
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </CanvasWrapper>
  );
};

export default Canvas;