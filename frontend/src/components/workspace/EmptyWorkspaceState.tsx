import React from 'react';
import { Box, Typography, styled } from '@mui/material';

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  width: '100%',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.secondary,
  padding: theme.spacing(4),
}));

const EmptyWorkspaceState: React.FC = () => {
  return (
    <EmptyState>
      <Typography variant="h6" gutterBottom>
        No diagram open
      </Typography>
      <Typography variant="body2">
        Create a new diagram by clicking the + button in the tab bar above
      </Typography>
    </EmptyState>
  );
};

export default EmptyWorkspaceState;