import React, { useState, useEffect } from 'react';
import { FaCheck } from 'react-icons/fa';

interface AutosaveIndicatorProps {
  onIterate?: () => void;
  isVisible: boolean;  // Add isVisible prop
}

export const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({ onIterate, isVisible }) => {
  const [showIteratePrompt, setShowIteratePrompt] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowIteratePrompt(true);
      // Don't auto-hide when showing iterate prompt
      if (!showIteratePrompt) {
        const timer = setTimeout(() => {
          setShowIteratePrompt(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, showIteratePrompt]);

  const handleIterate = () => {
    if (onIterate) {
      onIterate();
    }
    setShowIteratePrompt(false);
  };

  const handleClose = () => {
    setShowIteratePrompt(false);
  };

  if (!isVisible) return null;

  return (
    <div className="autosave-indicator">
      <FaCheck className="indicator-icon" />
      <span className="indicator-text">All changes saved</span>
      {showIteratePrompt && (
        <>
          <span className="indicator-text">Continue to iterate?</span>
          <button className="iterate-button" onClick={handleIterate}>
            Continue
          </button>
          <button className="iterate-button" onClick={handleClose} style={{ backgroundColor: '#666' }}>
            Close
          </button>
        </>
      )}
    </div>
  );
};