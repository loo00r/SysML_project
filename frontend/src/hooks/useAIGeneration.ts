import { useState, useCallback } from 'react';
import useDiagramStore from '../store/diagramStore';

// Types for AI generation
interface AIGenerationOptions {
  prompt: string;
  complexity?: 'simple' | 'medium' | 'complex';
  includeRelationships?: boolean;
  style?: 'technical' | 'conceptual';
}

interface AIGenerationResult {
  nodes: any[];
  edges: any[];
  error?: string;
}

// Call the backend API to generate a diagram
const callGenerateDiagramAPI = async (options: AIGenerationOptions): Promise<AIGenerationResult> => {
  try {
    // Determine which endpoint to use - RAG or standard
    const endpoint = '/api/v1/rag/generate-diagram-with-context/';
    
    // Call the backend API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: options.prompt,
        diagram_type: 'bdd', // Always generate BDD diagrams
        use_rag: true // Enable RAG by default
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      return { nodes: [], edges: [], error: data.error };
    }
    
    // Convert the backend diagram format to ReactFlow format
    const nodes = data.diagram.elements.map((element: any) => ({
      id: element.id,
      type: element.type, // Use the element type directly from backend ('block', 'sensor', 'processor', etc.)
      data: { 
        label: element.name,
        description: element.description, // Keep description as a direct property
        properties: {
          id: element.id,
          name: element.name,
          ...element.properties
        },
        type: element.type
      },
      position: element.position || { x: Math.random() * 500, y: Math.random() * 500 },
    }));
    
    // Convert relationships to edges
    const edges = data.diagram.relationships.map((rel: any) => ({
      id: `edge-${rel.source_id}-${rel.target_id}`,
      source: rel.source_id,
      target: rel.target_id,
      type: 'smoothstep', // Always use smoothstep for consistent styling
      animated: rel.type === 'flow',
      label: rel.name,
      data: {
        type: rel.type,
        name: rel.name
      }
    }));
    
    return { nodes, edges };
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
          type: 'bdd',
          nodes: result.nodes,
          edges: result.edges,
          description: shortDescription
        });
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
