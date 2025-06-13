import { DiagramEngine, PointModel, PortModelAlignment } from '@projectstorm/react-diagrams';
import { Point } from '@projectstorm/geometry';
import { STANDARD_NODE_WIDTH } from '../models/SysMLNodeModels';

/**
 * Create a new point model for a link with a fixed position
 */
export const createLinkMiddlePoint = (link: any, firstPoint: any, lastPoint: any, sourcePort: any, targetPort: any) => {
  // Create default midpoint position
  const defaultX = (firstPoint.getPosition().x + lastPoint.getPosition().x) / 2;
  const defaultY = (firstPoint.getPosition().y + lastPoint.getPosition().y) / 2;
    
  // Create a new point for the link
  const point = new PointModel({
    link: link,
    position: new Point(defaultX, defaultY)
  });
    
  if (!sourcePort || !targetPort) {
    return point;
  }
    
  // Get port alignments
  const sourceAlignment = sourcePort.getOptions().alignment;
  const targetAlignment = targetPort.getOptions().alignment;
    
  // Calculate ideal position based on port alignments
  if (sourceAlignment === targetAlignment) {
    // Same side ports - create a U-shape path
    const offset = 60; // Offset distance from node
    
    if (sourceAlignment === PortModelAlignment.TOP || sourceAlignment === PortModelAlignment.BOTTOM) {
      // For top/bottom ports, extend vertically first
      point.setPosition(
        defaultX,
        firstPoint.getPosition().y - (sourceAlignment === PortModelAlignment.TOP ? offset : -offset)
      );
    } else {
      // For left/right ports, extend horizontally first
      point.setPosition(
        firstPoint.getPosition().x - (sourceAlignment === PortModelAlignment.LEFT ? offset : -offset),
        defaultY
      );
    }
  } else {
    // Different sides - create an L-shape path or direct path
    if (
      (sourceAlignment === PortModelAlignment.TOP && targetAlignment === PortModelAlignment.LEFT) ||
      (sourceAlignment === PortModelAlignment.LEFT && targetAlignment === PortModelAlignment.TOP)
    ) {
      point.setPosition(firstPoint.getPosition().x, lastPoint.getPosition().y);
    } else if (
      (sourceAlignment === PortModelAlignment.TOP && targetAlignment === PortModelAlignment.RIGHT) ||
      (sourceAlignment === PortModelAlignment.RIGHT && targetAlignment === PortModelAlignment.TOP)
    ) {
      point.setPosition(lastPoint.getPosition().x, firstPoint.getPosition().y);
    } else if (
      (sourceAlignment === PortModelAlignment.BOTTOM && targetAlignment === PortModelAlignment.LEFT) ||
      (sourceAlignment === PortModelAlignment.LEFT && targetAlignment === PortModelAlignment.BOTTOM)
    ) {
      point.setPosition(firstPoint.getPosition().x, lastPoint.getPosition().y);
    } else if (
      (sourceAlignment === PortModelAlignment.BOTTOM && targetAlignment === PortModelAlignment.RIGHT) ||
      (sourceAlignment === PortModelAlignment.RIGHT && targetAlignment === PortModelAlignment.BOTTOM)
    ) {
      point.setPosition(lastPoint.getPosition().x, firstPoint.getPosition().y);
    }
  }
    
  return point;
};

/**
 * Enhanced link routing for perfect orthogonal connections
 */
