import React from 'react';
import styled from 'styled-components';
import { DiagramEngine } from '@projectstorm/react-diagrams';
import { downloadDiagram } from '../utils/diagramUtils';

const ToolbarContainer = styled.div`
  height: 50px;
  background: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;
`;

const Button = styled.button`
  padding: 8px 16px;
  background: #0073e6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:hover {
    background: #0066cc;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

interface ToolbarProps {
  engine: DiagramEngine;
}

const Toolbar: React.FC<ToolbarProps> = ({ engine }) => {
  const handleSave = () => {
    downloadDiagram(engine.getModel());
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          const model = engine.getModel();
          model.deserializeModel(JSON.parse(content), engine);
          engine.setModel(model);
          engine.repaintCanvas();
        } catch (error) {
          console.error('Error loading diagram:', error);
          alert('Error loading diagram. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleZoomIn = () => {
    const model = engine.getModel();
    model.setZoomLevel(model.getZoomLevel() + 10);
    engine.repaintCanvas();
  };

  const handleZoomOut = () => {
    const model = engine.getModel();
    model.setZoomLevel(model.getZoomLevel() - 10);
    engine.repaintCanvas();
  };

  const handleFitView = () => {
    engine.zoomToFit();
  };

  return (
    <ToolbarContainer>
      <Button onClick={handleSave}>💾 Save</Button>
      <Button as="label">
        📂 Load
        <input
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleLoad}
        />
      </Button>
      <Button onClick={handleZoomIn}>🔍+ Zoom In</Button>
      <Button onClick={handleZoomOut}>🔍- Zoom Out</Button>
      <Button onClick={handleFitView}>🔲 Fit View</Button>
    </ToolbarContainer>
  );
};

export default Toolbar;