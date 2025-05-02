import React from 'react';
import styled from 'styled-components';
import { NODE_TYPES } from '../utils/sysmlUtils';

const SidebarContainer = styled.div`
  width: 280px;
  background: linear-gradient(to bottom, #f8f9fa, #ffffff);
  border-right: 1px solid #ddd;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  box-shadow: 2px 0 5px rgba(0,0,0,0.05);
`;

const CategoryTitle = styled.h3`
  font-size: 14px;
  color: #2c3e50;
  margin: 15px 0 10px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: ${props => props.children === 'Blocks' ? '"⬛"' : 
              props.children === 'Activities' ? '"⚡"' : '"↔️"'};
  }
`;

const BlockItem = styled.div.withConfig({
  shouldForwardProp: (prop): boolean => !['blockType', 'blockLabel'].includes(prop as string)
})<{ blockType: string, blockLabel?: string }>`
  padding: 15px;
  margin: 8px 0;
  background: ${props => {
    if (props.blockLabel === 'System Block') return 'linear-gradient(to bottom, #e6f3ff, #fff)';
    if (props.blockLabel === 'Sensor') return 'linear-gradient(to bottom, #ffe6e6, #fff)';
    if (props.blockLabel === 'Processor') return 'linear-gradient(to bottom, #fffbe6, #fff)';
    return props.blockType === NODE_TYPES.BLOCK ? 'linear-gradient(to bottom, #e6f3ff, #fff)' :
      props.blockType === NODE_TYPES.ACTIVITY ? 'linear-gradient(to bottom, #e6ffe6, #fff)' : '#fff';
  }};
  border: 2px solid ${props => {
    if (props.blockLabel === 'System Block') return '#0073e6';
    if (props.blockLabel === 'Sensor') return '#e53935';
    if (props.blockLabel === 'Processor') return '#ffd600';
    return props.blockType === NODE_TYPES.BLOCK ? '#0073e6' :
      props.blockType === NODE_TYPES.ACTIVITY ? '#00b300' : '#666';
  }};
  border-radius: ${props => props.blockType === NODE_TYPES.ACTIVITY ? '10px' : '6px'};
  cursor: grab;
  user-select: none;
  position: relative;
  transition: all 0.2s ease;
  z-index: 100;
  pointer-events: all;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
  &:active {
    cursor: grabbing;
  }
  &::before {
    content: ${props => 
      props.blockType === NODE_TYPES.BLOCK ? '"⬛"' :
      props.blockType === NODE_TYPES.ACTIVITY ? '"⚡"' : '"↔️"'
    };
    margin-right: 8px;
  }
  &::after {
    content: 'Drag to canvas';
    position: absolute;
    right: 10px;
    bottom: 5px;
    font-size: 10px;
    color: #666;
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  &:hover::after {
    opacity: 1;
  }
`;

const Description = styled.p`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
`;

const blocks = [
  { 
    id: 'system-block', 
    type: NODE_TYPES.BLOCK, 
    label: 'System Block',
    description: 'Main system component with inputs and outputs'
  },
  { 
    id: 'sensor', 
    type: NODE_TYPES.BLOCK, 
    label: 'Sensor',
    description: 'Data collection component'
  },
  { 
    id: 'processor', 
    type: NODE_TYPES.BLOCK, 
    label: 'Processor',
    description: 'Data processing unit'
  },
  { 
    id: 'scan-activity', 
    type: NODE_TYPES.ACTIVITY, 
    label: 'Scan Activity',
    description: 'Data scanning process'
  },
  { 
    id: 'process-activity', 
    type: NODE_TYPES.ACTIVITY, 
    label: 'Process Activity',
    description: 'Data analysis and processing'
  },
  { 
    id: 'transmit-activity', 
    type: NODE_TYPES.ACTIVITY, 
    label: 'Transmit Activity',
    description: 'Data transmission process'
  }
];

const Sidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, block: any) => {
    try {
      const data = {
        type: block.type,
        label: block.label,
        description: block.description
      };
      event.dataTransfer.setData('application/json', JSON.stringify(data));
      event.dataTransfer.effectAllowed = 'copy';

      // Create and customize drag preview
      const dragPreview = document.createElement('div');
      dragPreview.style.padding = '10px';
      dragPreview.style.background = block.type === NODE_TYPES.BLOCK ? '#e6f3ff' : '#e6ffe6';
      dragPreview.style.border = `2px solid ${block.type === NODE_TYPES.BLOCK ? '#0073e6' : '#00b300'}`;
      dragPreview.style.borderRadius = block.type === NODE_TYPES.ACTIVITY ? '10px' : '6px';
      dragPreview.style.position = 'fixed';
      dragPreview.style.top = '-1000px';
      dragPreview.style.left = '-1000px';
      dragPreview.style.zIndex = '9999';
      dragPreview.style.pointerEvents = 'none';
      dragPreview.textContent = block.label;
      
      document.body.appendChild(dragPreview);
      event.dataTransfer.setDragImage(dragPreview, 0, 0);
      
      // Clean up the preview element
      requestAnimationFrame(() => {
        document.body.removeChild(dragPreview);
      });
    } catch (error) {
      console.error('Error starting drag:', error);
    }
  };

  const renderBlocksByType = (type: string) => {
    return blocks
      .filter(block => block.type === type)
      .map(block => (
        <BlockItem
          key={block.id}
          draggable
          blockType={block.type}
          blockLabel={block.label}
          onDragStart={(e) => onDragStart(e, block)}
        >
          {block.label}
          <Description>{block.description}</Description>
        </BlockItem>
      ));
  };

  return (
    <SidebarContainer>
      <CategoryTitle>Blocks</CategoryTitle>
      {renderBlocksByType(NODE_TYPES.BLOCK)}
      
      <CategoryTitle>Activities</CategoryTitle>
      {renderBlocksByType(NODE_TYPES.ACTIVITY)}
    </SidebarContainer>
  );
};

export default Sidebar;