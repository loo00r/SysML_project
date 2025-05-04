import { DiagramModel, NodeModel } from '@projectstorm/react-diagrams';
import { SysMLBlockModel, SysMLActivityModel, SysMLNodeOptions } from '../models/SysMLNodeModels';
import { NODE_TYPES } from './sysmlUtils';
import { AnimationController } from './animationController';
import { LayoutEngine } from './layoutUtils';

interface ParsedNode {
  type: string;
  name: string;
  description?: string;
  connections: string[]; // Keep track of connections for future implementation
}

interface ParsePattern {
  type: string;
  keywords: string[];
  relationshipPatterns: string[];
}

const PATTERNS: ParsePattern[] = [
  {
    type: NODE_TYPES.BLOCK,
    keywords: [
      'system', 'component', 'sensor', 'module', 'processor', 'device',
      'controller', 'interface', 'unit', 'subsystem'
    ],
    relationshipPatterns: [
      'connects to', 'interfaces with', 'sends data to', 'receives from',
      'communicates with', 'linked to', 'integrated with'
    ]
  },
  {
    type: NODE_TYPES.ACTIVITY,
    keywords: [
      'process', 'analyze', 'detect', 'transmit', 'scan', 'monitor',
      'calculate', 'compute', 'control', 'manage', 'coordinate'
    ],
    relationshipPatterns: [
      'followed by', 'triggers', 'initiates', 'processes data from',
      'sends results to', 'provides input to', 'receives output from'
    ]
  }
];

const findNodeType = (sentence: string): string | null => {
  const lowerSentence = sentence.toLowerCase();
  for (const pattern of PATTERNS) {
    if (pattern.keywords.some(keyword => lowerSentence.includes(keyword))) {
      return pattern.type;
    }
  }
  return null;
};

const findRelationships = (sentence: string): { target: string; type: string }[] => {
  const relationships: { target: string; type: string }[] = [];
  const lowerSentence = sentence.toLowerCase();

  for (const pattern of PATTERNS) {
    pattern.relationshipPatterns.forEach(relationPattern => {
      const index = lowerSentence.indexOf(relationPattern);
      if (index !== -1) {
        const afterPattern = sentence.substring(index + relationPattern.length).trim();
        const words = afterPattern.split(/\s+/);
        const targetName = words.slice(0, 3).join(' ').replace(/[,.;]$/, '');
        relationships.push({
          target: targetName,
          type: relationPattern
        });
      }
    });
  }

  return relationships;
};

export const parseText = (text: string): ParsedNode[] => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const nodes: ParsedNode[] = [];
  
  sentences.forEach(sentence => {
    const trimmedSentence = sentence.trim();
    const nodeType = findNodeType(trimmedSentence);
    
    if (nodeType) {
      const relationships = findRelationships(trimmedSentence);
      const name = nodeType === NODE_TYPES.BLOCK 
        ? extractMainNoun(trimmedSentence)
        : extractVerb(trimmedSentence);

      nodes.push({
        type: nodeType,
        name: name,
        description: trimmedSentence,
        connections: relationships.map(r => r.target)
      });
    }
  });

  // Post-process to merge similar nodes
  const mergedNodes = new Map<string, ParsedNode>();
  nodes.forEach(node => {
    const key = node.name.toLowerCase();
    if (mergedNodes.has(key)) {
      const existing = mergedNodes.get(key)!;
      existing.connections = [...new Set([...existing.connections, ...node.connections])];
    } else {
      mergedNodes.set(key, node);
    }
  });

  return Array.from(mergedNodes.values());
};

const extractMainNoun = (sentence: string): string => {
  const words = sentence.split(' ');
  const commonNouns = ['system', 'component', 'sensor', 'module', 'processor', 'device'];
  for (let i = 0; i < words.length; i++) {
    if (commonNouns.some(noun => words[i].includes(noun))) {
      return words.slice(Math.max(0, i - 1), i + 2).join(' ');
    }
  }
  return words.slice(0, 3).join(' ');
};

const extractVerb = (sentence: string): string => {
  const words = sentence.split(' ');
  const actionVerbs = ['process', 'analyze', 'detect', 'transmit', 'receive', 'scan'];
  for (let i = 0; i < words.length; i++) {
    if (actionVerbs.some(verb => words[i].includes(verb))) {
      return words.slice(i, i + 3).join(' ');
    }
  }
  return words.slice(0, 3).join(' ');
};

export const generateNodesFromParsedData = async (
  parsedNodes: ParsedNode[],
  model: DiagramModel,
  engine: any,
  onNodeAdded?: (node: NodeModel) => void
): Promise<void> => {
  const nodeMap = new Map<string, NodeModel>();
  const allNodes: NodeModel[] = [];

  // Create all nodes with temporary positions
  for (const nodeData of parsedNodes) {
    // Assign color based on name for special blocks, else default
    let color = nodeData.type === NODE_TYPES.BLOCK ? 'rgb(0,192,255)' : 'rgb(192,255,0)';
    if (nodeData.type === NODE_TYPES.BLOCK) {
      if (nodeData.name.trim() === 'System Block') color = '#e6ffe6';
      else if (nodeData.name.trim() === 'Sensor') color = '#ffe6e6';
      else if (nodeData.name.trim() === 'Processor') color = '#fffbe6';
    }
    const options: SysMLNodeOptions = {
      name: nodeData.name,
      color,
      description: nodeData.description,
    };

    const node = nodeData.type === NODE_TYPES.BLOCK
      ? new SysMLBlockModel(options)
      : new SysMLActivityModel(options);

    node.setPosition(0, 0);
    model.addNode(node);
    nodeMap.set(nodeData.name, node);
    allNodes.push(node);
  }

  // No longer creating links between nodes - links removed

  // Apply initial layout
  LayoutEngine.optimizeLayout(model);

  // Animate nodes appearing with optimized positions
  for (const node of allNodes) {
    if (onNodeAdded) {
      onNodeAdded(node);
      await AnimationController.animateNodeCreation(node, {
        duration: 500,
        stagger: 100
      });
    }
  }

  // Final layout refinement with animation
  await AnimationController.animateLayout(engine, {
    duration: 800
  });
};