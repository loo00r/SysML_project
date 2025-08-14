import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack,
  Divider,
  Switch
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import useAIGeneration from '../hooks/useAIGeneration';
import LoadingAnimation from './LoadingAnimation';

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
  const [includeRelationships, setIncludeRelationships] = useState(true);
  const [generateEnhanced, setGenerateEnhanced] = useState(false);
  
  // Use our custom AI generation hook
  const { generateDiagram, isGenerating, progress, error } = useAIGeneration();
  
  // We don't need to explicitly track steps anymore as our animation handles this

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    try {
      await generateDiagram({
        prompt: text,
        complexity: 'medium',
        includeRelationships,
        isEnhanced: generateEnhanced
      });
      
      // Reset the form after successful generation
      setText('');
      setIsExpanded(false);
      
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
  
  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setText(event.target.value);
  };
  
  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <>
      {/* Full screen loading animation */}
      <LoadingAnimation isVisible={isGenerating} progress={progress} />

      <GeneratorContainer isExpanded={isExpanded}>
        <Box sx={{ position: 'relative', width: '100%' }}>
          <ToggleButtonStyled
            onClick={toggleExpanded}
            aria-label={isExpanded ? 'Hide generator' : 'Show generator'}
            title={isExpanded ? 'Hide AI generator' : 'Show AI generator'}
          >
            {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </ToggleButtonStyled>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 18 }}>
              <PlayArrowIcon color="primary" />
              AI Diagram Generator
            </Typography>
            {!isExpanded && (
              <Button
                variant="contained"
                color="primary"
                size="small"
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                sx={{ ml: 2 }}
              >
                Generate
              </Button>
            )}
          </Box>
        </Box>
        <Divider sx={{ my: 1 }} />
        {isExpanded && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
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
              <FormControlLabel
                control={
                  <Switch
                    checked={generateEnhanced}
                    onChange={(e) => setGenerateEnhanced(e.target.checked)}
                    disabled={isGenerating}
                    name="generateEnhanced"
                  />
                }
                label="Generate with Internal Diagrams"
              />
            </Stack>
            <TextField
              multiline
              rows={5}
              fullWidth
              value={text}
              onChange={handleTextChange}
              placeholder="Enter your system description here. The AI will analyze your text and generate a SysML diagram automatically."
              disabled={isGenerating}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            {/* Loading indicator is now handled by the LoadingAnimation component */}
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
          </>
        )}
      </GeneratorContainer>
    </>
  );
};

export default DiagramGeneratorNew;
