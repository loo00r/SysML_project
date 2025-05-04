import React, { useState } from 'react';
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
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
  transition: all 0.2s ease;

  &:hover {
    background: #0066cc;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const DropdownButton = styled(Button)<{ $active?: boolean }>`
  position: relative;
  background: ${props => props.$active ? '#0066cc' : '#0073e6'};
  
  &:after {
    content: '▼';
    font-size: 10px;
    margin-left: 6px;
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: ${props => props.$isOpen ? 'block' : 'none'};
  z-index: 1000;
  min-width: 150px;
  margin-top: 4px;
`;

const MenuItem = styled.div`
  padding: 8px 16px;
  color: #333;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }
`;

const LinkButton = styled(Button)<{ $active: boolean }>`
  background: ${props => props.$active ? '#0066cc' : '#0073e6'};
  border: ${props => props.$active ? '2px solid #003366' : 'none'};
  
  &:hover {
    background: ${props => props.$active ? '#0055b3' : '#0066cc'};
  }
`;

interface ToolbarProps {
  engine: DiagramEngine;
  onToggleLink?: () => void;
  isLinkingMode?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ engine, onToggleLink, isLinkingMode = false }) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

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

  const handleExport = (format: 'json' | 'png' | 'svg') => {
    switch (format) {
      case 'json':
        downloadDiagram(engine.getModel(), 'diagram.json');
        break;
      case 'png':
        exportAsPng();
        break;
      case 'svg':
        exportAsSvg();
        break;
    }
    setExportMenuOpen(false);
  };

  const exportAsPng = () => {
    const canvas = document.querySelector('.srd-demo-canvas > div > canvas') as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'diagram.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const exportAsSvg = () => {
    const diagramElement = document.querySelector('.srd-demo-canvas') as HTMLElement;
    if (diagramElement) {
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${diagramElement.offsetWidth}" height="${diagramElement.offsetHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${diagramElement.innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;
      
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'diagram.svg';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
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
      <ButtonGroup>
        <DropdownButton 
          onClick={() => setExportMenuOpen(!exportMenuOpen)}
          $active={exportMenuOpen}
        >
          💾 Export
          <DropdownMenu $isOpen={exportMenuOpen}>
            <MenuItem onClick={() => handleExport('json')}>
              📄 Export as JSON
            </MenuItem>
            <MenuItem onClick={() => handleExport('png')}>
              🖼️ Export as PNG
            </MenuItem>
            <MenuItem onClick={() => handleExport('svg')}>
              📊 Export as SVG
            </MenuItem>
          </DropdownMenu>
        </DropdownButton>
        <Button as="label">
          📂 Load
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleLoad}
          />
        </Button>
      </ButtonGroup>
      <ButtonGroup>
        <Button onClick={handleZoomIn}>🔍+ Zoom In</Button>
        <Button onClick={handleZoomOut}>🔍- Zoom Out</Button>
        <Button onClick={handleFitView}>🔲 Fit View</Button>
      </ButtonGroup>
    </ToolbarContainer>
  );
};

export default Toolbar;