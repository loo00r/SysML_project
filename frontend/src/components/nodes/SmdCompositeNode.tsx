import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Paper, Typography, styled } from '@mui/material';
import { NodeData } from '../../store/diagramStore';
import {
  COMPOSITE_DEFAULT_HEIGHT,
  COMPOSITE_DEFAULT_WIDTH,
  COMPOSITE_HEADER_HEIGHT,
  COMPOSITE_PADDING,
} from '../../utils/smdComposite';
import type { CSSProperties } from 'react';

const CompositeContainer = styled(Paper)<{ isSelected: boolean; width: number; height: number }>(
  ({ theme, isSelected, width, height }) => ({
    width,
    height,
    borderRadius: 16,
    border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid #90a4ae',
    backgroundColor: '#fafafa',
    boxShadow: isSelected ? '0 6px 16px rgba(21, 101, 192, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    pointerEvents: 'auto' as CSSProperties['pointerEvents'],
    zIndex: 0,
  })
);

const Header = styled(Box)(({ theme }) => ({
  height: COMPOSITE_HEADER_HEIGHT,
  backgroundColor: '#e3f2fd',
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1.5),
}));

const HeaderTitle = styled(Typography)({
  fontWeight: 600,
  fontSize: '0.9rem',
  color: '#0d47a1',
});

const Workspace = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: `${COMPOSITE_PADDING}px`,
  position: 'relative',
  background:
    'repeating-linear-gradient(45deg, rgba(227, 242, 253, 0.4), rgba(227, 242, 253, 0.4) 10px, rgba(255, 255, 255, 0.4) 10px, rgba(255, 255, 255, 0.4) 20px)',
  borderRadius: theme.shape.borderRadius,
  border: '1px dashed rgba(13, 71, 161, 0.4)',
  pointerEvents: 'none' as CSSProperties['pointerEvents'],
  zIndex: 0,
}));

const MetaSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderTop: `1px dashed ${theme.palette.divider}`,
  backgroundColor: 'rgba(227, 242, 253, 0.4)',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.75),
}));

const MetaRow = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  color: theme.palette.text.secondary,
  fontFamily: 'Roboto Mono, monospace',
  whiteSpace: 'pre-wrap',
}));

const rightHandleStyle: CSSProperties = {
  background: '#455a64',
  width: 10,
  height: 10,
  right: -6,
  top: '50%',
  transform: 'translate(0, -50%)',
  pointerEvents: 'auto' as CSSProperties['pointerEvents'],
  zIndex: 10,
};

const SmdCompositeNode: React.FC<NodeProps<NodeData & { width?: number; height?: number }>> = ({
  data,
  selected,
}) => {
  const name = data?.name || data?.label || 'Composite';
  const entry = data?.entry;
  const exit = data?.exit;
  const doActivity = data?.do;

  const width = data?.width ?? COMPOSITE_DEFAULT_WIDTH;
  const height = data?.height ?? COMPOSITE_DEFAULT_HEIGHT;

  return (
    <CompositeContainer elevation={selected ? 6 : 2} isSelected={!!selected} width={width} height={height}>
      <Header>
        <HeaderTitle variant="subtitle2">{name}</HeaderTitle>
      </Header>

      <Workspace />

      {(entry || exit || doActivity) && (
        <MetaSection>
          {entry && entry.trim() !== '' && (
            <MetaRow variant="body2">entry / {entry}</MetaRow>
          )}
          {doActivity && doActivity.trim() !== '' && (
            <MetaRow variant="body2">do / {doActivity}</MetaRow>
          )}
          {exit && exit.trim() !== '' && (
            <MetaRow variant="body2">exit / {exit}</MetaRow>
          )}
        </MetaSection>
      )}

      <Handle id="out-right" type="source" position={Position.Right} style={rightHandleStyle} />
    </CompositeContainer>
  );
};

export default memo(SmdCompositeNode);
