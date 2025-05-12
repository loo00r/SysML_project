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
// Use BlockNode as a fallback for other node types that don't have specific components yet
export const nodeTypes = {
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  // Use BlockNode as fallback for other types
  actor: BlockNode,
  useCase: BlockNode,
  activity: BlockNode,
  requirement: BlockNode,
  interface: BlockNode
};
