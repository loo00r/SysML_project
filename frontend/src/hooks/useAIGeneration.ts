import { useState, useCallback } from 'react';
import type { Edge, Node } from 'reactflow';
import useDiagramStore, { type DiagramType, type NodeData } from '../store/diagramStore';
import { applyDagreLayout } from '../utils/dagreLayout';
import { parseSmdTestModeInput } from '../utils/smdTestMode';
import {
  composeSmdTransitionLabel,
  ensureSmdTransitionData,
  parseSmdTransitionLabel,
} from '../utils/smdTransition';

// Types for AI generation
interface AIGenerationOptions {
  prompt: string;
  complexity?: 'simple' | 'medium' | 'complex';
  includeRelationships?: boolean;
  style?: 'technical' | 'conceptual';
  isEnhanced?: boolean;
  testMode?: boolean;
}

interface AIGenerationResult {
  nodes: any[];
  edges: any[];
  error?: string;
  diagramId?: string;
  ibdData?: any[]; // IBD data from Redis for creating IBD diagrams
  smdData?: any[]; // SMD data from Redis for creating SMD diagrams
  diagramType?: DiagramType;
  name?: string;
  description?: string;
}

const generateTestModeSmdDiagram = async (rawJson: string): Promise<AIGenerationResult> => {
  const parsed = parseSmdTestModeInput(rawJson);
  if (parsed.success === false) {
    return {
      nodes: [],
      edges: [],
      error: parsed.error,
    };
  }

  // Apply Dagre layout for better structure with SMD-specific adaptations
  // Use Left-to-Right direction for natural state machine flow
  // flexiblePositions allows using all 4 connection sides (top, left, right, bottom)
  const layouted = applyDagreLayout(
    parsed.nodes,
    parsed.edges,
    'LR', // Left to Right for natural state machine flow
    {
      nodeWidth: 180,           // Wider for state names
      nodeHeight: 80,           // Taller for state content
      nodeSep: 100,             // Vertical spacing between nodes (increased for top/bottom connections)
      rankSep: 150,             // Horizontal spacing between ranks (increased for clarity)
      flexiblePositions: true,  // Allow SMD to use all 4 sides for connections
    }
  );

  return {
    nodes: layouted.nodes,
    edges: layouted.edges,
    diagramType: 'smd',
    name: parsed.name,
    description: parsed.description,
  };
};

const SMD_NODE_TYPE_MAP: Record<string, NodeData['type']> = {
  initial: 'smdInitial',
  final: 'smdFinal',
  state: 'smdState',
  choice: 'smdChoice',
};

const toTrimmedString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }
  return undefined;
};

const normalizeSmdNodeType = (value: unknown): NodeData['type'] | null => {
  const raw = toTrimmedString(value);
  if (!raw) {
    return null;
  }
  const key = raw.toLowerCase();
  return SMD_NODE_TYPE_MAP[key] ?? null;
};

const stateTypeForNodeType = (nodeType: NodeData['type']): NodeData['stateType'] | undefined => {
  switch (nodeType) {
    case 'smdInitial':
      return 'initial';
    case 'smdFinal':
      return 'final';
    case 'smdChoice':
      return 'choice';
    case 'smdState':
      return 'state';
    default:
      return undefined;
  }
};

const transformSmdNodesFromApi = (rawNodes: unknown[]): { nodes: Node<NodeData>[]; nodeIdSet: Set<string> } => {
  const nodes: Node<NodeData>[] = [];
  const nodeIdSet = new Set<string>();

  rawNodes.forEach((rawNode, index) => {
    if (!rawNode || typeof rawNode !== 'object') {
      return;
    }

    const nodeRecord = rawNode as Record<string, unknown>;
    const nodeId = toTrimmedString(nodeRecord.id) ?? `smd-node-${index}`;
    const nodeType = normalizeSmdNodeType(nodeRecord.type);

    if (!nodeType) {
      return;
    }

    const preferredLabel =
      toTrimmedString(nodeRecord.name) ??
      toTrimmedString(nodeRecord.label) ??
      (nodeType === 'smdInitial'
        ? 'Initial'
        : nodeType === 'smdFinal'
        ? 'Final'
        : nodeType === 'smdChoice'
        ? 'Choice'
        : 'State');

    const description = toTrimmedString(nodeRecord.description) ?? '';
    const entry = toTrimmedString(nodeRecord.entry) ?? '';
    const exit = toTrimmedString(nodeRecord.exit) ?? '';
    const doActivity = toTrimmedString((nodeRecord as Record<string, unknown>)['do']) ?? '';

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x: 0, y: index * 120 },
      data: {
        label: preferredLabel,
        description,
        type: nodeType,
        name: preferredLabel,
        entry,
        exit,
        do: doActivity,
        stateType: stateTypeForNodeType(nodeType),
      },
    });
    nodeIdSet.add(nodeId);
  });

  return { nodes, nodeIdSet };
};

