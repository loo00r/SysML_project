import { DefaultNodeModel, NodeModel, DefaultPortModel } from '@projectstorm/react-diagrams';

export class SysMLBlockModel extends DefaultNodeModel {
  constructor(name: string) {
    super({
      name,
      color: 'rgb(0,192,255)'
    });
  }
}

export class SysMLActivityModel extends DefaultNodeModel {
  constructor(name: string) {
    super({
      name,
      color: 'rgb(192,255,0)'
    });
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