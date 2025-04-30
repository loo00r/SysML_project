import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const EditableContainer = styled.div`
  position: relative;
  width: 100%;
  min-height: 20px;
`;

const TextDisplay = styled.div`
  cursor: text;
  padding: 2px 4px;
  border-radius: 2px;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 2px 4px;
  border: 1px solid #1890ff;
  border-radius: 2px;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  background: white;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 2px 4px;
  border: 1px solid #1890ff;
  border-radius: 2px;
  outline: none;
  font-size: inherit;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  background: white;
`;

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  multiline = false,
  placeholder = 'Click to edit',
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(value);
      setIsEditing(false);
    }
  };

  return (
    <EditableContainer className={className}>
      {isEditing ? (
        multiline ? (
          <TextArea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        ) : (
          <TextInput
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        )
      ) : (
        <TextDisplay onClick={handleClick}>
          {value || <span style={{ color: '#999' }}>{placeholder}</span>}
        </TextDisplay>
      )}
    </EditableContainer>
  );
};

export default EditableText;