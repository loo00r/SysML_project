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
  
  // Implement efficient updates with prioritized rendering
  let frameId: number | null = null;
  
  const scheduleUpdate = () => {
    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        // Use progressive rendering to improve performance
        progressiveRender(engine);
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

  // Add a custom rendering hook to the engine that ensures proper link rendering
  const originalRepaintCanvas = engine.repaintCanvas.bind(engine);
  
  // Use a simple and reliable approach to override the repaint function
  // This ensures it works with all versions of the Storm Diagrams library
  const engineAny = engine as any;
  engineAny.repaintCanvas = function() {
    progressiveRender(engine);
    return originalRepaintCanvas();
  };

  return engine;
};

export const setupSmartRouting = (engine: any) => {
  // Wrap in a try-catch to prevent errors if the canvas is not yet available
  try {
    engine.setMaxNumberPointsPerLink(10);
    
    // Ensure canvas exists before configuring routing
    setTimeout(() => {
      const canvas = document.querySelector('.srd-canvas');
      if (canvas) {
        // Configure link routing only after canvas is available
        engine.getLinkFactories().getFactory('default').setupDefaultInteractions();
      }
    }, 500);
  } catch (error) {
    console.warn('Cannot setup smart routing yet, canvas not available:', error);
  }
};

// Track the current zoom state globally to ensure consistency
let currentZoomState = {
  level: 100, // default zoom level (100%)
  offsetX: 0,
  offsetY: 0,
};

// Ensure zoom state is always in sync with model
export const syncZoomState = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;
  
  // Update our global zoom tracker
  currentZoomState.level = model.getZoomLevel();
  currentZoomState.offsetX = model.getOffsetX();
  currentZoomState.offsetY = model.getOffsetY();
  
  // Dispatch zoom change event to notify components
  document.dispatchEvent(new CustomEvent('diagram-zoom-changed', {
    detail: {
      zoom: currentZoomState.level,
      offsetX: currentZoomState.offsetX,
      offsetY: currentZoomState.offsetY
    }
  }));
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

    // Enhanced zoom handling with consistent state tracking
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const model = engine.getModel();
      if (!model) return;
      
      // Sync our state tracker with the model (in case it was changed elsewhere)
      currentZoomState.level = model.getZoomLevel();
      currentZoomState.offsetX = model.getOffsetX();
      currentZoomState.offsetY = model.getOffsetY();
      
      // Calculate zoom delta with speed adjustment for smoother zooming
      const zoomDelta = e.deltaY * (e.deltaY > 0 ? 0.3 : 0.2); // slower zoom out, faster zoom in
      
      // Calculate new zoom level with proper clamping
      const newZoomLevel = Math.max(20, Math.min(200, currentZoomState.level - zoomDelta));
      
      // Only proceed if zoom level changed
      if (newZoomLevel === currentZoomState.level) return;
      
      // Get the canvas rect
      const canvasRect = canvas.getBoundingClientRect();
      
      // Get mouse position relative to canvas
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;
      
      // Convert mouse position to model position before zoom
      const zoomFactor = currentZoomState.level / 100;
      const beforeZoomX = mouseX / zoomFactor + currentZoomState.offsetX;
      const beforeZoomY = mouseY / zoomFactor + currentZoomState.offsetY;
      
      // Apply new zoom level
      model.setZoomLevel(newZoomLevel);
      currentZoomState.level = newZoomLevel;
      
      // Calculate new offsets to keep mouse position stable
      const newZoomFactor = newZoomLevel / 100;
      const newOffsetX = beforeZoomX - mouseX / newZoomFactor;
      const newOffsetY = beforeZoomY - mouseY / newZoomFactor;
      
      // Set new offsets
      model.setOffsetX(newOffsetX);
      model.setOffsetY(newOffsetY);
      currentZoomState.offsetX = newOffsetX;
      currentZoomState.offsetY = newOffsetY;
      
      // Repaint and trigger updates
      engine.repaintCanvas();
      
      // Dispatch event for any components that need to update after zoom
      document.dispatchEvent(new CustomEvent('diagram-zoom-changed', { 
        detail: { zoom: newZoomLevel, offsetX: newOffsetX, offsetY: newOffsetY } 
      }));
    }, { passive: false });
  }
}

