import type { Edge, Node, XYPosition } from 'reactflow';
import type { NodeData } from '../store/diagramStore';
import {
  ensureSmdTransitionData,
  composeSmdTransitionLabel,
  SMD_EDGE_MARKER_URL,
  USE_SMD_EDGE_MARKERS,
} from './smdTransition';
import {
  COMPOSITE_DEFAULT_HEIGHT,
  COMPOSITE_DEFAULT_WIDTH,
} from './smdComposite';

const NODE_TYPE_MAP: Record<string, NodeData['type']> = {
  initial: 'smdInitial',
  smdinitial: 'smdInitial',
  initialstate: 'smdInitial',
  final: 'smdFinal',
  smdfinal: 'smdFinal',
  finalstate: 'smdFinal',
  state: 'smdState',
  smdstate: 'smdState',
  simple: 'smdState',
  choice: 'smdChoice',
  junction: 'smdChoice',
  smdchoice: 'smdChoice',
  composite: 'smdComposite',
  smdcomposite: 'smdComposite',
  region: 'smdComposite',
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }
  return undefined;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeNodeType = (value: unknown): NodeData['type'] | null => {
  const raw = toTrimmedString(value);
  if (!raw) {
    return null;
  }
  const key = raw.toLowerCase();
  return NODE_TYPE_MAP[key] ?? null;
};

