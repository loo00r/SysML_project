import React from 'react';
import styled from 'styled-components';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
`;

const App: React.FC = () => {
  return (
    <AppContainer>
      <Sidebar />
      <Canvas />
    </AppContainer>
  );
};

export default App;