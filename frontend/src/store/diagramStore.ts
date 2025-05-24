import { create } from 'zustand';
import { Node, Edge, Connection, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';

// Define node types based on SysML diagram elements
export type NodeType = 'block' | 'sensor' | 'processor';

// Define node data structure
export interface NodeData {
  label: string;
  description?: string;
  type: NodeType;
  properties?: Record<string, string>;
  inputs?: string[];
  outputs?: string[];
}

// Define diagram types
export type DiagramType = 'block';

// Define validation error structure
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeIds?: string[];
}

// Define the store state
interface DiagramState {
  // Diagram elements
  nodes: Node<NodeData>[];
  edges: Edge[];
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
    past: { nodes: Node<NodeData>[]; edges: Edge[] }[];
    future: { nodes: Node<NodeData>[]; edges: Edge[] }[];
    lastActionTimestamp: number;
  };
  
  // Actions
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  addNode: (node: Node<NodeData>) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  removeNode: (id: string) => void;
  
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, data: Partial<Edge>) => void;
  removeEdge: (id: string) => void;
  
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  
  setDiagramType: (type: DiagramType) => void;
  setDiagramName: (name: string) => void;
  setDiagramDescription: (description: string) => void;
  
  setValidationErrors: (errors: ValidationError[]) => void;
  toggleValidationPanel: () => void;
  
  setGenerationPrompt: (prompt: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setUseRAG: (useRAG: boolean) => void;
  
  // Diagram operations
  clearDiagram: () => void;
  generateDiagramFromText: (text: string) => Promise<void>;
  validateDiagram: () => ValidationError[];
  
  // History operations
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
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
  useRAG: false,
  
  history: {
    past: [],
    future: [],
    lastActionTimestamp: 0
  },
  
  // Basic node and edge operations
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes)
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    });
  },
  
  onConnect: (connection) => {
    // Save current state before connecting nodes
    get().saveToHistory();
    
    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source || '',
      target: connection.target || '',
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#555' }
    };
    
    set({
      edges: [...get().edges, newEdge]
    });
  },
  
  // Node operations
  addNode: (node) => {
    // Save current state before adding node
    get().saveToHistory();
    
    set({
      nodes: [...get().nodes, node]
    });
  },
  
  updateNode: (id, data) => {
    // Save current state before updating node
    get().saveToHistory();
    
    set({
      nodes: get().nodes.map(node => 
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      )
    });
  },
  
  removeNode: (id) => {
    // Save current state before removing node
    get().saveToHistory();
    
    // Remove the node
    set({
      nodes: get().nodes.filter(node => node.id !== id),
      // Also remove any connected edges
      edges: get().edges.filter(edge => edge.source !== id && edge.target !== id)
    });
  },
  
  // Edge operations
  addEdge: (edge) => {
    // Save current state before adding edge
    get().saveToHistory();
    
    set({
      edges: [...get().edges, edge]
    });
  },
  
  updateEdge: (id, data) => {
    // Save current state before updating edge
    get().saveToHistory();
    
    set({
      edges: get().edges.map(edge => 
        edge.id === id ? { ...edge, ...data } : edge
      )
    });
  },
  
  removeEdge: (id) => {
    // Save current state before removing edge
    get().saveToHistory();
    
    set({
      edges: get().edges.filter(edge => edge.id !== id)
    });
  },
  
  // Selection operations
  setSelectedNodes: (nodeIds) => set({ selectedNodes: nodeIds }),
  setSelectedEdges: (edgeIds) => set({ selectedEdges: edgeIds }),
  
  // Diagram metadata operations
  setDiagramType: (type) => set({ diagramType: type }),
  setDiagramName: (name) => set({ diagramName: name }),
  setDiagramDescription: (description) => set({ diagramDescription: description }),
  
  // Validation operations
  setValidationErrors: (errors) => set({ validationErrors: errors }),
  toggleValidationPanel: () => set(state => ({ showValidationPanel: !state.showValidationPanel })),
  
  // AI generation operations
  setGenerationPrompt: (prompt) => set({ generationPrompt: prompt }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setUseRAG: (useRAG) => set({ useRAG }),
  
  // Diagram operations
  clearDiagram: () => {
    // Save current state to history before clearing
    get().saveToHistory();
    
    set({
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
      validationErrors: []
    });
  },
  
  generateDiagramFromText: async (text) => {
    try {
      set({ isGenerating: true });
      
      // Save current state to history before generating
      get().saveToHistory();
      
      // Prepare API endpoint based on whether RAG is enabled
      const endpoint = get().useRAG 
        ? '/api/v1/rag/generate-diagram-with-context/' 
        : '/api/v1/create-diagram/';
      
      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          diagram_type: get().diagramType
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process the response and update the diagram
      if (data.nodes && data.edges) {
        // Transform the API response to ReactFlow format
        const rfNodes = data.nodes.map((node: any) => ({
          id: node.id,
          type: node.type || node.data?.type || 'block',
          position: node.position,
          data: {
            label: node.name || node.data?.label || node.label,
            description: node.description || node.data?.description || '',
            type: node.data?.type || node.type || 'block',
            properties: node.properties || node.data?.properties || {},
            inputs: node.inputs || node.data?.inputs || [],
            outputs: node.outputs || node.data?.outputs || []
          }
        }));
        const rfEdges = data.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          label: edge.label || '',
          animated: edge.animated || false,
          style: { stroke: '#555' }
        }));
        
        set({
          nodes: rfNodes,
          edges: rfEdges
        });
        
        // Validate the generated diagram
        const errors = get().validateDiagram();
        set({ validationErrors: errors });
        
        if (errors.length > 0) {
          set({ showValidationPanel: true });
        }
      }
    } catch (error) {
      console.error('Error generating diagram:', error);
      set({ 
        validationErrors: [
          ...get().validationErrors,
          { 
            type: 'error', 
            message: `Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}` 
          }
        ],
        showValidationPanel: true
      });
    } finally {
      set({ isGenerating: false });
    }
  },
  
  validateDiagram: () => {
    const { nodes, edges, diagramType } = get();
    const errors: ValidationError[] = [];
    
    // Basic validation rules
    
    // 1. Check for nodes without connections
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (disconnectedNodes.length > 0) {
      errors.push({
        type: 'warning',
        message: `${disconnectedNodes.length} node(s) have no connections`,
        nodeIds: disconnectedNodes.map(node => node.id)
      });
    }
    
    // 2. Check for nodes without labels
    const noLabelNodes = nodes.filter(node => !node.data.label || node.data.label.trim() === '');
    if (noLabelNodes.length > 0) {
      errors.push({
        type: 'error',
        message: `${noLabelNodes.length} node(s) have no label`,
        nodeIds: noLabelNodes.map(node => node.id)
      });
    }
    
    // 3. Diagram type specific validations
    // Check if there's at least one block
    const hasBlocks = nodes.some(node => node.data.type === 'block');
    if (!hasBlocks) {
      errors.push({
        type: 'error',
        message: 'Block diagram must contain at least one block'
      });
    }
    
    return errors;
  },
  
  // History operations
  undo: () => {
    const { past, future, lastActionTimestamp } = get().history;
    
    if (past.length === 0) return;
    
    const newPast = [...past];
    const previousState = newPast.pop();
    
    if (!previousState) return;
    
    // Get current state before applying undo
    const currentState = { nodes: get().nodes, edges: get().edges };
    
    // Add current state to future for redo
    set({
      nodes: previousState.nodes,
      edges: previousState.edges,
      history: {
        past: newPast,
        future: [currentState, ...future],
        lastActionTimestamp
      }
    });
  },
  
  
  redo: () => {
    const { past, future, lastActionTimestamp } = get().history;
    
    if (future.length === 0) return;
    
    const newFuture = [...future];
    const nextState = newFuture.shift();
    
    if (!nextState) return;
    
    // Get current state before applying redo
    const currentState = { nodes: get().nodes, edges: get().edges };
    
    set({
      nodes: nextState.nodes,
      edges: nextState.edges,
      history: {
        past: [...past, currentState],
        future: newFuture,
        lastActionTimestamp
      }
    });
  },
  
  
  saveToHistory: () => {
    // Get current timestamp
    const now = Date.now();
    const { lastActionTimestamp } = get().history;
    
    // Only save state if it's been more than 300ms since the last action
    // This prevents multiple history entries for rapid sequential changes
    if (now - lastActionTimestamp > 300) {
      set({
        history: {
          past: [...get().history.past, { nodes: get().nodes, edges: get().edges }],
          future: [], // Clear future when a new action is performed
          lastActionTimestamp: now
        }
      });
    }
  }
}));

export default useDiagramStore;
