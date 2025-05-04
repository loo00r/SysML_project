import { DiagramModel } from '@projectstorm/react-diagrams';

export function exportDiagramAsXMI(model: DiagramModel): string {
  // Simple XMI header
  let xmi = `<?xml version="1.0" encoding="UTF-8"?>\n<XMI xmi.version=\"2.1\" xmlns:uml=\"http://www.omg.org/spec/UML/20090901\">\n  <uml:Model name=\"SysMLDiagram\">\n`;

  // Export nodes as UML classes
  const nodes = model.getNodes();
  nodes.forEach(node => {
    const options = node.getOptions() as any;
    xmi += `    <packagedElement xmi:type=\"uml:Class\" name=\"${options.name || 'Node'}\"/>
`;
  });

  // Export links as UML associations
  const links = model.getLinks();
  links.forEach(link => {
    const source = link.getSourcePort()?.getParent();
    const target = link.getTargetPort()?.getParent();
    if (source && target) {
      const sourceName = (source.getOptions() as any).name || 'Node';
      const targetName = (target.getOptions() as any).name || 'Node';
      xmi += `    <packagedElement xmi:type=\"uml:Association\" memberEnd=\"${sourceName} ${targetName}\"/>
`;
    }
  });

  xmi += '  </uml:Model>\n</XMI>';
  return xmi;
}
