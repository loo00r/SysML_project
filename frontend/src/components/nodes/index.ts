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
export const nodeTypes = {
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode
};
