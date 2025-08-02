import React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('🚨 [ErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [ErrorBoundary] Error details:', error);
    console.error('🚨 [ErrorBoundary] Error info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRefresh = () => {
    console.log('🔄 [ErrorBoundary] Refreshing page...');
    window.location.reload();
  };

  handleReset = () => {
    console.log('🔄 [ErrorBoundary] Resetting error boundary...');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            p: 4,
            backgroundColor: 'background.default',
          }}
        >
          <Alert severity="error" sx={{ mb: 3, maxWidth: '600px', width: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong!
            </Typography>
            <Typography variant="body2" paragraph>
              An error occurred while rendering the diagram workspace. This might be due to:
            </Typography>
            <ul>
              <li>Issues with diagram data or node rendering</li>
              <li>Network connectivity problems</li>
              <li>Browser compatibility issues</li>
            </ul>
            
            {this.state.error && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 1 }}>
                <Typography variant="caption" component="div" fontFamily="monospace">
                  <strong>Error:</strong> {this.state.error.message}
                </Typography>
                {this.state.error.stack && (
                  <Typography variant="caption" component="div" fontFamily="monospace" sx={{ mt: 1, wordBreak: 'break-all' }}>
                    <strong>Stack:</strong> {this.state.error.stack.split('\n').slice(0, 3).join('\n')}...
                  </Typography>
                )}
              </Box>
            )}
          </Alert>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshOutlined />}
              onClick={this.handleRefresh}
              color="primary"
            >
              Refresh Page
            </Button>
            <Button
              variant="outlined"
              onClick={this.handleReset}
            >
              Try Again
            </Button>
          </Box>

          <Typography variant="caption" sx={{ mt: 3, color: 'text.secondary' }}>
            Check the browser console for more detailed error information
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;