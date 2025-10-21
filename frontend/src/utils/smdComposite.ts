import type { Node, XYPosition } from 'reactflow';
import type { NodeData } from '../store/diagramStore';

export const COMPOSITE_HEADER_HEIGHT = 28;
export const COMPOSITE_PADDING_X = 16;
export const COMPOSITE_PADDING_Y = 20;
export const COMPOSITE_PADDING = {
  x: COMPOSITE_PADDING_X,
  y: COMPOSITE_PADDING_Y,
} as const;
export const COMPOSITE_MIN_WIDTH = 220;
export const COMPOSITE_MIN_HEIGHT = 120;
export const COMPOSITE_DEFAULT_WIDTH = 360;
export const COMPOSITE_DEFAULT_HEIGHT = 260;

export interface CompositeWorkspaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const numericOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const getCompositeDimensions = (node: Node<NodeData>) => {
  const styleWidth = numericOrUndefined(node.style?.width);
  const styleHeight = numericOrUndefined(node.style?.height);
  const dataWidth = numericOrUndefined(node.data?.width);
  const dataHeight = numericOrUndefined(node.data?.height);
  const measuredWidth = numericOrUndefined(node.width);
  const measuredHeight = numericOrUndefined(node.height);

  return {
    width: styleWidth ?? dataWidth ?? measuredWidth ?? COMPOSITE_DEFAULT_WIDTH,
    height: styleHeight ?? dataHeight ?? measuredHeight ?? COMPOSITE_DEFAULT_HEIGHT,
  };
};

export const getNodeDimensions = (node: Node<NodeData>) => {
  const styleWidth = numericOrUndefined(node.style?.width);
  const styleHeight = numericOrUndefined(node.style?.height);
  const dataWidth = numericOrUndefined(node.data?.width);
  const dataHeight = numericOrUndefined(node.data?.height);
  const measuredWidth = numericOrUndefined(node.width);
  const measuredHeight = numericOrUndefined(node.height);

  return {
    width: styleWidth ?? dataWidth ?? measuredWidth ?? 120,
    height: styleHeight ?? dataHeight ?? measuredHeight ?? 60,
  };
};

export const getCompositeWorkspaceRect = (node: Node<NodeData>): CompositeWorkspaceRect => {
  const { width, height } = getCompositeDimensions(node);

  return {
    x: COMPOSITE_PADDING_X,
    y: COMPOSITE_HEADER_HEIGHT + COMPOSITE_PADDING_Y,
    width: Math.max(width - COMPOSITE_PADDING_X * 2, 0),
    height: Math.max(height - COMPOSITE_HEADER_HEIGHT - COMPOSITE_PADDING_Y * 2, 0),
  };
};

export const isPointInsideCompositeWorkspace = (
  absolutePoint: { x: number; y: number },
  composite: Node<NodeData>
): boolean => {
  const { width, height } = getCompositeDimensions(composite);
  const position = composite.positionAbsolute ?? composite.position;
  const left = position.x + COMPOSITE_PADDING_X;
  const top = position.y + COMPOSITE_HEADER_HEIGHT + COMPOSITE_PADDING_Y;
  const right = left + Math.max(width - COMPOSITE_PADDING_X * 2, 0);
  const bottom = top + Math.max(height - COMPOSITE_HEADER_HEIGHT - COMPOSITE_PADDING_Y * 2, 0);

  return (
    absolutePoint.x >= left &&
    absolutePoint.x <= right &&
    absolutePoint.y >= top &&
    absolutePoint.y <= bottom
  );
};

export const clampPositionWithinComposite = (
  child: Node<NodeData>,
  composite: Node<NodeData>
) => {
  const workspace = getCompositeWorkspaceRect(composite);
  const { width: childWidth, height: childHeight } = getNodeDimensions(child);

  const minX = workspace.x;
  const minY = workspace.y;
  const maxX = workspace.x + Math.max(workspace.width - childWidth, 0);
  const maxY = workspace.y + Math.max(workspace.height - childHeight, 0);

  return {
    x: Math.min(Math.max(child.position.x, minX), maxX),
    y: Math.min(Math.max(child.position.y, minY), maxY),
  };
};

export const toParentLocalPoint = (
  absolute: XYPosition,
  composite: Node<NodeData>
): XYPosition => {
  const position = composite.positionAbsolute ?? composite.position;
  return {
    x: absolute.x - position.x,
    y: absolute.y - position.y,
  };
};

export const detectCompositeAtPoint = (
  point: XYPosition,
  nodes: Node<NodeData>[]
): Node<NodeData> | undefined => {
  return nodes.find(
    node => node.type === 'smdComposite' && isPointInsideCompositeWorkspace(point, node)
  );
};
