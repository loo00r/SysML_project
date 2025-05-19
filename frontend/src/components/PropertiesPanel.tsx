import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import useDiagramStore from '../store/diagramStore';

// Styled components
const PanelContainer = styled(Paper)(({ theme }) => ({
  width: 300,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRadius: 0,
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));

const PanelContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowY: 'auto',
  flexGrow: 1,
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  marginBottom: theme.spacing(1),
}));

const PropertyItem = styled(ListItem)(({ theme }) => ({
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
}));

// Interface for property dialog
interface PropertyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string, value: string) => void;
  existingKeys: string[];
}

// Property dialog component
const PropertyDialog: React.FC<PropertyDialogProps> = ({
  open,
  onClose,
  onSave,
  existingKeys,
}) => {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [keyError, setKeyError] = useState('');

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setKey(newKey);
    
    if (existingKeys.includes(newKey)) {
      setKeyError('Property name already exists');
    } else {
      setKeyError('');
    }
  };

  const handleSave = () => {
    if (!key.trim()) {
      setKeyError('Property name is required');
      return;
    }
    
    if (keyError) return;
    
    onSave(key.trim(), value.trim());
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Property</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Property Name"
          fullWidth
          value={key}
          onChange={handleKeyChange}
          error={!!keyError}
          helperText={keyError}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Property Value"
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Interface for the properties panel
interface PropertiesPanelProps {
  nodeId: string;
  onClose: () => void;
}

// Main properties panel component
const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNode } = useDiagramStore();
  
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [properties, setProperties] = useState<Record<string, string>>({});
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  
  // Find the selected node
  const selectedNode = nodes.find((node) => node.id === nodeId);
  
  // Initialize form values when the selected node changes
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.data.label || '');
      setDescription(selectedNode.data.description || '');
      
      // Filter out the 'name' property if it exists
      const nodeProperties = selectedNode.data.properties || {};
      const filteredProperties = Object.entries(nodeProperties)
        .filter(([key]) => key.toLowerCase() !== 'name')
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      setProperties(filteredProperties);
    }
  }, [selectedNode]);
  
  // Handle saving changes to the node
  const handleSave = () => {
    if (selectedNode) {
      updateNode(nodeId, {
        label,
        description,
        properties,
      });
    }
  };
  
  // Handle adding a new property
  const handleAddProperty = (key: string, value: string) => {
    // Skip if the property key is 'name' as we want to remove this field
    if (key.toLowerCase() === 'name') return;
    
    const newProperties = { ...properties, [key]: value };
    setProperties(newProperties);
    
    // Save the changes immediately
    if (selectedNode) {
      updateNode(nodeId, {
        properties: newProperties,
      });
    }
  };
  
  // Handle removing a property
  const handleRemoveProperty = (key: string) => {
    const newProperties = { ...properties };
    delete newProperties[key];
    setProperties(newProperties);
    
    // Save the changes immediately
    if (selectedNode) {
      updateNode(nodeId, {
        properties: newProperties,
      });
    }
  };
  
  // If no node is selected, don't render anything
  if (!selectedNode) {
    return null;
  }
  
  return (
    <PanelContainer elevation={3}>
      <PanelHeader>
        <Typography variant="subtitle1" fontWeight="bold">
          Properties
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </PanelHeader>
      
      <PanelContent>
        <FormSection>
          <SectionTitle variant="subtitle2">Basic Information</SectionTitle>
          <TextField
            label="Label"
            fullWidth
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            margin="normal"
            size="small"
          />
          <TextField
            label="Description"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            size="small"
            multiline
            rows={3}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            sx={{ mt: 2 }}
          >
            Save Changes
          </Button>
        </FormSection>
        
        <Divider sx={{ my: 2 }} />
        
        <FormSection>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <SectionTitle variant="subtitle2">Properties</SectionTitle>
            <Button
              startIcon={<AddIcon />}
              size="small"
              onClick={() => setPropertyDialogOpen(true)}
            >
              Add
            </Button>
          </Box>
          
          {Object.keys(properties).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No properties defined
            </Typography>
          ) : (
            <List disablePadding>
              {Object.entries(properties).map(([key, value]) => (
                <PropertyItem key={key}>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="bold">
                        {key}
                      </Typography>
                    }
                    secondary={value}
                  />
                  <IconButton
                    size="small"
                    edge="end"
                    onClick={() => handleRemoveProperty(key)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </PropertyItem>
              ))}
            </List>
          )}
        </FormSection>
        
        <Divider sx={{ my: 2 }} />
        
        <FormSection>
          <SectionTitle variant="subtitle2">Node Information</SectionTitle>
          <Box mt={1}>
            <Typography variant="body2">
              <strong>Type:</strong>{' '}
              <Chip
                label={selectedNode.data.type || 'unknown'}
                size="small"
                color={
                  selectedNode.data.type === 'block'
                    ? 'primary'
                    : selectedNode.data.type === 'sensor'
                    ? 'error'
                    : selectedNode.data.type === 'processor'
                    ? 'warning'
                    : 'default'
                }
              />
            </Typography>
            <Typography variant="body2" mt={1}>
              <strong>ID:</strong> {nodeId}
            </Typography>
          </Box>
        </FormSection>
      </PanelContent>
      
      <PropertyDialog
        open={propertyDialogOpen}
        onClose={() => setPropertyDialogOpen(false)}
        onSave={handleAddProperty}
        existingKeys={Object.keys(properties)}
      />
    </PanelContainer>
  );
};

export default PropertiesPanel;
