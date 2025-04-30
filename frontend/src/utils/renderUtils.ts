import { DiagramEngine } from '@projectstorm/react-diagrams';

export const configureEngineForPerformance = (engine: DiagramEngine) => {
  // Get or create model
  const model = engine.getModel();
  if (!model) {
    return engine;
  }

  // Configure WebGL renderer settings
  const canvas = document.querySelector('.srd-demo-canvas > div > canvas') as HTMLCanvasElement;
  if (canvas) {
    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });

    if (gl) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
    }
  }

  // Configure engine performance options
  engine.setMaxNumberPointsPerLink(100);
  
  // Configure model settings
  model.setGridSize(20);
  model.setLocked(false);
  
  // Enable hardware acceleration
  if (canvas) {
    canvas.style.transform = 'translateZ(0)';
    canvas.style.backfaceVisibility = 'hidden';
  }

  return engine;
};

export const optimizeDiagramForLargeGraphs = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) {
    return engine;
  }

  // Configure rendering optimizations  
  model.setGridSize(20);
  
  // Implement efficient updates
  let frameId: number | null = null;
  
  const scheduleUpdate = () => {
    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        engine.repaintCanvas();
        frameId = null;
      });
    }
  };

  // Register update listener
  model.registerListener({
    nodesUpdated: scheduleUpdate,
    linksUpdated: scheduleUpdate,
    offsetUpdated: scheduleUpdate,
    zoomUpdated: scheduleUpdate
  });

  return engine;
};

export const setupSmartRouting = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) {
    return engine;
  }

  engine.setMaxNumberPointsPerLink(10);
  model.setLocked(false);
  
  // Simplify links by removing intermediate points
  model.registerListener({
    linksUpdated: () => {
      model.getLinks().forEach(link => {
        if (link.getSourcePort() && link.getTargetPort()) {
          const points = link.getPoints();
          while (points.length > 2) {
            points.splice(1, 1);
          }
        }
      });
      engine.repaintCanvas();
    }
  });

  return engine;
};

export const setupDiagramInteractions = (engine: DiagramEngine) => {
  // Enable touch interactions
  const canvas = document.querySelector('.srd-demo-canvas') as HTMLElement;
  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      canvas.dispatchEvent(mouseEvent);
    });

    // Add smooth zoom handling
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY;
      const model = engine.getModel();
      if (model) {
        const currentZoom = model.getZoomLevel();
        const newZoom = currentZoom - delta / 100;
        
        // Limit zoom levels
        if (newZoom >= 10 && newZoom <= 200) {
          model.setZoomLevel(newZoom);
          engine.repaintCanvas();
        }
      }
    }, { passive: false });
  }

  return engine;
};