import React from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  IconButton, 
  Typography, 
  styled 
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Add as AddIcon 
} from '@mui/icons-material';
import useDiagramStore from '../store/diagramStore';

const TabsContainer = styled(Box)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  alignItems: 'center',
  minHeight: 48,
  overflow: 'hidden',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  minHeight: 48,
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
  },
  '& .MuiTab-root': {
    minHeight: 48,
    textTransform: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: theme.spacing(0.5, 1),
    minWidth: 120,
    maxWidth: 200,
  },
}));

const TabContent = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
});

const TabLabel = styled(Typography)({
  fontSize: '0.875rem',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

const CloseButton = styled(IconButton)(({ theme }) => ({
  padding: 4,
  marginLeft: 4,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const AddButton = styled(IconButton)(({ theme }) => ({
  margin: theme.spacing(0, 1),
  padding: 8,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

interface DiagramTabProps {
  diagramId: string;
  label: string;
  onClose: (diagramId: string) => void;
}

const DiagramTab: React.FC<DiagramTabProps> = ({ diagramId, label, onClose }) => {
  const handleClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClose(diagramId);
  };

  return (
    <TabContent>
      <TabLabel>{label}</TabLabel>
      <CloseButton
        size="small"
        onClick={handleClose}
        aria-label={`Close ${label}`}
      >
        <CloseIcon fontSize="small" />
      </CloseButton>
    </TabContent>
  );
};

const DiagramTabs: React.FC = () => {
  const { 
    openDiagrams, 
    activeDiagramId, 
    setActiveDiagram, 
    closeDiagram, 
    openDiagram 
  } = useDiagramStore();

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveDiagram(newValue);
  };

  const handleCloseTab = (diagramId: string) => {
    closeDiagram(diagramId);
  };

  const handleAddTab = () => {
    const newDiagramName = `Diagram ${openDiagrams.length + 1}`;
    openDiagram({
      name: newDiagramName,
      type: 'BDD',
      nodes: [],
      edges: [],
      description: ''
    });
  };

  if (openDiagrams.length === 0) {
    return (
      <TabsContainer>
        <AddButton onClick={handleAddTab} aria-label="Add new diagram">
          <AddIcon />
        </AddButton>
      </TabsContainer>
    );
  }

  return (
    <TabsContainer>
      <StyledTabs
        value={activeDiagramId || false}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        {openDiagrams.map((diagram) => (
          <Tab
            key={diagram.id}
            value={diagram.id}
            label={
              <DiagramTab
                diagramId={diagram.id}
                label={diagram.name}
                onClose={handleCloseTab}
              />
            }
          />
        ))}
      </StyledTabs>
      <AddButton onClick={handleAddTab} aria-label="Add new diagram">
        <AddIcon />
      </AddButton>
    </TabsContainer>
  );
};

export default DiagramTabs;