const extractParentId = (value: Record<string, unknown>): string | undefined => {
  return (
    toTrimmedString(value.parent) ??
    toTrimmedString(value.parentId) ??
    toTrimmedString(value.parent_id)
  );
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizePosition = (node: Record<string, unknown>, fallback: XYPosition): XYPosition => {
  const positionCandidate = isPlainObject(node.position) ? node.position : undefined;

  const x =
    toFiniteNumber(positionCandidate?.x) ??
    toFiniteNumber(node.x) ??
    toFiniteNumber(node.posX) ??
    fallback.x;

  const y =
    toFiniteNumber(positionCandidate?.y) ??
    toFiniteNumber(node.y) ??
    toFiniteNumber(node.posY) ??
    fallback.y;

  return { x, y };
};

const extractProperties = (value: unknown): Record<string, string> | undefined => {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const entries = Object.entries(value)
    .map(([key, val]) => {
      const normalizedKey = toTrimmedString(key);
      const normalizedVal = toTrimmedString(val);
      if (!normalizedKey || normalizedVal === undefined) {
        return null;
      }
      return [normalizedKey, normalizedVal] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
};

const stateTypeForNode = (nodeType: NodeData['type']): NodeData['stateType'] | undefined => {
  switch (nodeType) {
    case 'smdInitial':
      return 'initial';
    case 'smdFinal':
      return 'final';
    case 'smdChoice':
      return 'choice';
    case 'smdState':
      return 'state';
    default:
      return undefined;
  }
};

const createDefaultPositionFactory = () => {
  const counters = new Map<string | null, number>();

  return (parentId: string | null, nodeType: NodeData['type']): XYPosition => {
    const key = parentId ?? null;
    const count = counters.get(key) ?? 0;
    counters.set(key, count + 1);

    if (parentId === null) {
      return {
        x: count * 220,
        y: nodeType === 'smdComposite' ? 40 : 0,
      };
    }

    const column = count % 3;
    const row = Math.floor(count / 3);
    return {
      x: column * 180,
      y: row * 120,
    };
  };
};

const normalizeEdgeHandle = (value: unknown): string | undefined => {
  const trimmed = toTrimmedString(value);
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
};

interface ParseSuccess {
  success: true;
  nodes: Node<NodeData>[];
  edges: Edge[];
  name?: string;
  description?: string;
}

interface ParseFailure {
  success: false;
  error: string;
}

export type SmdTestModeParseResult = ParseSuccess | ParseFailure;

export const parseSmdTestModeInput = (rawInput: string): SmdTestModeParseResult => {
  if (!rawInput || rawInput.trim().length === 0) {
    return {
      success: false,
      error: 'Test mode requires JSON input describing the SMD structure.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${(error as Error).message}`,
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      success: false,
      error: 'Expected a JSON object at the root level.',
    };
  }

  const diagramPayloadRaw = isPlainObject(parsed.diagram) ? parsed.diagram : parsed;
  const diagramPayload = diagramPayloadRaw as Record<string, unknown>;

  const rawNodesCandidate = diagramPayload['nodes'];
  const rawStatesCandidate = diagramPayload['states'];
  const rawNodesInput =
    Array.isArray(rawNodesCandidate) && rawNodesCandidate.length > 0
      ? rawNodesCandidate
      : Array.isArray(rawStatesCandidate)
        ? rawStatesCandidate
        : undefined;

  const rawNodes: unknown[] | undefined = rawNodesInput;

  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    return {
      success: false,
      error: 'The JSON must contain a non-empty "nodes" array (or "states").',
    };
  }

  const rawEdgesCandidate = diagramPayload['edges'];
  const rawTransitionsCandidate = diagramPayload['transitions'];
  const rawEdgesSource =
    Array.isArray(rawEdgesCandidate)
      ? rawEdgesCandidate
      : Array.isArray(rawTransitionsCandidate)
        ? rawTransitionsCandidate
        : [];
  const rawEdges: unknown[] = rawEdgesSource;

  const defaultPositionFor = createDefaultPositionFactory();
  const nodes: Node<NodeData>[] = [];
  const seenNodeIds = new Set<string>();
  const createdNodes = new Map<string, Node<NodeData>>();

  type PendingNode = {
    record: Record<string, unknown>;
    parentId: string | null;
  };

  const pending: PendingNode[] = [];

  for (const rawNode of rawNodes) {
    if (!isPlainObject(rawNode)) {
      return {
        success: false,
        error: 'Each node must be an object.',
      };
    }
    pending.push({ record: rawNode, parentId: null });
  }

  const childArrayKeys: Array<'children' | 'states'> = ['children', 'states'];

  while (pending.length > 0) {
    const next = pending.shift()!;
    const nodeRecord = next.record;
    const parentId = next.parentId;

    const id = toTrimmedString(nodeRecord['id']) ?? toTrimmedString(nodeRecord['uuid']);
    if (!id) {
      return {
        success: false,
        error: 'Each node requires an "id".',
      };
    }

    if (seenNodeIds.has(id)) {
      return {
        success: false,
        error: `Duplicate node id detected: "${id}".`,
      };
    }

    const nodeType =
      normalizeNodeType(nodeRecord['type']) ??
      normalizeNodeType(nodeRecord['kind']) ??
      normalizeNodeType(nodeRecord['stateType']) ??
      normalizeNodeType(nodeRecord['category']);

    if (!nodeType) {
      return {
        success: false,
        error: `Node "${id}" has an unrecognized type. Supported types: initial, final, state, choice, composite.`,
      };
    }

    if (parentId) {
      const parentNode = createdNodes.get(parentId);
      if (!parentNode) {
        return {
          success: false,
          error: `Node "${id}" references missing parent "${parentId}".`,
        };
      }
      if (parentNode.type !== 'smdComposite') {
        return {
          success: false,
          error: `Node "${id}" references parent "${parentId}" which is not a composite state.`,
        };
      }
    }

    const explicitParentId = extractParentId(nodeRecord);
    const resolvedParentId = explicitParentId ?? parentId;

    const fallbackPosition = defaultPositionFor(resolvedParentId ?? null, nodeType);
    const position = normalizePosition(nodeRecord, fallbackPosition);

    const name =
      toTrimmedString(nodeRecord['name']) ??
      toTrimmedString(nodeRecord['label']) ??
      id;

    const entry = toTrimmedString(nodeRecord['entry']);
    const exit = toTrimmedString(nodeRecord['exit']);
    const doActivity =
      toTrimmedString(nodeRecord['do']) ??
      toTrimmedString(nodeRecord['doActivity']) ??
      toTrimmedString(nodeRecord['activity']);

    const width =
      nodeType === 'smdComposite'
        ? toFiniteNumber(nodeRecord['width']) ?? COMPOSITE_DEFAULT_WIDTH
        : undefined;
    const height =
      nodeType === 'smdComposite'
        ? toFiniteNumber(nodeRecord['height']) ?? COMPOSITE_DEFAULT_HEIGHT
        : undefined;

    const nodeData: NodeData = {
      label: name,
      name,
      description: toTrimmedString(nodeRecord['description']),
      type: nodeType,
      entry,
      exit,
      do: doActivity,
      properties: extractProperties(nodeRecord['properties']),
      stateType: stateTypeForNode(nodeType),
      width,
      height,
    };

    const node: Node<NodeData> = {
      id,
      type: nodeType,
      position,
      data: nodeData,
      draggable: true,
    };

    if (resolvedParentId) {
      node.parentNode = resolvedParentId;
      node.extent = 'parent';
    }

    nodes.push(node);
    seenNodeIds.add(id);
    createdNodes.set(id, node);

    if (nodeType === 'smdComposite') {
      childArrayKeys.forEach(key => {
        const candidates = nodeRecord[key];
        if (Array.isArray(candidates)) {
          candidates.forEach(child => {
            if (!isPlainObject(child)) {
              return;
            }
            pending.push({
              record: child,
              parentId: id,
            });
          });
        }
      });
    }
  }

  const nodeMap = new Map(nodes.map(node => [node.id, node]));

  const edges: Edge[] = [];
  const seenEdgeIds = new Set<string>();

  for (let index = 0; index < rawEdges.length; index += 1) {
    const rawEdge = rawEdges[index];

    if (!isPlainObject(rawEdge)) {
      return {
        success: false,
        error: 'Each edge must be an object.',
      };
    }

    const edgeRecord = rawEdge as Record<string, unknown>;

    const source = toTrimmedString(edgeRecord['source']);
    const target = toTrimmedString(edgeRecord['target']);

    if (!source || !target) {
      return {
        success: false,
        error: 'Each edge requires "source" and "target" fields.',
      };
    }

    if (!nodeMap.has(source)) {
      return {
        success: false,
        error: `Edge references unknown source node "${source}".`,
      };
    }
    if (!nodeMap.has(target)) {
      return {
        success: false,
        error: `Edge references unknown target node "${target}".`,
      };
    }

    const id =
      toTrimmedString(edgeRecord['id']) ??
      toTrimmedString(edgeRecord['uuid']) ??
      `smd-${source}-${target}-${index}`;

    if (seenEdgeIds.has(id)) {
      return {
        success: false,
        error: `Duplicate edge id detected: "${id}".`,
      };
    }

    const transitionData = ensureSmdTransitionData({
      event: toTrimmedString(edgeRecord['event']),
      guard: toTrimmedString(edgeRecord['guard']),
      action: toTrimmedString(edgeRecord['action']),
    });

    const label =
      toTrimmedString(edgeRecord['label']) ?? composeSmdTransitionLabel(transitionData) ?? undefined;

    const edge: Edge = {
      id,
      source,
      target,
      type: 'smdTransition',
      data: transitionData,
      label,
      sourceHandle: normalizeEdgeHandle(edgeRecord['sourceHandle']),
      targetHandle: normalizeEdgeHandle(edgeRecord['targetHandle']),
      animated: false,
      markerEnd: USE_SMD_EDGE_MARKERS ? SMD_EDGE_MARKER_URL : undefined,
      style: {
        stroke: '#37474f',
        strokeWidth: 2,
      },
    };

    edges.push(edge);
    seenEdgeIds.add(id);
  }

  const name =
    toTrimmedString(diagramPayload['name']) ??
    toTrimmedString(diagramPayload['title']);
  const description = toTrimmedString(diagramPayload['description']);

  return {
    success: true,
    nodes,
    edges,
    name,
    description,
  };
};
