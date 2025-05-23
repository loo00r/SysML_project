import { DefaultNodeModel, DefaultLinkModel, DefaultPortModel, PortModelAlignment } from '@projectstorm/react-diagrams';
import { enhanceLinkRouting } from '../utils/linkOptimizer';
import EditableText from '../components/custom/EditableText';
import styled from 'styled-components';

const NodeContainer = styled.div`
  padding: 10px;
  border-radius: 5px;
  border: 1px solid black;
  user-select: none;
`;

const NodeTitle = styled.div`
  font-weight: 500;
  margin-bottom: 5px;
`;

const NodeDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 5px;
`;

// Standard width for all SysML nodes
export const STANDARD_NODE_WIDTH = 220;

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
    
    // Always use standard width but preserve specified height if provided
    const height = options.size?.height || 150;
    this.size = { width: STANDARD_NODE_WIDTH, height };
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
            <NodeContainer>
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
    return this.size;
  }
  setSize(_width: number, height: number) {
    this.size = {
      // Always maintain the standard width regardless of the input width
      width: STANDARD_NODE_WIDTH,
      // Allow height to be adjusted but maintain minimum height
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
    // Ensure standard width is maintained when deserializing
    const height = event.size?.height || 150;
    this.size = { width: STANDARD_NODE_WIDTH, height };
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
    // Always use standard width but preserve specified height if provided
    const height = options.size?.height || 100;
    this.size = { width: STANDARD_NODE_WIDTH, height };
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
            <NodeContainer>
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
    return this.size;
  }

  setSize(_width: number, height: number) {
    this.size = {
      // Always maintain the standard width regardless of the input width
      width: STANDARD_NODE_WIDTH,
      // Allow height to be adjusted but maintain minimum height
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
    // Ensure standard width is maintained when deserializing
    const height = event.size?.height || 100;
    this.size = { width: STANDARD_NODE_WIDTH, height };
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
      color: '#0073e6', // Blue link
      selectedColor: '#00cc00', // Green when selected
      orthogonal: true, // Use orthogonal routing for straight edges
      curvyness: 0,     // No curvy segments for straighter lines
      stepOffset: 50,   // Large step offset for very clean orthogonal lines
      router: 'manhattan', // Force manhattan routing for perfectly straight segments
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
  }  // Override to ensure perfectly straight lines between nodes
  calculatePath(): void {
    // Use our helper function to ensure perfect orthogonal routing
    enhanceLinkRouting(this);
  }// Method removed - link optimization now handled in linkOptimizer.ts
}