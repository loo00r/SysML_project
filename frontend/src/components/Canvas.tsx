import React from 'react';
import styled from 'styled-components';
import createEngine, { DiagramModel, DefaultLinkModel } from '@projectstorm/react-diagrams';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import { SysMLBlockModel, SysMLActivityModel } from '../models/SysMLNodeModels';
import { NODE_TYPES, getNodeStyle, validateConnection } from '../utils/sysmlUtils';
import Toolbar from './Toolbar';

const CanvasWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const CanvasContainer = styled.div`
  flex: 1;
  background: #f8f8f8;
  background-size: 50px 50px;
  background-image:
    linear-gradient(to right, #e4e4e4 1px, transparent 1px),
    linear-gradient(to bottom, #e4e4e4 1px, transparent 1px);
  > * {
    height: 100%;
  }
`;

const Canvas: React.FC = () => {
  const [engine] = React.useState(() => {
    const engine = createEngine();
    const model = new DiagramModel();

    // Configure the diagram model
    model.setGridSize(15);
    model.registerListener({
      linksUpdated: (event: any) => {
        // Validate new connections
        event.links.forEach((link: DefaultLinkModel) => {
          if (link.getSourcePort() && link.getTargetPort()) {
            const isValid = validateConnection(link.getSourcePort(), link.getTargetPort());
            if (!isValid) {
              model.removeLink(link);
              engine.repaintCanvas();
            }
          }
        });
      }
    });

    engine.setModel(model);
    return engine;
  });

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('application/json'));
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let node;
    switch (data.type) {
      case NODE_TYPES.BLOCK:
        node = new SysMLBlockModel(data.label);
        node.addInPort('In');
        node.addOutPort('Out');
        Object.assign(node.getOptions(), { style: getNodeStyle(NODE_TYPES.BLOCK) });
        break;
      case NODE_TYPES.ACTIVITY:
        node = new SysMLActivityModel(data.label);
        node.addInPort('In');
        node.addOutPort('Out');
        Object.assign(node.getOptions(), { style: getNodeStyle(NODE_TYPES.ACTIVITY) });
        break;
      default:
        node = new SysMLBlockModel(data.label);
        Object.assign(node.getOptions(), { style: getNodeStyle(NODE_TYPES.BLOCK) });
    }

    node.setPosition(x, y);
    engine.getModel().addNode(node);
    engine.repaintCanvas();
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  return (
    <CanvasWrapper>
      <Toolbar engine={engine} />
      <CanvasContainer
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <CanvasWidget engine={engine} />
      </CanvasContainer>
    </CanvasWrapper>
  );
};

export default Canvas;