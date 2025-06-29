import { AbstractReactFactory } from '@projectstorm/react-canvas-core';
import { DiagramEngine, DefaultLinkFactory, PortWidget } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel, SysMLLinkModel } from './SysMLNodeModels';
import React from 'react';
import styled from 'styled-components';
import { NODE_TYPES } from '../utils/sysmlUtils';

const NodeContainer = styled.div<{ $type: string; $color?: string; $borderColor?: string }>`
  padding: 15px;
  border-radius: ${props => props.$type === NODE_TYPES.ACTIVITY ? '10px' : '6px'};
  background: ${props => props.$color || 
    (props.$type === NODE_TYPES.BLOCK ? 
    'linear-gradient(135deg, #e6f3ff 0%, #ffffff 100%)' : 
    'linear-gradient(135deg, #e6ffe6 0%, #ffffff 100%)')};
  border: 2px solid ${props => props.$borderColor || 
    (props.$type === NODE_TYPES.BLOCK ? '#0073e6' : '#00b300')};
  min-width: 150px;
  min-height: 80px;
  position: relative;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s ease, transform 0.3s ease;

  /* Прибираємо box-shadow при hover */
  &:hover {
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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

const ConnectorDot = styled.div<{ $dotColor?: string }>`
  width: 10px;
  height: 10px;
  background: ${props => props.$dotColor || '#111'};
  border: 2px solid white;
  border-radius: 50%;
  position: absolute;
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.2);
    background: ${props => props.$dotColor || '#222'};
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

  const [editingTitle, setEditingTitle] = React.useState(false);
  const [editingDesc, setEditingDesc] = React.useState(false);
  const [title, setTitle] = React.useState(node.getOptions().name);
  const [desc, setDesc] = React.useState(node.getDescription ? node.getDescription() : '');

  React.useEffect(() => {
    setTitle(node.getOptions().name);
  }, [node.getOptions().name]);
  React.useEffect(() => {
    setDesc(node.getDescription ? node.getDescription() : '');
  }, [node.getDescription ? node.getDescription() : '']);

  const saveTitle = () => {
    node.getOptions().name = title;
    setEditingTitle(false);
    if (engine) engine.repaintCanvas();
  };
  const saveDesc = () => {
    if (node.setDescription) node.setDescription(desc);
    setEditingDesc(false);
    if (engine) engine.repaintCanvas();
  };

  // Отримуємо порти для кожної позиції
  const topPort = node.getPort('top');
  const rightPort = node.getPort('right');
  const bottomPort = node.getPort('bottom');
  const leftPort = node.getPort('left');

  // Визначаємо кольори для Sensor/Processor/System Block
  const name = node.getOptions().name;
  let color = node.getOptions().color;
  let borderColor = undefined;
  let dotColor = '#111';
  // Якщо явно заданий color у options — використовуємо його завжди
  if (!color) {
    if (name === 'Sensor') {
      color = '#ffe6e6'; // як у тулбарі
      borderColor = '#e53935';
      dotColor = '#e53935';
    } else if (name === 'Processor') {
      color = '#fffbe6'; // як у тулбарі
      borderColor = '#ffd600';
      dotColor = '#ffd600';
    } else if (name === 'System Block') {
      color = '#e6ffe6'; // як у тулбарі
      borderColor = '#00b300';
      dotColor = '#00b300';
    }
  }

  return (
    <NodeContainer $type={node.getOptions().type || 'sysml-block'} $color={color} $borderColor={borderColor}>
      <NodeTitle>
        {editingTitle ? (
          <input
            type="text"
            value={title}
            autoFocus
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitle();
              else if (e.key === 'Escape') { setTitle(node.getOptions().name); setEditingTitle(false); }
              else e.stopPropagation();
            }}
            style={{ width: '100%', fontWeight: 600, fontSize: 16, border: '1px solid #ccc', borderRadius: 3 }}
          />
        ) : (
          <span onClick={() => setEditingTitle(true)} style={{ cursor: 'pointer' }}>{title || 'Назва блоку'}</span>
        )}
      </NodeTitle>
      <NodeDescription>
        {editingDesc ? (
          <textarea
            value={desc}
            autoFocus
            onChange={e => setDesc(e.target.value)}
            onBlur={saveDesc}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveDesc(); }
              else if (e.key === 'Escape') { setDesc(node.getDescription ? node.getDescription() : ''); setEditingDesc(false); }
              else e.stopPropagation();
            }}
            style={{ width: '100%', fontSize: 13, border: '1px solid #ccc', borderRadius: 3, resize: 'none' }}
            rows={2}
          />
        ) : (
          <span onClick={() => setEditingDesc(true)} style={{ cursor: 'pointer', whiteSpace: 'pre-line' }}>{desc || 'Опис...'}</span>
        )}
      </NodeDescription>
      
      {/* Connection points with propagation prevention */}
      {topPort && (
        <PortWidget port={topPort} engine={engine}>
          <TopConnector 
            className="connector-dot"
            data-connector="top" 
            data-nodeid={node.getID()}
            data-portid={topPort.getID()}
            $dotColor={dotColor}
            onClick={preventPropagation}
            onMouseDown={preventPropagation}
          />
        </PortWidget>
      )}
      {rightPort && (
        <PortWidget port={rightPort} engine={engine}>
          <RightConnector 
            className="connector-dot"
            data-connector="right" 
            data-nodeid={node.getID()}
            data-portid={rightPort.getID()}
            $dotColor={dotColor}
            onClick={preventPropagation}
            onMouseDown={preventPropagation}
          />
        </PortWidget>
      )}
      {bottomPort && (
        <PortWidget port={bottomPort} engine={engine}>
          <BottomConnector 
            className="connector-dot"
            data-connector="bottom" 
            data-nodeid={node.getID()}
            data-portid={bottomPort.getID()}
            $dotColor={dotColor}
            onClick={preventPropagation}
            onMouseDown={preventPropagation}
          />
        </PortWidget>
      )}
      {leftPort && (
        <PortWidget port={leftPort} engine={engine}>
          <LeftConnector 
            className="connector-dot"
            data-connector="left" 
            data-nodeid={node.getID()}
            data-portid={leftPort.getID()}
            $dotColor={dotColor}
            onClick={preventPropagation}
            onMouseDown={preventPropagation}
          />
        </PortWidget>
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

// Кастомний LinkWidget для умовної стрілки
const SysMLLinkWidget = (props: any) => {
  const { link } = props;
  const targetPort = link.getTargetPort();
  // Стрілка тільки якщо лінк завершений (є targetPort)
  const markerEnd = targetPort ? 'url(#arrowhead)' : undefined;
  return (
    <g className={link.getOptions().className || 'sysml-link'} data-linkid={link.getID()}>
      {link.getPoints().length >= 2 && (
        <path
          d={`M ${link.getPoints()[0].getX()} ${link.getPoints()[0].getY()} L ${link.getPoints()[link.getPoints().length-1].getX()} ${link.getPoints()[link.getPoints().length-1].getY()}`}
          stroke="#111"
          strokeWidth={2}
          fill="none"
          markerEnd={markerEnd}
        />
      )}
    </g>
  );
};

export class SysMLLinkFactory extends DefaultLinkFactory {
  constructor() {
    super('sysml-link');
  }

  generateModel(): SysMLLinkModel {
    return new SysMLLinkModel();
  }

  generateReactWidget(event: any) {
    return <SysMLLinkWidget link={event.model} diagramEngine={event.engine} />;
  }
}