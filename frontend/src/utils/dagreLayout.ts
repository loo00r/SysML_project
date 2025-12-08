import { Edge, Node, Position } from 'reactflow';
import dagre from 'dagre';
import { NodeData } from '../store/diagramStore';

type DagreDirection = 'TB' | 'BT' | 'LR';

// Core layout function shared by helpers
const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: DagreDirection = 'TB',
  nodeWidth = 180,
  nodeHeight = 100,
  nodeSep = 50,
  rankSep = 50,
  flexiblePositions = false
) => {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: direction,
    nodesep: nodeSep,
    ranksep: rankSep,
    ranker: 'longest-path',
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes with optional rank hints for SMD diagrams
  nodes.forEach((node) => {
    const nodeConfig: { width: number; height: number; rank?: number } = {
      width: nodeWidth,
      height: nodeHeight,
    };

    if (node.type === 'smdInitial') {
      nodeConfig.rank = 0;
    } else if (node.type === 'smdFinal') {
      nodeConfig.rank = 999;
    }

    g.setNode(node.id, nodeConfig);
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const isHorizontal = direction === 'LR';
  const isBottomToTop = direction === 'BT';

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    const baseNode = {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    if (flexiblePositions) {
      if (node.type === 'smdState' || node.type === 'smdChoice') {
        return {
          ...baseNode,
          targetPosition: Position.Left,
          sourcePosition: Position.Right,
        };
      }
      return baseNode;
    }

    const targetPosition = isHorizontal
      ? Position.Left
      : isBottomToTop
      ? Position.Bottom
      : Position.Top;
    const sourcePosition = isHorizontal
      ? Position.Right
      : isBottomToTop
      ? Position.Top
      : Position.Bottom;

    return {
      ...baseNode,
      targetPosition,
      sourcePosition,
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const applyDagreLayout = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: DagreDirection = 'TB',
  options?: {
    nodeWidth?: number;
    nodeHeight?: number;
    nodeSep?: number;
    rankSep?: number;
    flexiblePositions?: boolean;
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
