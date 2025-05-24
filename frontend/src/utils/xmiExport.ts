import { Node, Edge } from 'reactflow';

/**
 * Converts a SysML diagram to XMI format
 * 
 * @param nodes The diagram nodes
 * @param edges The diagram edges
 * @param diagramType The type of diagram (block, activity, etc.)
 * @returns XMI formatted string
 */
export const generateXMI = (
  nodes: Node[], 
  edges: Edge[], 
  diagramType: string
): string => {
  // Get current date for XMI metadata
  const currentDate = new Date().toISOString();
  const diagramId = `diagram-${Date.now()}`;
  
  // Create XMI header
  let xmi = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmlns:xmi="http://www.omg.org/spec/XMI/20131001" 
         xmlns:uml="http://www.omg.org/spec/UML/20131001"
         xmlns:sysml="http://www.omg.org/spec/SysML/20131001"
         xmi:version="2.0">
  <xmi:Documentation exporter="SysML Modeling Tool" exporterVersion="1.0"/>
  
  <uml:Model xmi:id="${diagramId}" name="SysML ${diagramType} Diagram">
    <packagedElement xmi:type="uml:Package" xmi:id="pkg-${diagramId}" name="${diagramType.charAt(0).toUpperCase() + diagramType.slice(1)} Diagram">
`;

  // Add nodes to XMI
  nodes.forEach(node => {
    const nodeType = mapNodeTypeToXMI(node.type || 'block', diagramType);
    xmi += `      <packagedElement xmi:type="${nodeType}" xmi:id="${node.id}" name="${node.data.label || 'Unnamed'}">
`;
    
    // Add node properties if any
    if (node.data.properties) {
      Object.entries(node.data.properties).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'name' && value) {
          xmi += `        <ownedAttribute xmi:type="uml:Property" name="${key}" value="${value}"/>
`;
        }
      });
    }
    
    // Add description if available
    if (node.data.description) {
      xmi += `        <ownedComment xmi:type="uml:Comment">
          <body>${node.data.description}</body>
        </ownedComment>
`;
    }
    
    xmi += `      </packagedElement>
`;
  });
  
  // Add edges to XMI
  edges.forEach(edge => {
    const relationshipType = mapEdgeTypeToXMI(edge.data?.type || 'association');
    xmi += `      <packagedElement xmi:type="${relationshipType}" xmi:id="${edge.id}" 
        name="${edge.label || edge.data?.name || ''}"
        source="${edge.source}" 
        target="${edge.target}"/>
`;
  });
  
  // Close XMI
  xmi += `    </packagedElement>
  </uml:Model>
</xmi:XMI>`;

  return xmi;
};

/**
 * Maps SysML node types to XMI element types
 */
const mapNodeTypeToXMI = (nodeType: string, diagramType: string): string => {
  const typeMap: Record<string, string> = {
    'block': 'sysml:Block',
    'sensor': 'sysml:Block',
    'processor': 'sysml:Block',
    'activity': 'uml:Activity',
    'usecase': 'uml:UseCase',
    'actor': 'uml:Actor',
    'requirement': 'sysml:Requirement'
  };
  
  return typeMap[nodeType] || 'sysml:Block';
};

/**
 * Maps SysML edge types to XMI relationship types
 */
const mapEdgeTypeToXMI = (edgeType: string): string => {
  const typeMap: Record<string, string> = {
    'association': 'uml:Association',
    'composition': 'uml:Association',
    'aggregation': 'uml:Association',
    'generalization': 'uml:Generalization',
    'dependency': 'uml:Dependency',
    'flow': 'sysml:ItemFlow',
    'satisfy': 'sysml:Satisfy',
    'verify': 'sysml:Verify',
    'refine': 'sysml:Refine'
  };
  
  return typeMap[edgeType] || 'uml:Association';
};

/**
 * Validates a diagram against SysML rules
 * 
 * @param nodes The diagram nodes
 * @param edges The diagram edges
 * @param diagramType The type of diagram
 * @returns Object with validation result and any errors
 */
export const validateSysMLDiagram = (
  nodes: Node[], 
  edges: Edge[], 
  diagramType: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic validation - check if diagram has nodes
  if (nodes.length === 0) {
    errors.push('Diagram must contain at least one node');
  }
  
  // Check for disconnected nodes (except for certain diagram types)
  if (diagramType !== 'requirement') {
    const connectedNodeIds = new Set<string>();
    
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
    if (disconnectedNodes.length > 0) {
      errors.push(`Found ${disconnectedNodes.length} disconnected node(s). All nodes should be connected in a ${diagramType} diagram.`);
    }
  }
  
  // Diagram-specific validations
  switch (diagramType) {
    case 'block':
      // Validate block diagram rules
      validateBlockDiagram(nodes, edges, errors);
      break;
    case 'activity':
      // Validate activity diagram rules
      validateActivityDiagram(nodes, edges, errors);
      break;
    case 'usecase':
      // Validate use case diagram rules
      validateUseCaseDiagram(nodes, edges, errors);
      break;
    case 'requirement':
      // Validate requirement diagram rules
      validateRequirementDiagram(nodes, edges, errors);
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Diagram-specific validation functions
const validateBlockDiagram = (nodes: Node[], edges: Edge[], errors: string[]) => {
  // Check for proper block structure
  const blockNodes = nodes.filter(node => node.type === 'block' || node.type === 'sensor' || node.type === 'processor');
  if (blockNodes.length === 0) {
    errors.push('Block diagram must contain at least one block element');
  }
  
  // Check for valid relationships between blocks
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      const edgeType = edge.data?.type || 'association';
      
      // Validate specific relationship constraints
      if (edgeType === 'composition' || edgeType === 'aggregation') {
        if (sourceNode.type !== 'block' && sourceNode.type !== 'sensor' && sourceNode.type !== 'processor') {
          errors.push(`Composition/aggregation relationship must start from a block element (${edge.id})`);
        }
      }
    }
  });
};

const validateActivityDiagram = (nodes: Node[], edges: Edge[], errors: string[]) => {
  // Activity diagram specific validations would go here
  // For example, checking for start/end nodes, proper flow, etc.
};

const validateUseCaseDiagram = (nodes: Node[], edges: Edge[], errors: string[]) => {
  // Use case diagram specific validations would go here
  // For example, checking for actors, use cases, and proper relationships
};

const validateRequirementDiagram = (nodes: Node[], edges: Edge[], errors: string[]) => {
  // Requirement diagram specific validations would go here
  // For example, checking for requirement elements and proper traces
};

/**
 * Downloads the XMI content as a file
 * 
 * @param xmiContent The XMI content to download
 * @param fileName Optional file name (defaults to diagram-export.xmi)
 */
export const downloadXMI = (xmiContent: string, fileName: string = 'diagram-export.xmi') => {
  const blob = new Blob([xmiContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
