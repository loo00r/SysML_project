import type { Node, XYPosition } from 'reactflow';
import type { NodeData } from '../../../store/diagramStore';
import {
  COMPOSITE_HEADER_HEIGHT,
  COMPOSITE_MIN_HEIGHT,
  COMPOSITE_MIN_WIDTH,
  COMPOSITE_PADDING_X,
  COMPOSITE_PADDING_Y,
  getCompositeDimensions,
  getNodeDimensions,
} from '../../../utils/smdComposite';

const RESIZE_DEBOUNCE_MS = 150;
const FRAME_DELAY_FALLBACK_MS = 16;

const SMD_CHILD_TYPES = new Set<NodeData['type']>([
  'smdInitial',
  'smdState',
  'smdFinal',
  'smdChoice',
  'smdComposite',
]);

export const isSmdCompositeNode = (node: Node<NodeData>): boolean => node.type === 'smdComposite';

export const isSmdChildNode = (node: Node<NodeData>): boolean => {
  if (!node) return false;
  return SMD_CHILD_TYPES.has(node.type as NodeData['type']);
};

export interface CompositeResizeResult {
  updatedNodes: Node<NodeData>[];
  width: number;
  height: number;
  changed: boolean;
}

const roundToPixel = (value: number) => Math.round(value * 100) / 100;

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toParentLocalPosition = (
  child: Node<NodeData>,
  parent: Node<NodeData>
): XYPosition => {
  const parentAbsolute = parent.positionAbsolute ?? parent.position ?? { x: 0, y: 0 };
  const childAbsolute = child.positionAbsolute ?? child.position ?? { x: 0, y: 0 };

  return {
    x: childAbsolute.x - parentAbsolute.x,
    y: childAbsolute.y - parentAbsolute.y,
  };
};

export type CompositeResizeReason =
  | 'child-add'
  | 'child-delete'
  | 'dragging'
  | 'drag-end'
  | 'layout-done'
  | 'hydrate'
  | 'edge-add'
  | 'edge-remove'
  | 'unknown';

export interface ResizeCompositeOptions {
  reason?: CompositeResizeReason;
}

const AUTO_RESIZE_POLICY = 'incrementalOnAdd' as const;
const GROWTH_FACTOR = 1.05;
const SIZE_EPSILON = 0.5;

interface ChildEntry {
  node: Node<NodeData>;
  index: number;
}

const resolveDimension = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const getCompositeSizeBounds = (parent: Node<NodeData>) => {
  const { width: currentWidth, height: currentHeight } = getCompositeDimensions(parent);
  const initialWidth = resolveDimension(parent.data?.initialW, currentWidth);
  const initialHeight = resolveDimension(parent.data?.initialH, currentHeight);
  const maxWidth = resolveDimension(parent.data?.maxW, initialWidth * 4);
  const maxHeight = resolveDimension(parent.data?.maxH, initialHeight * 4);
  const minWidth = Math.max(COMPOSITE_MIN_WIDTH, initialWidth);
  const minHeight = Math.max(COMPOSITE_MIN_HEIGHT, initialHeight);
  const boundedMaxWidth = Math.max(maxWidth, minWidth);
  const boundedMaxHeight = Math.max(maxHeight, minHeight);

  return {
    currentWidth,
    currentHeight,
    initialWidth,
    initialHeight,
    minWidth,
    minHeight,
    maxWidth: boundedMaxWidth,
    maxHeight: boundedMaxHeight,
  };
};

