import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel } from './SysMLNodeModels';
import React from 'react';
import styled from 'styled-components';

const NodeContainer = styled.div`
  padding: 10px;
  border-radius: 5px;
  user-select: none;
`;

interface SysMLWidgetProps {
  node: SysMLBlockModel | SysMLActivityModel;
}

const SysMLWidget: React.FC<SysMLWidgetProps> = ({ node }) => {
  return (
    <NodeContainer>
      {node.getOptions().name}
      {node.getDescription && <div>{node.getDescription()}</div>}
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

  generateReactWidget(event: { model: SysMLBlockModel }): JSX.Element {
    return <SysMLWidget node={event.model} />;
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

  generateReactWidget(event: { model: SysMLActivityModel }): JSX.Element {
    return <SysMLWidget node={event.model} />;
  }
}