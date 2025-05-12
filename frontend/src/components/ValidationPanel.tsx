import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

import useDiagramStore, { ValidationError } from '../store/diagramStore';

// Styled components
const PanelContainer = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: 70,
  right: 20,
  width: 350,
  maxHeight: 400,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[3],
  zIndex: 1000,
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.error.light,
  color: theme.palette.error.contrastText,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const PanelContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  overflowY: 'auto',
  maxHeight: 350,
}));

const ErrorItem = styled(ListItem)<{ type: 'error' | 'warning' }>(({ theme, type }) => ({
  padding: theme.spacing(1),
  backgroundColor: type === 'error' ? theme.palette.error.light : theme.palette.warning.light,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  '&:hover': {
    backgroundColor: type === 'error' ? theme.palette.error.main : theme.palette.warning.main,
    cursor: 'pointer',
  },
}));

// Interface for the validation panel
interface ValidationPanelProps {
  errors: ValidationError[];
}

// Main validation panel component
const ValidationPanel: React.FC<ValidationPanelProps> = ({ errors }) => {
  const { toggleValidationPanel, setSelectedNodes } = useDiagramStore();

  // Handle clicking on an error to highlight related nodes
  const handleErrorClick = (error: ValidationError) => {
    if (error.nodeIds && error.nodeIds.length > 0) {
      setSelectedNodes(error.nodeIds);
    }
  };

  return (
    <PanelContainer>
      <PanelHeader>
        <Typography variant="subtitle1" fontWeight="bold">
          Validation Issues ({errors.length})
        </Typography>
        <IconButton size="small" onClick={toggleValidationPanel} color="inherit">
          <CloseIcon fontSize="small" />
        </IconButton>
      </PanelHeader>

      <PanelContent>
        <List disablePadding>
          {errors.map((error, index) => (
            <ErrorItem
              key={index}
              type={error.type}
              onClick={() => handleErrorClick(error)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {error.type === 'error' ? (
                  <ErrorIcon color="error" />
                ) : (
                  <WarningIcon color="warning" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={error.message}
                secondary={
                  error.nodeIds && error.nodeIds.length > 0
                    ? 'Click to highlight affected elements'
                    : null
                }
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: error.type === 'error' ? 'bold' : 'normal',
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  sx: { opacity: 0.8 },
                }}
              />
            </ErrorItem>
          ))}
        </List>
      </PanelContent>
    </PanelContainer>
  );
};

export default ValidationPanel;
