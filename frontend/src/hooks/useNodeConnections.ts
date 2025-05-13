import { useStore } from 'reactflow';

/**
 * Custom hook to check if a node has incoming connections
 * @param nodeId The ID of the node to check
 * @returns boolean - true if the node has incoming connections
 */
export const useNodeConnections = (nodeId: string): boolean => {
  // Get all edges from the store
  const edges = useStore((state) => state.edges);
  
  // Check if any edge has this node as a target
  return edges.some((edge) => edge.target === nodeId);
};
