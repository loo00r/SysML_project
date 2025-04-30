import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

const GeneratorContainer = styled.div<{ $isExpanded: boolean }>`
  position: fixed;
  bottom: 0;
  left: 250px; // Sidebar width
  right: 0;
  background: white;
  border-top: 1px solid #ddd;
  padding: 15px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: transform 0.3s ease;
  transform: translateY(${props => props.$isExpanded ? '0' : '90%'});
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 150px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: none;
  &:focus {
    outline: none;
    border-color: #0073e6;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  background: ${props => props.$variant === 'primary' ? '#0073e6' : '#fff'};
  color: ${props => props.$variant === 'primary' ? '#fff' : '#333'};
  border: 1px solid ${props => props.$variant === 'primary' ? '#0073e6' : '#ddd'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$variant === 'primary' ? '#0066cc' : '#f5f5f5'};
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  top: -30px;
  right: 20px;
  background: white;
  border: 1px solid #ddd;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  padding: 5px 15px;
  cursor: pointer;
  &:hover {
    background: #f5f5f5;
  }
`;

const progressAnimation = keyframes`
  0% { width: 0; }
  100% { width: 100%; }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const ProgressBar = styled.div<{ duration: number }>`
  height: 2px;
  background: #1890ff;
  position: absolute;
  bottom: 0;
  left: 0;
  animation: ${progressAnimation} ${props => props.duration}ms linear;
`;

const ProcessingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-size: 14px;
  animation: ${pulseAnimation} 2s infinite ease-in-out;
`;

const StepIndicator = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
`;

const Step = styled.div<{ $status: 'pending' | 'active' | 'completed' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => 
    props.$status === 'completed' ? '#52c41a' :
    props.$status === 'active' ? '#1890ff' :
    '#8c8c8c'
  };
`;

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface DiagramGeneratorProps {
  onGenerate: (text: string) => Promise<void>;
  onClear: () => void;
}

const DiagramGenerator: React.FC<DiagramGeneratorProps> = ({ onGenerate, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<GenerationStep[]>([
    { id: 'parse', label: 'Parsing text', status: 'pending' },
    { id: 'analyze', label: 'Analyzing components', status: 'pending' },
    { id: 'generate', label: 'Generating diagram', status: 'pending' },
  ]);

  const updateStep = (stepId: string, status: 'pending' | 'active' | 'completed') => {
    setSteps(current =>
      current.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const resetSteps = () => {
    setSteps(steps.map(step => ({ ...step, status: 'pending' })));
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError('Please enter a system description');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      resetSteps();

      // Simulate parsing step
      updateStep('parse', 'active');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep('parse', 'completed');

      // Simulate analysis step
      updateStep('analyze', 'active');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('analyze', 'completed');

      // Generate diagram
      updateStep('generate', 'active');
      await onGenerate(text);
      updateStep('generate', 'completed');

    } catch (err) {
      setError('Failed to generate diagram. Please try again.');
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    setText('');
    setError(null);
    resetSteps();
    onClear();
  };

  return (
    <GeneratorContainer $isExpanded={isExpanded}>
      {isGenerating && <ProgressBar duration={3000} />}
      <ToggleButton onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? '▼ Hide Generator' : '▲ Show Generator'}
      </ToggleButton>
      <TextArea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder="Enter your system description here. The AI will analyze your text and generate a SysML diagram automatically.
Example:
The UAV system consists of a thermal sensor for detecting survivors and a data processor for analyzing the thermal images. The system transmits processed data to the ground station..."
        disabled={isGenerating}
      />
      {isGenerating && (
        <StepIndicator>
          {steps.map(step => (
            <Step key={step.id} $status={step.status}>
              {step.status === 'completed' ? '✓' : 
               step.status === 'active' ? '►' : '○'} 
              {step.label}
            </Step>
          ))}
        </StepIndicator>
      )}
      {error && (
        <div style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
          {error}
        </div>
      )}
      <ButtonGroup>
        <Button 
          $variant="primary" 
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim()}
        >
          {isGenerating ? (
            <ProcessingIndicator>
              <span>Generating...</span>
            </ProcessingIndicator>
          ) : 'Generate Diagram'}
        </Button>
        <Button onClick={handleClear} disabled={isGenerating}>
          Clear All
        </Button>
      </ButtonGroup>
    </GeneratorContainer>
  );
};

export default DiagramGenerator;