export const enhanceLinkRouting = (link: any) => {
  if (link.points.length === 0) return;
  
  // Get the first and last points representing connection to nodes
  const firstPoint = link.getFirstPoint();
  const lastPoint = link.getLastPoint();
  const sourcePort = link.getSourcePort();
  const targetPort = link.getTargetPort();
  
  // Skip if missing ports
  if (!sourcePort || !targetPort) return;
  
  const sourceAlignment = sourcePort.getOptions().alignment;
  const targetAlignment = targetPort.getOptions().alignment;
  
  // For direct top-bottom or left-right connections, use just 2 points
  if ((sourceAlignment === PortModelAlignment.TOP && targetAlignment === PortModelAlignment.BOTTOM) ||
      (sourceAlignment === PortModelAlignment.BOTTOM && targetAlignment === PortModelAlignment.TOP) ||
      (sourceAlignment === PortModelAlignment.LEFT && targetAlignment === PortModelAlignment.RIGHT) ||
      (sourceAlignment === PortModelAlignment.RIGHT && targetAlignment === PortModelAlignment.LEFT)) {
    // Ensure we have exactly 2 points for a straight line
    if (link.points.length > 2) {
      // Remove any middle points to ensure direct connection
      link.setPoints([firstPoint, lastPoint]);
    }
  }
  // For ports on the same side, use a 3-point path for a clean orthogonal route
  else if (sourceAlignment === targetAlignment) {
    if (link.points.length === 2) {
      // Add a middle point for orthogonal routing
      const middlePoint = createLinkMiddlePoint(link, firstPoint, lastPoint, sourcePort, targetPort);
      link.addPoint(middlePoint);
    } else if (link.points.length === 3) {
      // Update the middle point
      const middlePoint = createLinkMiddlePoint(link, firstPoint, lastPoint, sourcePort, targetPort);
      link.points[1].setPosition(middlePoint.getPosition());
    }
  }
  // For connections between adjacent sides (L-shape), ensure optimal route
  else {
    // Determine the positions of parent nodes
    const sourceNode = sourcePort.getParent();
    const targetNode = targetPort.getParent();
    
    if (sourceNode && targetNode) {
      // If the nodes are closely aligned, optimize the path
      const sourcePos = sourceNode.getPosition();
      const targetPos = targetNode.getPosition();
      
      // For nodes that are closely aligned vertically or horizontally
      const verticallyAligned = Math.abs(sourcePos.x - targetPos.x) < 100;
      const horizontallyAligned = Math.abs(sourcePos.y - targetPos.y) < 100;
      
      if (verticallyAligned || horizontallyAligned) {
        // Optimize the path for aligned nodes by using 3 points with the
        // middle point positioned to create straight segments
        if (link.points.length !== 3) {
          // Create a middle point for L-shaped routing
          const middlePoint = new PointModel({
            link: link
          });
          
          if (verticallyAligned) {
            // Position the middle point for vertical alignment
            middlePoint.setPosition(
              firstPoint.getPosition().x,
              lastPoint.getPosition().y
            );
          } else {
            // Position the middle point for horizontal alignment
            middlePoint.setPosition(
              lastPoint.getPosition().x,
              firstPoint.getPosition().y
            );
          }
          
          // Replace points with the optimized 3-point path
          link.setPoints([firstPoint, middlePoint, lastPoint]);
        } else {
          // Update the existing middle point
          if (verticallyAligned) {
            link.points[1].setPosition(
              firstPoint.getPosition().x,
              lastPoint.getPosition().y
            );
          } else {
            link.points[1].setPosition(
              lastPoint.getPosition().x,
              firstPoint.getPosition().y
            );
          }
        }
      }
    }
  }
};

/**
 * Enhanced version of optimizeLinkRouting that focuses on perfect orthogonal connections
 */
export const optimizeLinkRouting = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;

  // Process all links
  const links = model.getLinks();
  Object.values(links).forEach(link => {
    enhanceLinkRouting(link);
  });
};

/**
 * Adjust port offsets for cleaner connections - exact same as before
 */
export const adjustPortOffsets = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;
  
  // Get all nodes
  const nodes = model.getNodes();

  // Adjust port offsets based on node position
  nodes.forEach(node => {
    const nodeSize = (node as any).getSize ? (node as any).getSize() : { width: STANDARD_NODE_WIDTH, height: 150 };
    
    // Get ports
    const ports = node.getPorts();
    Object.values(ports).forEach(port => {
      // Use port names to determine positioning instead of alignment
      const portName = port.getName();
      
      // Set port offsets to center of each edge for cleaner connections
      if (portName === 'top') {
        const x = Math.round(nodeSize.width / 2);
        const y = 0;
        port.setPosition(x, y);
      } else if (portName === 'right') {
        const x = nodeSize.width;
        const y = Math.round(nodeSize.height / 2);
        port.setPosition(x, y);
      } else if (portName === 'bottom') {
        const x = Math.round(nodeSize.width / 2);
        const y = nodeSize.height;
        port.setPosition(x, y);
      } else if (portName === 'left') {
        const x = 0;
        const y = Math.round(nodeSize.height / 2);
        port.setPosition(x, y);
      }
    });
  });
};
