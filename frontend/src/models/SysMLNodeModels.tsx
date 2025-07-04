import { DefaultNodeModel, DefaultLinkModel, DefaultPortModel, PortModelAlignment } from '@projectstorm/react-diagrams';
import EditableText from '../components/custom/EditableText';
import styled from 'styled-components';

export const STANDARD_NODE_WIDTH = 260;

const NodeContainer = styled.div`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid black;
  user-select: none;
  width: ${STANDARD_NODE_WIDTH}px;
  min-width: ${STANDARD_NODE_WIDTH}px;
  max-width: ${STANDARD_NODE_WIDTH}px;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const NodeTitle = styled.div`
  font-weight: 500;
  margin-bottom: 5px;
  width: 100%;
  box-sizing: border-box;
`;

const NodeDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  width: 100%;
  box-sizing: border-box;
`;

export interface SysMLNodeOptions {
  name: string;
  color: string;
  size?: { width: number; height: number };
  description?: string;
  type?: string;
}

export interface NodeSize {
  width: number;
  height: number;
}

export class SysMLBlockModel extends DefaultNodeModel {
  private size: NodeSize = { width: STANDARD_NODE_WIDTH, height: 150 };
  private description: string = '';
  private resizing: boolean = false;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-block',
      name: options.name || 'Block'
    });
    
    this.size = options.size || { width: STANDARD_NODE_WIDTH, height: 150 };
    this.description = options.description || '';

    // Додаємо порти: top/left — in: true, right/bottom — in: false
    this.addPort(new DefaultPortModel({ in: true, name: 'top', alignment: PortModelAlignment.TOP }));
    this.addPort(new DefaultPortModel({ in: false, name: 'right', alignment: PortModelAlignment.RIGHT }));
    this.addPort(new DefaultPortModel({ in: false, name: 'bottom', alignment: PortModelAlignment.BOTTOM }));
    this.addPort(new DefaultPortModel({ in: true, name: 'left', alignment: PortModelAlignment.LEFT }));

    // Override the default widget after ensuring super() is called
    // Tesst
    this.registerListener({
      widgetGenerated: (event: any) => {
        const widget = event.widget;
        if (widget) {
          widget.renderContainer = () => (
            <NodeContainer style={{width: STANDARD_NODE_WIDTH, minWidth: STANDARD_NODE_WIDTH, maxWidth: STANDARD_NODE_WIDTH, boxSizing: 'border-box'}}>
              <NodeTitle>
                <EditableText
                  value={this.getOptions().name || ''}
                  onChange={(value) => {
                    this.getOptions().name = value;
                    this.fireEvent({ type: 'labelChanged' }, 'labelChanged');
                  }}
                  placeholder="Enter node name"
                />
              </NodeTitle>
              <NodeDescription>
                <EditableText
                  value={this.description}
                  onChange={(value) => {
                    this.description = value;
                    this.fireEvent({ type: 'descriptionChanged' }, 'descriptionChanged');
                  }}
                  multiline
                  placeholder="Enter description"
                />
              </NodeDescription>
              {/* No ports rendered */}
            </NodeContainer>
          );
        }
      }
    });
  }

  getSize(): NodeSize {
    return {
      width: STANDARD_NODE_WIDTH,
      height: this.size.height
    };
  }

  setSize(width: number, height: number) {
    this.size = {
      width: STANDARD_NODE_WIDTH,
      height: Math.max(80, height)
    };
  }

  getDescription(): string {
    return this.description;
  }

  setDescription(description: string) {
    this.description = description;
  }

  setResizing(resizing: boolean) {
    this.resizing = resizing;
  }

  isResizing(): boolean {
    return this.resizing;
  }

  serialize() {
    return {
      ...super.serialize(),
      size: this.size,
      description: this.description,
    };
  }

  deserialize(event: any): void {
    super.deserialize(event);
    this.size = {
      width: STANDARD_NODE_WIDTH,
      height: (event.size && event.size.height) ? event.size.height : 150
    };
    this.description = event.description || '';
  }
}

