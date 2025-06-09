import React, { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';
import { styled } from '@mui/material/styles';

interface LoadingAnimationProps {
  progress: number;
  isVisible: boolean;
}

// Keyframes for various animations
const glitch = keyframes`
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-5px, 5px);
  }
  40% {
    transform: translate(-5px, -5px);
  }
  60% {
    transform: translate(5px, 5px);
  }
  80% {
    transform: translate(5px, -5px);
  }
  100% {
    transform: translate(0);
  }
`;

const scanline = keyframes`
  0% {
    transform: translateY(0%);
  }
  100% {
    transform: translateY(100%);
  }
`;

const blink = keyframes`
  0% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const flicker = keyframes`
  0% {
    opacity: 0.2;
  }
  10% {
    opacity: 0.9;
  }
  20% {
    opacity: 0.2;
  }
  30% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  70% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
`;

const rotation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Styled components
const AnimationContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible'
})<{ isVisible: boolean }>(({ theme, isVisible }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: '#f5f5f7',
  zIndex: 10000,
  display: isVisible ? 'flex' : 'none',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
}));

const GlitchText = styled(Typography)(({ theme }) => ({
  color: '#1976d2',
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontWeight: 700,
  fontSize: '4rem',
  position: 'relative',
  textShadow: '2px 2px 0px #0288d1, -2px -2px 0px #0d47a1',
  animation: `${glitch} 1s infinite alternate-reverse`,
  letterSpacing: '5px',
  textTransform: 'uppercase',
  marginBottom: theme.spacing(6),

  '&::before, &::after': {
    content: 'attr(data-text)',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },

  '&::before': {
    left: '2px',
    textShadow: '-2px 0 #00e5ff',
    animation: `${glitch} 0.5s infinite alternate-reverse`,
    clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
  },

  '&::after': {
    left: '-2px',
    textShadow: '2px 0 #f0f',
    animation: `${glitch} 0.5s infinite alternate-reverse`,
    clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
  },
}));

const ProgressBar = styled(Box)(({ theme }) => ({
  width: '300px',
  height: '10px',
  backgroundColor: '#e0e0e0',
  borderRadius: '5px',
  overflow: 'hidden',
  position: 'relative',
  margin: theme.spacing(2),
}));

const ProgressFill = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'progress'
})<{ progress: number }>(({ progress }) => ({
  height: '100%',
  width: `${progress}%`,
  backgroundColor: '#1976d2',
  transition: 'width 0.5s ease-in-out',
  position: 'relative',
  boxShadow: '0 0 10px 2px rgba(25, 118, 210, 0.6)',
}));

const CircularElement = styled(Box)(({ theme }) => ({
  position: 'absolute',
  width: '300px',
  height: '300px',
  border: '2px solid #1976d2',
  borderRadius: '50%',
  animation: `${rotation} 15s linear infinite`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '250px',
    height: '250px',
    border: '2px solid #0288d1',
    borderRadius: '50%',
  },
}));

const Scanline = styled(Box)({
  width: '100%',
  height: '2px',
  backgroundColor: 'rgba(2, 136, 209, 0.3)',
  position: 'absolute',
  animation: `${scanline} 4s linear infinite`,
});

const StatusText = styled(Typography)(({ theme }) => ({
  color: '#0288d1',
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  marginTop: theme.spacing(2),
  letterSpacing: '2px',
  animation: `${blink} 1s infinite`,
}));

const phrases = [
  "ANALYZING NEURAL PATTERNS",
  "SYNTHESIZING DIAGRAM ARCHITECTURE",
  "CALCULATING NODE RELATIONSHIPS",
  "GENERATING SYSTEM MODEL",
  "ESTABLISHING NODE CONNECTIONS",
  "PARSING SYSTEM STRUCTURE",
  "ASSEMBLING VISUALIZATION MATRIX"
];

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ progress, isVisible }) => {
  const [phrase, setPhrase] = useState(phrases[0]);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * phrases.length);
      setPhrase(phrases[randomIndex]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  return (
    <AnimationContainer isVisible={isVisible}>
      {/* Background elements */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundImage: 'linear-gradient(0deg, #f5f5f7 85%, #e0e0e0 90%, #f5f5f7 95%)',
          opacity: 0.8,
          animation: `${flicker} 5s infinite`,
        }}
      />
      
      {/* Scanlines */}
      {[...Array(10)].map((_, i) => (
        <Scanline key={i} sx={{ top: `${i * 10}%`, animationDelay: `${i * 0.4}s` }} />
      ))}
      
      {/* Circular elements */}
      <CircularElement sx={{ animationDuration: '20s' }} />
      <CircularElement sx={{ width: '400px', height: '400px', animationDuration: '25s', animationDirection: 'reverse' }} />
      
      {/* Main content */}
      <GlitchText variant="h1" data-text="GENERATING">
        GENERATING
      </GlitchText>
      
      <ProgressBar>
        <ProgressFill progress={progress} />
      </ProgressBar>
      
      <StatusText variant="body1">
        {phrase}... {Math.round(progress)}%
      </StatusText>
      
      {/* Small rotating symbols that resemble the Love, Death + Robots logo */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: '40px', 
        display: 'flex', 
        gap: 4
      }}>
        <Typography 
          sx={{ 
            color: '#1976d2', 
            fontSize: '2rem', 
            fontWeight: 'bold',
            animation: `${rotation} 5s linear infinite`,
            display: 'inline-block'
          }}
        >
          ♥
        </Typography>
        <Typography 
          sx={{ 
            color: '#0288d1', 
            fontSize: '2rem', 
            fontWeight: 'bold',
            animation: `${rotation} 5s linear infinite reverse`,
            display: 'inline-block'
          }}
        >
          +
        </Typography>
        <Typography 
          sx={{ 
            color: '#0d47a1', 
            fontSize: '2rem', 
            fontWeight: 'bold',
            animation: `${rotation} 5s linear infinite`,
            display: 'inline-block'
          }}
        >
          ⚙
        </Typography>
      </Box>
    </AnimationContainer>
  );
};

export default LoadingAnimation;
