import BlockNode from './BlockNode';
import SensorNode from './SensorNode';
import ProcessorNode from './ProcessorNode';

// Export all node components
export {
  BlockNode,
  SensorNode,
  ProcessorNode
};

// Node types mapping for ReactFlow
// Map each node type to its corresponding component
export const nodeTypes = {
  // Basic node types
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  
  // Default node for types without specific implementations
  defaultNode: BlockNode
};
