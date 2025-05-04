import { DiagramModel, NodeModel } from '@projectstorm/react-diagrams';

interface Point {
  x: number;
  y: number;
}

interface LayoutOptions {
  padding?: number;
  levelSeparation?: number;
  nodeSeparation?: number;
  direction?: 'LR' | 'TB';
}

export class LayoutEngine {
  private static calculateNodeLevels(model: DiagramModel): Map<string, number> {
    const levels = new Map<string, number>();
    const nodes = model.getNodes();
    const visited = new Set<string>();

    const calculateLevel = (node: NodeModel, level: number) => {
      const nodeId = node.getID();
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      levels.set(nodeId, Math.max(level, levels.get(nodeId) || 0));

      // Get all outgoing connections
      const outPort = node.getPort('out');
      if (outPort) {
        Object.values(outPort.getLinks()).forEach(link => {
          const targetNode = link.getTargetPort()?.getParent();
          if (targetNode) {
            calculateLevel(targetNode, level + 1);
          }
        });
      }
    };

    // Start with nodes that have no incoming connections
    nodes.forEach(node => {
      const inPort = node.getPort('in');
      const hasIncomingConnections = inPort && Object.keys(inPort.getLinks()).length > 0;
      if (!hasIncomingConnections) {
        calculateLevel(node, 0);
      }
    });

    return levels;
  }

  static applyHierarchicalLayout(model: DiagramModel, options: LayoutOptions = {}) {
    const {
      padding = 50,
      levelSeparation = 200,
      nodeSeparation = 150,
      direction = 'LR'
    } = options;

    const levels = this.calculateNodeLevels(model);
    const levelGroups = new Map<number, NodeModel[]>();

    // Group nodes by their levels
    levels.forEach((level, nodeId) => {
      const node = model.getNode(nodeId);
      if (node) {
        if (!levelGroups.has(level)) {
          levelGroups.set(level, []);
        }
        levelGroups.get(level)!.push(node);
      }
    });

    // Position nodes by level
    let maxNodesInLevel = 0;
    levelGroups.forEach(nodes => {
      maxNodesInLevel = Math.max(maxNodesInLevel, nodes.length);
    });

    levelGroups.forEach((nodes, level) => {
      nodes.forEach((node, index) => {
        const x = direction === 'LR' 
          ? padding + level * levelSeparation
          : padding + index * nodeSeparation;
        const y = direction === 'LR'
          ? padding + index * nodeSeparation
          : padding + level * levelSeparation;
        
        node.setPosition(x, y);
      });
    });

    return {
      width: direction === 'LR'
        ? (levelGroups.size * levelSeparation + padding * 2)
        : (maxNodesInLevel * nodeSeparation + padding * 2),
      height: direction === 'LR'
        ? (maxNodesInLevel * nodeSeparation + padding * 2)
        : (levelGroups.size * levelSeparation + padding * 2)
    };
  }

  static applyForceDirectedLayout(model: DiagramModel, iterations: number = 100) {
    const nodes = model.getNodes();
    const links = model.getLinks();
    
    const repulsionForce = 1000;
    const attractionForce = 0.1;
    const damping = 0.9;
    
    // Initialize velocities
    const velocities = new Map<string, Point>();
    nodes.forEach(node => {
      velocities.set(node.getID(), { x: 0, y: 0 });
    });

    for (let i = 0; i < iterations; i++) {
      // Calculate repulsion between nodes
      nodes.forEach(node1 => {
        const pos1 = node1.getPosition();
        const vel1 = velocities.get(node1.getID())!;

        nodes.forEach(node2 => {
          if (node1 !== node2) {
            const pos2 = node2.getPosition();
            const dx = pos1.x - pos2.x;
            const dy = pos1.y - pos2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
              const force = repulsionForce / (distance * distance);
              vel1.x += (dx / distance) * force;
              vel1.y += (dy / distance) * force;
            }
          }
        });
      });

      // Calculate attraction along links
      links.forEach(link => {
        const sourceNode = link.getSourcePort()?.getParent();
        const targetNode = link.getTargetPort()?.getParent();
        
        if (sourceNode && targetNode) {
          const pos1 = sourceNode.getPosition();
          const pos2 = targetNode.getPosition();
          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            const force = distance * attractionForce;
            const velSource = velocities.get(sourceNode.getID())!;
            const velTarget = velocities.get(targetNode.getID())!;

            velSource.x += (dx / distance) * force;
            velSource.y += (dy / distance) * force;
            velTarget.x -= (dx / distance) * force;
            velTarget.y -= (dy / distance) * force;
          }
        }
      });

      // Apply velocities and damping
      nodes.forEach(node => {
        const velocity = velocities.get(node.getID())!;
        const pos = node.getPosition();
        
        velocity.x *= damping;
        velocity.y *= damping;
        
        node.setPosition(
          pos.x + velocity.x,
          pos.y + velocity.y
        );
      });
    }

    // Center the graph
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      const pos = node.getPosition();
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });

    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    const offset = { x: 500 - centerX, y: 300 - centerY };

    nodes.forEach(node => {
      const pos = node.getPosition();
      node.setPosition(pos.x + offset.x, pos.y + offset.y);
    });
  }

  static optimizeLayout(model: DiagramModel) {
    const nodes = model.getNodes();
    if (nodes.length === 0) return;

    // Decide which layout to use based on the diagram structure
    const hasHierarchy = nodes.some(node => {
      const outPort = node.getPort('out');
      return outPort && Object.keys(outPort.getLinks()).length > 0;
    });

    if (hasHierarchy) {
      this.applyHierarchicalLayout(model);
    } else {
      this.applyForceDirectedLayout(model);
    }
  }
}