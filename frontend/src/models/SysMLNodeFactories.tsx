import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine, DefaultLinkModel } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel } from './SysMLNodeModels';
import React from 'react';
import styled from 'styled-components';
import { NODE_TYPES } from '../utils/sysmlUtils';

const NodeContainer = styled.div<{ $type: string }>`
  padding: 15px;
  border-radius: ${props => props.$type === NODE_TYPES.ACTIVITY ? '10px' : '6px'};
  background: ${props => 
    props.$type === NODE_TYPES.BLOCK ? 
    'linear-gradient(135deg, #e6f3ff 0%, #ffffff 100%)' : 
    'linear-gradient(135deg, #e6ffe6 0%, #ffffff 100%)'};
  border: 2px solid ${props =>
    props.$type === NODE_TYPES.BLOCK ? '#0073e6' : '#00b300'};
  min-width: 150px;
  min-height: 80px;
  position: relative;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;

  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    transform: translateY(-1px);
  }
`;

const NodeTitle = styled.div`
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
  padding: 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.5);
`;

const NodeDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  padding: 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.5);
`;

const PortContainer = styled.div<{ $position: 'left' | 'right' }>`
  width: 16px;
  height: 16px;
  position: absolute;
  top: 50%;
  ${props => props.$position}: -8px;
  transform: translateY(-50%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
`;

const PortWidget = styled.div<{ $isConnectable?: boolean }>`
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid ${props => props.$isConnectable ? '#0073e6' : '#666'};
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e6f3ff;
    border-color: #1890ff;
    transform: scale(1.2);
    box-shadow: 0 0 0 4px rgba(24,144,255,0.2);
  }

  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    background: transparent;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
  }
`;

interface SysMLWidgetProps {
  node: SysMLBlockModel | SysMLActivityModel;
  engine: DiagramEngine;
}

const SysMLWidget: React.FC<SysMLWidgetProps> = ({ node, engine }) => {
  const startDragging = (
    event: React.MouseEvent,
    port: any,
    connectionType: 'source' | 'target'
  ) => {
    const link = new DefaultLinkModel();
    if (connectionType === 'source') {
      link.setSourcePort(port);
    } else {
      link.setTargetPort(port);
    }

    const point = engine.getRelativeMousePoint(event);
    link.getFirstPoint().setPosition(point);
    link.getLastPoint().setPosition(point);

    engine.getModel().addLink(link);
    return link;
  };

  const handlePortMouseDown = (event: React.MouseEvent, port: any) => {
    if (event.button === 0) {
      event.stopPropagation();
      startDragging(event, port, 'source');
    }
  };

  return (
    <NodeContainer $type={node.getOptions().type || 'sysml-block'}>
      <NodeTitle>{node.getOptions().name}</NodeTitle>
      {node.getDescription() && (
        <NodeDescription>{node.getDescription()}</NodeDescription>
      )}
      {Object.values(node.getPorts()).map((port: any) => (
        <PortContainer
          key={port.getID()}
          $position={port.getOptions().alignment === 'left' ? 'left' : 'right'}
        >
          <PortWidget
            onMouseDown={(e) => handlePortMouseDown(e, port)}
            $isConnectable={true}
          />
        </PortContainer>
      ))}
    </NodeContainer>
  );
};

export class SysMLBlockFactory extends AbstractReactFactory<SysMLBlockModel, DiagramEngine> {
  constructor() {
    super('sysml-block');
  }

  generateModel(): SysMLBlockModel {
    return new SysMLBlockModel({
      name: 'New Block',
      color: 'rgb(0,192,255)'
    });
  }

  generateReactWidget(event: { model: SysMLBlockModel; engine: DiagramEngine }): JSX.Element {
    return <SysMLWidget node={event.model} engine={event.engine} />;
  }
}

export class SysMLActivityFactory extends AbstractReactFactory<SysMLActivityModel, DiagramEngine> {
  constructor() {
    super('sysml-activity');
  }

  generateModel(): SysMLActivityModel {
    return new SysMLActivityModel({
      name: 'New Activity',
      color: 'rgb(192,255,0)'
    });
  }

  generateReactWidget(event: { model: SysMLActivityModel; engine: DiagramEngine }): JSX.Element {
    return <SysMLWidget node={event.model} engine={event.engine} />;
  }
}