// Node-specific colors for IBD icons - highly saturated versions for optimal visibility
export const nodeColors = {
  block: '#3b82f6',     // Much more saturated blue - matches Processor visibility level
  sensor: '#f792be',    // Lighter pink for better visual balance and less saturation  
  processor: '#fcd34d'  // Perfect yellow/amber - keeping unchanged
} as const;

export type NodeType = keyof typeof nodeColors;