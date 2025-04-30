import { DiagramModel } from '@projectstorm/react-diagrams';
import { DiagramHistory } from './historyUtils';

const AUTOSAVE_KEY = 'sysml-diagram-autosave';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export const setupKeyboardShortcuts = (model: DiagramModel, history: DiagramHistory) => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Undo/Redo
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (e.shiftKey) {
        history.redo();
      } else {
        history.undo();
      }
    }

    // Delete selected nodes
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selectedNodes = model.getSelectedEntities();
      if (selectedNodes.length > 0) {
        e.preventDefault();
        selectedNodes.forEach(node => {
          model.removeNode(node);
        });
      }
    }

    // Copy/Paste
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      const selectedNodes = model.getSelectedEntities();
      if (selectedNodes.length > 0) {
        e.preventDefault();
        // Store selected nodes data in localStorage for paste operation
        localStorage.setItem('clipboard', JSON.stringify(
          selectedNodes.map(node => node.serialize())
        ));
      }
    }

    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const clipboardData = localStorage.getItem('clipboard');
      if (clipboardData) {
        const nodes = JSON.parse(clipboardData);
        nodes.forEach((nodeData: any) => {
          const node = model.getNode(nodeData.id);
          if (node) {
            const newNode = node.clone();
            newNode.setPosition(node.getPosition().x + 50, node.getPosition().y + 50);
            model.addNode(newNode);
          }
        });
      }
    }

    // Select all nodes
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      model.getNodes().forEach(node => {
        node.setSelected(true);
      });
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
};

export const setupAutosave = (model: DiagramModel) => {
  const saveToLocalStorage = () => {
    try {
      const serializedModel = model.serialize();
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serializedModel));
    } catch (error) {
      console.error('Error autosaving diagram:', error);
    }
  };

  const intervalId = setInterval(saveToLocalStorage, AUTOSAVE_INTERVAL);

  // Also save when the model changes
  const listener = {
    nodesUpdated: saveToLocalStorage,
    linksUpdated: saveToLocalStorage,
    offsetUpdated: saveToLocalStorage,
    zoomUpdated: saveToLocalStorage,
    labelChanged: saveToLocalStorage,
  };

  model.registerListener(listener);

  return () => {
    clearInterval(intervalId);
    model.deregisterListener(listener);
  };
};

export const loadAutosavedDiagram = (model: DiagramModel) => {
  try {
    const savedData = localStorage.getItem(AUTOSAVE_KEY);
    if (savedData) {
      const serializedModel = JSON.parse(savedData);
      model.deserializeModel(serializedModel, model.getEngine());
      return true;
    }
  } catch (error) {
    console.error('Error loading autosaved diagram:', error);
  }
  return false;
};

export function downloadDiagram(model: DiagramModel, filename = 'diagram.json') {
  try {
    const dataStr = JSON.stringify(model.serialize(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export diagram:', error);
  }
}
