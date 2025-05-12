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

// Mock API call - in a real implementation, this would call your backend AI service
const mockGenerateDiagram = async (options: AIGenerationOptions): Promise<AIGenerationResult> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // This is just a mock implementation
  // In a real app, this would call your backend AI service
  
  // Simple mock response based on the prompt
  if (options.prompt.toLowerCase().includes('error')) {
    return { nodes: [], edges: [], error: 'Failed to generate diagram from the provided description.' };
  }
  
  // Generate some mock nodes and edges based on the prompt
  const words = options.prompt
    .split(' ')
    .filter(word => word.length > 3)
    .slice(0, 5);
  
  const nodes = words.map((word, index) => ({
    id: `node-${index}`,
    type: index % 3 === 0 ? 'block' : index % 3 === 1 ? 'sensor' : 'processor',
    data: { 
      label: word.charAt(0).toUpperCase() + word.slice(1),
      properties: {
        id: `node-${index}`,
        name: word.charAt(0).toUpperCase() + word.slice(1),
        description: `This is a ${word} component`,
      }
    },
    position: { x: 100 + index * 200, y: 100 + (index % 2) * 100 },
  }));
  
  // Create some mock edges between nodes
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    if (Math.random() > 0.3) { // 70% chance to create an edge
      edges.push({
        id: `edge-${i}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
        type: 'default',
        animated: false,
      });
    }
  }
  
  return { nodes, edges };
};

// Custom hook for AI diagram generation
export const useAIGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { setNodes, setEdges, clearDiagram } = useDiagramStore();
  
  const generateDiagram = useCallback(async (options: AIGenerationOptions) => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    
    try {
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Call the AI generation service
      const result = await mockGenerateDiagram(options);
      
      clearInterval(progressInterval);
      
      if (result.error) {
        setError(result.error);
        setProgress(0);
      } else {
        // Update the diagram with the generated nodes and edges
        setProgress(100);
        clearDiagram();
        setNodes(result.nodes);
        setEdges(result.edges);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  }, [clearDiagram, setNodes, setEdges]);
  
  return {
    generateDiagram,
    isGenerating,
    progress,
    error,
  };
};

export default useAIGeneration;
