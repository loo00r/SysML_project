import React from 'react';
import { Tooltip } from '@mui/material';
import type { ValidationResult } from '../../services/validation/smdValidator';

export interface ValidationBadgeProps {
  results: ValidationResult[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: number;
}

const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  results,
  position = 'top-right',
  size = 20
}) => {
  if (results.length === 0) {
    return null;
  }

  const errorCount = results.filter(r => r.severity === 'error').length;
  const warningCount = results.filter(r => r.severity === 'warning').length;

  // Prefer error over warning
  const severity = errorCount > 0 ? 'error' : 'warning';
  const count = errorCount + warningCount;

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: -8, right: -8 },
    'top-left': { top: -8, left: -8 },
    'bottom-right': { bottom: -8, right: -8 },
    'bottom-left': { bottom: -8, left: -8 },
  };

  // Badge colors
  const colors = {
    error: {
      bg: '#f44336',
      border: '#d32f2f',
    },
    warning: {
      bg: '#ff9800',
      border: '#f57c00',
    },
  };

  const tooltipContent = results.map((r, i) => (
    <div key={i} style={{ marginBottom: i < results.length - 1 ? '4px' : 0 }}>
      <strong>{r.code}:</strong> {r.message}
    </div>
  ));

  return (
    <Tooltip
      title={<div style={{ fontSize: '0.75rem' }}>{tooltipContent}</div>}
      arrow
      placement="top"
    >
      <div
        style={{
          position: 'absolute',
          ...positionStyles[position],
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: colors[severity].bg,
          border: `2px solid ${colors[severity].border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.5,
          fontWeight: 'bold',
          color: '#fff',
          cursor: 'help',
          zIndex: 1000,
          pointerEvents: 'auto',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {count > 1 ? count : severity === 'error' ? '!' : '⚠'}
      </div>
    </Tooltip>
  );
};

export default ValidationBadge;