// Utility functions to convert between screen and model coordinates
export const screenToModelPosition = (screenX: number, screenY: number, canvasRect: DOMRect) => {
  // Get the current zoom state
  const zoomLevel = currentZoomState.level / 100;
  const offsetX = currentZoomState.offsetX;
  const offsetY = currentZoomState.offsetY;
  
  // Calculate the relative position within the canvas
  const relativeX = screenX - canvasRect.left;
  const relativeY = screenY - canvasRect.top;
  
  // Convert to model coordinates
  return {
    x: relativeX / zoomLevel - offsetX,
    y: relativeY / zoomLevel - offsetY
  };
};

export const modelToScreenPosition = (modelX: number, modelY: number, canvasRect: DOMRect) => {
  // Get the current zoom state
  const zoomLevel = currentZoomState.level / 100;
  const offsetX = currentZoomState.offsetX;
  const offsetY = currentZoomState.offsetY;
  
  // Convert to screen coordinates
  const relativeX = (modelX + offsetX) * zoomLevel;
  const relativeY = (modelY + offsetY) * zoomLevel;
  
  return {
    x: relativeX + canvasRect.left,
    y: relativeY + canvasRect.top
  };
};

// Progressive rendering implementation for better performance with complex diagrams
export const progressiveRender = (engine: DiagramEngine) => {
  const model = engine.getModel();
  if (!model) return;
  
  try {
    // Find the canvas element for measurements
    const canvasElement = document.querySelector('.srd-demo-canvas') as HTMLElement;
    if (!canvasElement) return;
    
    // Prioritize redrawing links (arrows) after zoom operations
    // This helps ensure connections are correctly rendered
    const redrawLinks = () => {
      try {
        // Get all links from the model
        const links = Object.values(model.getLinks());
        
        // First invalidate the routing for all links to force them to recalculate
        links.forEach(link => {
          // Force refresh of link points and paths
          if (link.getPoints) {
            // Get source and target ports
            const sourcePort = link.getSourcePort();
            const targetPort = link.getTargetPort();
            
            if (sourcePort && targetPort) {
              // Re-calculate points for the link
              const points = link.getPoints();
              if (points && points.length >= 2) {
                // Update the start and end points based on port positions
                const firstPoint = points[0];
                const lastPoint = points[points.length - 1];
                
                // Update with current port positions
                const sourcePos = sourcePort.getPosition();
                const targetPos = targetPort.getPosition();
                
                // Adjust for parent node position
                const sourceNode = sourcePort.getParent();
                const targetNode = targetPort.getParent();
                
                if (sourceNode && firstPoint) {
                  const nodePos = sourceNode.getPosition();
                  
                  // Get node dimensions to calculate border points
                  const nodeElement = document.querySelector(`[data-nodeid="${sourceNode.getID()}"]`) as HTMLElement;
                  if (nodeElement) {
                    const nodeRect = nodeElement.getBoundingClientRect();
                    const nodeWidth = nodeRect.width / (model.getZoomLevel() / 100);
                    const nodeHeight = nodeRect.height / (model.getZoomLevel() / 100);
                    
                    // Calculate port position relative to node center
                    const portRelX = sourcePos.x - nodeWidth/2;
                    const portRelY = sourcePos.y - nodeHeight/2;
                    
                    // Determine which edge the port is closest to (right, bottom, left, top)
                    const distToRight = Math.abs(portRelX - nodeWidth/2);
                    const distToBottom = Math.abs(portRelY - nodeHeight/2);
                    const distToLeft = Math.abs(portRelX + nodeWidth/2);
                    const distToTop = Math.abs(portRelY + nodeHeight/2);
                    
                    const minDist = Math.min(distToRight, distToBottom, distToLeft, distToTop);
                    
                    let borderX = sourcePos.x;
                    let borderY = sourcePos.y;
                    
                    // Snap to the closest border
                    if (minDist === distToRight) {
                      borderX = nodeWidth/2;
                      // Clamp Y position to stay within node height
                      borderY = Math.max(-nodeHeight/2, Math.min(nodeHeight/2, portRelY));
                    } else if (minDist === distToBottom) {
                      borderY = nodeHeight/2;
                      // Clamp X position to stay within node width
                      borderX = Math.max(-nodeWidth/2, Math.min(nodeWidth/2, portRelX));
                    } else if (minDist === distToLeft) {
                      borderX = -nodeWidth/2;
                      // Clamp Y position to stay within node height
                      borderY = Math.max(-nodeHeight/2, Math.min(nodeHeight/2, portRelY));
                    } else { // distToTop
                      borderY = -nodeHeight/2;
                      // Clamp X position to stay within node width
                      borderX = Math.max(-nodeWidth/2, Math.min(nodeWidth/2, portRelX));
                    }
                    
                    // Set point at border position
                    firstPoint.setPosition(
                      nodePos.x + nodeWidth/2 + borderX,
                      nodePos.y + nodeHeight/2 + borderY
                    );
                  } else {
                    // Fallback to original position if node element not found
                    firstPoint.setPosition(
                      nodePos.x + sourcePos.x,
                      nodePos.y + sourcePos.y
                    );
                  }
                }
                
                if (targetNode && lastPoint) {
                  const nodePos = targetNode.getPosition();
                  
                  // Get node dimensions to calculate border points
                  const nodeElement = document.querySelector(`[data-nodeid="${targetNode.getID()}"]`) as HTMLElement;
                  if (nodeElement) {
                    const nodeRect = nodeElement.getBoundingClientRect();
                    const nodeWidth = nodeRect.width / (model.getZoomLevel() / 100);
                    const nodeHeight = nodeRect.height / (model.getZoomLevel() / 100);
                    
                    // Calculate port position relative to node center
                    const portRelX = targetPos.x - nodeWidth/2;
                    const portRelY = targetPos.y - nodeHeight/2;
                    
                    // Determine which edge the port is closest to (right, bottom, left, top)
                    const distToRight = Math.abs(portRelX - nodeWidth/2);
                    const distToBottom = Math.abs(portRelY - nodeHeight/2);
                    const distToLeft = Math.abs(portRelX + nodeWidth/2);
                    const distToTop = Math.abs(portRelY + nodeHeight/2);
                    
                    const minDist = Math.min(distToRight, distToBottom, distToLeft, distToTop);
                    
                    let borderX = targetPos.x;
                    let borderY = targetPos.y;
                    
                    // Snap to the closest border
                    if (minDist === distToRight) {
                      borderX = nodeWidth/2;
                      borderY = Math.max(-nodeHeight/2, Math.min(nodeHeight/2, portRelY));
                    } else if (minDist === distToBottom) {
                      borderY = nodeHeight/2;
                      borderX = Math.max(-nodeWidth/2, Math.min(nodeWidth/2, portRelX));
                    } else if (minDist === distToLeft) {
                      borderX = -nodeWidth/2;
                      borderY = Math.max(-nodeHeight/2, Math.min(nodeHeight/2, portRelY));
                    } else { // distToTop
                      borderY = -nodeHeight/2;
                      borderX = Math.max(-nodeWidth/2, Math.min(nodeWidth/2, portRelX));
                    }
                    
                    // Set point at border position
                    lastPoint.setPosition(
                      nodePos.x + nodeWidth/2 + borderX,
                      nodePos.y + nodeHeight/2 + borderY
                    );
                  } else {
                    // Fallback to original position if node element not found
                    lastPoint.setPosition(
                      nodePos.x + targetPos.x,
                      nodePos.y + targetPos.y
                    );
                  }
                }
                
                // Force link to recalculate its path
                link.setPoints(points);
              }
            }
          }
        });
      } catch (err) {
        // Safely handle any unexpected errors during link update
        console.warn('Error updating links:', err);
      }
    };
    
    // Prioritize viewport center
    const prioritizeViewportItems = () => {
      try {
        // We'll use a simple approach: force immediate repaint
        // This ensures everything renders properly after zoom
        engine.repaintCanvas();
        
        // Then schedule a follow-up repaint to catch any rendering artifacts
        // Safety check to avoid duplicate timers
        if (window._sysmlRenderTimerId) {
          clearTimeout(window._sysmlRenderTimerId);
        }
        
        window._sysmlRenderTimerId = window.setTimeout(() => {
          redrawLinks();
          engine.repaintCanvas();
          delete window._sysmlRenderTimerId;
        }, 50);
      } catch (err) {
        console.warn('Error prioritizing viewport items:', err);
      }
    };
    
    // Execute the prioritized rendering
    redrawLinks();
    prioritizeViewportItems();
    
  } catch (err) {
    console.warn('Error in progressive rendering:', err);
  }
};

// Add typings for our global window object extension
declare global {
  interface Window {
    _sysmlRenderFrameId?: number;
    _sysmlRenderTimerId?: number;
  }
}