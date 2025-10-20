import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from 'reactflow';
import type { CSSProperties } from 'react';

const SmdTransitionEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    label,
    markerEnd,
  } = props;

  const computedLabel = typeof label === 'string' && label.trim().length > 0 ? label : undefined;
  const resolvedMarkerEnd = typeof markerEnd === 'string' ? markerEnd : 'url(#smd-arrowhead)';
  const mergedStyle: CSSProperties = {
    stroke: '#37474f',
    strokeWidth: 2,
    ...(style as CSSProperties | undefined),
  };
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const showLabel = Boolean(computedLabel);
  const labelContainerStyle: CSSProperties = {
    position: 'absolute',
    transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
    pointerEvents: 'all' as CSSProperties['pointerEvents'],
    zIndex: 1,
  };

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={mergedStyle} markerEnd={resolvedMarkerEnd} interactionWidth={20} />
      {showLabel && (
        <EdgeLabelRenderer>
          <div className="smd-edge-label" style={labelContainerStyle}>
            {computedLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(SmdTransitionEdge);
