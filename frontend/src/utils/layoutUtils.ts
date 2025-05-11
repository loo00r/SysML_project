import { DiagramModel, NodeModel } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';

interface Point {
  x: number;
  y: number;
}

interface LayoutOptions {
  padding?: number;
  levelSeparation?: number;
  nodeSeparation?: number;
  direction?: 'LR' | 'TB';
  verticalGrowth?: boolean; // Add option to prioritize vertical growth
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
      direction = 'LR',
      verticalGrowth = true // Default to vertical growth
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
        // If verticalGrowth is true, use TB-like layout even in LR direction
        // This prioritizes stacking nodes vertically
        const x = verticalGrowth
          ? padding + index * nodeSeparation 
          : (direction === 'LR' ? padding + level * levelSeparation : padding + index * nodeSeparation);
        const y = verticalGrowth
          ? padding + level * levelSeparation
          : (direction === 'LR' ? padding + index * nodeSeparation : padding + level * levelSeparation);
        
        node.setPosition(x, y);
          // Adjust node size to favor vertical growth
        const nodeSize = this.getNodeSize(node);
        if (nodeSize && verticalGrowth) {
          // If the node is a SysML node, it might have a description
          const nodeOptions = node.getOptions() as any;
          if (nodeOptions && nodeOptions.description) {
            const textLength = nodeOptions.description?.length || 0;
            const additionalHeight = Math.min(Math.ceil(textLength / 30) * 20, 100);
            // For SysML nodes, width will be maintained at STANDARD_NODE_WIDTH by their setSize method
            this.setNodeSize(node, nodeSize.width, nodeSize.height + additionalHeight);
          }
        }
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
    
    // Forces tuned to favor vertical arrangement
    const repulsionForce = 3500;   // Higher repulsion
    const attractionForce = 0.25;  // Slightly higher attraction 
    const damping = 0.85; 
    const minDistance = 180;       // Base distance for node separation
    
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
              // Apply stronger repulsion when nodes are too close
              let force = repulsionForce / (distance * distance);
              
              // Extra repulsion if nodes are closer than minimum distance
              if (distance < minDistance) {
                force = force * (1 + (minDistance - distance) / minDistance * 2);
              }
              
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

  // Helper method to get node size
  private static getNodeSize(node: NodeModel): {width: number, height: number} | null {
    // Try to access the size property through common methods
    if (typeof (node as any).getSize === 'function') {
      return (node as any).getSize();
    }
    
    // Default fallback size
    return { width: 200, height: 150 };
  }
    // Helper method to set node size
  private static setNodeSize(node: NodeModel, width: number, height: number): void {
    // Try to access the setSize method
    if (typeof (node as any).setSize === 'function') {
      // For SysML nodes, we only adjust height and keep standard width
      if ((node instanceof SysMLBlockModel) || (node instanceof SysMLActivityModel)) {
        (node as any).setSize(width, height); // The model's setSize method already enforces standard width
      } else {
        (node as any).setSize(width, height);
      }
    }
  }
  
  static optimizeLayout(model: DiagramModel) {
    const nodes = model.getNodes();
    if (nodes.length === 0) return;

    // Apply initial grid layout for better starting positions
    this.applyInitialGridLayout(model);

    // Decide which layout to use based on the diagram structure
    const hasHierarchy = nodes.some(node => {
      const outPort = node.getPort('out');
      return outPort && Object.keys(outPort.getLinks()).length > 0;
    });

    if (hasHierarchy) {
      // First apply hierarchical layout
      this.applyHierarchicalLayout(model);
      
      // Then fine-tune with force-directed layout with fewer iterations
      this.applyForceDirectedLayout(model, 50);
    } else {
      // Apply more iterations for non-hierarchical layouts
      this.applyForceDirectedLayout(model, 150);
    }
    
    // Final pass to resolve any remaining overlaps
    this.resolveOverlaps(model);
  }
  
