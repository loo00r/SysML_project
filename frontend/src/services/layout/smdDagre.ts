import dagre from 'dagre';
import type { Edge, Node } from 'reactflow';
import type { NodeData } from '../../store/diagramStore';
import { getCompositeWorkspaceRect, getNodeDimensions } from '../../utils/smdComposite';

type DagreNodeMeta = {
  x?: number;
  y?: number;
  rank?: number;
  order?: number;
};

const CHILD_TYPES: ReadonlySet<NodeData['type']> = new Set([
  'smdInitial',
  'smdState',
  'smdFinal',
  'smdChoice',
  'smdComposite',
]);

const DEFAULT_CHILD_SIZE: Partial<Record<NodeData['type'], { width: number; height: number }>> = {
  smdInitial: { width: 40, height: 40 },
  smdFinal: { width: 40, height: 40 },
  smdState: { width: 160, height: 64 },
  smdComposite: { width: 220, height: 150 },
  smdChoice: { width: 28, height: 28 },
};

const POSITION_EPSILON = 0.5;

const roundToHundredth = (value: number): number => Math.round(value * 100) / 100;

const snapToStep = (value: number, step: number): number => {
  if (step <= 0) {
    return value;
  }

  if (value <= 0) {
    return 0;
  }

  return Math.ceil(value / step) * step;
};

const snapToGrid = (value: number, grid: number): number => {
  if (grid <= 0) {
    return value;
  }

  return Math.round(value / grid) * grid;
};

const resolveChildSize = (node: Node<NodeData>) => {
  const fallback = DEFAULT_CHILD_SIZE[node.type as keyof typeof DEFAULT_CHILD_SIZE];

  if (!fallback) {
    return getNodeDimensions(node);
  }

  const base = getNodeDimensions(node);
  return {
    width: Number.isFinite(base.width) ? base.width : fallback.width,
    height: Number.isFinite(base.height) ? base.height : fallback.height,
  };
};

export interface LayoutSmdCompositeOptions {
  nodesep?: number;
  ranksep?: number;
  stepX?: number;
  snapY?: number;
  paddingX?: number;
  paddingY?: number;
}

