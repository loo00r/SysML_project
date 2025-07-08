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
  display: 'flex',
  alignItems: 'center',
  minHeight: 48,
  overflow: 'visible',
  padding: theme.spacing(0.5, 1),
  maxWidth: 'calc(100vw - 400px)', // Leave space for sidebar and other UI
}));

const StyledTabs = styled(Tabs)<{ tabCount: number }>(({ theme, tabCount }) => {
  // Calculate adaptive width based on tab count
  const getTabWidth = () => {
    if (tabCount <= 6) return { minWidth: 120, maxWidth: 180 };
    if (tabCount <= 10) return { minWidth: 90, maxWidth: 120 };
    if (tabCount <= 14) return { minWidth: 70, maxWidth: 90 };
    return { minWidth: 50, maxWidth: 70 };
  };
  
  const { minWidth, maxWidth } = getTabWidth();
  
  return {
    minHeight: 40,
    flex: 1,
    '& .MuiTabs-indicator': {
      backgroundColor: theme.palette.primary.main,
    },
    '& .MuiTab-root': {
      minHeight: 40,
      textTransform: 'none',
      fontSize: tabCount > 14 ? '0.65rem' : '0.75rem',
      fontWeight: 500,
      padding: theme.spacing(0.5, 0.5),
      minWidth: minWidth,
      maxWidth: maxWidth,
    },
    '& .MuiTabs-flexContainer': {
      gap: theme.spacing(0.25),
    },
    '& .MuiTabs-scrollButtons': {
      '&.Mui-disabled': {
        opacity: 0.3,
      },
    },
  };
});

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
  margin: theme.spacing(0, 0.5),
  padding: 6,
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
        <CloseIcon fontSize="inherit" sx={{ fontSize: '14px' }} />
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
        <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>
          No diagrams
        </Typography>
        <AddButton onClick={handleAddTab} aria-label="Add new diagram">
          <AddIcon fontSize="small" />
        </AddButton>
      </TabsContainer>
    );
  }

  return (
    <TabsContainer>
      <StyledTabs
        tabCount={openDiagrams.length}
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
        <AddIcon fontSize="small" />
      </AddButton>
    </TabsContainer>
  );
};

export default DiagramTabs;