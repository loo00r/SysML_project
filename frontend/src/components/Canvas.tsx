import React, { useState, useEffect, useCallback } from 'react';
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

interface LinkState {
  sourceNode: NodeModel | null;
  targetNode: NodeModel | null;
  isCreatingLink: boolean;
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
  const [linkState, setLinkState] = useState<LinkState>({
    sourceNode: null,
    targetNode: null,
    isCreatingLink: false
  });
  const [isLinkingMode, setIsLinkingMode] = useState(false);

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
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
        color: data.type === NODE_TYPES.BLOCK ? 'rgb(0,192,255)' : 'rgb(192,255,0)',
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

  useEffect(() => {
    const model = engine.getModel();
    model.registerListener({
      nodesUpdated: (event: any) => {
        if (!event?.nodes) return;
        event.nodes.forEach((node: NodeModel) => {
          if (!node) return;
          node.setLocked(false);
          const { x, y } = validateNodePosition(node, model);
          node.setPosition(x, y);
        });
        checkDiagramValidity();
      }
    });

    const handleNodeContextMenu = (e: React.MouseEvent, node: NodeModel) => {
      e.preventDefault();
      e.stopPropagation();
      handleContextMenu(e, node);
    };

    engine.getModel().getNodes().forEach(node => {
      const element = document.querySelector(`[data-nodeid="${node.getID()}"]`);
      if (element) {
        element.addEventListener('contextmenu', (e: any) => handleNodeContextMenu(e, node));
      }
    });

    return () => {
      engine.getModel().getNodes().forEach(node => {
        const element = document.querySelector(`[data-nodeid="${node.getID()}"]`);
        if (element) {
          element.removeEventListener('contextmenu', (e: any) => handleNodeContextMenu(e, node));
        }
      });
    };
  }, [engine, checkDiagramValidity]);

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

  const handleNodeClick = (node: NodeModel) => {
    if (!isLinkingMode) return;
    
    if (!linkState.isCreatingLink) {
      setLinkState({
        sourceNode: node,
        targetNode: null,
        isCreatingLink: true
      });
    } else {
      if (linkState.sourceNode && linkState.sourceNode.getID() !== node.getID()) {
        createLinkBetweenNodes(linkState.sourceNode, node);
        setLinkState({
          sourceNode: null,
          targetNode: null,
          isCreatingLink: false
        });
      }
    }
  };

  const createLinkBetweenNodes = (sourceNode: NodeModel, targetNode: NodeModel) => {
    const link = new SysMLLinkModel();
    const sourcePosition = sourceNode.getPosition();
    const targetPosition = targetNode.getPosition();
    
    const sourcePoint = new PointModel({
      link,
      position: {
        x: sourcePosition.x + (sourceNode as any).getSize().width / 2,
        y: sourcePosition.y + (sourceNode as any).getSize().height / 2
      }
    });
    
    const targetPoint = new PointModel({
      link,
      position: {
        x: targetPosition.x + (targetNode as any).getSize().width / 2,
        y: targetPosition.y + (targetNode as any).getSize().height / 2
      }
    });
    
    link.addPoint(sourcePoint);
    link.addPoint(targetPoint);
    
    engine.getModel().addLink(link);
    engine.repaintCanvas();
    history.saveState();
    checkDiagramValidity();
  };

  const toggleLinkingMode = () => {
    setIsLinkingMode(!isLinkingMode);
    setLinkState({
      sourceNode: null,
      targetNode: null,
      isCreatingLink: false
    });
  };

  useEffect(() => {
    const attachNodeClickEvents = () => {
      engine.getModel().getNodes().forEach(node => {
        const element = document.querySelector(`[data-nodeid="${node.getID()}"]`);
        if (element) {
          element.removeEventListener('click', () => handleNodeClick(node));
          element.addEventListener('click', (e) => {
            if ((e as MouseEvent).button !== 2) {
              handleNodeClick(node);
            }
          });
        }
      });
    };
    
    engine.getModel().registerListener({
      nodesUpdated: attachNodeClickEvents
    });
    
    attachNodeClickEvents();
    
    return () => {
      engine.getModel().getNodes().forEach(node => {
        const element = document.querySelector(`[data-nodeid="${node.getID()}"]`);
        if (element) {
          element.removeEventListener('click', () => handleNodeClick(node));
        }
      });
    };
  }, [engine, isLinkingMode, linkState]);

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
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="#0073e6"
            />
          </marker>
        </defs>
      </svg>
      <Toolbar engine={engine} onToggleLink={toggleLinkingMode} isLinkingMode={isLinkingMode} />
      <CanvasContainer
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={isLinkingMode ? { cursor: 'crosshair' } : {}}
      >
        {isLinkingMode && linkState.sourceNode && (
          <div 
            style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              background: 'rgba(0, 115, 230, 0.8)',
              color: 'white',
              borderRadius: '4px',
              zIndex: 100,
              fontSize: '14px'
            }}
          >
            Select target node to create a link
          </div>
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