import React from 'react';
import DiagramGeneratorNew from './DiagramGeneratorNew';

/**
 * This is a wrapper component that forwards to DiagramGeneratorNew.
 * We're keeping this file to maintain backward compatibility.
 */
interface DiagramGeneratorProps {
  onGenerate?: (text: string) => Promise<void>;
  onClear?: () => void;
}

const DiagramGenerator: React.FC<DiagramGeneratorProps> = (props) => {
  return <DiagramGeneratorNew {...props} />;
};

export default DiagramGenerator;