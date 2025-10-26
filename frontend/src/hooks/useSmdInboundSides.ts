import { useMemo, useEffect, useState } from 'react';
import type { Edge, Node, XYPosition } from 'reactflow';
import useDiagramStore from '../store/diagramStore';
import type { ArrowSide } from '../components/shared/ArrowHeadOverlay';

const HANDLE_TO_SIDE: Record<string, ArrowSide> = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
  'in-left': 'left',
  'in-right': 'right',
  'in-top': 'top',
  'in-bottom': 'bottom',
};

const POSITION_TO_SIDE: Record<string, ArrowSide> = {
  left: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
};

const ORDER: ArrowSide[] = ['top', 'right', 'bottom', 'left'];

// SMD policy: only LEFT and TOP can be inbound (target) sides
const ALLOWED_INBOUND_SIDES: Set<ArrowSide> = new Set(['left', 'top']);

const normalizeKey = (value?: string | null): string | null =>
  value ? value.toLowerCase() : null;

const getNodePosition = (node: Node | undefined): XYPosition => ({
  x: node?.position?.x ?? 0,
  y: node?.position?.y ?? 0,
});

const inferSide = (edge: Edge, source: Node | undefined, target: Node | undefined): ArrowSide | null => {
  const targetHandle = normalizeKey(edge.targetHandle);
  if (targetHandle && HANDLE_TO_SIDE[targetHandle]) {
    return HANDLE_TO_SIDE[targetHandle];
  }

  const rawTargetPosition = (edge as Record<string, unknown>).targetPosition;
  const targetPosition = normalizeKey(typeof rawTargetPosition === 'string' ? rawTargetPosition : undefined);
  if (targetPosition && POSITION_TO_SIDE[targetPosition]) {
    return POSITION_TO_SIDE[targetPosition];
  }

  const dataTargetPosition = normalizeKey(
    typeof edge.data === 'object' && edge.data && 'targetPosition' in edge.data
      ? (edge.data as Record<string, unknown>).targetPosition as string | undefined
      : undefined,
  );
  if (dataTargetPosition && POSITION_TO_SIDE[dataTargetPosition]) {
    return POSITION_TO_SIDE[dataTargetPosition];
  }

  if (source && target) {
    const sourcePos = getNodePosition(source);
    const targetPos = getNodePosition(target);
    const dx = sourcePos.x - targetPos.x;
    const dy = sourcePos.y - targetPos.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    }
    return dy > 0 ? 'bottom' : 'top';
  }

  return null;
};

const useSmdInboundSides = (nodeId: string): ArrowSide[] => {
  const edges = useDiagramStore((state) => state.edges as Edge[]);
  const nodes = useDiagramStore((state) => state.nodes as Node[]);
  const [frameTick, setFrameTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setFrameTick((tick) => tick + 1);
      return;
    }

    let cancelled = false;
    const raf = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setFrameTick((tick) => tick + 1);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
    };
  }, [edges, nodes]);

  return useMemo(() => {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const currentNode = nodeMap.get(nodeId);
    const sideSet = new Set<ArrowSide>();

    edges.forEach((edge) => {
      if (edge.type !== 'smdTransition' || edge.target !== nodeId) {
        return;
      }

      const side = inferSide(edge, nodeMap.get(edge.source ?? ''), nodeMap.get(edge.target ?? ''));

      // Filter out disallowed inbound sides (RIGHT/BOTTOM globally)
      if (!side || !ALLOWED_INBOUND_SIDES.has(side)) {
        return;
      }

      // Additional filter for State/Choice: only LEFT is allowed (no TOP)
      if (currentNode?.type === 'smdState' || currentNode?.type === 'smdChoice') {
        if (side === 'left') {
          sideSet.add(side);
        }
        // Ignore 'top' for State/Choice even if edge says so
      } else {
        // For Initial/Final, both left and top are allowed
        sideSet.add(side);
      }
    });

    return ORDER.filter((side) => sideSet.has(side));
  }, [edges, nodes, nodeId, frameTick]);
};

export default useSmdInboundSides;
