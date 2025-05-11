import { DiagramEngine, PointModel, LinkModel, PortModelAlignment } from '@projectstorm/react-diagrams';
import { STANDARD_NODE_WIDTH } from '../models/SysMLNodeModels';
import { Point } from '@projectstorm/geometry';

/**
 * Smart link routing utility for ensuring straight, aligned connections between nodes
 */
export const optimizeLinkRouting = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;

  // Process all links
  const links = model.getLinks();
  Object.values(links).forEach(link => {
    // Skip links without source or target
    if (!link.getSourcePort() || !link.getTargetPort()) return;
    
    const sourcePort = link.getSourcePort();
    const targetPort = link.getTargetPort();
    const sourceNode = sourcePort.getParent();
    const targetNode = targetPort.getParent();
    
    // Skip if we don't have both nodes
    if (!sourceNode || !targetNode) return;

    const sourcePos = sourceNode.getPosition();
    const targetPos = targetNode.getPosition();

    // Calculate node centers
    const sourceNodeSize = (sourceNode as any).getSize ? (sourceNode as any).getSize() : { width: STANDARD_NODE_WIDTH, height: 150 };
    const targetNodeSize = (targetNode as any).getSize ? (targetNode as any).getSize() : { width: STANDARD_NODE_WIDTH, height: 150 };
    
    const sourceCenter = {
      x: sourcePos.x + sourceNodeSize.width / 2,
      y: sourcePos.y + sourceNodeSize.height / 2
    };
    
    const targetCenter = {
      x: targetPos.x + targetNodeSize.width / 2,
      y: targetPos.y + targetNodeSize.height / 2
    };
    
    // Get source and target port alignments
    const sourceAlignment = sourcePort.getOptions().alignment;
    const targetAlignment = targetPort.getOptions().alignment;

    // Clear existing interior points (keep only source and target)
    const sourcePoint = link.getFirstPoint();
    const targetPoint = link.getLastPoint();

    // Handle different port placement combinations
    // Direct connection for opposing ports
    if (
      (sourceAlignment === PortModelAlignment.TOP && targetAlignment === PortModelAlignment.BOTTOM) ||
      (sourceAlignment === PortModelAlignment.BOTTOM && targetAlignment === PortModelAlignment.TOP) ||
      (sourceAlignment === PortModelAlignment.LEFT && targetAlignment === PortModelAlignment.RIGHT) ||
      (sourceAlignment === PortModelAlignment.RIGHT && targetAlignment === PortModelAlignment.LEFT)
    ) {
      // Use direct straight connection - just source and target points
      link.setPoints([sourcePoint, targetPoint]);
      return;
    }
    
    // For same-side ports, create a U-shaped path
    if (sourceAlignment === targetAlignment) {
      const offset = 60; // Distance from nodes
      
      // Create a path with 3 points
      const midPoint = new PointModel({
        link,
        position: new Point(0, 0) // Will be set below
      });
      
      // Position middle point based on port alignment
      if (sourceAlignment === PortModelAlignment.TOP) {
        // For top ports, go up
        const midY = Math.min(sourcePos.y, targetPos.y) - offset;
        const midX = (sourcePoint.getPosition().x + targetPoint.getPosition().x) / 2;
        midPoint.setPosition(midX, midY);
      } else if (sourceAlignment === PortModelAlignment.BOTTOM) {
        // For bottom ports, go down
        const midY = Math.max(sourcePos.y + sourceNodeSize.height, 
                             targetPos.y + targetNodeSize.height) + offset;
        const midX = (sourcePoint.getPosition().x + targetPoint.getPosition().x) / 2;
        midPoint.setPosition(midX, midY);
      } else if (sourceAlignment === PortModelAlignment.LEFT) {
        // For left ports, go left
        const midX = Math.min(sourcePos.x, targetPos.x) - offset;
        const midY = (sourcePoint.getPosition().y + targetPoint.getPosition().y) / 2;
        midPoint.setPosition(midX, midY);
      } else if (sourceAlignment === PortModelAlignment.RIGHT) {
        // For right ports, go right
        const midX = Math.max(sourcePos.x + sourceNodeSize.width, 
                             targetPos.x + targetNodeSize.width) + offset;
        const midY = (sourcePoint.getPosition().y + targetPoint.getPosition().y) / 2;
        midPoint.setPosition(midX, midY);
      }
      
      // Set the new path
      link.setPoints([sourcePoint, midPoint, targetPoint]);
      return;
    }
    
    // For adjacent ports (e.g., TOP-LEFT, BOTTOM-RIGHT), create an L-shaped path
    // Determine if nodes are aligned vertically or horizontally
    const verticallyAligned = Math.abs(sourceCenter.x - targetCenter.x) < 80;
    const horizontallyAligned = Math.abs(sourceCenter.y - targetCenter.y) < 80;
    
    // Clear existing paths and create a single middle point
    // This creates a clear L-shaped path
    if (verticallyAligned || horizontallyAligned) {
      // Create an L-shaped route with one middle point
      const middlePoint = new PointModel({ link });
      
      if (verticallyAligned) {
        // Nodes are roughly aligned vertically, bend horizontally
        middlePoint.setPosition(
          sourcePoint.getPosition().x,
          targetPoint.getPosition().y
        );
      } else {
        // Either horizontally aligned or neither - default to bend vertically
        middlePoint.setPosition(
          targetPoint.getPosition().x,
          sourcePoint.getPosition().y
        );
      }
      
      // Set the new path with a single mid-point
      link.setPoints([sourcePoint, middlePoint, targetPoint]);
    } else {
      // Use the standard Manhattan routing which creates 90-degree angles
      // Create an L-shaped route with one middle point
      const middlePoint = new PointModel({
        link,
        position: new Point(targetPoint.getPosition().x, sourcePoint.getPosition().y)
      });
      
      // Insert the middle point
      link.setPoints([sourcePoint, middlePoint, targetPoint]);
    }
  });
};

/**
 * Adjust port offsets for cleaner connections
 */
export const adjustPortOffsets = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;
  
  // Get all nodes and links
  const nodes = model.getNodes();

  // Adjust port offsets based on node position in the diagram
  nodes.forEach(node => {
    const nodePos = node.getPosition();
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
