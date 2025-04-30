import React, { Suspense } from 'react';
import styled from 'styled-components';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const LoadingFallback = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background: #f8f8f8;
  font-size: 16px;
  color: #666;
`;

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff4d4f' }}>
          Something went wrong. Please refresh the page.
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContainer>
        <Suspense fallback={<LoadingFallback>Loading...</LoadingFallback>}>
          <Sidebar />
          <Canvas />
        </Suspense>
      </AppContainer>
    </ErrorBoundary>
  );
};

export default App;