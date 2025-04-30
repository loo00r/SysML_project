import React, { useState, useEffect, useCallback } from 'react';
import { AutosaveIndicator } from '../components/custom/AutosaveIndicator';
import styled from 'styled-components';
import KeyboardShortcutsPanel from './custom/KeyboardShortcutsPanel';
import { CSSTransition } from 'react-transition-group';
import createEngine, { 
  DiagramModel, 
  DefaultLinkModel,
  DefaultPortModel,
  PortModelAlignment,
  NodeModel,
  BasePositionModelOptions
} from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';
import { NODE_TYPES, getNodeStyle, validateConnection } from '../utils/sysmlUtils';
import { validateDiagram, ValidationError, validateNodePosition } from '../utils/validationUtils';
import Toolbar from './Toolbar';
import DiagramGenerator from './DiagramGenerator';
import ContextMenu from './custom/ContextMenu';
import NodeEditModal from './custom/NodeEditModal';
import { parseText, generateNodesFromParsedData } from '../utils/diagramGeneratorUtils';
import {
  configureEngineForPerformance,
  optimizeDiagramForLargeGraphs,
  setupSmartRouting,
  setupDiagramInteractions
} from '../utils/renderUtils';
import { DiagramHistory } from '../utils/historyUtils';
import { loadAutosavedDiagram } from '../utils/diagramUtils';

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
  
  .port {
    width: 12px;
    height: 12px;
    background: #fff;
    border: 2px solid #666;
    border-radius: 50%;
    cursor: pointer;
    &:hover {
      background: #ddd;
    }
  }
  
  .link-path {
    stroke: #666;
    stroke-width: 2px;
    pointer-events: all;
    &:hover {
      stroke: #0073e6;
      stroke-width: 3px;
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
  node: ExtendedNodeModel | null;  // Update to use ExtendedNodeModel
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

const Canvas: React.FC = () => {
  const DEFAULT_GRID_SIZE = 15;
  const [engine] = React.useState(() => {
    const engine = createEngine();
    const model = new DiagramModel();

    // Set model properties first
    model.setGridSize(DEFAULT_GRID_SIZE);
    engine.setModel(model);

    // Configure engine with performance optimizations
    configureEngineForPerformance(engine);
    optimizeDiagramForLargeGraphs(engine);
    setupSmartRouting(engine);
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
  const [undoStack, setUndoStack] = useState<DiagramState[]>([]);
  const [redoStack, setRedoStack] = useState<DiagramState[]>([]);

  // Move checkDiagramValidity up before it's used
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
    // Don't trigger shortcuts when typing in input fields
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

    // Delete key for selected nodes
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

  // Set up keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
  
  // Load saved state on mount
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

      // Add ports after node creation
      node.addPort(new DefaultPortModel({
        in: true,
        name: 'in',
        alignment: PortModelAlignment.LEFT
      }));
      node.addPort(new DefaultPortModel({
        in: false,
        name: 'out',
        alignment: PortModelAlignment.RIGHT
      }));

      // Set position
      const gridSize = DEFAULT_GRID_SIZE;
      const snappedX = Math.round(x / gridSize) * gridSize;
      const snappedY = Math.round(y / gridSize) * gridSize;
      node.setPosition(snappedX, snappedY);

      // Add node to model
      model.addNode(node);

      // Trigger repaint and animation
      engine.repaintCanvas();
      const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);
      if (nodeElement) {
        nodeElement.classList.add('node-appear');
      }

      // Save state and validate
      history.saveState();
      checkDiagramValidity();
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [engine, history, checkDiagramValidity]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Add history save points on important actions
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
    history.clear(); // Clear history when diagram is cleared
  }, [engine, history]);

  useEffect(() => {
    const model = engine.getModel();
    model.registerListener({
      nodesUpdated: (event: any) => {
        event.nodes.forEach((node: NodeModel) => {
          node.setLocked(false);
          const { x, y } = validateNodePosition(node, model);
          node.setPosition(x, y);
        });
        checkDiagramValidity();
      },
      linksUpdated: (event: any) => {
        event.links.forEach((link: DefaultLinkModel) => {
          if (link.getSourcePort() && link.getTargetPort()) {
            const isValid = validateConnection(link.getSourcePort(), link.getTargetPort());
            if (!isValid) {
              model.removeLink(link);
              engine.repaintCanvas();
            }
          }
        });
        checkDiagramValidity();
      }
    });

    // Add context menu handler to engine
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
      // Cleanup listeners
      engine.getModel().getNodes().forEach(node => {
        const element = document.querySelector(`[data-nodeid="${node.getID()}"]`);
        if (element) {
          element.removeEventListener('contextmenu', (e: any) => handleNodeContextMenu(e, node));
        }
      });
    };
  }, [engine]);

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

    // Clone ports
    Object.values(node.getPorts()).forEach(port => {
      newNode.addPort(new DefaultPortModel({
        name: port.getOptions().name,
        alignment: port.getOptions().alignment,
      }));
    });

    // Position slightly offset from original
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
        // Add temporary highlight effect
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
        // Add temporary highlight effect
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
        // Add animation class to newly created nodes
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

  return (
    <CanvasWrapper>
      <Toolbar engine={engine} />
      <CanvasContainer
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
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