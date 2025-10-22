import React from 'react';
import type { CSSProperties } from 'react';

export type ArrowSide = 'left' | 'right' | 'top' | 'bottom';

export interface ArrowHeadOverlayProps {
  side: ArrowSide;
  offset?: number;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const baseStyle: CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 25,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const rotationBySide: Record<ArrowSide, number> = {
  top: 180,
  right: 270,
  bottom: 0,
  left: 90,
};

const ArrowHeadOverlay: React.FC<ArrowHeadOverlayProps> = ({
  side,
  offset = 20,
  size = 14,
  color = '#555',
  className,
  style,
}) => {
  const rotation = rotationBySide[side] ?? 0;

  const placement: CSSProperties = (() => {
    switch (side) {
      case 'top':
        return { top: -offset, left: '50%', transform: `translate(-50%, 0) rotate(${rotation}deg)` };
      case 'bottom':
        return { bottom: -offset, left: '50%', transform: `translate(-50%, 0) rotate(${rotation}deg)` };
      case 'left':
        return { left: -offset, top: '50%', transform: `translate(0, -50%) rotate(${rotation}deg)` };
      case 'right':
      default:
        return { right: -offset, top: '50%', transform: `translate(0, -50%) rotate(${rotation}deg)` };
    }
  })();

  return (
    <div
      className={className}
      style={{ ...baseStyle, transformOrigin: 'center', ...placement, ...style }}
    >
      <svg width={size} height={size} viewBox="0 0 14 14">
        <polygon points="7,0 14,14 0,14" fill={color} />
      </svg>
    </div>
  );
};

export default ArrowHeadOverlay;
