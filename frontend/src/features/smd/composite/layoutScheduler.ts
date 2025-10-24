import type { Edge, Node } from 'reactflow';
import type { NodeData } from '../../../store/diagramStore';
import { layoutSmdComposite, type LayoutSmdCompositeResult } from '../../../services/layout/smdDagre';

const LAYOUT_DEBOUNCE_MS = 150;
const FRAME_DELAY_FALLBACK_MS = 16;
const POSITION_STABLE_DELAY = 2; // number of RAF hops before measuring

export type CompositeLayoutReason =
  | 'child-add'
  | 'child-delete'
  | 'drag-end'
  | 'edge-add'
  | 'edge-remove'
  | 'hydrate'
  | 'open'
  | 'undo-redo'
  | 'unknown';

export interface CompositeLayoutSchedulerConfig {
  getNodes: () => Node<NodeData>[];
  getEdges: () => Edge[];
  applyLayout: (nodes: Node<NodeData>[]) => void;
  afterLayout?: (payload: CompositeLayoutCallbackPayload) => void;
}

export interface CompositeLayoutRequest {
  reason?: CompositeLayoutReason;
}

export interface CompositeLayoutCallbackPayload {
  parentId: string;
  reason?: CompositeLayoutReason;
  result: LayoutSmdCompositeResult;
}

export interface CompositeLayoutScheduler {
  schedule(parentId: string, request?: CompositeLayoutRequest): void;
  scheduleMany(parentIds: Iterable<string>, request?: CompositeLayoutRequest): void;
  flush(parentId: string, request?: CompositeLayoutRequest): void;
  flushMany(parentIds?: Iterable<string>, request?: CompositeLayoutRequest): void;
  cancel(parentId: string): void;
  cancelAll(): void;
}

type TimeoutHandle = ReturnType<typeof setTimeout>;

const waitForStableFrame = () => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return new Promise<void>(resolve => setTimeout(resolve, FRAME_DELAY_FALLBACK_MS));
  }

  return new Promise<void>(resolve => {
    let hops = POSITION_STABLE_DELAY;
    const step = () => {
      if (hops <= 0) {
        resolve();
        return;
      }
      hops -= 1;
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  });
};

export const createCompositeLayoutScheduler = (
  config: CompositeLayoutSchedulerConfig,
): CompositeLayoutScheduler => {
  const timers = new Map<string, TimeoutHandle>();
  const reasons = new Map<string, CompositeLayoutReason>();
  const inFlight = new Set<string>();
  const queued = new Set<string>();

  const clearTimer = (parentId: string) => {
    const handle = timers.get(parentId);
    if (handle) {
      clearTimeout(handle);
      timers.delete(parentId);
    }
  };

  const runLayout = async (parentId: string) => {
    if (inFlight.has(parentId)) {
      queued.add(parentId);
      return;
    }

    const reason = reasons.get(parentId);
    reasons.delete(parentId);

    inFlight.add(parentId);

    try {
      await waitForStableFrame();
      const nodes = config.getNodes();
      const edges = config.getEdges();
      const result = await layoutSmdComposite(
        {
          parentId,
          nodes,
          edges,
        },
        {},
      );

      if (result.changed) {
        config.applyLayout(result.nodes);
      }

      if (config.afterLayout) {
        config.afterLayout({
          parentId,
          reason,
          result,
        });
      }
    } catch (error) {
      console.warn(`[SMD] Failed to layout composite '${parentId}':`, error);
    } finally {
      inFlight.delete(parentId);
      if (queued.delete(parentId)) {
        // Re-run layout after any queued request
        scheduleImmediate(parentId);
      }
    }
  };

  const scheduleImmediate = (parentId: string) => {
    clearTimer(parentId);
    // Run after microtask to avoid blocking current updates
    Promise.resolve().then(() => {
      runLayout(parentId).catch(() => {
        // ignore errors
      });
    });
  };

  const scheduleWithDelay = (parentId: string) => {
    clearTimer(parentId);
    const handle = setTimeout(() => {
      timers.delete(parentId);
      runLayout(parentId).catch(() => {
        // ignore errors
      });
    }, LAYOUT_DEBOUNCE_MS);
    timers.set(parentId, handle);
  };

  const scheduleMany = (parentIds: Iterable<string>, request?: CompositeLayoutRequest, immediate = false) => {
    for (const parentId of parentIds) {
      if (request?.reason) {
        reasons.set(parentId, request.reason);
      }

      if (inFlight.has(parentId)) {
        queued.add(parentId);
        continue;
      }

      if (immediate) {
        scheduleImmediate(parentId);
      } else {
        scheduleWithDelay(parentId);
      }
    }
  };

  return {
    schedule(parentId, request) {
      scheduleMany([parentId], request, false);
    },
    scheduleMany(parentIds, request) {
      scheduleMany(parentIds, request, false);
    },
    flush(parentId, request) {
      scheduleMany([parentId], request, true);
    },
    flushMany(parentIds, request) {
      const ids = parentIds
        ? Array.from(parentIds)
        : Array.from(new Set([...timers.keys(), ...inFlight.values(), ...queued.values(), ...reasons.keys()]));
      scheduleMany(ids, request, true);
    },
    cancel(parentId) {
      clearTimer(parentId);
      reasons.delete(parentId);
      queued.delete(parentId);
    },
    cancelAll() {
      timers.forEach(handle => clearTimeout(handle));
      timers.clear();
      reasons.clear();
      queued.clear();
      inFlight.clear();
    },
  };
};
