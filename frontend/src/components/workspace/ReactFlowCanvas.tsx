import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  MiniMap,
  useReactFlow,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, styled } from '@mui/material';

import { nodeTypes } from '../nodes';
import { NodeData } from '../../store/diagramStore';

const FlowContainer = styled(Box)({
  flex: 1,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative', // Important for absolute positioning of floating panel
});

interface ReactFlowCanvasProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node<NodeData>) => void;
  onPaneClick: () => void;
  onSelectionChange: ({ nodes, edges }: { nodes: Node<NodeData>[]; edges: Edge[] }) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

const ReactFlowCanvas: React.FC<ReactFlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onSelectionChange,
  onDrop,
  onDragOver,
  children,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  return (
    <FlowContainer ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Control"
        selectionOnDrag
        snapToGrid
        snapGrid={[15, 15]}
      >
        {/* Background grid */}
        <Background color="#aaa" gap={16} />
        
        {/* Mini map for navigation */}
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'block') return '#0041d0';
            if (n.type === 'sensor') return '#ff0072';
            if (n.type === 'processor') return '#ff9500';
            return '#0041d0';
          }}
          nodeColor={(n) => {
            if (n.type === 'block') return '#e3f2fd';
            if (n.type === 'sensor') return '#ffebee';
            if (n.type === 'processor') return '#fff8e1';
            return '#e3f2fd';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        
        {children}
      </ReactFlow>
    </FlowContainer>
  );
};

export default ReactFlowCanvas;