import React from 'react';
import styled from 'styled-components';
import { NODE_TYPES } from '../utils/sysmlUtils';

const SidebarContainer = styled.div`
  width: 250px;
  background-color: #f5f5f5;
  border-right: 1px solid #ddd;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const CategoryTitle = styled.h3`
  font-size: 14px;
  color: #666;
  margin: 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #ddd;
`;

const BlockItem = styled.div<{ blockType: string }>`
  padding: 12px;
  margin: 5px 0;
  background: ${props => 
    props.blockType === NODE_TYPES.BLOCK ? '#e6f3ff' :
    props.blockType === NODE_TYPES.ACTIVITY ? '#e6ffe6' : 'white'
  };
  border: 2px solid ${props =>
    props.blockType === NODE_TYPES.BLOCK ? '#0073e6' :
    props.blockType === NODE_TYPES.ACTIVITY ? '#00b300' : '#ddd'
  };
  border-radius: ${props => props.blockType === NODE_TYPES.ACTIVITY ? '8px' : '4px'};
  cursor: move;
  user-select: none;
  position: relative;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  &::before {
    content: '${props => 
      props.blockType === NODE_TYPES.BLOCK ? '⬛' :
      props.blockType === NODE_TYPES.ACTIVITY ? '⚡' : '↔️'
    }';
    margin-right: 8px;
  }
`;

const blocks = [
  { id: 'system-block', type: NODE_TYPES.BLOCK, label: 'System Block' },
  { id: 'sensor', type: NODE_TYPES.BLOCK, label: 'Sensor' },
  { id: 'processor', type: NODE_TYPES.BLOCK, label: 'Processor' },
  { id: 'scan-activity', type: NODE_TYPES.ACTIVITY, label: 'Scan Activity' },
  { id: 'process-activity', type: NODE_TYPES.ACTIVITY, label: 'Process Activity' },
  { id: 'transmit-activity', type: NODE_TYPES.ACTIVITY, label: 'Transmit Activity' },
  { id: 'flow', type: NODE_TYPES.FLOW, label: 'Flow Connection' },
];

const Sidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, block: any) => {
    event.dataTransfer.setData('application/json', JSON.stringify(block));
    event.dataTransfer.effectAllowed = 'move';
  };

  const renderBlocksByType = (type: string) => {
    return blocks
      .filter(block => block.type === type)
      .map(block => (
        <BlockItem
          key={block.id}
          draggable
          blockType={block.type}
          onDragStart={(e) => onDragStart(e, block)}
        >
          {block.label}
        </BlockItem>
      ));
  };

  return (
    <SidebarContainer>
      <CategoryTitle>Blocks</CategoryTitle>
      {renderBlocksByType(NODE_TYPES.BLOCK)}
      
      <CategoryTitle>Activities</CategoryTitle>
      {renderBlocksByType(NODE_TYPES.ACTIVITY)}
      
      <CategoryTitle>Connections</CategoryTitle>
      {renderBlocksByType(NODE_TYPES.FLOW)}
    </SidebarContainer>
  );
};

export default Sidebar;