import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  LinearProgress,
  IconButton,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  SelectChangeEvent
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import useAIGeneration from '../hooks/useAIGeneration';

// Styled components using Material UI
const GeneratorContainer = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isExpanded'
})<{ isExpanded: boolean }>(({ theme, isExpanded }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  maxWidth: '100%',
  margin: '0 auto',
  borderTopLeftRadius: theme.shape.borderRadius,
  borderTopRightRadius: theme.shape.borderRadius,
  borderTop: `1px solid ${theme.palette.divider}`,
  borderLeft: `1px solid ${theme.palette.divider}`,
  borderRight: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  boxShadow: theme.shadows[3],
  transition: 'transform 0.3s ease',
  transform: isExpanded ? 'translateY(0)' : 'translateY(85%)',
  '@media (min-width: 600px)': {
    left: 250, // Sidebar width on larger screens
  },
}));

const ToggleButtonStyled = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: -30,
  right: 20,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderBottom: 'none',
  borderRadius: `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StepItem = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status'
})<{ status: 'pending' | 'active' | 'completed' }>(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: 
    status === 'completed' ? theme.palette.success.main :
    status === 'active' ? theme.palette.primary.main :
    theme.palette.text.secondary,
}));

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface DiagramGeneratorProps {
  onGenerate?: (text: string) => Promise<void>;
  onClear?: () => void;
}

const DiagramGeneratorNew: React.FC<DiagramGeneratorProps> = ({ onGenerate, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [diagramType, setDiagramType] = useState('block');
  const [includeRelationships, setIncludeRelationships] = useState(true);
  const [diagramStyle, setDiagramStyle] = useState('technical');
  
  // Use our custom AI generation hook
  const { generateDiagram, isGenerating, progress, error } = useAIGeneration();
  
  // Steps for the generation process
  const steps: GenerationStep[] = [
    { id: 'parse', label: 'Parsing text', status: progress > 0 && progress < 40 ? 'active' : progress >= 40 ? 'completed' : 'pending' },
    { id: 'analyze', label: 'Analyzing components', status: progress >= 40 && progress < 80 ? 'active' : progress >= 80 ? 'completed' : 'pending' },
    { id: 'generate', label: 'Generating diagram', status: progress >= 80 ? 'active' : progress === 100 ? 'completed' : 'pending' },
  ];

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    try {
      await generateDiagram({
        prompt: text,
        complexity: 'medium',
        includeRelationships,
        style: diagramStyle as 'technical' | 'conceptual'
      });
      
      // Call the parent component's onGenerate if provided
      if (onGenerate) {
        await onGenerate(text);
      }
    } catch (err) {
      console.error('Error generating diagram:', err);
    }
  };
  
  const handleClear = () => {
    setText('');
    if (onClear) {
      onClear();
    }
  };
  
  const handleDiagramTypeChange = (event: SelectChangeEvent) => {
    setDiagramType(event.target.value);
  };
  
  const handleDiagramStyleChange = (event: SelectChangeEvent) => {
    setDiagramStyle(event.target.value);
  };
  
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setText(event.target.value);
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <ToggleButtonStyled onClick={toggleExpanded}>
        {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
      </ToggleButtonStyled>
      
      <GeneratorContainer isExpanded={isExpanded}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">AI Diagram Generator</Typography>
        </Box>
        
        <Divider />
        
        {isExpanded && (
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="diagram-type-label">Diagram Type</InputLabel>
              <Select
                labelId="diagram-type-label"
                value={diagramType}
                label="Diagram Type"
                onChange={handleDiagramTypeChange}
                disabled={isGenerating}
              >
                <MenuItem value="block">Block Diagram</MenuItem>
                <MenuItem value="activity">Activity Diagram</MenuItem>
                <MenuItem value="usecase">Use Case Diagram</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="diagram-style-label">Style</InputLabel>
              <Select
                labelId="diagram-style-label"
                value={diagramStyle}
                label="Style"
                onChange={handleDiagramStyleChange}
                disabled={isGenerating}
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="conceptual">Conceptual</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeRelationships}
                  onChange={(e) => setIncludeRelationships(e.target.checked)}
                  disabled={isGenerating}
                />
              }
              label="Include Relationships"
            />
          </Stack>
        )}
        
        <TextField
          multiline
          rows={isExpanded ? 5 : 2}
          fullWidth
          value={text}
          onChange={handleTextChange}
          placeholder="Enter your system description here. The AI will analyze your text and generate a SysML diagram automatically."
          disabled={isGenerating}
          variant="outlined"
        />
        
        {isGenerating && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress variant="determinate" value={progress} />
            <Stack direction="column" spacing={1} sx={{ mt: 2 }}>
              {steps.map((step) => (
                <StepItem key={step.id} status={step.status}>
                  {step.status === 'completed' ? (
                    <CheckCircleOutlineIcon fontSize="small" />
                  ) : step.status === 'active' ? (
                    <PlayArrowIcon fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon fontSize="small" />
                  )}
                  <Typography variant="body2">{step.label}</Typography>
                </StepItem>
              ))}
            </Stack>
          </Box>
        )}
        
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            startIcon={isGenerating ? null : <PlayArrowIcon />}
          >
            {isGenerating ? 'Generating...' : 'Generate Diagram'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleClear}
            disabled={isGenerating}
          >
            Clear
          </Button>
        </Stack>
      </GeneratorContainer>
    </>
  );
};

export default DiagramGeneratorNew;
