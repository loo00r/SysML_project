import { Node } from 'reactflow';
import { NodeData } from '../store/diagramStore';

export const COMPOSITE_HEADER_HEIGHT = 36;
export const COMPOSITE_PADDING = 16;
export const COMPOSITE_DEFAULT_WIDTH = 360;
export const COMPOSITE_DEFAULT_HEIGHT = 260;

export interface CompositeWorkspaceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getCompositeDimensions = (node: Node<NodeData>) => {
  const styleWidth = typeof node.style?.width === 'number' ? node.style?.width : undefined;
  const styleHeight = typeof node.style?.height === 'number' ? node.style?.height : undefined;
  const dataWidth = typeof node.data?.width === 'number' ? node.data?.width : undefined;
  const dataHeight = typeof node.data?.height === 'number' ? node.data?.height : undefined;

  return {
    width: styleWidth ?? dataWidth ?? COMPOSITE_DEFAULT_WIDTH,
    height: styleHeight ?? dataHeight ?? COMPOSITE_DEFAULT_HEIGHT,
  };
};

export const getCompositeWorkspaceRect = (node: Node<NodeData>): CompositeWorkspaceRect => {
  const { width, height } = getCompositeDimensions(node);

  return {
    x: COMPOSITE_PADDING,
    y: COMPOSITE_HEADER_HEIGHT,
    width: Math.max(width - COMPOSITE_PADDING * 2, 0),
    height: Math.max(height - COMPOSITE_HEADER_HEIGHT - COMPOSITE_PADDING, 0),
  };
};

export const isPointInsideCompositeWorkspace = (
  absolutePoint: { x: number; y: number },
  composite: Node<NodeData>
): boolean => {
  const { width, height } = getCompositeDimensions(composite);
  const position = composite.positionAbsolute ?? composite.position;
  const left = position.x + COMPOSITE_PADDING;
  const top = position.y + COMPOSITE_HEADER_HEIGHT;
  const right = left + Math.max(width - COMPOSITE_PADDING * 2, 0);
  const bottom = top + Math.max(height - COMPOSITE_HEADER_HEIGHT - COMPOSITE_PADDING, 0);

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
  const childWidth = child.width ?? 0;
  const childHeight = child.height ?? 0;

  const minX = workspace.x;
  const minY = workspace.y;
  const maxX = workspace.x + Math.max(workspace.width - childWidth, 0);
  const maxY = workspace.y + Math.max(workspace.height - childHeight, 0);

  return {
    x: Math.min(Math.max(child.position.x, minX), maxX),
    y: Math.min(Math.max(child.position.y, minY), maxY),
  };
};
