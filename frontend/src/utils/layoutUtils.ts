import { DiagramModel, NodeModel } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel, STANDARD_NODE_WIDTH } from '../models/SysMLNodeModels';

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
  }  static applyHierarchicalLayout(model: DiagramModel, options: LayoutOptions = {}) {
    const {
      padding = 50,
      levelSeparation = 250, // Increased for better vertical separation
      nodeSeparation = STANDARD_NODE_WIDTH + 50, // Use standard width + padding for separation
      direction = 'TB', // Change default to top-bottom for better hierarchical representation
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
    });    // Center the nodes at each level for better symmetry
    levelGroups.forEach((nodes, level) => {
      nodes.forEach((node, index) => {
        // Center the nodes horizontally within their level
        // This ensures nodes are evenly distributed and centered
        const centerOffset = (maxNodesInLevel - nodes.length) * (nodeSeparation / 2);
        
        let x, y;
        if (direction === 'TB') {
          // Top-to-bottom layout with horizontal centering
          x = padding + centerOffset + index * nodeSeparation;
          y = padding + level * levelSeparation;
        } else if (direction === 'LR') {
          // Left-to-right layout with vertical centering
          x = padding + level * levelSeparation;
          y = padding + centerOffset + index * nodeSeparation;
        } else {
          // Default centered layout
          x = padding + centerOffset + index * nodeSeparation;
          y = padding + level * levelSeparation;
        }
        
        // Ensure precise alignment by rounding to nearest grid position
        const gridSize = 10;
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
        
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
    
    // Forces tuned to favor vertical arrangement with standard width
    const repulsionForce = 4000;   // Higher repulsion to prevent overlaps
    const attractionForce = 0.2;   // Lower attraction for more spread out layout
    const damping = 0.85; 
    const minDistance = STANDARD_NODE_WIDTH + 30;  // Base distance using standard node width
    
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
            
            if (distance > 0) {              // Apply stronger repulsion when nodes are too close
              let force = repulsionForce / (distance * distance);
              
              // Extra repulsion if nodes are closer than minimum distance
              if (distance < minDistance) {
                force = force * (1 + (minDistance - distance) / minDistance * 2);
              }
              
              // Apply asymmetric force to favor vertical spacing (reduce horizontal movement)
              vel1.x += (dx / distance) * force * 0.7; // Reduce horizontal repulsion
              vel1.y += (dy / distance) * force * 1.3; // Increase vertical repulsion
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
            const velTarget = velocities.get(targetNode.getID())!;            // Modify attraction forces to encourage vertical alignment
            // Apply stronger attraction vertically than horizontally
            velSource.x += (dx / distance) * force * 0.8; // Reduced horizontal attraction
            velSource.y += (dy / distance) * force * 1.2; // Increased vertical attraction
            velTarget.x -= (dx / distance) * force * 0.8; // Reduced horizontal attraction
            velTarget.y -= (dy / distance) * force * 1.2; // Increased vertical attraction
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
      const size = (node as any).getSize();
      // Ensure SysML nodes always return standard width
      if ((node instanceof SysMLBlockModel) || (node instanceof SysMLActivityModel)) {
        return { width: STANDARD_NODE_WIDTH, height: size.height };
      }
      return size;
    }
    
    // Default fallback size, using standard width for SysML nodes
    if ((node instanceof SysMLBlockModel) || (node instanceof SysMLActivityModel)) {
      return { width: STANDARD_NODE_WIDTH, height: 150 };
    }
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

    // Determine if diagram has a hierarchical structure based on connections
    const hasHierarchy = this.detectHierarchicalStructure(model);

    if (hasHierarchy) {
      // For hierarchical diagrams, prioritize a clean hierarchical layout
      this.applyHierarchicalLayout(model, {
        direction: 'TB', // Use top-to-bottom for clearer hierarchy
        levelSeparation: 250, // More vertical space between levels
        nodeSeparation: STANDARD_NODE_WIDTH + 70, // More horizontal space for neater arrangement
        verticalGrowth: true // Emphasize vertical relationships
      });
      
      // Apply minimal force-directed adjustments to preserve hierarchy but fix minor issues
      this.applyForceDirectedLayout(model, 10);
    } else {
      // For non-hierarchical diagrams, use a more balanced arrangement
      this.applyHierarchicalLayout(model, {
        direction: 'TB',
        verticalGrowth: true,
        levelSeparation: 200,
        nodeSeparation: STANDARD_NODE_WIDTH + 60
      });
      
      // Apply more iterations for non-hierarchical layouts, but still limit to maintain control
      this.applyForceDirectedLayout(model, 50);
    }
    
    // Align nodes horizontally within levels for perfect alignment
    this.alignNodesHorizontally(model);
    
    // Align nodes to a grid for a cleaner appearance with 20px precision
    this.snapNodesToGrid(model, 20);
    
    // Final pass to resolve any remaining overlaps
    this.resolveOverlaps(model);
  }
  // Initial grid layout to give nodes better starting positions
  private static applyInitialGridLayout(model: DiagramModel) {
    const nodes = model.getNodes();
    const numNodes = nodes.length;
    if (numNodes === 0) return;
      // Calculate optimal arrangement based on the number of nodes
    // For hierarchical-looking layouts, prefer a tree-like structure
    let columnsCount;
    
    // Choose layout strategy based on node count
    if (numNodes <= 3) {
      // For very small diagrams, single column layout looks best
      columnsCount = 1;
    } else if (numNodes <= 9) {
      // For small to medium diagrams, use a balanced grid
      columnsCount = Math.ceil(Math.sqrt(numNodes));
    } else {
      // For larger diagrams, favor vertical arrangement with fewer columns
      columnsCount = Math.ceil(Math.sqrt(numNodes / 2));
    }
    
    const horizontalSpacing = STANDARD_NODE_WIDTH + 100; // More horizontal space for clearer layout
    const verticalSpacing = 220; // More vertical space between rows
    const startX = 150; // Start further from the edge
    const startY = 100;
      // Position nodes in a grid with better alignment
    nodes.forEach((node, index) => {
      // Fill grid from left to right, top to bottom for more natural reading order
      const row = Math.floor(index / columnsCount);
      const col = index % columnsCount;
      
      // Calculate positions with precise grid alignment
      const xPos = startX + col * horizontalSpacing;
      const yPos = startY + row * verticalSpacing;
      
      // Snap to grid
      const gridSize = 20;
      const snappedX = Math.round(xPos / gridSize) * gridSize;
      const snappedY = Math.round(yPos / gridSize) * gridSize;
      
      node.setPosition(snappedX, snappedY);
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
          // We don't use the distance directly, but calculate separate requirements for X and Y          // Calculate minimum required distance based on node sizes and minimum spacing
          // Use larger distance horizontally to promote vertical stacking and respect standard width
          const requiredX = STANDARD_NODE_WIDTH + 50; // Fixed horizontal distance based on standard width
          // For vertical spacing, use the actual heights since nodes can vary in height
          const requiredY = (size1.height + size2.height)/2 + 40; // Increased vertical distance for better readability
          
          // If nodes are too close horizontally or vertically
          if (Math.abs(dx) < requiredX && Math.abs(dy) < requiredY) {
            hasOverlap = true;
            
            // Prefer moving vertically over horizontally
            let moveX = 0;
            let moveY = 0;
              // Always prefer vertical movement to maintain consistent width layout
            // Only use horizontal movement if vertical alignment is nearly perfect
            if (Math.abs(dy) < 20) {
              // Move horizontally if nodes are almost perfectly aligned vertically
              moveX = (dx === 0) ? 1 : dx / Math.abs(dx);
              moveX *= (requiredX - Math.abs(dx)) / 2;
            } else {
              // Move primarily vertically in most cases
              moveY = (dy === 0) ? 1 : dy / Math.abs(dy);
              moveY *= (requiredY - Math.abs(dy)) / 2;
            }
            
            // Apply the movement
            node1.setPosition(pos1.x - moveX, pos1.y - moveY);
            node2.setPosition(pos2.x + moveX, pos2.y + moveY);
          }
        }
      }
    }
  }

  // Snap all nodes to a grid for a cleaner appearance
  private static snapNodesToGrid(model: DiagramModel, gridSize: number = 10) {
    const nodes = model.getNodes();
    
    nodes.forEach(node => {
      const pos = node.getPosition();
      
      // Snap positions to grid
      const snappedX = Math.round(pos.x / gridSize) * gridSize;
      const snappedY = Math.round(pos.y / gridSize) * gridSize;
      
      // Only update if position changed to avoid unnecessary redraws
      if (snappedX !== pos.x || snappedY !== pos.y) {
        node.setPosition(snappedX, snappedY);
      }
    });
  }

  // Detect if the diagram has a hierarchical structure by analyzing the connections between nodes
  private static detectHierarchicalStructure(model: DiagramModel): boolean {
    const nodes = model.getNodes();
    const links = model.getLinks();
    
    // No hierarchy with 0-1 nodes
    if (nodes.length <= 1) return false;
    
    // Check if we have links forming a tree or hierarchical structure
    const linkCount = Object.keys(links).length;
    
    // If we have very few links compared to nodes, it's likely not hierarchical
    if (linkCount < nodes.length / 2) return false;
    
    // Check for nodes with multiple incoming connections (indicates hierarchy)
    const incomingConnectionCounts: {[key: string]: number} = {};
    
    Object.values(links).forEach(link => {
      const targetNodeId = link.getTargetPort()?.getParent().getID();
      if (targetNodeId) {
        incomingConnectionCounts[targetNodeId] = (incomingConnectionCounts[targetNodeId] || 0) + 1;
      }
    });
    
    // Count nodes with multiple incoming connections
    const nodesWithMultipleIncoming = Object.values(incomingConnectionCounts).filter(count => count > 1).length;
    
    // If we have nodes with multiple incoming connections, it's likely a hierarchy
    if (nodesWithMultipleIncoming > 0) return true;
    
    // If we have a chain of connections with clear levels, it's hierarchical
    const levels = this.calculateNodeLevels(model);
    const distinctLevels = new Set(levels.values()).size;
    
    // If we have distinct levels with a reasonable depth, consider it hierarchical
    return distinctLevels >= 2;
  }
  
  // Align nodes horizontally within their respective levels for cleaner appearance
  private static alignNodesHorizontally(model: DiagramModel) {
    const nodes = model.getNodes();
    if (nodes.length <= 1) return;
    
    // Group nodes by their Y position (with some tolerance)
    const yTolerance = 30; // Nodes within this Y distance are considered on the same level
    const levelGroups: {[key: number]: NodeModel[]} = {};
    
    nodes.forEach(node => {
      const position = node.getPosition();
      const y = position.y;
      
      // Find the closest existing level
      let foundLevel = false;
      for (const levelY in levelGroups) {
        if (Math.abs(Number(levelY) - y) < yTolerance) {
          levelGroups[Number(levelY)].push(node);
          foundLevel = true;
          break;
        }
      }
      
      // If no close level found, create a new one
      if (!foundLevel) {
        levelGroups[y] = [node];
      }
    });
      // For each level, align nodes horizontally to the average Y position
    Object.entries(levelGroups).forEach(([_, levelNodes]) => {
      // Skip single nodes
      if (levelNodes.length <= 1) return;
      
      // Calculate average Y position for this level
      const avgY = levelNodes.reduce((sum, node) => sum + node.getPosition().y, 0) / levelNodes.length;
      const roundedY = Math.round(avgY / 10) * 10; // Round to nearest 10px for clean alignment
      
      // Set all nodes in this level to the same Y position
      levelNodes.forEach(node => {
        const position = node.getPosition();
        node.setPosition(position.x, roundedY);
      });
      
      // Also sort them horizontally if they're close
      levelNodes.sort((a, b) => a.getPosition().x - b.getPosition().x);
      
      // If nodes are clustered too close, space them out evenly
      const xPositions = levelNodes.map(node => node.getPosition().x);
      const minX = Math.min(...xPositions);
      const maxX = Math.max(...xPositions);
      const avgSpacing = (maxX - minX) / (levelNodes.length - 1 || 1);
      
      // If nodes are too close, redistribute them
      if (levelNodes.length > 1 && avgSpacing < STANDARD_NODE_WIDTH) {
        const spacing = STANDARD_NODE_WIDTH + 50; // Desired spacing
        levelNodes.forEach((node, index) => {
          const position = node.getPosition();
          node.setPosition(minX + index * spacing, position.y);
        });
      }
    });
  }
}