const transformSmdEdgesFromApi = (rawEdges: unknown[], validNodeIds: Set<string>): Edge[] => {
  const edges: Edge[] = [];

  rawEdges.forEach((rawEdge, index) => {
    if (!rawEdge || typeof rawEdge !== 'object') {
      return;
    }

    const edgeRecord = rawEdge as Record<string, unknown>;
    const source =
      toTrimmedString(edgeRecord.source) ??
      toTrimmedString(edgeRecord.source_id) ??
      toTrimmedString(edgeRecord.from);
    const target =
      toTrimmedString(edgeRecord.target) ??
      toTrimmedString(edgeRecord.target_id) ??
      toTrimmedString(edgeRecord.to);

    if (!source || !target) {
      return;
    }

    if (validNodeIds.size > 0 && (!validNodeIds.has(source) || !validNodeIds.has(target))) {
      return;
    }

    const edgeId = toTrimmedString(edgeRecord.id) ?? `smd-edge-${source}-${target}-${index}`;

    const baseData = ensureSmdTransitionData({
      event: toTrimmedString(edgeRecord.event) ?? toTrimmedString(edgeRecord.trigger),
      guard: toTrimmedString(edgeRecord.guard),
      action: toTrimmedString(edgeRecord.action) ?? toTrimmedString(edgeRecord.effect),
    });

    let derivedData = baseData;
    let label = toTrimmedString(edgeRecord.label);

    if (label) {
      const parsed = parseSmdTransitionLabel(label);
      derivedData = ensureSmdTransitionData({
        event: derivedData.event || parsed.event,
        guard: derivedData.guard || parsed.guard,
        action: derivedData.action || parsed.action,
      });
    } else {
      label = composeSmdTransitionLabel(baseData);
    }

    edges.push({
      id: edgeId,
      source,
      target,
      type: 'smdTransition',
      label: label ?? '',
      data: derivedData,
    });
  });

  return edges;
};

// Helper function to poll for diagram result
const pollDiagramResult = async (diagramId: string, maxAttempts: number = 30): Promise<any> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`/api/v1/rag/diagram-result/${diagramId}`);
      
      if (response.status === 404) {
        // Diagram not found or expired
        throw new Error('Diagram generation expired or failed');
      }
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve diagram result: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(result.error || 'Diagram generation failed');
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error; // Last attempt, re-throw the error
      }
      // Continue polling on temporary errors
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error('Diagram generation timed out');
};