export class SysMLActivityModel extends DefaultNodeModel {
  private size: NodeSize = { width: STANDARD_NODE_WIDTH, height: 100 };
  private description: string = '';
  private resizing: boolean = false;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-activity',
      name: options.name || 'Activity'
    });
    this.size = options.size || { width: STANDARD_NODE_WIDTH, height: 100 };
    this.description = options.description || '';

    // Додаємо порти: top/left — in: true, right/bottom — in: false
    this.addPort(new DefaultPortModel({ in: true, name: 'top', alignment: PortModelAlignment.TOP }));
    this.addPort(new DefaultPortModel({ in: false, name: 'right', alignment: PortModelAlignment.RIGHT }));
    this.addPort(new DefaultPortModel({ in: false, name: 'bottom', alignment: PortModelAlignment.BOTTOM }));
    this.addPort(new DefaultPortModel({ in: true, name: 'left', alignment: PortModelAlignment.LEFT }));

    // Override the default widget
    this.registerListener({
      widgetGenerated: (event: any) => {
        const widget = event.widget;
        if (widget) {
          widget.renderContainer = () => (
            <NodeContainer style={{width: STANDARD_NODE_WIDTH, minWidth: STANDARD_NODE_WIDTH, maxWidth: STANDARD_NODE_WIDTH, boxSizing: 'border-box'}}>
              <NodeTitle>
                <EditableText
                  value={this.getOptions().name || ''}
                  onChange={(value) => {
                    this.getOptions().name = value;
                    this.fireEvent({ type: 'labelChanged' }, 'labelChanged');
                  }}
                  placeholder="Enter activity name"
                />
              </NodeTitle>
              <NodeDescription>
                <EditableText
                  value={this.description}
                  onChange={(value) => {
                    this.description = value;
                    this.fireEvent({ type: 'descriptionChanged' }, 'descriptionChanged');
                  }}
                  multiline
                  placeholder="Enter description"
                />
              </NodeDescription>
              {/* No ports rendered */}
            </NodeContainer>
          );
        }
      }
    });
  }

  getSize(): NodeSize {
    return {
      width: STANDARD_NODE_WIDTH,
      height: this.size.height
    };
  }

  setSize(width: number, height: number) {
    this.size = {
      width: STANDARD_NODE_WIDTH,
      height: Math.max(80, height)
    };
  }

  getDescription(): string {
    return this.description;
  }

  setDescription(description: string) {
    this.description = description;
  }

  setResizing(resizing: boolean) {
    this.resizing = resizing;
  }

  isResizing(): boolean {
    return this.resizing;
  }
  
  serialize() {
    return {
      ...super.serialize(),
      size: this.size,
      description: this.description,
    };
  }

  deserialize(event: any): void {
    super.deserialize(event);
    this.size = {
      width: STANDARD_NODE_WIDTH,
      height: (event.size && event.size.height) ? event.size.height : 100
    };
    this.description = event.description || '';
  }
}

export class SysMLLinkModel extends DefaultLinkModel {
  private _sysmlData?: {
    sourceNodeId: string;
    sourcePosition: string;
    targetNodeId: string;
    targetPosition: string;
    relationName?: string;
    relationType?: string;
  };

  constructor(options: any = {}) {
    super({
      type: 'sysml-link',
      width: 2,
      color: '#0073e6', // синій лінк
      selectedColor: '#0073e6',
      ...options
    });
  }

  // Add data to store connector information
  setData(data: {
    sourceNodeId: string;
    sourcePosition: string;
    targetNodeId: string;
    targetPosition: string;
    relationName?: string;
    relationType?: string;
  }) {
    this._sysmlData = data;
  }

  // Get data about the connector
  getData() {
    return this._sysmlData;
  }

  // Override serialize to include our connector data
  serialize() {
    return {
      ...super.serialize(),
      sysmlData: this._sysmlData
    };
  }

  // Override deserialize to handle connector data
  deserialize(event: any): void {
    super.deserialize(event);
    if (event.sysmlData) {
      this.setData(event.sysmlData);
    }
  }
}