import createEngine, {
  DefaultLinkModel,
  DefaultNodeModel,
  DiagramEngine,
  DiagramModel
} from '@projectstorm/react-diagrams';
import {
  CanvasEngineOptions,
  CanvasWidget
} from '@projectstorm/react-canvas-core';

/**
 * Creates and configures a diagram engine instance
 */
export const createDiagramEngine = (): DiagramEngine => {
  // Create the engine
  const engine = createEngine();
    // Configure the engine with default options
  // Use default state configuration provided by the engine
  
  return engine;
};

/**
 * Creates a block node with proper styling
 */
export const createBlockNode = (id: string, name: string, x: number, y: number) => {
  const node = new DefaultNodeModel({
    id,
    name,
    color: 'rgb(0, 192, 255)'
  });
  
  node.setPosition(x, y);
  node.addOutPort('Output');
  node.addInPort('Input');
  
  return node;
};

/**
 * Creates a sensor node with proper styling
 */
export const createSensorNode = (id: string, name: string, x: number, y: number) => {
  const node = new DefaultNodeModel({
    id,
    name,
    color: 'rgb(255, 0, 114)'
  });
  
  node.setPosition(x, y);
  node.addOutPort('Output');
  node.addInPort('Input');
  
  return node;
};

/**
 * Creates a processor node with proper styling
 */
export const createProcessorNode = (id: string, name: string, x: number, y: number) => {
  const node = new DefaultNodeModel({
    id,
    name,
    color: 'rgb(255, 149, 0)'
  });
  
  node.setPosition(x, y);
  node.addOutPort('Output');
  node.addInPort('Input');
  
  return node;
};

/**
 * Creates a link between two ports
 */
export const createLink = (sourcePort: any, targetPort: any, label?: string) => {
  const link = sourcePort.link(targetPort);
  
  if (label) {
    link.addLabel(label);
  }
  
  return link;
};