  // Initial grid layout to give nodes better starting positions
  private static applyInitialGridLayout(model: DiagramModel) {
    const nodes = model.getNodes();
    const numNodes = nodes.length;
    if (numNodes === 0) return;
      // Calculate grid dimensions - prioritize vertical arrangement
    // Use fewer columns and more rows for vertical growth
    const columnsCount = Math.ceil(Math.sqrt(numNodes / 3)); // Even fewer columns to enhance vertical layout
    const rowsCount = Math.ceil(numNodes / columnsCount); // More rows
    
    const horizontalSpacing = STANDARD_NODE_WIDTH * 1.5; // Space based on standard width
    const verticalSpacing = 180; // Less vertical space between rows
    const startX = 100;
    const startY = 100;
    
    // Position nodes in a grid that emphasizes vertical growth
    nodes.forEach((node, index) => {
      const col = Math.floor(index / rowsCount); // Column first to fill vertically
      const row = index % rowsCount;            // Then progress horizontally
      
      node.setPosition(
        startX + col * horizontalSpacing, 
        startY + row * verticalSpacing
      );
        // Adjust node size for vertical growth
      const nodeSize = this.getNodeSize(node);
      if (nodeSize) {
        // If the node is a SysML node, it might have a description
        const nodeOptions = node.getOptions() as any;
        if (nodeOptions && nodeOptions.description) {
          const textLength = nodeOptions.description?.length || 0;
          const additionalHeight = Math.min(Math.ceil(textLength / 30) * 20, 100);
          // For SysML nodes, width will be maintained at STANDARD_NODE_WIDTH by their setSize method
          this.setNodeSize(node, nodeSize.width, nodeSize.height + additionalHeight);
        }
      }
    });
  }
  
  // Resolve any remaining overlaps between nodes
  private static resolveOverlaps(model: DiagramModel) {
    const nodes = model.getNodes();
    const numNodes = nodes.length;
    if (numNodes <= 1) return;
    
    // Use larger horizontal minimum distance to favor vertical layout
    let hasOverlap = true;
    const maxIterations = 20;
    let iteration = 0;
    
    while (hasOverlap && iteration < maxIterations) {
      hasOverlap = false;
      iteration++;
      
      // Check each pair of nodes for overlap
      for (let i = 0; i < numNodes; i++) {
        const node1 = nodes[i];
        const pos1 = node1.getPosition();
        const size1 = this.getNodeSize(node1) || { width: 200, height: 150 };
        
        for (let j = i + 1; j < numNodes; j++) {
          const node2 = nodes[j];
          const pos2 = node2.getPosition();
          const size2 = this.getNodeSize(node2) || { width: 200, height: 150 };
          
          // Calculate center points
          const center1 = { x: pos1.x + size1.width/2, y: pos1.y + size1.height/2 };
          const center2 = { x: pos2.x + size2.width/2, y: pos2.y + size2.height/2 };
          
          const dx = center2.x - center1.x;
          const dy = center2.y - center1.y;
          // We don't use the distance directly, but calculate separate requirements for X and Y
            // Calculate minimum required distance based on node sizes and minimum spacing
          // Use larger distance horizontally to promote vertical stacking and respect standard width
          // We use STANDARD_NODE_WIDTH instead of actual width to maintain consistent spacing
          const requiredX = STANDARD_NODE_WIDTH + 50; // Fixed horizontal distance based on standard width
          const requiredY = (size1.height + size2.height)/2 + 30; // Vertical distance
          
          // If nodes are too close horizontally or vertically
          if (Math.abs(dx) < requiredX && Math.abs(dy) < requiredY) {
            hasOverlap = true;
            
            // Prefer moving vertically over horizontally
            let moveX = 0;
            let moveY = 0;
            
            // If nodes are more aligned horizontally than vertically
            if (Math.abs(dx) / requiredX < Math.abs(dy) / requiredY) {
              // Move primarily vertically
              moveY = (dy === 0) ? 1 : dy / Math.abs(dy);
              moveY *= (requiredY - Math.abs(dy)) / 2;
            } else {
              // Move horizontally if necessary
              moveX = (dx === 0) ? 1 : dx / Math.abs(dx);
              moveX *= (requiredX - Math.abs(dx)) / 2;
            }
            
            // Apply the movement
            node1.setPosition(pos1.x - moveX, pos1.y - moveY);
            node2.setPosition(pos2.x + moveX, pos2.y + moveY);
          }
        }
      }
    }
  }
}