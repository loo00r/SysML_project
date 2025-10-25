import { Edge, Node, Position } from 'reactflow';
import dagre from 'dagre';
import { NodeData } from '../store/diagramStore';

// This is the core layout function
const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
  nodeWidth = 180,
  nodeHeight = 100,
  nodeSep = 50, // Default spacing
  rankSep = 50,  // Default spacing
  flexiblePositions = false // For SMD diagrams that use all 4 sides
) => {
  const g = new dagre.graphlib.Graph();

  // Set graph properties
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes and edges to the graph
  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });
  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Calculate the layout
  dagre.layout(g);

  // Apply the new positions to the nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const baseNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    // For SMD diagrams with flexible positions
    if (flexiblePositions) {
      // State/Choice nodes: force LEFT for targets, RIGHT for sources
      if (node.type === 'smdState' || node.type === 'smdChoice') {
        return {
          ...baseNode,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        };
      }
      // For Initial/Final, allow flexible positioning (all 4 sides)
      return baseNode;
    }

    // For standard diagrams (IBD, BDD), use fixed positions based on direction
    return {
      ...baseNode,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
    };
  });

  return { nodes: layoutedNodes, edges };
};

// This is the helper function called from the store
export const applyDagreLayout = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    nodeSep?: number;
    rankSep?: number;
    flexiblePositions?: boolean; // Set true for SMD diagrams
  }
) => {
  return getLayoutedElements(
    nodes,
    edges,
    direction,
    options?.nodeWidth,
    options?.nodeHeight,
    options?.nodeSep,
    options?.rankSep,
    options?.flexiblePositions || false
  );
};