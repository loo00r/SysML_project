import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  has_ibd?: boolean; // Flag for AI-generated IBDs
}

// Define diagram types
export type DiagramType = 'bdd' | 'bdd_enhanced' | 'ibd';

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
  source?: 'ai' | 'manual'; // Track how this diagram was created
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
  openIbdForBlock: (bddBlockId: string) => Promise<void>;
  
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
  
  openIbdForBlock: async (bddBlockId) => {
    console.log('🚀 [IBD] Starting openIbdForBlock for blockId:', bddBlockId);
    const { openDiagrams, diagramsData, activeDiagramId, openNewDiagramTab, setActiveDiagram } = get();

    if (!activeDiagramId) {
      console.error('❌ [IBD] Cannot create IBD: no active diagram');
      return;
    }

    const ibdId = `ibd-for-${activeDiagramId}-${bddBlockId}`;
    console.log('📍 [IBD] Generated IBD ID:', ibdId);
    
    const parentDiagram = openDiagrams.find(d => d.id === activeDiagramId);
    console.log('📊 [IBD] Parent diagram found:', !!parentDiagram, 'name:', parentDiagram?.name);
    
    const parentNode = parentDiagram?.nodes.find(n => n.id === bddBlockId);
    console.log('🔍 [IBD] Parent node found:', !!parentNode, 'has_ibd flag:', parentNode?.data?.has_ibd);

    // 1. Check if the IBD tab is already open
    if (openDiagrams.some(d => d.id === ibdId)) {
      console.log('✅ [IBD] IBD tab already open, switching to it');
      setActiveDiagram(ibdId);
      return;
    }

    // 2. Check if the IBD data is already stored locally (from a previous session or manual creation)
    if (diagramsData[ibdId]) {
      console.log('💾 [IBD] Found locally stored IBD data, opening from cache');
      const savedData = diagramsData[ibdId];
      console.log('📋 [IBD] Cached data - nodes:', savedData.nodes?.length || 0, 'edges:', savedData.edges?.length || 0);
      
      try {
        openNewDiagramTab({
          name: `IBD for ${bddBlockId}`,
          type: 'ibd',
          nodes: savedData.nodes,
          edges: savedData.edges,
          description: `Internal Block Diagram for ${bddBlockId}`,
          customId: ibdId
        });
        console.log('✅ [IBD] Successfully opened IBD from local cache');
      } catch (error) {
        console.error('❌ [IBD] Error opening IBD from cache:', error);
        throw error;
      }
      return;
    }

    // 3. NEW LOGIC: If the node has the has_ibd flag, fetch from the backend
    if (parentNode?.data?.has_ibd) {
      console.log('🌐 [IBD] Node has has_ibd flag, attempting API fetch');
      try {
        const apiUrl = `/api/v1/diagrams/ibd/${bddBlockId}`;
        console.log('📡 [IBD] Making API request to:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 [IBD] API response status:', response.status, response.statusText);

        if (response.ok) {
          console.log('✅ [IBD] API request successful, parsing response');
          const ibdDataFromApi = await response.json();
          console.log('📋 [IBD] API data - nodes:', ibdDataFromApi.nodes?.length || 0, 'edges:', ibdDataFromApi.edges?.length || 0);
          console.log('🔍 [IBD] Node types in API data:', ibdDataFromApi.nodes?.map(n => n.type).join(', ') || 'none');
          console.log('📊 [IBD] Raw API node structure:', ibdDataFromApi.nodes?.[0]);
          
          // Transform API nodes to ReactFlow format
          const transformedNodes = ibdDataFromApi.nodes?.map((apiNode: any) => ({
            id: apiNode.id,
            type: apiNode.type || 'ibd_block',
            position: apiNode.position || { x: 0, y: 0 },
            data: {
              label: apiNode.name || apiNode.label || 'Unnamed IBD Component',
              description: apiNode.description || '',
              type: apiNode.type || 'ibd_block',
              properties: apiNode.properties || {}
            }
          })) || [];
          
          // Transform API edges to ReactFlow format 
          const transformedEdges = ibdDataFromApi.edges?.map((apiEdge: any) => ({
            id: apiEdge.id,
            source: apiEdge.source,
            target: apiEdge.target,
            // Use dynamic edge type: straight for 2 nodes or fewer, smoothstep for 3+ nodes
            type: (ibdDataFromApi.nodes?.length || 0) <= 2 ? 'straight' : 'smoothstep',
            animated: true,
            style: { 
              stroke: '#555', 
              strokeWidth: 2,
              strokeDasharray: '8 4'
            },
            className: 'ibd-animated-edge ibd-edge',
            label: apiEdge.label || 'IBD Connection'
          })) || [];
          
          console.log('🔄 [IBD] Transformed nodes:', transformedNodes.length, 'first node data:', transformedNodes[0]?.data);
          console.log('🔄 [IBD] Transformed edges:', transformedEdges.length);
          
          // Apply simple Dagre layout with Left-to-Right direction for IBD horizontal connections
          console.log('🌀 [IBD] Applying Dagre layout (LR)...');
          const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(transformedNodes, transformedEdges, 'LR', {
            nodeSep: 150,  // Vertical distance can be smaller
            rankSep: 350   // Radically increased horizontal distance
          });
          console.log('✅ [IBD] Dagre layout (LR) applied successfully');
          
          try {
            openNewDiagramTab({
              name: `IBD for ${bddBlockId}`,
              type: 'ibd',
              nodes: layoutedNodes,
              edges: layoutedEdges,
              description: `Internal Block Diagram for ${bddBlockId}`,
              customId: ibdId
            });
            console.log('✅ [IBD] Successfully opened IBD from API data');
          } catch (tabError) {
            console.error('❌ [IBD] Error opening new tab with API data:', tabError);
            throw tabError;
          }
          return;
        }

        if (response.status === 404) {
           console.log("⚠️ [IBD] has_ibd flag was true, but no IBD found on backend (404). Falling back to manual creation.");
        } else {
          console.error('❌ [IBD] API request failed with status:', response.status, 'Response text:', await response.text());
        }

      } catch (error) {
        console.error("❌ [IBD] Failed to fetch IBD from backend:", error);
      }
    } else {
      console.log('ℹ️ [IBD] Node does not have has_ibd flag, proceeding to manual creation');
    }

    // 4. Fallback: If all else fails, create a new, empty IBD (original behavior for manual creation)
    console.log('🔧 [IBD] Creating new empty IBD (fallback)');
    try {
      openNewDiagramTab({
        name: `IBD for ${bddBlockId}`,
        type: 'ibd',
        nodes: [],
        edges: [],
        description: `Internal Block Diagram for ${bddBlockId}`,
        customId: ibdId
      });
      console.log('✅ [IBD] Successfully created new empty IBD');
    } catch (error) {
      console.error('❌ [IBD] Error creating new empty IBD:', error);
      throw error;
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
    
    // Get current diagram type and node count to determine edge style
    const activeDiagram = get().openDiagrams.find(d => d.id === get().activeDiagramId);
    const isIBD = activeDiagram?.type === 'ibd';
    const currentNodes = get().nodes;
    
    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source || '',
      target: connection.target || '',
      // For IBD: use straight for 2 nodes, smoothstep for 3+ nodes. For BDD: always smoothstep
      type: isIBD ? (currentNodes.length <= 2 ? 'straight' : 'smoothstep') : 'smoothstep',
      animated: isIBD,
      style: isIBD ? { 
        stroke: '#555', 
        strokeWidth: 2,
        strokeDasharray: '8 4'
      } : { stroke: '#555', strokeWidth: 1 },
      className: isIBD ? 'ibd-animated-edge ibd-edge' : undefined,
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
      // IBD діаграми використовують LR (горизонтальний), BDD діаграми TB (вертикальний)
      const direction = get().diagramType === 'ibd' ? 'LR' : 'TB';
      console.log(`🌀 [Generation] Applying Dagre layout (${direction}) for diagram type: ${get().diagramType}`);
      const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(rfNodes, rfEdges, direction, 
        get().diagramType === 'ibd' ? {
          nodeSep: 150,  // Vertical distance can be smaller
          rankSep: 350   // Radically increased horizontal distance
        } : undefined
      );
      
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
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ 
    openDiagrams: state.openDiagrams,
    activeDiagramId: state.activeDiagramId,
    diagramsData: state.diagramsData
  }),
  onRehydrateStorage: () => (state) => {
    if (state && state.activeDiagramId && state.openDiagrams) {
      // Find the active diagram and restore computed state
      const activeDiagram = state.openDiagrams.find(d => d.id === state.activeDiagramId);
      if (activeDiagram) {
        // Update computed state from the active diagram
        state.nodes = activeDiagram.nodes;
        state.edges = activeDiagram.edges;
        state.diagramType = activeDiagram.type;
        state.diagramName = activeDiagram.name;
        state.diagramDescription = activeDiagram.description || '';
        // Reset transient state
        state.selectedNodes = [];
        state.selectedEdges = [];
        state.isLoading = false;
        state.validationErrors = [];
        state.showValidationPanel = false;
        state.isGenerating = false;
        state.generationPrompt = '';
      }
    }
  }
}
));

export default useDiagramStore;