// Call the backend API to generate a diagram
const callGenerateDiagramAPI = async (options: AIGenerationOptions): Promise<AIGenerationResult> => {
  try {
    // Step 1: Start generation and get diagram ID
    const endpoint = '/api/v1/rag/generate-diagram-unified/';
    
    const requestBody = {
      text: options.prompt,
      use_rag: true,
      generate_ibd: Boolean(options.isEnhanced),
      generate_smd: Boolean(options.isEnhanced),
      name: 'AI Generated Diagram'
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const initResult = await response.json();
    if (initResult.error || initResult.status === 'error') {
      const message = initResult.error || 'Diagram generation failed to start';
      return { nodes: [], edges: [], error: message };
    }

    if (!initResult.diagramId) {
      return { nodes: [], edges: [], error: 'Missing diagram ID from unified generation endpoint' };
    }
    
    // Step 2: Poll for the actual result
    const data = await pollDiagramResult(initResult.diagramId);
    
    if (data.error) {
      return { nodes: [], edges: [], error: data.error };
    }
    
    // Convert the backend diagram format to ReactFlow format
    const ibdData = data.ibd_data || [];
    const ibdBlockIds = new Set(
      ibdData.map((item: any) => item.parent_block_id).filter(Boolean)
    );
    const smdData = data.smd_data || [];
    const smdBlockIds = new Set(
      smdData.map((item: any) => item.parent_block_id).filter(Boolean)
    );

    const diagramElements = data.diagram?.elements || [];
    const nodes = diagramElements.map((element: any) => ({
      id: element.id,
      type: element.type,
      data: { 
        label: element.name,
        description: element.description,
        properties: {
          id: element.id,
          name: element.name,
          ...element.properties
        },
        type: element.type,
        has_ibd: element.data?.has_ibd || ibdBlockIds.has(element.id) || false,
        has_smd: element.data?.has_smd || smdBlockIds.has(element.id) || false
      },
      position: element.position || { x: Math.random() * 500, y: Math.random() * 500 },
    }));
    
    // Convert relationships to edges
    const diagramRelationships = data.diagram?.relationships || [];
    const edges = diagramRelationships.map((rel: any) => ({
      id: `edge-${rel.source_id}-${rel.target_id}`,
      source: rel.source_id,
      target: rel.target_id,
      type: 'smoothstep',
      animated: rel.type === 'flow',
      label: rel.name,
      data: {
        type: rel.type,
        name: rel.name
      }
    }));
    
    return { 
      nodes, 
      edges, 
      diagramId: initResult.diagramId,
      ibdData, // Include IBD data from Redis
      smdData // Include SMD data from Redis
    };
  } catch (error) {
    console.error('Error generating diagram:', error);
    return { 
      nodes: [], 
      edges: [], 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
};

// Custom hook for AI diagram generation
export const useAIGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Get all the necessary functions from the diagram store
  const { 
    setNodes, 
    setEdges, 
    clearDiagram, 
    setGenerationPrompt, 
    setDiagramDescription,
    openDiagram,
    openNewDiagramTab,
    setActiveDiagram,
    activeDiagramId,
    openDiagrams
  } = useDiagramStore();
  
  const generateDiagram = useCallback(async (options: AIGenerationOptions) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      // Save the original prompt text to the store for future reference
      // This is critical for ensuring the RAG database gets the original text
      setGenerationPrompt(options.prompt);
      
      // Also set a shorter version as the diagram description
      const shortDescription = options.prompt.substring(0, 100) + (options.prompt.length > 100 ? '...' : '');
      setDiagramDescription(shortDescription);
      
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Call the backend API service
      const result = options.testMode
        ? await generateTestModeSmdDiagram(options.prompt)
        : await callGenerateDiagramAPI(options);
      
      clearInterval(progressInterval);
      
      if (result.error) {
        setError(result.error);
        setProgress(0);
      } else {
        // Create a new diagram tab with the generated content
        setProgress(100);
        
        const defaultDiagramName = options.testMode
          ? 'SMD Test Diagram'
          : `${options.prompt.split(' ').slice(0, 3).join(' ')} Diagram`;

        const resolvedName =
          result.name && result.name.trim().length > 0
            ? result.name.trim()
            : defaultDiagramName.trim().length > 0
              ? defaultDiagramName
              : 'Generated Diagram';

        const resolvedType: DiagramType = result.diagramType ?? (options.isEnhanced ? 'bdd_enhanced' : 'bdd');
        const resolvedDescription =
          result.description && result.description.trim().length > 0
            ? result.description.trim()
            : shortDescription;
        
        // Open a new diagram with the generated content
        openDiagram({
          name: resolvedName,
          type: resolvedType,
          nodes: result.nodes,
          edges: result.edges,
          description: resolvedDescription,
          needsCentering: true, // Center new AI-generated diagrams
          generatedDiagramId: options.testMode ? undefined : result.diagramId // Store Redis diagram ID for saving
        });
        
        // Create IBD diagrams for enhanced diagrams if IBD data exists
        if (options.isEnhanced && result.ibdData && result.ibdData.length > 0) {
          console.log(`🚀 Creating ${result.ibdData.length} IBD diagrams from AI generation`);
          
          // Get the newly created BDD diagram ID for IBD reference
          const currentDiagramId = useDiagramStore.getState().activeDiagramId;
          
          result.ibdData.forEach((ibdData: any) => {
            // Transform IBD nodes to ReactFlow format
            const ibdNodes = ibdData.nodes?.map((node: any) => ({
              id: node.id,
              type: node.type || 'ibd_block',
              position: node.position || { x: 0, y: 0 },
              data: {
                label: node.name || node.label || 'Unnamed IBD Component',
                description: node.description || '',
                type: node.type || 'ibd_block',
                properties: node.properties || {}
              }
            })) || [];
            
            // Transform IBD edges to ReactFlow format
            const ibdEdges = ibdData.edges?.map((edge: any) => ({
              id: edge.id || `edge-${edge.source}-${edge.target}`,
              source: edge.source,
              target: edge.target,
              type: 'smoothstep',
              animated: true,
              style: { 
                stroke: '#555', 
                strokeWidth: 2,
                strokeDasharray: '8 4'
              },
              className: 'ibd-animated-edge ibd-edge',
              label: edge.label || 'IBD Connection'
            })) || [];
            
            // Create IBD diagram tab
            const ibdDiagramName = `IBD for ${ibdData.parent_block_id}`;
            const ibdId = `ibd-for-${currentDiagramId}-${ibdData.parent_block_id}`;
            
            console.log(`🔧 Creating IBD: ${ibdDiagramName} with ${ibdNodes.length} nodes and ${ibdEdges.length} edges`);
            
            // Apply Dagre layout for IBD (Left-to-Right direction with increased spacing)
            const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(
              ibdNodes, 
              ibdEdges, 
              'LR', 
              {
                nodeSep: 150,  // Vertical distance
                rankSep: 350   // Horizontal distance
              }
            );
            
            openNewDiagramTab({
              name: ibdDiagramName,
              type: 'ibd',
              nodes: layoutedNodes,
              edges: layoutedEdges,
              description: `Internal Block Diagram for ${ibdData.parent_block_id}`,
              customId: ibdId,
              needsCentering: true
            });
          });
          
          // After creating all IBD diagrams, switch back to the main BDD diagram
          if (currentDiagramId) {
            console.log(`🔄 Switching back to main BDD diagram: ${currentDiagramId}`);
            setActiveDiagram(currentDiagramId);
          }
        }

        if (options.isEnhanced && result.smdData && result.smdData.length > 0) {
          console.log(`🚀 Creating ${result.smdData.length} SMD diagrams from AI generation`);

          const currentDiagramId = useDiagramStore.getState().activeDiagramId;

          result.smdData.forEach((smdEntry: any, index: number) => {
            const rawNodes = Array.isArray(smdEntry?.nodes) ? smdEntry.nodes : [];
            if (!rawNodes.length) {
              const identifier = smdEntry?.parent_block_id ?? `index-${index}`;
              console.warn(`⚠️ Skipping SMD creation for block ${identifier}: no nodes provided`);
              return;
            }

            const rawEdges = Array.isArray(smdEntry?.edges) ? smdEntry.edges : [];
            const { nodes: smdNodes, nodeIdSet } = transformSmdNodesFromApi(rawNodes);
            const smdEdges = transformSmdEdgesFromApi(rawEdges, nodeIdSet);

            const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(
              smdNodes,
              smdEdges,
              'LR',
              {
                nodeWidth: 180,
                nodeHeight: 80,
                nodeSep: 100,
                rankSep: 150,
                flexiblePositions: true,
              }
            );

            const blockLabel =
              toTrimmedString(smdEntry?.parent_block_name) ??
              toTrimmedString(smdEntry?.parent_block_id) ??
              `Block ${index + 1}`;

            const smdCustomId =
              currentDiagramId && smdEntry?.parent_block_id
                ? `smd-for-${currentDiagramId}-${smdEntry.parent_block_id}`
                : undefined;

            console.log(
              `🔧 Creating SMD: ${blockLabel} with ${layoutedNodes.length} nodes and ${layoutedEdges.length} edges`
            );

            openNewDiagramTab({
              name: `SMD for ${blockLabel}`,
              type: 'smd',
              nodes: layoutedNodes,
              edges: layoutedEdges,
              description: `State Machine Diagram for ${blockLabel}`,
              customId: smdCustomId,
              needsCentering: true,
              parentBlockId: toTrimmedString(smdEntry?.parent_block_id),
              parentDiagramId: currentDiagramId || undefined,
            });
          });

          if (currentDiagramId) {
            console.log(`🔄 Switching back to main BDD diagram after SMD creation: ${currentDiagramId}`);
            setActiveDiagram(currentDiagramId);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  }, [clearDiagram, setNodes, setEdges, setGenerationPrompt, setDiagramDescription]);
  
  return {
    generateDiagram,
    isGenerating,
    progress,
    error,
  };
};

export default useAIGeneration;
