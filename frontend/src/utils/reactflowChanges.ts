import type { NodeChange } from 'reactflow';

type NodeChangeWithId = Extract<NodeChange, { id: string }>;

const changeHasId = (change: NodeChange): change is NodeChangeWithId =>
  'id' in change && typeof (change as { id?: unknown }).id === 'string';

export const getNodeChangeId = (change: NodeChange): string | null => {
  if (change.type === 'add') {
    return change.item?.id ?? null;
  }

  if (changeHasId(change)) {
    return change.id;
  }

  return null;
};
