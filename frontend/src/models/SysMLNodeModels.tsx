import { DefaultNodeModel, NodeModel, DefaultPortModel } from '@projectstorm/react-diagrams';
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
  private size: NodeSize;
  private description: string;
  private resizing: boolean;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-block'
    });
    this.size = options.size || { width: 200, height: 150 };
    this.description = options.description || '';
    this.resizing = false;

    // Override the default widget
    this.addListener({
      widgetGenerated: (event: any) => {
        const widget = event.widget;
        if (widget) {
          widget.renderContainer = () => (
            <NodeContainer>
              <NodeTitle>
                <EditableText
                  value={this.getOptions().name}
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
              {widget.generatePorts()}
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
    this.updatePortPositions();
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

  private updatePortPositions() {
    const ports = this.getPorts();
    Object.values(ports).forEach(port => {
      if (port.getOptions().alignment === 'left') {
        port.setPosition(0, this.size.height / 2);
      } else if (port.getOptions().alignment === 'right') {
        port.setPosition(this.size.width, this.size.height / 2);
      }
    });
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
    this.updatePortPositions();
  }
}

export class SysMLActivityModel extends DefaultNodeModel {
  private size: NodeSize;
  private description: string;
  private resizing: boolean;

  constructor(options: SysMLNodeOptions) {
    super({
      ...options,
      type: 'sysml-activity'
    });
    this.size = options.size || { width: 180, height: 100 };
    this.description = options.description || '';
    this.resizing = false;

    // Override the default widget
    this.addListener({
      widgetGenerated: (event: any) => {
        const widget = event.widget;
        if (widget) {
          widget.renderContainer = () => (
            <NodeContainer>
              <NodeTitle>
                <EditableText
                  value={this.getOptions().name}
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
              {widget.generatePorts()}
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
    this.updatePortPositions();
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

  private updatePortPositions() {
    const ports = this.getPorts();
    Object.values(ports).forEach(port => {
      if (port.getOptions().alignment === 'left') {
        port.setPosition(0, this.size.height / 2);
      } else if (port.getOptions().alignment === 'right') {
        port.setPosition(this.size.width, this.size.height / 2);
      }
    });
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
    this.updatePortPositions();
  }
}

export class SysMLFlowPortModel extends DefaultPortModel {
  constructor(isInput: boolean) {
    super({
      in: isInput,
      name: isInput ? 'in' : 'out',
      label: isInput ? 'Input' : 'Output',
      alignment: isInput ? 'left' : 'right'
    });
  }
}