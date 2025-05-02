import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AutosaveIndicator } from '../components/custom/AutosaveIndicator';
import styled from 'styled-components';
import KeyboardShortcutsPanel from './custom/KeyboardShortcutsPanel';
import { CSSTransition } from 'react-transition-group';
import createEngine, { 
  DiagramModel, 
  NodeModel,
  BasePositionModelOptions,
  PointModel
} from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { SysMLBlockModel, SysMLActivityModel, SysMLLinkModel } from '../models/SysMLNodeModels';
import { NODE_TYPES } from '../utils/sysmlUtils';
import { validateDiagram, ValidationError, validateNodePosition } from '../utils/validationUtils';
import Toolbar from './Toolbar';
import DiagramGenerator from './DiagramGenerator';
import ContextMenu from './custom/ContextMenu';
import NodeEditModal from './custom/NodeEditModal';
import { parseText, generateNodesFromParsedData } from '../utils/diagramGeneratorUtils';
import {
  configureEngineForPerformance,
  optimizeDiagramForLargeGraphs,
  setupDiagramInteractions
} from '../utils/renderUtils';
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
    cursor: se-resize;
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
  node: ExtendedNodeModel | null;
}

interface DiagramState {
  model: DiagramModel;
  timestamp: number;
}

interface ExtendedNodeModelOptions extends BasePositionModelOptions {
  name: string;
  description?: string;
  style?: any;
}

interface ExtendedNodeModel extends NodeModel {
  getOptions(): ExtendedNodeModelOptions;
}

// Simple class for DiagramModelListener to fix errors
class DiagramModelListener {
  updateLinkPositions: () => void;

  constructor(updateFn: () => void) {
    this.updateLinkPositions = updateFn;
  }

  nodesUpdated() {
    this.updateLinkPositions();
  }
  
