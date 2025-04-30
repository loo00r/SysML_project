import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';

export const NODE_TYPES = {
  BLOCK: 'Block',
  ACTIVITY: 'Activity',
  FLOW: 'Flow',
} as const;

export interface NodeStyle {
  background: string;
  border: string;
  borderRadius: string;
  padding: string;
  minWidth?: string;
  minHeight?: string;
  boxShadow?: string;
  transform?: string;
  transition?: string;
}

export const getNodeStyle = (type: string, isResizing = false, isSelected = false): NodeStyle => {
  const baseStyle = {
    padding: '15px',
    minWidth: '150px',
    minHeight: '80px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isSelected 
      ? '0 0 0 2px #1890ff, 0 2px 8px rgba(0,0,0,0.1)'
      : '0 2px 5px rgba(0,0,0,0.1)',
  };

  const getTypeSpecificStyle = () => {
    switch (type) {
      case NODE_TYPES.BLOCK:
        return {
          background: 'linear-gradient(135deg, #e6f3ff 0%, #ffffff 100%)',
          border: '2px solid #0073e6',
          borderRadius: '6px',
        };
      case NODE_TYPES.ACTIVITY:
        return {
          background: 'linear-gradient(135deg, #e6ffe6 0%, #ffffff 100%)',
          border: '2px solid #00b300',
          borderRadius: '10px',
        };
      default:
        return {
          background: '#ffffff',
          border: '2px solid #666666',
          borderRadius: '4px',
        };
    }
  };

  const resizingStyle = isResizing ? {
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transform: 'scale(1.02)',
  } : {};

  return {
    ...baseStyle,
    ...getTypeSpecificStyle(),
    ...resizingStyle,
  };
};

export const getPortStyle = (isConnectable: boolean, isConnected: boolean) => ({
  width: '12px',
  height: '12px',
  background: isConnected ? '#52c41a' : '#fff',
  border: `2px solid ${isConnectable ? '#1890ff' : '#d9d9d9'}`,
  borderRadius: '50%',
  cursor: isConnectable ? 'pointer' : 'not-allowed',
  transition: 'all 0.3s',
  boxShadow: isConnectable ? '0 0 0 4px rgba(24,144,255,0.1)' : 'none',
});

export const getLinkStyle = (isValid: boolean, isHighlighted: boolean) => ({
  stroke: isValid ? (isHighlighted ? '#1890ff' : '#666') : '#ff4d4f',
  strokeWidth: isHighlighted ? 3 : 2,
  transition: 'all 0.3s',
});

export const validateConnection = (source: any, target: any): boolean => {
  // Prevent connecting a node to itself
  if (source.getParent() === target.getParent()) {
    return false;
  }

  const sourceNode = source.getParent();
  const targetNode = target.getParent();

  // Block to Block: Only allowed with compatible ports
  if (sourceNode instanceof SysMLBlockModel && targetNode instanceof SysMLBlockModel) {
    // Allow connections only between different blocks and compatible ports
    return source.getName() !== target.getName() && 
           ((source.getName() === 'out' && target.getName() === 'in') ||
            (source.getName() === 'in' && target.getName() === 'out'));
  }

  // Activity to Activity: Allow sequential connections
  if (sourceNode instanceof SysMLActivityModel && targetNode instanceof SysMLActivityModel) {
    // Prevent cycles and ensure proper flow
    return source.getName() === 'out' && target.getName() === 'in';
  }

  // Block to Activity or Activity to Block: Allow with proper port alignment
  return (source.getName() === 'out' && target.getName() === 'in') ||
         (source.getName() === 'in' && target.getName() === 'out');
};

export const calculatePortPositions = (node: any) => {
  const size = node.getSize();
  return {
    in: { x: 0, y: size.height / 2 },
    out: { x: size.width, y: size.height / 2 }
  };
};