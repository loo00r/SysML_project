import React from 'react';
import { Paper, styled } from '@mui/material';
import DiagramTabs from '../DiagramTabs';

const StyledFloatingPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: 16,
  left: 16,
  right: 16, // Allow panel to expand to full width
  zIndex: 1000, // Above canvas elements
  display: 'flex',
  alignItems: 'center',
  background: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  borderRadius: theme.shape.borderRadius,
  overflow: 'visible', // Allow scrolling
  maxWidth: 'calc(100vw - 32px)', // Prevent overflow beyond viewport
}));

const FloatingTabPanel: React.FC = () => {
  return (
    <StyledFloatingPanel elevation={3}>
      <DiagramTabs />
    </StyledFloatingPanel>
  );
};

export default FloatingTabPanel;