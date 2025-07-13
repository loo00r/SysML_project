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

const TabsContainer = styled(Box)<{ hasScrolling?: boolean }>(({ theme, hasScrolling }) => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: 48,
  overflow: 'hidden', // Hide overflow to prevent tabs from extending beyond container
  padding: theme.spacing(0.5, 1),
  width: '100%', // Take full width of parent container
  position: hasScrolling ? 'relative' : 'static', // For positioning the fixed add button only when needed
}));

const StyledTabs = styled(Tabs)<{ tabCount: number }>(({ theme, tabCount }) => {
  // Calculate adaptive width based on tab count - optimized for max 9 visible tabs
  const getTabWidth = () => {
    if (tabCount <= 5) return { minWidth: 140, maxWidth: 180 };
    if (tabCount <= 7) return { minWidth: 110, maxWidth: 140 };
    if (tabCount <= 9) return { minWidth: 90, maxWidth: 110 };
    // When more than 9 tabs, use scrolling with fixed smaller width
    return { minWidth: 80, maxWidth: 100 };
  };
  
  const { minWidth, maxWidth } = getTabWidth();
  
  return {
    minHeight: 40,
    flex: tabCount > 9 ? 1 : 'none', // Use flex: 1 only when scrolling, otherwise fit content
    overflow: 'hidden', // Ensure tabs don't overflow container
    paddingRight: tabCount > 9 ? '48px' : 0, // Reserve space for add button only when scrolling
    '& .MuiTabs-indicator': {
      backgroundColor: theme.palette.primary.main,
    },
    '& .MuiTab-root': {
      minHeight: 40,
      textTransform: 'none',
      fontSize: tabCount > 9 ? '0.65rem' : '0.75rem',
      fontWeight: 500,
      padding: theme.spacing(0.5, 0.5),
      minWidth: minWidth,
      maxWidth: maxWidth,
    },
    '& .MuiTabs-flexContainer': {
      gap: theme.spacing(0.25),
    },
    '& .MuiTabs-scrollButtons': {
      width: 32,
      '&.Mui-disabled': {
        opacity: 0.3,
      },
    },
    '& .MuiTabs-scroller': {
      overflow: 'hidden !important', // Force hide overflow
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

const FixedAddButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  padding: 6,
  minWidth: 32,
  height: 32,
  zIndex: 1000,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 4,
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
      type: 'bdd',
      nodes: [],
      edges: [],
      description: ''
    });
  };

  if (openDiagrams.length === 0) {
    return (
      <TabsContainer hasScrolling={false}>
        <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>
          No diagrams
        </Typography>
        
        {/* Inline add button for empty state */}
        <AddButton onClick={handleAddTab} aria-label="Add new diagram">
          <AddIcon fontSize="small" />
        </AddButton>
      </TabsContainer>
    );
  }

  return (
    <TabsContainer hasScrolling={openDiagrams.length > 9}>
      <StyledTabs
        tabCount={openDiagrams.length}
        value={activeDiagramId || false}
        onChange={handleTabChange}
        variant={openDiagrams.length > 9 ? "scrollable" : "standard"}
        scrollButtons={openDiagrams.length > 9 ? "auto" : false}
        allowScrollButtonsMobile={openDiagrams.length > 9}
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
      
      {/* Conditional add button positioning */}
      {openDiagrams.length > 9 ? (
        /* Fixed add button when scrolling */
        <FixedAddButton onClick={handleAddTab} aria-label="Add new diagram">
          <AddIcon fontSize="small" />
        </FixedAddButton>
      ) : (
        /* Inline add button when no scrolling */
        <AddButton onClick={handleAddTab} aria-label="Add new diagram">
          <AddIcon fontSize="small" />
        </AddButton>
      )}
    </TabsContainer>
  );
};

export default DiagramTabs;