import BlockNode from './BlockNode';
import SensorNode from './SensorNode';
import ProcessorNode from './ProcessorNode';
import ActivityNode from './ActivityNode';
import UseCaseNode from './UseCaseNode';
import ActorNode from './ActorNode';

// Export all node components
export {
  BlockNode,
  SensorNode,
  ProcessorNode,
  ActivityNode,
  UseCaseNode,
  ActorNode
};

// Node types mapping for ReactFlow
// Map each node type to its corresponding component
export const nodeTypes = {
  // Basic node types
  block: BlockNode,
  sensor: SensorNode,
  processor: ProcessorNode,
  
  // New node types for different diagram types
  activity: ActivityNode,
  activityNode: ActivityNode,
  useCase: UseCaseNode,
  useCaseNode: UseCaseNode,
  actor: ActorNode,
  actorNode: ActorNode,
  
  // Default node for types without specific implementations
  defaultNode: BlockNode,
  requirement: BlockNode,
  interface: BlockNode
};
