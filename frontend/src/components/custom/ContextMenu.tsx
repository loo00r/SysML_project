import React from 'react';
import styled from 'styled-components';

interface Position {
  x: number;
  y: number;
}

const MenuContainer = styled.div<{ position: Position }>`
  position: fixed;
  left: ${props => props.position.x}px;
  top: ${props => props.position.y}px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 160px;
`;

const MenuItem = styled.div<{ isDestructive?: boolean }>`
  padding: 8px 12px;
  cursor: pointer;
  color: ${props => props.isDestructive ? '#ff4d4f' : 'inherit'};
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid #f0f0f0;
  }
`;

const Shortcut = styled.span`
  color: #999;
  font-size: 12px;
  margin-left: auto;
`;

interface ContextMenuProps {
  position: Position;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
}) => {
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu')) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <MenuContainer position={position} className="context-menu">
      <MenuItem onClick={onEdit}>
        <span>✏️ Edit</span>
        <Shortcut>E</Shortcut>
      </MenuItem>
      <MenuItem onClick={onDuplicate}>
        <span>📋 Duplicate</span>
        <Shortcut>Ctrl+D</Shortcut>
      </MenuItem>
      <MenuItem onClick={onDelete} isDestructive>
        <span>🗑️ Delete</span>
        <Shortcut>Del</Shortcut>
      </MenuItem>
    </MenuContainer>
  );
};

export default ContextMenu;