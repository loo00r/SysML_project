import React from 'react';

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl/⌘', 'Z'], description: 'Undo last action' },
    { keys: ['Ctrl/⌘', 'Shift', 'Z'], description: 'Redo last action' },
    { keys: ['Ctrl/⌘', 'S'], description: 'Save diagram' },
    { keys: ['?'], description: 'Show/hide keyboard shortcuts' },
    { keys: ['Delete'], description: 'Delete selected node' },
    { keys: ['Esc'], description: 'Cancel current action' }
  ];

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div className="keyboard-shortcuts-panel" onClick={e => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="shortcuts-list">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-item">
              <div className="shortcut-keys">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    <kbd>{key}</kbd>
                    {keyIndex < shortcut.keys.length - 1 && <span>+</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="shortcut-description">{shortcut.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsPanel;