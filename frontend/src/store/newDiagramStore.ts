import { create } from 'zustand';
import { DefaultNodeModel, DiagramModel } from '@projectstorm/react-diagrams';

// Define node types based on SysML diagram elements
export type NodeType = 'block' | 'sensor' | 'processor' | 'interface' | 'requirement' | 'useCase' | 'activity' | 'actor';

// Define node data structure
export interface NodeData {
  label: string;
  description?: string;
  type: NodeType;
  properties?: Record<string, string>;
  inputs?: string[];
  outputs?: string[];
}

// Define our custom node format
export interface SysMLNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

// Define our custom edge format
export interface SysMLEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// Define diagram types
export type DiagramType = 'block' | 'requirement' | 'activity' | 'use_case';

// Define validation error structure
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeIds?: string[];
}

// Define the store state
interface DiagramState {
  // Diagram elements
  nodes: SysMLNode[];
  edges: SysMLEdge[];
  selectedNodes: string[];
  selectedEdges: string[];
  
  // Diagram metadata
  diagramType: DiagramType;
  diagramName: string;
  diagramDescription: string;
  
  // UI state
  isLoading: boolean;
  validationErrors: ValidationError[];
  showValidationPanel: boolean;
  
  // AI generation state
  generationPrompt: string;
  isGenerating: boolean;
  useRAG: boolean;
  
  // History for undo/redo
  history: {
    past: { nodes: SysMLNode[]; edges: SysMLEdge[] }[];
    future: { nodes: SysMLNode[]; edges: SysMLEdge[] }[];
  };
  
  // Actions
  onNodesChange: (changes: any[]) => void;
  onEdgesChange: (changes: any[]) => void;
  onConnect: (connection: { source: string; sourceHandle?: string; target: string; targetHandle?: string }) => void;
  addNode: (node: SysMLNode) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: SysMLEdge) => void;
  updateEdge: (id: string, data: Partial<SysMLEdge>) => void;
  deleteEdge: (id: string) => void;
  setNodes: (nodes: SysMLNode[]) => void;
  setEdges: (edges: SysMLEdge[]) => void;
  setSelectedNodes: (ids: string[]) => void;
  setSelectedEdges: (ids: string[]) => void;
  selectAll: () => void;
  deselectAll: () => void;
  undo: () => void;
  redo: () => void;
  clearDiagram: () => void;
  addValidationError: (error: ValidationError) => void;
  clearValidationErrors: () => void;
  toggleValidationPanel: () => void;
  setDiagramType: (type: DiagramType) => void;
  setDiagramName: (name: string) => void;
  setDiagramDescription: (description: string) => void;  setGenerationPrompt: (prompt: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;  setUseRAG: (useRAG: boolean) => void;
  importDiagram: (data: { nodes: SysMLNode[]; edges: SysMLEdge[] }) => void;
  exportDiagram: () => { nodes: SysMLNode[]; edges: SysMLEdge[] };
  saveHistory: () => void;
}

// Create the store
const useDiagramStore = create<DiagramState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  diagramType: 'block',
  diagramName: 'Untitled Diagram',
  diagramDescription: '',
  isLoading: false,
  validationErrors: [],
  showValidationPanel: false,
  generationPrompt: '',
  isGenerating: false,
  useRAG: true,
  history: {
    past: [],
    future: [],
  },
  
  // Helper to save history
  saveHistory: () => {
    const { nodes, edges } = get();
    set((state) => ({
      history: {
        past: [...state.history.past, { nodes: [...nodes], edges: [...edges] }],
        future: [],
      },
    }));
  },
  
  // Node actions
  onNodesChange: (changes) => {
    // This is a simplified version - in real implementation you'd need custom logic
    // to handle different types of changes similar to ReactFlow's applyNodeChanges
    console.log('Node changes:', changes);
    // Get current state
    const { nodes } = get();
    
    // Process changes manually
    const updatedNodes = [...nodes];
    
    // Handle changes (simplified implementation)
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        const nodeIndex = updatedNodes.findIndex(n => n.id === change.id);
        if (nodeIndex !== -1) {
          updatedNodes[nodeIndex] = {
            ...updatedNodes[nodeIndex],
            position: change.position
          };
        }
      } else if (change.type === 'remove') {
        const nodeIndex = updatedNodes.findIndex(n => n.id === change.id);
        if (nodeIndex !== -1) {
          updatedNodes.splice(nodeIndex, 1);
        }
      }
    });
    
    set({ nodes: updatedNodes });
  },
  
  // Edge actions
  onEdgesChange: (changes) => {
    // This is a simplified version - in real implementation you'd need custom logic
    // to handle different types of changes similar to ReactFlow's applyEdgeChanges
    console.log('Edge changes:', changes);
    // Get current state
    const { edges } = get();
    
    // Process changes manually
    const updatedEdges = [...edges];
    
    // Handle changes (simplified implementation)
    changes.forEach(change => {
      if (change.type === 'remove') {
        const edgeIndex = updatedEdges.findIndex(e => e.id === change.id);
        if (edgeIndex !== -1) {
          updatedEdges.splice(edgeIndex, 1);
        }
      }
    });
    
    set({ edges: updatedEdges });
  },
  
  // Handle connections
  onConnect: (connection) => {
    const newEdge: SysMLEdge = {
      id: `e${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
    };
    
    get().saveHistory();
    set((state) => ({
      edges: [...state.edges, newEdge],
    }));
  },
  
  // Add a node
  addNode: (node) => {
    get().saveHistory();
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },
  
  // Update a node
  updateNode: (id, data) => {
    get().saveHistory();
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }));
  },
  
  // Delete a node
  deleteNode: (id) => {
    get().saveHistory();
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter(
        (edge) => edge.source !== id && edge.target !== id
      ),
    }));
  },
  
  // Add an edge
  addEdge: (edge) => {
    get().saveHistory();
    set((state) => ({
      edges: [...state.edges, edge],
    }));
  },
  
  // Update an edge
  updateEdge: (id, data) => {
    get().saveHistory();
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === id ? { ...edge, ...data } : edge
      ),
    }));
  },
  
  // Delete an edge
  deleteEdge: (id) => {
    get().saveHistory();
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
    }));
  },
  
  // Set all nodes
  setNodes: (nodes) => {
    get().saveHistory();
    set({ nodes });
  },
  
  // Set all edges
  setEdges: (edges) => {
    get().saveHistory();
    set({ edges });
  },
  
  // Set selected nodes
  setSelectedNodes: (ids) => {
    set({ selectedNodes: ids });
  },
  
  // Set selected edges
  setSelectedEdges: (ids) => {
    set({ selectedEdges: ids });
  },
  
  // Select all elements
  selectAll: () => {
    const { nodes, edges } = get();
    set({
      selectedNodes: nodes.map((node) => node.id),
      selectedEdges: edges.map((edge) => edge.id),
    });
  },
  
  // Deselect all elements
  deselectAll: () => {
    set({
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  // Undo action
  undo: () => {
    const { history } = get();
    if (history.past.length === 0) return;
    
    const previous = history.past[history.past.length - 1];
    
    set((state) => ({
      nodes: previous.nodes,
      edges: previous.edges,
      history: {
        past: state.history.past.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.history.future],
      },
    }));
  },
  
  // Redo action
  redo: () => {
    const { history } = get();
    if (history.future.length === 0) return;
    
    const next = history.future[0];
    
    set((state) => ({
      nodes: next.nodes,
      edges: next.edges,
      history: {
        past: [...state.history.past, { nodes: state.nodes, edges: state.edges }],
        future: state.history.future.slice(1),
      },
    }));
  },
  
  // Clear the diagram
  clearDiagram: () => {
    get().saveHistory();
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  // Add validation error
  addValidationError: (error) => {
    set((state) => ({
      validationErrors: [...state.validationErrors, error],
    }));
  },
  
  // Clear validation errors
  clearValidationErrors: () => {
    set({ validationErrors: [] });
  },
  
  // Toggle validation panel
  toggleValidationPanel: () => {
    set((state) => ({
      showValidationPanel: !state.showValidationPanel,
    }));
  },
  
  // Set diagram type
  setDiagramType: (type) => {
    set({ diagramType: type });
  },
  
  // Set diagram name
  setDiagramName: (name) => {
    set({ diagramName: name });
  },
  
  // Set diagram description
  setDiagramDescription: (description) => {
    set({ diagramDescription: description });
  },
  
  // Set generation prompt
  setGenerationPrompt: (prompt) => {
    set({ generationPrompt: prompt });
  },
  
  // Set is generating
  setIsGenerating: (isGenerating) => {
    set({ isGenerating });
  },
  
  // Set use RAG
  setUseRAG: (useRAG) => {
    set({ useRAG });
  },
  
  // Import diagram from data
  importDiagram: (data) => {
    get().saveHistory();
    set({
      nodes: data.nodes,
      edges: data.edges,
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  // Export diagram data
  exportDiagram: () => {
    const { nodes, edges } = get();
    return { nodes, edges };
  },
}));

export default useDiagramStore;