const computeChildrenBounds = (children: ChildEntry[], parent: Node<NodeData>) => {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  children.forEach(({ node }) => {
    const localPosition = toParentLocalPosition(node, parent);
    const { width: childWidth, height: childHeight } = getNodeDimensions(node);

    if (!Number.isFinite(localPosition.x) || !Number.isFinite(localPosition.y)) {
      return;
    }

    const left = localPosition.x;
    const top = localPosition.y;
    const right = left + childWidth;
    const bottom = top + childHeight;

    if (!Number.isFinite(right) || !Number.isFinite(bottom)) {
      return;
    }

    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });

  const hasBounds =
    Number.isFinite(minX) &&
    Number.isFinite(minY) &&
    Number.isFinite(maxX) &&
    Number.isFinite(maxY);

  if (!hasBounds) {
    return {
      hasChildren: false,
      width: 0,
      height: 0,
    };
  }

  return {
    hasChildren: true,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
};

export const resizeCompositeToChildren = (
  parentId: string,
  nodes: Node<NodeData>[],
  options: ResizeCompositeOptions = {}
): CompositeResizeResult => {
  const parentIndex = nodes.findIndex(node => node.id === parentId && isSmdCompositeNode(node));

  if (parentIndex === -1) {
    return { updatedNodes: nodes, width: 0, height: 0, changed: false };
  }

  const parent = nodes[parentIndex];
  const childEntries = nodes
    .map((node, index) => ({ node, index }))
    .filter(
      ({ node }) => node.parentNode === parentId && isSmdChildNode(node)
    );

  const {
    currentWidth,
    currentHeight,
    initialWidth,
    initialHeight,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  } = getCompositeSizeBounds(parent);

  const reason = options.reason ?? 'unknown';
  const childCount = childEntries.length;
  const bounds = computeChildrenBounds(childEntries, parent);
  const policy = parent.data?.autoResizePolicy ?? AUTO_RESIZE_POLICY;

  let targetWidth = currentWidth;
  let targetHeight = currentHeight;

  if (policy === AUTO_RESIZE_POLICY) {
    if (reason === 'child-add') {
      if (childCount >= 2) {
        const grownWidth = Math.ceil(currentWidth * GROWTH_FACTOR);
        const grownHeight = Math.ceil(currentHeight * GROWTH_FACTOR);
        targetWidth = clampValue(grownWidth, minWidth, maxWidth);
        targetHeight = clampValue(grownHeight, minHeight, maxHeight);
      }
    } else if (
      reason === 'child-delete' ||
      reason === 'layout-done' ||
      reason === 'hydrate' ||
      reason === 'edge-remove'
    ) {
      if (childCount === 0) {
        targetWidth = clampValue(Math.ceil(initialWidth), minWidth, maxWidth);
        targetHeight = clampValue(Math.ceil(initialHeight), minHeight, maxHeight);
      } else if (bounds.hasChildren) {
        const fitWidth = Math.ceil(bounds.width + COMPOSITE_PADDING_X * 2);
        const fitHeight = Math.ceil(COMPOSITE_HEADER_HEIGHT + bounds.height + COMPOSITE_PADDING_Y * 2);
        targetWidth = clampValue(fitWidth, minWidth, maxWidth);
        targetHeight = clampValue(fitHeight, minHeight, maxHeight);
      }
    } else {
      // dragging, drag-end, unknown => keep current size but still clamp children below.
      targetWidth = currentWidth;
      targetHeight = currentHeight;
    }
  }

  const widthChanged = Math.abs(targetWidth - currentWidth) >= SIZE_EPSILON;
  const heightChanged = Math.abs(targetHeight - currentHeight) >= SIZE_EPSILON;
  const finalWidth = widthChanged ? roundToPixel(targetWidth) : roundToPixel(currentWidth);
  const finalHeight = heightChanged ? roundToPixel(targetHeight) : roundToPixel(currentHeight);

  const updatedNodes = [...nodes];
  let changed = false;

  if (widthChanged || heightChanged) {
    const updatedParent: Node<NodeData> = {
      ...parent,
      style: {
        ...parent.style,
        width: finalWidth,
        height: finalHeight,
      },
      data: {
        ...parent.data,
        width: finalWidth,
        height: finalHeight,
      },
      width: finalWidth,
      height: finalHeight,
    };
    updatedNodes[parentIndex] = updatedParent;
    changed = true;
  }

  const innerRect = {
    x: COMPOSITE_PADDING_X,
    y: COMPOSITE_HEADER_HEIGHT + COMPOSITE_PADDING_Y,
    width: Math.max(finalWidth - COMPOSITE_PADDING_X * 2, 0),
    height: Math.max(finalHeight - COMPOSITE_HEADER_HEIGHT - COMPOSITE_PADDING_Y * 2, 0),
  };

  childEntries.forEach(({ node, index }) => {
    const position = node.position ?? { x: 0, y: 0 };
    const { width: childWidth, height: childHeight } = getNodeDimensions(node);

    const maxXForChild = innerRect.x + Math.max(innerRect.width - childWidth, 0);
    const maxYForChild = innerRect.y + Math.max(innerRect.height - childHeight, 0);

    const clampedX = clampValue(position.x, innerRect.x, maxXForChild);
    const clampedY = clampValue(position.y, innerRect.y, maxYForChild);

    if (Math.abs(clampedX - position.x) > 0.5 || Math.abs(clampedY - position.y) > 0.5) {
      updatedNodes[index] = {
        ...node,
        position: {
          x: roundToPixel(clampedX),
          y: roundToPixel(clampedY),
        },
      };
      changed = true;
    }
  });

  return {
    updatedNodes: changed ? updatedNodes : nodes,
    width: finalWidth,
    height: finalHeight,
    changed,
  };
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

export interface CompositeResizeSchedulerConfig {
  getNodes: () => Node<NodeData>[];
  applyNodes: (nodes: Node<NodeData>[]) => void;
}

export interface CompositeResizeRequest {
  reason?: CompositeResizeReason;
}

export interface CompositeResizeScheduler {
  schedule(parentId: string, request?: CompositeResizeRequest): void;
  scheduleMany(parentIds: Iterable<string>, request?: CompositeResizeRequest): void;
  flush(parentId: string, request?: CompositeResizeRequest): void;
  flushMany(parentIds?: Iterable<string>, request?: CompositeResizeRequest): void;
  cancel(parentId: string): void;
  cancelAll(): void;
}

export const createCompositeResizeScheduler = (
  config: CompositeResizeSchedulerConfig
): CompositeResizeScheduler => {
  const timers = new Map<string, TimeoutHandle>();
  const reasons = new Map<string, CompositeResizeReason | undefined>();

  const waitForStableFrame = () => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return new Promise<void>(resolve => setTimeout(resolve, FRAME_DELAY_FALLBACK_MS));
    }

    return new Promise<void>(resolve => {
      Promise.resolve().then(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      });
    });
  };

  const runResize = async (parentId: string) => {
    const reason = reasons.get(parentId);
    await waitForStableFrame();
    const nodes = config.getNodes();
    const { updatedNodes, changed } = resizeCompositeToChildren(parentId, nodes, {
      reason,
    });

    if (changed) {
      config.applyNodes(updatedNodes);
    }

    reasons.delete(parentId);
  };

  const clearTimer = (parentId: string) => {
    const handle = timers.get(parentId);
    if (handle) {
      clearTimeout(handle);
      timers.delete(parentId);
    }
  };

  const scheduleSingle = (parentId: string) => {
    clearTimer(parentId);
    const handle = setTimeout(() => {
      timers.delete(parentId);
      runResize(parentId).catch(() => {
        // ignore errors
      });
    }, RESIZE_DEBOUNCE_MS);
    timers.set(parentId, handle);
  };

  const flushSingle = (parentId: string) => {
    clearTimer(parentId);
    runResize(parentId).catch(() => {
      // ignore errors
    });
  };

  return {
    schedule(parentId, request) {
      if (request?.reason) {
        reasons.set(parentId, request.reason);
      }
      scheduleSingle(parentId);
    },
    scheduleMany(parentIds, request) {
      for (const id of parentIds) {
        this.schedule(id, request);
      }
    },
    flush(parentId, request) {
      if (request?.reason) {
        reasons.set(parentId, request.reason);
      }
      flushSingle(parentId);
    },
    flushMany(parentIds, request) {
      const ids = parentIds ? Array.from(parentIds) : Array.from(new Set([...timers.keys(), ...reasons.keys()]));
      ids.forEach(id => this.flush(id, request));
    },
    cancel(parentId) {
      clearTimer(parentId);
      reasons.delete(parentId);
    },
    cancelAll() {
      Array.from(timers.keys()).forEach(id => clearTimer(id));
      reasons.clear();
    },
  };
};
