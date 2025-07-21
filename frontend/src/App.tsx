import React, { Suspense } from 'react';
import { ThemeProvider, createTheme, styled as muiStyled } from '@mui/material/styles';
import { Box, CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ReactFlowProvider } from 'reactflow';
import DiagramWorkspace from './components/DiagramWorkspace';
import Sidebar from './components/Sidebar';
import DiagramGeneratorNew from './components/DiagramGeneratorNew';
import ErrorBoundary from './components/ErrorBoundary';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#9c27b0',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

const AppContainer = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const WorkspaceArea = muiStyled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  height: '100%',
  overflow: 'hidden',
  minWidth: 0, // Allow flex shrinking
}));

const LoadingFallback = muiStyled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  backgroundColor: theme.palette.background.default,
  fontSize: '16px',
  color: theme.palette.text.secondary,
}));


const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <AppContainer>
          <Suspense fallback={
            <LoadingFallback>
              <CircularProgress />
              <Box ml={2}>Loading SysML Modeling Tool...</Box>
            </LoadingFallback>
          }>
            <Sidebar />
            <WorkspaceArea>
              <ReactFlowProvider>
                <DiagramWorkspace />
              </ReactFlowProvider>
            </WorkspaceArea>
            <DiagramGeneratorNew />
          </Suspense>
        </AppContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;