import BlockNode from './BlockNode';
import SensorNode from './SensorNode';
import ProcessorNode from './ProcessorNode';
import PortNode from './PortNode';
import ConnectionNode from './ConnectionNode';
import IBDNode from './IBDNode';

// Export all node components
export {
  BlockNode,
  SensorNode,
  ProcessorNode,
  PortNode,
  ConnectionNode,
  IBDNode
};

// BDD node types mapping for ReactFlow
export const bddNodeTypes = {
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  ibd: IBDNode, // IBD block type available in all diagram types except BDD
  defaultNode: BlockNode
};

// IBD node types mapping for ReactFlow
export const ibdNodeTypes = {
  port: PortNode,
  connection: ConnectionNode,
  block: BlockNode, // Blocks can still appear in IBD as referenced elements
  ibd: IBDNode, // IBD block type
  defaultNode: PortNode
};

// Legacy node types mapping for backward compatibility
export const nodeTypes = bddNodeTypes;
