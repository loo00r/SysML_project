import React, { memo } from 'react';
import { EdgeProps, SmoothStepEdge } from 'reactflow';

const baseStyle = {
  stroke: '#37474f',
  strokeWidth: 2,
};

const SmdTransitionEdge: React.FC<EdgeProps> = (props) => {
  const { style, label, ...rest } = props;

  return (
    <SmoothStepEdge
      {...rest}
      style={{ ...baseStyle, ...style }}
      label={label ?? 'event [guard] / action'}
      labelBgPadding={[6, 3]}
      labelBgBorderRadius={4}
      labelBgStyle={{
        fill: '#eceff1',
        stroke: '#b0bec5',
        strokeWidth: 1,
      }}
    />
  );
};

export default memo(SmdTransitionEdge);
