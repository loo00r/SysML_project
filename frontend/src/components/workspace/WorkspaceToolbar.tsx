import React from 'react';
import { IconButton, Button, styled } from '@mui/material';
import { Panel } from 'reactflow';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import DeleteIcon from '@mui/icons-material/Delete';

const ToolbarPanel = styled(Panel)({
  display: 'flex',
  gap: '8px',
  padding: '8px',
  background: 'white',
  borderRadius: '4px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  marginTop: '80px', // Move toolbar down to avoid overlap with diagram tabs
});

interface WorkspaceToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onClear: () => void;
  onSave: () => void;
  onValidate: () => void;
  onExport: () => void;
  validationErrors: any[];
  isExportEnabled: boolean;
}

const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onClear,
  onSave,
  onValidate,
  onExport,
  validationErrors,
  isExportEnabled,
}) => {
  return (
    <ToolbarPanel position="top-center">
      <IconButton onClick={onUndo} size="small" title="Undo">
        <UndoIcon />
      </IconButton>
      <IconButton onClick={onRedo} size="small" title="Redo">
        <RedoIcon />
      </IconButton>
      <IconButton onClick={onZoomIn} size="small" title="Zoom In">
        <ZoomInIcon />
      </IconButton>
      <IconButton onClick={onZoomOut} size="small" title="Zoom Out">
        <ZoomOutIcon />
      </IconButton>
      <IconButton onClick={onFitView} size="small" title="Fit View">
        <FitScreenIcon />
      </IconButton>
      <IconButton onClick={onClear} size="small" title="Clear Diagram">
        <DeleteIcon />
      </IconButton>
      <IconButton onClick={onSave} size="small" title="Save Diagram">
        <SaveIcon />
      </IconButton>
      <Button
        variant="outlined"
        size="small"
        onClick={onValidate}
        color={validationErrors.length > 0 ? 'warning' : 'primary'}
      >
        {validationErrors.length > 0 ? `Validation Issues (${validationErrors.length})` : 'VALIDATE'}
      </Button>
      <Button
        variant="outlined"
        size="small"
        onClick={onExport}
        disabled={!isExportEnabled}
        color="warning"
        sx={{ minWidth: '80px' }}
      >
        EXPORT
      </Button>
    </ToolbarPanel>
  );
};

export default WorkspaceToolbar;