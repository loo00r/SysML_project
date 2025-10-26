import type { Node, Edge } from 'reactflow';
import type { NodeData } from '../../store/diagramStore';

export type ValidationSeverity = 'error' | 'warning';
export type ValidationKind = 'node' | 'edge';
export type ValidationCode = 'SMD001' | 'SMD002' | 'SMD003' | 'SMD004';

export interface ValidationResult {
  id: string; // node.id or edge.id
  kind: ValidationKind;
  severity: ValidationSeverity;
  code: ValidationCode;
  message: string;
}

/**
 * Validates an SMD diagram according to the following rules:
 * - SMD001 (warning): Only one Initial node recommended
 * - SMD002 (error): No dangling transitions (edges must have valid source and target)
 * - SMD003 (error): Initial → Initial is forbidden
 * - SMD004 (error): Final → * is forbidden (Final cannot be a source)
 */
export const validateSmd = (
  nodes: Node<NodeData>[],
  edges: Edge[]
): ValidationResult[] => {
  const results: ValidationResult[] = [];

  // Build memoized index maps for performance
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const initialNodes = nodes.filter(node => node.type === 'smdInitial');

  // Rule SMD001: Only one Initial recommended
  if (initialNodes.length > 1) {
    // Mark all Initial nodes except the first one as warnings
    initialNodes.forEach((node, index) => {
      if (index > 0) {
        results.push({
          id: node.id,
          kind: 'node',
          severity: 'warning',
          code: 'SMD001',
          message: `Only one Initial node is recommended; found ${initialNodes.length}. Consider removing extra Initial nodes.`,
        });
      }
    });

    // Also add a warning to the first Initial to inform about the issue
    if (initialNodes.length > 0) {
      results.push({
        id: initialNodes[0].id,
        kind: 'node',
        severity: 'warning',
        code: 'SMD001',
        message: `Multiple Initial nodes detected (${initialNodes.length} total). Only one is recommended.`,
      });
    }
  }

  // Rule SMD002, SMD003, SMD004: Edge validations
  edges.forEach(edge => {
    // Skip non-SMD transitions
    if (edge.type !== 'smdTransition') {
      return;
    }

    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);

    // Rule SMD002: Dangling transitions
    if (!sourceNode || !targetNode) {
      results.push({
        id: edge.id,
        kind: 'edge',
        severity: 'error',
        code: 'SMD002',
        message: `Dangling transition: ${!sourceNode ? 'source' : 'target'} node not found. Please reconnect or remove this transition.`,
      });
      return; // Skip further checks for this edge
    }

    // Rule SMD003: Initial → Initial forbidden
    if (sourceNode.type === 'smdInitial' && targetNode.type === 'smdInitial') {
      results.push({
        id: edge.id,
        kind: 'edge',
        severity: 'error',
        code: 'SMD003',
        message: 'Initial → Initial transition is forbidden. Initial states cannot transition to other Initial states.',
      });
    }

    // Rule SMD004: Final → * forbidden
    if (sourceNode.type === 'smdFinal') {
      results.push({
        id: edge.id,
        kind: 'edge',
        severity: 'error',
        code: 'SMD004',
        message: 'Final states cannot be sources of transitions. Final is a terminal state.',
      });
    }
  });

  return results;
};

/**
 * Gets a summary of validation results for display
 */
export const getValidationSummary = (results: ValidationResult[]): { errors: number; warnings: number } => {
  return results.reduce(
    (acc, result) => {
      if (result.severity === 'error') {
        acc.errors++;
      } else {
        acc.warnings++;
      }
      return acc;
    },
    { errors: 0, warnings: 0 }
  );
};
