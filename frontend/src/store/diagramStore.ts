import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Node, Edge, Connection, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { applyDagreLayout } from '../utils/dagreLayout';

// Define node types based on SysML diagram elements
export type NodeType = 'block' | 'sensor' | 'processor' | 'port' | 'connection';

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
export type DiagramType = 'bdd' | 'ibd';

// Define diagram instance interface
export interface DiagramInstance {
  id: string;
  name: string;
  type: DiagramType;
  nodes: Node<NodeData>[];
  edges: Edge[];
  description?: string;
  createdAt: Date;
  modifiedAt: Date;
}

// Define validation error structure
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeIds?: string[];
}

// Define diagram state structure for persistence
export interface DiagramState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}

// Define the store state
interface DiagramStoreState {
  // Multi-diagram state
  openDiagrams: DiagramInstance[];
  activeDiagramId: string | null;
  
  // Persistent state for IBD diagrams
  diagramsData: Record<string, DiagramState>;
  
  // Legacy compatibility - computed from active diagram
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodes: string[];
  selectedEdges: string[];
  
  // Diagram metadata - computed from active diagram
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
  
  // Multi-diagram actions
  openDiagram: (diagramData: Omit<DiagramInstance, 'id' | 'createdAt' | 'modifiedAt'>) => void;
  openNewDiagramTab: (diagramData: Omit<DiagramInstance, 'id' | 'createdAt' | 'modifiedAt'> & { customId?: string }) => void;
  closeDiagram: (diagramId: string) => void;
  setActiveDiagram: (diagramId: string) => void;
  updateActiveDiagram: (payload: { nodes?: Node<NodeData>[], edges?: Edge[] }) => void;
  
  // Persistent state actions
  saveDiagramState: (diagramId: string, state: DiagramState) => void;
  openIbdForBlock: (bddBlockId: string) => void;
  