  deregister() {
    // Cleanup method needed by StormDiagrams
  }
}

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
    node: null as ExtendedNodeModel | null,
  });
  const [history] = useState(() => new DiagramHistory(engine.getModel()));
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
  const listenerRef = useRef<DiagramModelListener | null>(null);

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
      
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const model = engine.getModel();

      let node;
      const nodeOptions = {
        name: data.label,
        color:
          data.label === 'System Block' ? 'rgb(0,192,255)' :
          data.label === 'Sensor' ? 'rgb(229,57,53)' :
          data.label === 'Processor' ? 'rgb(255,214,0)' :
          data.type === NODE_TYPES.BLOCK ? 'rgb(0,192,255)' :
          'rgb(192,255,0)',
        description: data.description
      };

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

      const gridSize = DEFAULT_GRID_SIZE;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      node.setPosition(snappedX, snappedY);

      model.addNode(node);

      engine.repaintCanvas();
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
        history.saveState();
      },
      descriptionChanged: () => {
        history.saveState();
      }
    });
  }, [engine, history]);

  const clearDiagram = useCallback(() => {
    const model = engine.getModel();
    model.getNodes().forEach(node => {
      model.removeNode(node);
    });
    model.getLinks().forEach(link => {
      model.removeLink(link);
    });
    engine.repaintCanvas();
    history.clear();
  }, [engine, history]);

  const handleContextMenu = (event: React.MouseEvent, node: NodeModel) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      node: node as ExtendedNodeModel,
    });
  };

  const handleDeleteNode = (node: NodeModel) => {
    const model = engine.getModel();
    model.removeNode(node);
    engine.repaintCanvas();
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
    checkDiagramValidity();
  };

  const handleDuplicateNode = (node: ExtendedNodeModel) => {
    const model = engine.getModel();
    const options = node.getOptions();
    const newNode = node instanceof SysMLBlockModel 
      ? new SysMLBlockModel({ name: `${options.name} (copy)`, color: options.style?.color })
      : new SysMLActivityModel({ name: `${options.name} (copy)`, color: options.style?.color });

    const { x, y } = node.getPosition();
    newNode.setPosition(x + 50, y + 50);

    model.addNode(newNode);
    engine.repaintCanvas();
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
  };

  const handleEditNode = (node: NodeModel) => {
    setEditModal({
      isOpen: true,
      node: node as ExtendedNodeModel,
    });
    setContextMenu({ isOpen: false, position: { x: 0, y: 0 }, node: null });
  };

  const handleSaveNodeEdit = (data: { name: string; description: string }) => {
    if (!editModal.node) return;
    const options = (editModal.node as ExtendedNodeModel).getOptions();
    options.name = data.name;
    options.description = data.description;
    engine.repaintCanvas();
    setEditModal({ isOpen: false, node: null });
    checkDiagramValidity();
  };

  const handleValidationMessageClick = (error: ValidationError) => {
    if (error.nodes) {
      error.nodes.forEach(node => {
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

  const handleTextGeneration = async (text: string) => {
    try {
      clearDiagram();
      
      const parsedNodes = parseText(text);
      const model = engine.getModel();
      
      await generateNodesFromParsedData(parsedNodes, model, (node) => {
        setTimeout(() => {
          const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
          if (nodeElement) {
            nodeElement.classList.add('node-appear');
          }
        }, 0);
      });

      engine.repaintCanvas();
      checkDiagramValidity();
      
    } catch (error) {
      console.error('Error generating diagram:', error);
      throw error;
    }
  };

  const updateLinkPositions = useCallback(() => {
    engine.getModel().getLinks().forEach(link => {
      if (link instanceof SysMLLinkModel) {
        const data = link.getData();
        if (!data) return;
        
        const { sourceNodeId, sourcePosition, targetNodeId, targetPosition } = data;
        
        const sourceConnector = document.querySelector(
          `[data-nodeid="${sourceNodeId}"][data-connector="${sourcePosition}"]`
        );
        const targetConnector = document.querySelector(
          `[data-nodeid="${targetNodeId}"][data-connector="${targetPosition}"]`
        );
        
        if (!sourceConnector || !targetConnector) return;
        
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        
        const sourceRect = sourceConnector.getBoundingClientRect();
        const targetRect = targetConnector.getBoundingClientRect();
        
        const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
        
        if (link.getPoints().length >= 2) {
          link.getPoints()[0].setPosition(sourceX, sourceY);
          link.getPoints()[link.getPoints().length - 1].setPosition(targetX, targetY);
        }
      }
    });
    
    engine.repaintCanvas();
  }, [engine, canvasRef]);

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
          const rect = target.getBoundingClientRect();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (canvasRect) {
            const x1 = rect.left + rect.width / 2 - canvasRect.left;
            const y1 = rect.top + rect.height / 2 - canvasRect.top;
            setLinkDragging({
              isDragging: true,
              sourceNode: nodeId,
              sourceConnector: connectorType,
              tempLink: { x1, y1, x2: x1, y2: y1 },
              isValidDrag: true
            });
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!linkDragging.isDragging || !linkDragging.isValidDrag || !linkDragging.tempLink || !canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const x2 = e.clientX - canvasRect.left;
      const y2 = e.clientY - canvasRect.top;
      setLinkDragging(prev => ({
        ...prev,
        tempLink: { ...prev.tempLink!, x2, y2 }
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!linkDragging.isDragging || !linkDragging.isValidDrag) return;
      const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
      if (elemUnder && elemUnder.classList.contains('connector-dot')) {
        const targetNodeId = elemUnder.getAttribute('data-nodeid');
        const targetConnector = elemUnder.getAttribute('data-connector');
        if (
          targetNodeId &&
          targetConnector &&
          targetNodeId !== linkDragging.sourceNode &&
          targetConnector !== linkDragging.sourceConnector
        ) {
          createLink(
            linkDragging.sourceNode!,
            linkDragging.sourceConnector!,
            targetNodeId,
            targetConnector
          );
        }
      }
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
    const sourceNode = engine.getModel().getNode(sourceNodeId);
    const targetNode = engine.getModel().getNode(targetNodeId);
    if (!sourceNode || !targetNode) {
      return;
    }
    const sourcePort = sourceNode.getPort(sourceConnector);
    const targetPort = targetNode.getPort(targetConnector);
    if (!sourcePort || !targetPort) {
      return;
    }
    const link = new SysMLLinkModel();
    link.setSourcePort(sourcePort);
    link.setTargetPort(targetPort);
    link.setData({
      sourceNodeId,
      sourcePosition: sourceConnector,
      targetNodeId,
      targetPosition: targetConnector
    });
    engine.getModel().addLink(link);
    engine.repaintCanvas();
    updateLinkPositions();
    history.saveState();
  };

  useEffect(() => {
    if (!listenerRef.current) {
      listenerRef.current = new DiagramModelListener(updateLinkPositions);
    }
    
    engine.getModel().registerListener(listenerRef.current);
    
    return () => {
      if (listenerRef.current) {
        engine.getModel().deregisterListener(listenerRef.current);
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
            <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
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
            onDuplicate={() => contextMenu.node && handleDuplicateNode(contextMenu.node as ExtendedNodeModel)}
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
            name: (editModal.node?.getOptions() as ExtendedNodeModelOptions)?.name || '',
            description: (editModal.node?.getOptions() as ExtendedNodeModelOptions)?.description || '',
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