import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';

export const NODE_TYPES = {
  BLOCK: 'Block',
  ACTIVITY: 'Activity',
  FLOW: 'Flow',
} as const;

export const getNodeStyle = (type: string) => {
  switch (type) {
    case NODE_TYPES.BLOCK:
      return {
        background: '#e6f3ff',
        border: '2px solid #0073e6',
        borderRadius: '4px',
        padding: '10px'
      };
    case NODE_TYPES.ACTIVITY:
      return {
        background: '#e6ffe6',
        border: '2px solid #00b300',
        borderRadius: '8px',
        padding: '10px'
      };
    default:
      return {};
  }
};

export const validateConnection = (source: any, target: any): boolean => {
  // Prevent connecting a node to itself
  if (source.getParent() === target.getParent()) {
    return false;
  }

  // Block to Block: Only allowed with flow ports
  if (source.getParent() instanceof SysMLBlockModel && 
      target.getParent() instanceof SysMLBlockModel) {
    return source.getName() !== target.getName(); // Different port types
  }

  // Activity to Activity: Always allowed
  if (source.getParent() instanceof SysMLActivityModel && 
      target.getParent() instanceof SysMLActivityModel) {
    return true;
  }

  // Block to Activity or Activity to Block: Allowed
  return true;
};