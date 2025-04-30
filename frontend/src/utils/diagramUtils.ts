import { DiagramModel } from '@projectstorm/react-diagrams';

export const serializeDiagram = (model: DiagramModel) => {
  const serializedData = model.serialize();
  return JSON.stringify(serializedData, null, 2);
};

export const deserializeDiagram = (engine: any, serializedData: string) => {
  try {
    const parsedData = JSON.parse(serializedData);
    const model = new DiagramModel();
    model.deserializeModel(parsedData, engine);
    return model;
  } catch (error) {
    console.error('Error deserializing diagram:', error);
    return new DiagramModel();
  }
};

export const downloadDiagram = (model: DiagramModel, filename: string = 'sysml-diagram.json') => {
  const serializedData = serializeDiagram(model);
  const blob = new Blob([serializedData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};