export interface LayoutSmdCompositeParams {
  parentId: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export interface LayoutSmdCompositeResult {
  nodes: Node<NodeData>[];
  updatedNodeIds: string[];
  changed: boolean;
}

interface Placement {
  id: string;
  x: number;
  y: number;
  left: number;
  top: number;
  width: number;
  height: number;
  locked: boolean;
}

const isLayoutChild = (node: Node<NodeData>): boolean =>
  Boolean(node?.parentNode) && CHILD_TYPES.has(node.type as NodeData['type']);

const hasLockPositionFlag = (data: NodeData | undefined): data is NodeData & { lockPosition?: boolean } =>
  typeof data === 'object' && data !== null && 'lockPosition' in data;

const isLocked = (node: Node<NodeData>): boolean => {
  if (!node) {
    return false;
  }

  if (!hasLockPositionFlag(node.data)) {
    return false;
  }

  return node.data.lockPosition === true;
};

export const layoutSmdComposite = async (
  params: LayoutSmdCompositeParams,
  options: LayoutSmdCompositeOptions = {},
): Promise<LayoutSmdCompositeResult> => {
  const { parentId, nodes, edges } = params;
  const parent = nodes.find(node => node.id === parentId && node.type === 'smdComposite');

  if (!parent) {
    return { nodes, updatedNodeIds: [], changed: false };
  }

  const children = nodes.filter(node => node.parentNode === parentId && isLayoutChild(node));

  if (children.length === 0) {
    return { nodes, updatedNodeIds: [], changed: false };
  }

  const graph = new dagre.graphlib.Graph({ multigraph: true, compound: false });
  const nodesep = options.nodesep ?? 48;
  const ranksep = options.ranksep ?? 96;
  const stepX = options.stepX ?? 180;
  const snapY = options.snapY ?? 8;
  const resolvedPaddingX = options.paddingX ?? 24;
  const resolvedPaddingY = options.paddingY ?? 24;

  graph.setGraph({
    rankdir: 'LR',
    nodesep,
    ranksep,
    marginx: 0,
    marginy: 0,
  });

  graph.setDefaultEdgeLabel(() => ({}));

  const sortedChildren = [...children].sort((a, b) => a.id.localeCompare(b.id));

  sortedChildren.forEach(child => {
    const { width, height } = resolveChildSize(child);
    graph.setNode(child.id, { width, height });
  });

  const childIdSet = new Set(sortedChildren.map(child => child.id));
  const internalEdges = edges.filter(
    edge =>
      edge.type === 'smdTransition' &&
      childIdSet.has(edge.source ?? '') &&
      childIdSet.has(edge.target ?? ''),
  );

  internalEdges.forEach(edge => {
    const key = edge.id ?? `${edge.source}->${edge.target}`;
    graph.setEdge(edge.source, edge.target, {}, key);
  });

  dagre.layout(graph);

  const placements: Placement[] = sortedChildren
    .map(child => {
      const meta = graph.node(child.id) as DagreNodeMeta | undefined;
      if (!meta) {
        return null;
      }
      const { width, height } = resolveChildSize(child);
      const rawX = snapToStep(meta.x ?? 0, stepX);
      const rawY = snapToGrid(meta.y ?? 0, snapY);
      return {
        id: child.id,
        x: rawX,
        y: rawY,
        left: rawX - width / 2,
        top: rawY - height / 2,
        width,
        height,
        locked: isLocked(child),
      };
    })
    .filter((value): value is Placement => value !== null);

  if (placements.length === 0) {
    return { nodes, updatedNodeIds: [], changed: false };
  }

  // Stabilize ordering within ranks
  const ranks = new Map<number, Placement[]>();
  placements.forEach(entry => {
    const meta = graph.node(entry.id) as DagreNodeMeta | undefined;
    const rank = typeof meta?.rank === 'number' ? meta.rank : 0;
    if (!ranks.has(rank)) {
      ranks.set(rank, []);
    }
    ranks.get(rank)!.push(entry);
  });

  ranks.forEach(list => {
    let lastY: number | null = null;
    let lastHeight: number | null = null;
    list.sort((a, b) => {
      const metaA = graph.node(a.id) as DagreNodeMeta | undefined;
      const metaB = graph.node(b.id) as DagreNodeMeta | undefined;
      if (metaA?.y !== metaB?.y) {
        return (metaA?.y ?? 0) - (metaB?.y ?? 0);
      }
      if (metaA?.order !== undefined && metaB?.order !== undefined && metaA.order !== metaB.order) {
        return metaA.order - metaB.order;
      }
      return a.id.localeCompare(b.id);
    });

    list.forEach(entry => {
      const meta = graph.node(entry.id) as DagreNodeMeta | undefined;
      const baseY = snapToGrid(meta?.y ?? entry.y, snapY);
      if (lastY === null || lastHeight === null) {
        entry.y = baseY;
      } else {
        const minGap = (lastHeight + entry.height) / 2 + nodesep;
        entry.y = Math.max(baseY, lastY + minGap);
      }
      entry.top = entry.y - entry.height / 2;
      lastY = entry.y;
      lastHeight = entry.height;
    });
  });

  const minLeft = Math.min(...placements.map(entry => entry.left));
  const minTop = Math.min(...placements.map(entry => entry.top));

  const workspace = getCompositeWorkspaceRect(parent);
  const paddingX = Math.max(resolvedPaddingX, workspace.x);
  const paddingY = Math.max(resolvedPaddingY, workspace.y);

  const indexMap = new Map<string, number>();
  nodes.forEach((node, index) => {
    indexMap.set(node.id, index);
  });

  const nextNodes = [...nodes];
  const updatedNodeIds: string[] = [];
  let changed = false;

  placements.forEach(entry => {
    const originalIndex = indexMap.get(entry.id);
    if (originalIndex === undefined) {
      return;
    }

    if (entry.locked) {
      return;
    }

    const originalNode = nodes[originalIndex];
    const currentPosition = originalNode?.position ?? { x: 0, y: 0 };
    const nextX = paddingX + (entry.left - minLeft);
    const nextY = paddingY + (entry.top - minTop);

    const deltaX = Math.abs(currentPosition.x - nextX);
    const deltaY = Math.abs(currentPosition.y - nextY);

    if (deltaX <= POSITION_EPSILON && deltaY <= POSITION_EPSILON) {
      return;
    }

    nextNodes[originalIndex] = {
      ...originalNode,
      position: {
        x: roundToHundredth(nextX),
        y: roundToHundredth(nextY),
      },
      extent: 'parent',
    };
    updatedNodeIds.push(entry.id);
    changed = true;
  });

  return {
    nodes: changed ? nextNodes : nodes,
    updatedNodeIds,
    changed,
  };
};