  // Legacy actions
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
const useDiagramStore = create<DiagramStoreState>()(persist(
  (set, get) => ({
  // Initial state
  openDiagrams: [],
  activeDiagramId: null,
  
  // Persistent state for IBD diagrams
  diagramsData: {},
  
  // Computed/legacy state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  
  diagramType: 'bdd' as DiagramType,
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
  
  // Multi-diagram actions
  openDiagram: (diagramData) => {
    const newDiagram: DiagramInstance = {
      id: `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
      ...diagramData
    };
    
    set(state => ({
      openDiagrams: [...state.openDiagrams, newDiagram],
      activeDiagramId: newDiagram.id,
      // Update computed state
      nodes: newDiagram.nodes,
      edges: newDiagram.edges,
      diagramType: newDiagram.type,
      diagramName: newDiagram.name,
      diagramDescription: newDiagram.description || ''
    }));
  },

  openNewDiagramTab: (diagramData) => {
    const { customId, ...rest } = diagramData;
    const newDiagram: DiagramInstance = {
      id: customId || `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      modifiedAt: new Date(),
      ...rest
    };
    
    set(state => ({
      openDiagrams: [...state.openDiagrams, newDiagram],
      activeDiagramId: newDiagram.id,
      // Update computed state
      nodes: newDiagram.nodes,
      edges: newDiagram.edges,
      diagramType: newDiagram.type,
      diagramName: newDiagram.name,
      diagramDescription: newDiagram.description || ''
    }));
  },
  
  closeDiagram: (diagramId) => {
    const state = get();
    
    // Find the diagram being closed
    const diagramToClose = state.openDiagrams.find(d => d.id === diagramId);
    
    // If it's an IBD diagram, save its state before closing
    if (diagramToClose && diagramToClose.type === 'ibd') {
      get().saveDiagramState(diagramId, {
        nodes: diagramToClose.nodes,
        edges: diagramToClose.edges
      });
    }
    
    const updatedDiagrams = state.openDiagrams.filter(d => d.id !== diagramId);
    
    let newActiveDiagramId = state.activeDiagramId;
    if (state.activeDiagramId === diagramId) {
      // If closing the active diagram, switch to another one
      newActiveDiagramId = updatedDiagrams.length > 0 ? updatedDiagrams[0].id : null;
    }
    
    const activeDiagram = updatedDiagrams.find(d => d.id === newActiveDiagramId);
    
    set({
      openDiagrams: updatedDiagrams,
      activeDiagramId: newActiveDiagramId,
      // Update computed state
      nodes: activeDiagram?.nodes || [],
      edges: activeDiagram?.edges || [],
      diagramType: activeDiagram?.type || 'bdd',
      diagramName: activeDiagram?.name || 'Untitled Diagram',
      diagramDescription: activeDiagram?.description || '',
      selectedNodes: [],
      selectedEdges: []
    });
  },
  
  setActiveDiagram: (diagramId) => {
    const state = get();
    
    // Save current active diagram state if it's an IBD
    if (state.activeDiagramId && state.activeDiagramId !== diagramId) {
      const currentDiagram = state.openDiagrams.find(d => d.id === state.activeDiagramId);
      if (currentDiagram && currentDiagram.type === 'ibd') {
        get().saveDiagramState(state.activeDiagramId, {
          nodes: state.nodes,
          edges: state.edges
        });
      }
    }
    
    const activeDiagram = state.openDiagrams.find(d => d.id === diagramId);
    
    if (activeDiagram) {
      set({
        activeDiagramId: diagramId,
        // Update computed state
        nodes: activeDiagram.nodes,
        edges: activeDiagram.edges,
        diagramType: activeDiagram.type,
        diagramName: activeDiagram.name,
        diagramDescription: activeDiagram.description || '',
        selectedNodes: [],
        selectedEdges: []
      });
    }
  },
  
  updateActiveDiagram: (payload) => {
    const state = get();
    if (!state.activeDiagramId) return;
    
    const updatedDiagrams = state.openDiagrams.map(diagram => {
      if (diagram.id === state.activeDiagramId) {
        return {
          ...diagram,
          nodes: payload.nodes || diagram.nodes,
          edges: payload.edges || diagram.edges,
          modifiedAt: new Date()
        };
      }
      return diagram;
    });
    
    set(state => ({
      openDiagrams: updatedDiagrams,
      // Update computed state
      nodes: payload.nodes || state.nodes,
      edges: payload.edges || state.edges
    }));
    
    // Auto-save to diagramsData if this is an IBD
    if (state.activeDiagramId) {
      const activeDiagram = updatedDiagrams.find(d => d.id === state.activeDiagramId);
      if (activeDiagram && activeDiagram.type === 'ibd') {
        get().saveDiagramState(state.activeDiagramId, {
          nodes: payload.nodes || state.nodes,
          edges: payload.edges || state.edges
        });
      }
    }
  },
  
  // Persistent state actions
  saveDiagramState: (diagramId, state) => {
    set(currentState => ({
      diagramsData: {
        ...currentState.diagramsData,
        [diagramId]: state
      }
    }));
  },
  
  openIbdForBlock: (bddBlockId) => {
    const ibdId = `ibd-for-${bddBlockId}`;
    const state = get();
    
    // Check if this IBD is already open
    const existingDiagram = state.openDiagrams.find(d => d.id === ibdId);
    if (existingDiagram) {
      // Just switch to the existing tab
      get().setActiveDiagram(ibdId);
      return;
    }
    
    // Get previously saved state for this IBD
    const savedState = state.diagramsData[ibdId];
    
    // Create new IBD diagram
    const newDiagram: DiagramInstance = {
      id: ibdId,
      name: `IBD for ${bddBlockId}`,
      type: 'ibd',
      nodes: savedState?.nodes || [],
      edges: savedState?.edges || [],
      description: `Internal Block Diagram for ${bddBlockId}`,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
    
    set(currentState => ({
      openDiagrams: [...currentState.openDiagrams, newDiagram],
      activeDiagramId: ibdId,
      // Update computed state
      nodes: newDiagram.nodes,
      edges: newDiagram.edges,
      diagramType: 'ibd',
      diagramName: newDiagram.name,
      diagramDescription: newDiagram.description || ''
    }));
    
    // Save initial state to diagramsData to mark IBD as created
    if (!savedState) {
      get().saveDiagramState(ibdId, {
        nodes: newDiagram.nodes,
        edges: newDiagram.edges
      });
    }
  },
  
  // Legacy actions
  setNodes: (nodes) => {
    set({ nodes });
    get().updateActiveDiagram({ nodes });
  },
  setEdges: (edges) => {
    set({ edges });
    get().updateActiveDiagram({ edges });
  },
  
  onNodesChange: (changes) => {
    const newNodes = applyNodeChanges(changes, get().nodes);
    set({ nodes: newNodes });
    get().updateActiveDiagram({ nodes: newNodes });
  },
  
  onEdgesChange: (changes) => {
    const newEdges = applyEdgeChanges(changes, get().edges);
    set({ edges: newEdges });
    get().updateActiveDiagram({ edges: newEdges });
  },
  
  onConnect: (connection) => {
    // Save current state before connecting nodes
    get().saveToHistory();
    
    // Get current diagram type to determine edge style
    const activeDiagram = get().openDiagrams.find(d => d.id === get().activeDiagramId);
    const isIBD = activeDiagram?.type === 'ibd';
    
    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source || '',
      target: connection.target || '',
      type: isIBD ? 'straight' : 'smoothstep', // Use straight for IBD, smoothstep for BDD
      animated: isIBD,
      style: isIBD ? { 
        stroke: '#555', 
        strokeWidth: 2,
        strokeDasharray: '8 4'
      } : { stroke: '#555', strokeWidth: 1 },
      className: isIBD ? 'ibd-animated-edge' : undefined,
      label: isIBD ? 'IBD Blocks' : undefined
    };
    
    const newEdges = [...get().edges, newEdge];
    set({ edges: newEdges });
    get().updateActiveDiagram({ edges: newEdges });
  },
  
  // Node operations
  addNode: (node) => {
    // Save current state before adding node
    get().saveToHistory();
    
    const newNodes = [...get().nodes, node];
    set({ nodes: newNodes });
    get().updateActiveDiagram({ nodes: newNodes });
  },
  
  updateNode: (id, data) => {
    // Save current state before updating node
    get().saveToHistory();
    
    const newNodes = get().nodes.map(node => 
      node.id === id ? { ...node, data: { ...node.data, ...data } } : node
    );
    set({ nodes: newNodes });
    get().updateActiveDiagram({ nodes: newNodes });
  },
  
  removeNode: (id) => {
    // Save current state before removing node
    get().saveToHistory();
    
    // Remove the node and connected edges
    const newNodes = get().nodes.filter(node => node.id !== id);
    const newEdges = get().edges.filter(edge => edge.source !== id && edge.target !== id);
    
    set({ nodes: newNodes, edges: newEdges });
    get().updateActiveDiagram({ nodes: newNodes, edges: newEdges });
  },
  
  // Edge operations
  addEdge: (edge) => {
    // Save current state before adding edge
    get().saveToHistory();
    
    const newEdges = [...get().edges, edge];
    set({ edges: newEdges });
    get().updateActiveDiagram({ edges: newEdges });
  },
  
  updateEdge: (id, data) => {
    // Save current state before updating edge
    get().saveToHistory();
    
    const newEdges = get().edges.map(edge => 
      edge.id === id ? { ...edge, ...data } : edge
    );
    set({ edges: newEdges });
    get().updateActiveDiagram({ edges: newEdges });
  },
  
  removeEdge: (id) => {
    // Save current state before removing edge
    get().saveToHistory();
    
    const newEdges = get().edges.filter(edge => edge.id !== id);
    set({ edges: newEdges });
    get().updateActiveDiagram({ edges: newEdges });
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
    get().updateActiveDiagram({ nodes: [], edges: [] });
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
        // Позиція буде встановлена алгоритмом Dagre
        position: node.position || { x: 0, y: 0 },
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
      
      // Застосовуємо автоматичне позиціонування за допомогою Dagre
      const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(rfNodes, rfEdges, 'TB');
      
      set({
        nodes: layoutedNodes,
        edges: layoutedEdges
      });
      get().updateActiveDiagram({ nodes: layoutedNodes, edges: layoutedEdges });
        
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
}),
{
  name: 'sysml-diagram-storage',
  partialize: (state) => ({ 
    diagramsData: state.diagramsData
  })
}
));

export default useDiagramStore;
