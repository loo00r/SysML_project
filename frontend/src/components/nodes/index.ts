import BlockNode from './BlockNode';
import SensorNode from './SensorNode';
import ProcessorNode from './ProcessorNode';
import PortNode from './PortNode';
import ConnectionNode from './ConnectionNode';

// Export all node components
export {
  BlockNode,
  SensorNode,
  ProcessorNode,
  PortNode,
  ConnectionNode
};

// BDD node types mapping for ReactFlow
export const bddNodeTypes = {
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  defaultNode: BlockNode
};

// IBD node types mapping for ReactFlow
export const ibdNodeTypes = {
  port: PortNode,
  connection: ConnectionNode,
  block: BlockNode, // Blocks can still appear in IBD as referenced elements
  defaultNode: PortNode
};

// Legacy node types mapping for backward compatibility
export const nodeTypes = bddNodeTypes;
