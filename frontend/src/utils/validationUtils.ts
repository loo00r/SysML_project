import { DiagramModel, NodeModel, LinkModel } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';
import { validateConnection } from './sysmlUtils';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodes?: NodeModel[];
  links?: LinkModel[];
}

interface ValidationResult {
  errors: ValidationError[];
  isValid: boolean;
}

export const validateDiagram = (model: DiagramModel): ValidationResult => {
  const errors: ValidationError[] = [];
  const nodes = model.getNodes();
  const links = model.getLinks();

  // Validate node names and descriptions
  nodes.forEach(node => {
    const name = node.getOptions().name;
    const description = (node as any).getDescription?.();

    if (!name || name.trim().length === 0) {
      errors.push({
        type: 'error',
        message: 'Node name cannot be empty',
        nodes: [node],
      });
    } else if (name.length > 50) {
      errors.push({
        type: 'warning',
        message: 'Node name is too long (max 50 characters)',
        nodes: [node],
      });
    }

    if (description && description.length > 200) {
      errors.push({
        type: 'warning',
        message: 'Node description is too long (max 200 characters)',
        nodes: [node],
      });
    }
  });

  // Validate duplicate node names
  const nodeNames = new Map<string, NodeModel>();
  nodes.forEach(node => {
    const name = node.getOptions().name.toLowerCase();
    if (nodeNames.has(name)) {
      errors.push({
        type: 'warning',
        message: `Duplicate node name: ${node.getOptions().name}`,
        nodes: [node, nodeNames.get(name)!],
      });
    } else {
      nodeNames.set(name, node);
    }
  });

  // Validate connections
  links.forEach(link => {
    const sourcePort = link.getSourcePort();
    const targetPort = link.getTargetPort();

    if (!sourcePort || !targetPort) {
      errors.push({
        type: 'error',
        message: 'Invalid connection: missing port',
        links: [link],
      });
      return;
    }

    if (!validateConnection(sourcePort, targetPort)) {
      errors.push({
        type: 'error',
        message: 'Invalid connection: incompatible ports',
        links: [link],
      });
    }
  });

  // Validate node positions
  nodes.forEach(node => {
    const { x, y } = node.getPosition();
    if (x < 0 || y < 0) {
      errors.push({
        type: 'warning',
        message: 'Node position is outside the visible area',
        nodes: [node],
      });
    }
  });

  // Validate diagram consistency
  if (nodes.length === 0) {
    errors.push({
      type: 'warning',
      message: 'Diagram is empty',
    });
  } else {
    // Check for isolated nodes
    nodes.forEach(node => {
      const hasConnections = links.some(link => 
        link.getSourcePort()?.getParent() === node ||
        link.getTargetPort()?.getParent() === node
      );
      
      if (!hasConnections) {
        errors.push({
          type: 'warning',
          message: `Isolated node: ${node.getOptions().name}`,
          nodes: [node],
        });
      }
    });

    // Check for cycles in activity diagrams
    if (nodes.some(node => node instanceof SysMLActivityModel)) {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const hasCycle = (node: NodeModel): boolean => {
        const nodeId = node.getID();
        visited.add(nodeId);
        recursionStack.add(nodeId);

        const outPort = node.getPort('out');
        if (outPort) {
          for (const link of Object.values(outPort.getLinks())) {
            const targetNode = link.getTargetPort()?.getParent();
            if (targetNode) {
              const targetId = targetNode.getID();
              if (!visited.has(targetId)) {
                if (hasCycle(targetNode)) {
                  return true;
                }
              } else if (recursionStack.has(targetId)) {
                errors.push({
                  type: 'error',
                  message: 'Cyclic dependency detected in activity diagram',
                  nodes: [node, targetNode],
                });
                return true;
              }
            }
          }
        }

        recursionStack.delete(nodeId);
        return false;
      };

      nodes.forEach(node => {
        if (!visited.has(node.getID())) {
          hasCycle(node);
        }
      });
    }
  }

  return {
    errors,
    isValid: errors.filter(e => e.type === 'error').length === 0,
  };
};

export const validateNodePosition = (node: NodeModel, model: DiagramModel) => {
  const { x, y } = node.getPosition();
  const gridSize = model.getGridSize();
  
  // Snap to grid
  const snappedX = Math.round(x / gridSize) * gridSize;
  const snappedY = Math.round(y / gridSize) * gridSize;
  
  // Ensure minimum distance between nodes
  const minDistance = 50;
  let adjustedX = snappedX;
  let adjustedY = snappedY;
  
  model.getNodes().forEach(otherNode => {
    if (otherNode !== node) {
      const otherPos = otherNode.getPosition();
      const dx = Math.abs(adjustedX - otherPos.x);
      const dy = Math.abs(adjustedY - otherPos.y);
      
      if (dx < minDistance && dy < minDistance) {
        if (dx < dy) {
          adjustedX = otherPos.x + (adjustedX < otherPos.x ? -minDistance : minDistance);
        } else {
          adjustedY = otherPos.y + (adjustedY < otherPos.y ? -minDistance : minDistance);
        }
      }
    }
  });
  
  return {
    x: Math.max(0, adjustedX),
    y: Math.max(0, adjustedY)
  };
};