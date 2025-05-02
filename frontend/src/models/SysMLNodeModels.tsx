import { DefaultNodeModel, DefaultLinkModel } from '@projectstorm/react-diagrams';
import EditableText from '../components/custom/EditableText';
import React from 'react';
import styled from 'styled-components';

const NodeContainer = styled.div`
  padding: 10px;
  border-radius: 5px;
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
  private size: NodeSize = { width: 200, height: 150 };
  private description: string = '';
  private resizing: boolean = false;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-block',
      name: options.name || 'Block'
    });
    
    this.size = options.size || { width: 200, height: 150 };
    this.description = options.description || '';

    // No ports are added - removed port initialization

    // Override the default widget after ensuring super() is called
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

  setSize(width: number, height: number) {
    this.size = {
      width: Math.max(100, width),
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
    this.size = event.size || { width: 200, height: 150 };
    this.description = event.description || '';
  }
}

export class SysMLActivityModel extends DefaultNodeModel {
  private size: NodeSize = { width: 180, height: 100 };
  private description: string = '';
  private resizing: boolean = false;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-activity',
      name: options.name || 'Activity'
    });
    this.size = options.size || { width: 180, height: 100 };
    this.description = options.description || '';

    // No ports are added - removed port initialization

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

  setSize(width: number, height: number) {
    this.size = {
      width: Math.max(100, width),
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
    this.size = event.size || { width: 180, height: 100 };
    this.description = event.description || '';
  }
}

export class SysMLLinkModel extends DefaultLinkModel {
  constructor(options: any = {}) {
    super({
      type: 'sysml-link',
      width: 2,
      color: '#0073e6',
      selectedColor: '#1890ff',
      ...options
    });
  }
}