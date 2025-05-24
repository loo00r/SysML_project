import { Node, Edge } from 'reactflow';
import { NodeData } from '../store/diagramStore';
import dagre from 'dagre';

// Цей інтерфейс більше не потрібен, оскільки ми використовуємо реальну бібліотеку Dagre

// Функція для автоматичного позиціонування елементів діаграми
export const getLayoutedElements = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
  nodeWidth = 180,
  nodeHeight = 100
) => {
  // Створюємо копії вузлів та ребер, щоб не змінювати оригінальні дані
  const layoutedNodes = nodes.map((node) => ({ ...node }));
  const layoutedEdges = edges.map((edge) => ({ ...edge }));

  // Створюємо новий граф Dagre
  const g = new dagre.graphlib.Graph();

  // Встановлюємо напрямок графа (TB = зверху вниз, LR = зліва направо)
  g.setGraph({ rankdir: direction });
  
  // Встановлюємо стандартну мітку для ребер
  g.setDefaultEdgeLabel(() => ({}));

  // Додаємо вузли до графа
  layoutedNodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Додаємо ребра до графа
  layoutedEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Виконуємо розрахунок позицій
  dagre.layout(g);

  // Оновлюємо позиції вузлів з результатів Dagre
  layoutedNodes.forEach((node) => {
    // Отримуємо позицію вузла з графа Dagre
    const nodeWithPosition = g.node(node.id);
    
    // Встановлюємо позицію вузла
    // Віднімаємо половину ширини/висоти, щоб центрувати вузол
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

/**
 * Функція для застосування автоматичного позиціонування до діаграми
 * 
 * @param nodes - Вузли діаграми
 * @param edges - Ребра діаграми
 * @param direction - Напрямок графа (TB = зверху вниз, LR = зліва направо)
 * @returns Об'єкт з позиціонованими вузлами та ребрами
 */
export const applyDagreLayout = (
  nodes: Node<NodeData>[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
) => {
  return getLayoutedElements(nodes, edges, direction);
};
