import { DiagramModel } from '@projectstorm/react-diagrams';

export function downloadDiagram(model: DiagramModel, filename = 'diagram.json') {
  try {
    const dataStr = JSON.stringify(model.serialize(), null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export diagram:', error);
  }
}
