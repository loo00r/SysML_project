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
  rankSep = 50  // Default spacing
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
    return {
      ...node,
      targetPosition: direction === 'LR' ? Position.Left : Position.Top,
      sourcePosition: direction === 'LR' ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
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
  }
) => {
  return getLayoutedElements(
    nodes,
    edges,
    direction,
    options?.nodeWidth,
    options?.nodeHeight,
    options?.nodeSep,
    options?.rankSep
  );
};