import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';
import { DefaultPortModel, DefaultLinkModel } from '@projectstorm/react-diagrams';

export const NODE_TYPES = {
  BLOCK: 'Block',
  ACTIVITY: 'Activity',
  FLOW: 'Flow',
} as const;

// LINK_TYPES are kept for reference but no longer used for creating custom link models
export const LINK_TYPES = {
  ASSOCIATION: 'association',
  COMPOSITION: 'composition',
  AGGREGATION: 'aggregation',
  GENERALIZATION: 'generalization',
  DEPENDENCY: 'dependency'
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

// Node styling remains unchanged
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

// Basic link styling function that works with DefaultLinkModel
export const getLinkStyle = (type: string, isSelected: boolean) => {
  const baseStyle = {
    strokeWidth: isSelected ? 3 : 2,
    transition: 'all 0.3s',
  };
  
  switch (type) {
    case LINK_TYPES.ASSOCIATION:
      return {
        ...baseStyle,
        stroke: isSelected ? '#1890ff' : '#0073e6',
        markerEnd: 'url(#arrowhead)',
      };
    case LINK_TYPES.COMPOSITION:
      return {
        ...baseStyle,
        stroke: isSelected ? '#f759ab' : '#eb2f96',
        markerEnd: 'url(#diamond-filled)',
      };
    case LINK_TYPES.AGGREGATION:
      return {
        ...baseStyle,
        stroke: isSelected ? '#52c41a' : '#389e0d',
        markerEnd: 'url(#diamond-empty)',
      };
    case LINK_TYPES.GENERALIZATION:
      return {
        ...baseStyle,
        stroke: isSelected ? '#722ed1' : '#531dab',
        markerEnd: 'url(#triangle)',
      };
    case LINK_TYPES.DEPENDENCY:
      return {
        ...baseStyle,
        stroke: isSelected ? '#1890ff' : '#0073e6',
        strokeDasharray: '5,5',
        markerEnd: 'url(#arrowhead)',
      };
    default:
      return {
        ...baseStyle,
        stroke: isSelected ? '#1890ff' : '#666',
        markerEnd: 'url(#arrowhead)',
      };
  }
};

export const validateConnection = (sourcePort: DefaultPortModel, targetPort: DefaultPortModel): boolean => {
  if (sourcePort.getParent().getID() === targetPort.getParent().getID()) {
    return false;
  }

  const sourceNode = sourcePort.getParent();
  const targetNode = targetPort.getParent();

  if (sourceNode instanceof SysMLBlockModel && targetNode instanceof SysMLBlockModel) {
    return sourcePort.getOptions().alignment !== targetPort.getOptions().alignment;
  }

  if (sourceNode instanceof SysMLActivityModel && targetNode instanceof SysMLActivityModel) {
    return sourcePort.getOptions().alignment === 'right' && targetPort.getOptions().alignment === 'left';
  }

  if (
    (sourceNode instanceof SysMLActivityModel && targetNode instanceof SysMLBlockModel) ||
    (sourceNode instanceof SysMLBlockModel && targetNode instanceof SysMLActivityModel)
  ) {
    if (sourcePort.getOptions().alignment === 'right' && targetPort.getOptions().alignment === 'left') return true;
    if (sourcePort.getOptions().alignment === 'bottom' && targetPort.getOptions().alignment === 'top') return true;
    return false;
  }

  return true;
};

export const calculatePortPositions = (node: any) => {
  const size = node.getSize();
  return {
    top: { x: size.width / 2, y: 0 },
    bottom: { x: size.width / 2, y: size.height },
    in: { x: 0, y: size.height / 2 },
    out: { x: size.width, y: size.height / 2 }
  };
};

// Create a standard link with the default model instead of custom SysMLLinkModel
export const createLink = (
  engine: any,
  sourcePort: DefaultPortModel,
  targetPort: DefaultPortModel,
  options?: {
    type?: string;
    label?: string;
  }
): DefaultLinkModel => {
  const type = options?.type || LINK_TYPES.ASSOCIATION;
  const style = getLinkStyle(type, false);
  
  const link = new DefaultLinkModel();
  link.setColor(style.stroke);
  
  if (options?.label) {
    link.addLabel(options.label);
  }
  
  link.setSourcePort(sourcePort);
  link.setTargetPort(targetPort);
  
  engine.getModel().addLink(link);
  
  return link;
};

export const areNodesConnected = (sourceNode: any, targetNode: any): boolean => {
  const sourcePorts = sourceNode.getPorts();
  
  for (const portKey in sourcePorts) {
    const port = sourcePorts[portKey];
    const links = port.getLinks();
    
    for (const linkKey in links) {
      const link = links[linkKey];
      const sourcePort = link.getSourcePort();
      const targetPort = link.getTargetPort();
      
      if (!sourcePort || !targetPort) continue;
      
      const otherNode = sourcePort.getParent().getID() === sourceNode.getID() 
        ? targetPort.getParent() 
        : sourcePort.getParent();
        
      if (otherNode.getID() === targetNode.getID()) {
        return true;
      }
    }
  }
  
  return false;
};

export const getLinkTypeFromNodes = (sourceNode: any, targetNode: any, portNames: {source: string, target: string}) => {
  if (sourceNode instanceof SysMLBlockModel && targetNode instanceof SysMLBlockModel) {
    if (portNames.source === 'bottom' && portNames.target === 'top') {
      return LINK_TYPES.COMPOSITION;
    }
  }
  
  if (sourceNode instanceof SysMLActivityModel && targetNode instanceof SysMLActivityModel) {
    if (portNames.source === 'out' && portNames.target === 'in') {
      return LINK_TYPES.DEPENDENCY;
    }
  }
  
  return LINK_TYPES.ASSOCIATION;
};