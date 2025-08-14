import { useState, useCallback } from 'react';
import useDiagramStore from '../store/diagramStore';
import { applyDagreLayout } from '../utils/dagreLayout';

// Types for AI generation
interface AIGenerationOptions {
  prompt: string;
  complexity?: 'simple' | 'medium' | 'complex';
  includeRelationships?: boolean;
  style?: 'technical' | 'conceptual';
  isEnhanced?: boolean;
}

interface AIGenerationResult {
  nodes: any[];
  edges: any[];
  error?: string;
  diagramId?: string;
  ibdData?: any[]; // IBD data from Redis for creating IBD diagrams
}

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
    const endpoint = '/api/v1/rag/generate-diagram-with-context/';
    
    const requestBody = {
      text: options.prompt,
      diagram_type: options.isEnhanced ? 'bdd_enhanced' : 'bdd',
      use_rag: true,
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
    if (initResult.error) {
      return { nodes: [], edges: [], error: initResult.error };
    }
    
    // Step 2: Poll for the actual result
    const data = await pollDiagramResult(initResult.diagramId);
    
    if (data.error) {
      return { nodes: [], edges: [], error: data.error };
    }
    
    // Convert the backend diagram format to ReactFlow format
    const nodes = data.diagram.elements.map((element: any) => ({
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
        has_ibd: element.data?.has_ibd || false
      },
      position: element.position || { x: Math.random() * 500, y: Math.random() * 500 },
    }));
    
    // Convert relationships to edges
    const edges = data.diagram.relationships.map((rel: any) => ({
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
      ibdData: data.ibd_data || [] // Include IBD data from Redis
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
      const result = await callGenerateDiagramAPI(options);
      
      clearInterval(progressInterval);
      
      if (result.error) {
        setError(result.error);
        setProgress(0);
      } else {
        // Create a new diagram tab with the generated content
        setProgress(100);
        
        // Generate a name for the new diagram based on the prompt
        const diagramName = options.prompt.split(' ').slice(0, 3).join(' ') + ' Diagram';
        
        // Open a new diagram with the generated content
        openDiagram({
          name: diagramName,
          type: options.isEnhanced ? 'bdd_enhanced' : 'bdd',
          nodes: result.nodes,
          edges: result.edges,
          description: shortDescription,
          needsCentering: true, // Center new AI-generated diagrams
          generatedDiagramId: result.diagramId // Store Redis diagram ID for saving
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
