import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine, DefaultLinkFactory } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel, SysMLLinkModel } from './SysMLNodeModels';
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

const ConnectorDot = styled.div`
  width: 10px;
  height: 10px;
  background: #0073e6;
  border: 2px solid white;
  border-radius: 50%;
  position: absolute;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.2);
    background: #1890ff;
  }
`;

const TopConnector = styled(ConnectorDot)`
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  &:hover {
    transform: translateX(-50%) scale(1.2);
  }
`;

const RightConnector = styled(ConnectorDot)`
  top: 50%;
  right: -5px;
  transform: translateY(-50%);
  &:hover {
    transform: translateY(-50%) scale(1.2);
  }
`;

const BottomConnector = styled(ConnectorDot)`
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  &:hover {
    transform: translateX(-50%) scale(1.2);
  }
`;

const LeftConnector = styled(ConnectorDot)`
  top: 50%;
  left: -5px;
  transform: translateY(-50%);
  &:hover {
    transform: translateY(-50%) scale(1.2);
  }
`;

// Create a simple context to access the engine
const DiagramContext = React.createContext<{engine: DiagramEngine | null}>({engine: null});

interface SysMLWidgetProps {
  node: SysMLBlockModel | SysMLActivityModel;
  engine: DiagramEngine;
}

// Simplified widget with connection dots that stop propagation
const SysMLWidget: React.FC<SysMLWidgetProps> = ({ node, engine }) => {
  // Prevent the click event from reaching the block and moving it
  const preventPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Отримуємо порти для кожної позиції
  const topPort = node.getPort('top');
  const rightPort = node.getPort('right');
  const bottomPort = node.getPort('bottom');
  const leftPort = node.getPort('left');

  return (
    <NodeContainer $type={node.getOptions().type || 'sysml-block'}>
      <NodeTitle>{node.getOptions().name}</NodeTitle>
      {node.getDescription && node.getDescription() && (
        <NodeDescription>{node.getDescription()}</NodeDescription>
      )}
      
      {/* Connection points with propagation prevention */}
      {topPort && (
        <TopConnector 
          className="connector-dot"
          data-connector="top" 
          data-nodeid={node.getID()}
          data-portid={topPort.getID()}
          onClick={preventPropagation}
          onMouseDown={preventPropagation}
        />
      )}
      {rightPort && (
        <RightConnector 
          className="connector-dot"
          data-connector="right" 
          data-nodeid={node.getID()}
          data-portid={rightPort.getID()}
          onClick={preventPropagation}
          onMouseDown={preventPropagation}
        />
      )}
      {bottomPort && (
        <BottomConnector 
          className="connector-dot"
          data-connector="bottom" 
          data-nodeid={node.getID()}
          data-portid={bottomPort.getID()}
          onClick={preventPropagation}
          onMouseDown={preventPropagation}
        />
      )}
      {leftPort && (
        <LeftConnector 
          className="connector-dot"
          data-connector="left" 
          data-nodeid={node.getID()}
          data-portid={leftPort.getID()}
          onClick={preventPropagation}
          onMouseDown={preventPropagation}
        />
      )}
    </NodeContainer>
  );
};

// Wrap the factory's generateReactWidget to provide the engine via context
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
    return (
      <DiagramContext.Provider value={{engine: this.engine}}>
        <SysMLWidget node={event.model} engine={this.engine} />
      </DiagramContext.Provider>
    );
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
    return (
      <DiagramContext.Provider value={{engine: this.engine}}>
        <SysMLWidget node={event.model} engine={this.engine} />
      </DiagramContext.Provider>
    );
  }
}

// Factory for our custom links
export class SysMLLinkFactory extends DefaultLinkFactory {
  constructor() {
    super('sysml-link');
  }

  generateModel(): SysMLLinkModel {
    return new SysMLLinkModel();
  }
}