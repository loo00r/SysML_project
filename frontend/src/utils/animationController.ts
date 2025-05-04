import { DiagramEngine, NodeModel } from '@projectstorm/react-diagrams';

export interface AnimationOptions {
  duration?: number;
  stagger?: number;
}

export class AnimationController {
  static async animateNodeCreation(
    node: NodeModel,
    options: AnimationOptions = {}
  ) {
    const {
      duration = 500,
      stagger = 100,
    } = options;

    const nodeElement = document.querySelector(`[data-nodeid="${node.getID()}"]`);

    if (nodeElement && nodeElement instanceof HTMLElement) {
      nodeElement.style.opacity = '0';
      nodeElement.style.transform = 'scale(0.3) translateY(20px)';
      nodeElement.style.transition = `all ${duration}ms`;

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          nodeElement.style.opacity = '1';
          nodeElement.style.transform = 'scale(1) translateY(0)';
          setTimeout(resolve, duration);
        });
      });
    }

    return new Promise((resolve) => setTimeout(resolve, stagger));
  }

  static async animateNodeGroup(
    nodes: NodeModel[],
    options: AnimationOptions = {}
  ) {
    for (const node of nodes) {
      await this.animateNodeCreation(node, options);
    }
  }

  static async animateLayout(
    engine: DiagramEngine,
    options: AnimationOptions = {}
  ) {
    const {
      duration = 800,
    } = options;

    const model = engine.getModel();
    const nodes = model.getNodes();

    // Store initial positions
    const initialPositions = new Map(
      nodes.map(node => [node.getID(), { ...node.getPosition() }])
    );

    // Calculate final positions (e.g., grid layout)
    const gridSize = 200;
    const nodesPerRow = Math.ceil(Math.sqrt(nodes.length));
    const finalPositions = new Map(
      nodes.map((node, index) => [
        node.getID(),
        {
          x: (index % nodesPerRow) * gridSize + 100,
          y: Math.floor(index / nodesPerRow) * gridSize + 100,
        },
      ])
    );

    const startTime = performance.now();
    return new Promise<void>((resolve) => {
      const animate = () => {
        const currentTime = performance.now();
        const progress = Math.min(1, (currentTime - startTime) / duration);

        nodes.forEach(node => {
          const initial = initialPositions.get(node.getID());
          const final = finalPositions.get(node.getID());
          if (initial && final) {
            const x = initial.x + (final.x - initial.x) * progress;
            const y = initial.y + (final.y - initial.y) * progress;
            node.setPosition(x, y);
          }
        });

        engine.repaintCanvas();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  static async transitionDiagramState(
    options: AnimationOptions = {}
  ) {
    const canvas = document.querySelector('.srd-demo-canvas') as HTMLElement;
    if (canvas) {
      canvas.style.transition = `opacity ${options.duration || 300}ms ease`;
      canvas.style.opacity = '0.5';

      await new Promise(resolve => setTimeout(resolve, options.duration || 300));

      canvas.style.opacity = '1';
    }
  }
}