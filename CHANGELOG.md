# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.43] - 2025-07-19

### Fixed
- Fixed IBD cross-contamination between independent diagrams by implementing diagram-specific IBD storage keys
- IBD diagrams are now isolated per parent diagram using `ibd-for-{parentDiagramId}-{blockId}` format
- Manual IBDs no longer appear on other diagrams with similar block IDs

### Added
- Added source tracking ('ai' | 'manual') to IBD creation for better data management
- Enhanced IBD existence checking to use parent diagram context for proper isolation
- Improved RAG cleaning to distinguish between manual and AI-created IBD content

### Changed
- Updated all node components (BlockNode, SensorNode, ProcessorNode) to use diagram-scoped IBD checking
- Modified `openIbdForBlock` function to create diagram-specific IBD instances
- Enhanced `cleanDiagramForRAG` to filter only manual IBDs while preserving future AI-created IBDs

## [1.1.42] - 2025-07-19

### Fixed
- Fixed RAG contamination where manually created IBD data was influencing AI diagram generation
- Implemented diagram cleaning function to remove IBD-specific content before saving to RAG database
- Added filtering to exclude IBD blocks, IBD edges, and IBD-related properties from RAG context
- AI generation now maintains clean BDD-only examples regardless of manual IBD creation

### Changed
- Enhanced diagram saving logic to always store clean BDD diagrams in RAG database
- Updated RAG storage to force 'bdd' diagram type for consistency
- Improved IBD isolation by preventing IBD contamination of training data

## [1.1.41] - 2025-07-19

### Fixed
- Fixed AI Diagram Generator incorrectly setting diagram_type for RAG requests 
- Changed persistence storage from localStorage to sessionStorage for session-only data retention
- AI Generator now correctly requests 'bdd' diagram type instead of complex conditional logic
- Diagrams now clear when browser is fully closed and reopened, maintaining clean state between sessions

### Changed
- Updated useAIGeneration to always generate BDD diagrams with correct diagram_type parameter
- Enhanced data persistence to use sessionStorage for better session management
- Improved user experience by preventing unwanted IBD creation from AI Generator

## [1.1.40] - 2025-07-19

### Fixed
- Isolated RAG context by diagram type to prevent unwanted IBD generation when requesting BDD diagrams
- Removed fallback logic in RAG system that would search all diagram types when specific type wasn't found
- Enhanced semantic search to strictly enforce diagram type filtering without compromising type isolation
- BDD generation with RAG now only uses BDD examples as context, preventing automatic IBD creation

### Changed
- Updated find_similar_diagrams function to enforce strict diagram type filtering
- Modified RAG router to maintain type isolation instead of falling back to cross-type searches
- Improved logging for better debugging of RAG type filtering behavior

## [1.1.39] - 2025-07-19

### Added
- Implemented diagram state persistence on page reload using Zustand persist middleware
- All open diagrams, active tab, and workspace state now automatically save to localStorage
- Complete workspace restoration after browser refresh or navigation
- Automatic state synchronization on any diagram changes (nodes, edges, tabs)

### Changed
- Enhanced Zustand store to persist openDiagrams, activeDiagramId, and diagramsData
- Added onRehydrateStorage handler to restore computed state from active diagram
- Improved user experience by preventing data loss on page reload

## [1.1.38] - 2025-07-19

### Changed
- Updated "Diagram Types" section in sidebar to include both Block Definition Diagram (BDD) and Internal Block Diagram (IBD)
- Added IBD description: "Shows internal structure of a block"
- Modified "Help" section to remove keyboard shortcuts and provide clearer Delete key guidance
- Replaced "Use keyboard shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Delete (Remove selected)" with "Use 'Delete' key to remove selected elements"

## [1.1.37] - 2025-07-15

### Fixed
- Fixed edge types to use smoothstep for BDD diagrams and straight for IBD diagrams
- Restored proper curved connections for BDD blocks while maintaining straight lines for IBD blocks
- BDD diagrams now have proper smooth corners again while IBD keeps straight animated lines

## [1.1.36] - 2025-07-15

### Fixed
- Removed white background square from center of IBD animated lines
- Added comprehensive CSS rules to hide all background elements from IBD edge labels
- IBD connection lines now display cleanly without any background interference

## [1.1.35] - 2025-07-15

### Fixed
- Removed white background from IBD edge label text for cleaner visual appearance
- IBD connection labels now display without background rectangle

## [1.1.34] - 2025-07-15

### Fixed
- Fixed IBD connection line deviation - lines now render as perfectly straight instead of curved
- Corrected edge type from 'smoothstep' to 'straight' for IBD diagrams to eliminate downward curve

### Added
- Added 'IBD Blocks' text label to IBD connection lines
- Positioned label above the line with proper alignment (end of text at center)

### Changed
- Updated IBD edge creation logic to apply appropriate styling based on diagram type
- Enhanced CSS styling for IBD edge labels with consistent positioning

## [1.1.33] - 2025-07-14

### Fixed
- Fixed IBD icon visibility logic in BDD blocks to persist after tab closure
- IBD existence check now considers both open diagrams and persistent storage data
- IBD icons now correctly show as "View IBD" state even when tab is closed
- Added initial state saving to diagramsData when IBD is first created

### Changed
- Enhanced IBD existence detection in BlockNode, SensorNode, and ProcessorNode
- Updated icon display logic to check diagramsData in addition to openDiagrams
- Improved user experience by maintaining visual IBD indicators across tab operations

### Improved
- Better persistence of IBD creation state across interface operations
- More reliable IBD icon state management independent of tab status

## [1.1.32] - 2025-07-14

### Fixed
- Fixed critical IBD state persistence bug where diagrams were lost when tabs were closed
- Added proper state saving in `closeDiagram` method for IBD diagrams before removal
- Enhanced `setActiveDiagram` to save current IBD state before switching to another diagram
- Improved persist middleware configuration to only save essential `diagramsData`
- Ensured IBD diagrams maintain their state across tab closures and reopenings

### Changed
- Modified localStorage persistence to focus on `diagramsData` only, preventing conflicts
- Enhanced diagram state management with proactive saving during tab operations
- Improved IBD workflow reliability for better user experience

## [1.1.31] - 2025-07-14

### Added
- Implemented persistent state system for IBD diagrams using Zustand store
- Added `diagramsData` field to store diagram states (nodes, edges, viewport) with diagram ID mapping
- Created `saveDiagramState` action for saving individual diagram states
- Added `openIbdForBlock` action for creating/opening IBD diagrams with deterministic IDs
- Integrated localStorage persistence using zustand persist middleware
- Auto-save functionality triggers on diagram changes for IBD diagrams

### Changed
- Updated IBD creation logic to use persistent state with `ibd-for-{blockId}` naming pattern
- Modified BlockNode, SensorNode, and ProcessorNode to use new `openIbdForBlock` action
- Enhanced store with automatic state persistence for IBD diagrams between sessions
- Improved IBD tab management with state restoration on reopening

### Fixed
- IBD diagram state now persists when tabs are closed and reopened
- Prevented loss of user progress when switching between IBD diagrams
- Ensured consistent IBD naming and state management across all node types

## [1.1.30] - 2025-07-14

### Fixed
- Fixed IBD block text color from green to black for consistency with BDD blocks
- IBD block titles now use black text (#000000) instead of green (#2e7d32)
- Enhanced visual consistency between BDD and IBD diagram elements

## [1.1.29] - 2025-07-14

### Changed
- Increased IBD animation speed by 25% for more dynamic visual feedback
- Animation duration reduced from 2s to 1.6s for faster dash movement
- Enhanced user experience with more responsive flow visualization

### Improved
- More engaging and lively animation for IBD diagram connections
- Better visual feedback for data flow direction in real-time

## [1.1.28] - 2025-07-14

### Added
- Animated dashed lines for IBD diagram connections showing flow direction
- CSS keyframe animation `dashFlow` for moving dash pattern from left to right
- Professional flow visualization without traditional arrow markers

### Changed
- Replaced static arrows with animated dashed lines in IBD diagrams
- IBD edges now use thicker lines (strokeWidth: 2) with dashed pattern (8 4)
- Enhanced visual indication of data/signal flow through animated dash movement

### Improved
- Better flow visualization in IBD diagrams with continuous animation
- More intuitive direction indication through animated dash progression
- Consistent gray color scheme maintained across both BDD and IBD diagrams

## [1.1.27] - 2025-07-14

### Fixed
- Fixed arrow visibility issues in IBD diagrams by switching to standard ReactFlow arrows
- Unified edge styling between BDD and IBD diagrams for better consistency
- Removed problematic custom SVG arrow markers that weren't displaying properly

### Changed
- IBD diagram edges now use the same gray color (#555) as BDD diagrams
- Simplified edge configuration to use single style for both diagram types
- Improved visual consistency across all diagram types

## [1.1.26] - 2025-07-14

### Fixed
- Restored arrow markers on IBD diagram connections that were missing
- Added custom SVG arrow markers for both IBD (black) and BDD (gray) diagrams
- Fixed markerEnd configuration with proper URL references to custom arrow definitions
- Ensured visual consistency between BDD and IBD connection arrows

### Added
- Custom SVG marker definitions for black and gray arrow heads
- Proper markerEnd configuration in defaultEdgeOptions for both diagram types

## [1.1.25] - 2025-07-14

### Fixed
- Fixed IBD block connection handles to use single centered handle per side
- Resolved connection routing issues caused by multiple overlapping handles
- Improved connection behavior with proper left (target) and right (source) handle positioning
- Eliminated erratic connection paths that went in wrong directions before connecting

### Changed
- Simplified IBD block handle configuration from 4 handles to 2 handles per block
- Left handle now serves as input (target), right handle as output (source)
- All handles are properly centered on their respective sides

## [1.1.24] - 2025-07-14

### Changed
- Improved IBD diagram readability with standardized black edge colors
- Modified IBD blocks to use exclusive horizontal connectivity (left and right sides only)
- Replaced top and bottom connection handles with side handles for cleaner horizontal flow
- Enhanced IBD block design with multiple connection points per side (30% and 70% positions)
- Added support for both source and target connections on each side of IBD blocks

### Improved
- Better visual consistency between BDD and IBD diagrams with uniform edge styling
- Cleaner diagram layouts with horizontal connection patterns for IBD elements
- More flexible connectivity options for complex IBD structures

## [1.1.23] - 2025-07-14

### Changed
- Refined IBD behavior by removing "Create IBD" functionality from IBD nodes themselves
- IBD blocks can no longer create sub-IBD diagrams (only BDD blocks retain this capability)
- Implemented contextual locking for BDD elements in IBD diagrams
- System Block, Sensor, and Processor elements are now locked and grayed out in IBD diagrams
- Enhanced sidebar tooltips to explain element availability based on diagram context

### Fixed
- Prevented inappropriate element usage across different diagram types
- Ensured proper separation between BDD and IBD element functionality
- Improved user experience with clear visual indicators for locked elements

## [1.1.22] - 2025-07-14

### Added
- New IBD (Internal Block Diagram) Block node type with distinct green styling
- IBD blocks now available in sidebar with drag-and-drop functionality
- Conditional locking system for IBD blocks in Block Definition Diagrams (BDD)
- Visual indicators for locked/disabled IBD blocks when diagram type is BDD
- IBD blocks display grayed out appearance and disabled cursor when locked

### Changed
- Updated node type configuration to include IBD blocks in appropriate diagram types
- Enhanced sidebar with IBD block component featuring green color scheme
- Modified DiagramWorkspace to handle IBD node types in drop logic and minimap
- Added green color support (#4caf50, #e8f5e8) throughout the application for IBD nodes

### Fixed
- IBD blocks properly prevented from being dropped onto BDD diagrams
- Conditional rendering ensures IBD blocks are only functional in appropriate diagram contexts

## [1.1.21] - 2025-07-13

### Changed
- Realigned IBD icons from center-bottom to bottom-right corner of parent blocks
- Updated positioning for all three node types (Block, Sensor, Processor)
- IBD icons now use `right: 10px` instead of `left: 50%` to prevent overlapping with connection lines
- Removed `transform: translateX(-50%)` in favor of `transform: none` for cleaner positioning

### Fixed
- IBD icons no longer overlap with vertical connection lines drawn from bottom of blocks
- Improved visual clarity and professional appearance of diagram layouts
- Connection lines now have clear path without visual interference from IBD indicators

## [1.1.20] - 2025-07-13

### Changed
- Adjusted Sensor IBD icon color to lighter pink (#f792be) for better visual balance
- Reduced color saturation to prevent overpowering the interface design
- Improved overall visual harmony while maintaining sufficient visibility

## [1.1.19] - 2025-07-13

### Changed
- Updated Sensor IBD icon color from red (#ef4444) to pink (#ec4899) for better visual harmony
- Sensor IBD icons now use high visibility pink that avoids conflict with red node borders
- Improved visual coherence between Sensor nodes and their IBD indicators
- Block and Processor IBD icon colors remain unchanged for consistency

## [1.1.18] - 2025-07-13

### Improved
- Further enhanced IBD icon visibility by increasing saturation for Block and Sensor colors
- Block IBD icons now use highly saturated blue (#3b82f6) for optimal visibility
- Sensor IBD icons now use highly saturated red (#ef4444) for optimal visibility  
- Processor IBD icons remain unchanged (#fcd34d) as they already had perfect visibility
- All IBD icons now have consistent high visibility matching the Processor standard

### Changed
- Color consistency across all node types with uniform saturation levels
- Enhanced user experience with clearly visible IBD indicators on all node types

## [1.1.17] - 2025-07-13

### Improved
- Enhanced visibility of adaptive IBD icons with darker, more saturated colors
- Updated color palette for better contrast against white canvas background
- Block IBD icons now use richer blue (#93c5fd) instead of light blue
- Sensor IBD icons now use richer pink/red (#fca5a5) instead of light pink
- Processor IBD icons now use richer yellow/amber (#fcd34d) instead of light yellow

### Fixed
- Poor contrast issue with IBD icons being too light to see clearly
- Improved user experience with more visible icon indicators

## [1.1.16] - 2025-07-13

### Added
- Created adaptive color system for 'View IBD' icons that match their parent node colors
- New AdaptiveIbdIcon SVG component with customizable background colors
- Node-specific color mapping (Block: light blue, Sensor: light pink, Processor: light yellow)

### Changed
- Replaced static Article icons with dynamic AdaptiveIbdIcon in all node types
- IBD view icons now provide clear visual connection to their parent nodes
- Enhanced visual coherence between nodes and their internal diagrams

### Improved
- Better user experience with color-coded IBD indicators
- Consistent design language across all node types

## [1.1.15] - 2025-07-13

### Added
- Extended IBD (Internal Block Diagram) functionality to Sensor and Processor nodes
- All container-like nodes (Block, Sensor, Processor) now support IBD creation and viewing
- Consistent IBD trigger icons appear below all relevant node types
- Unified hover-to-reveal behavior for Add IBD functionality across all node types

### Changed
- SensorNode and ProcessorNode components now include complete IBD logic
- Replicated smart IBD indicator system from BlockNode to ensure consistent UX
- Enhanced modularity by applying identical IBD patterns to all container nodes

## [1.1.14] - 2025-07-13

### Fixed
- Fixed hover animation that caused View IBD icon to shift position during mouse hover
- Removed scale transform from view-ibd hover effect to keep icon stationary
- Improved icon stability and user interaction experience

## [1.1.13] - 2025-07-13

### Changed
- Refined View IBD icon visual style for better consistency with application design
- Removed blue background and border from persistent View IBD icon 
- Changed to transparent background with clean, minimal appearance
- Enhanced hover effects with brightness filter and subtle background
- Added smooth transitions for better user feedback

## [1.1.12] - 2025-07-13

### Added
- Implemented embedded IBD (Internal Block Diagram) functionality in frontend
- Added support for 'bdd' and 'ibd' diagram types in Zustand store
- Created smart IBD indicator icon below BlockNode components
- New IBD-specific node types: PortNode and ConnectionNode for Internal Block Diagrams
- Conditional rendering of node types based on active diagram type (BDD vs IBD)

### Changed
- Updated diagram type system to use lowercase conventions ('bdd', 'ibd')
- Enhanced BlockNode component with IBD trigger functionality
- Added visual indicator showing IBD existence status with hover-to-reveal behavior
- Fixed CSS hover trap issue preventing proper icon interaction
- Restructured component hierarchy to support extended hover areas

### Fixed
- Resolved hover trap where IBD trigger icon disappeared before users could click it
- Enhanced hover mechanics with proper container structure and CSS positioning
- Improved icon accessibility and interaction reliability

## [1.1.11] - 2025-07-09

### Fixed
- Fixed add tab button (+) positioning when tabs are present
- StyledTabs now uses flex: 'none' when less than 10 tabs to allow proper inline positioning
- Add button now appears directly adjacent to tabs instead of being pushed to the far right
- Only uses flex: 1 when scrolling is needed (10+ tabs) to maintain proper layout with fixed positioning

## [1.1.10] - 2025-07-09

### Changed
- Improved add tab button (+) behavior to match browser interface standards
- Add button now appears inline directly after tabs when less than 10 tabs are present
- When 10+ tabs trigger scrolling, add button automatically switches to fixed position
- Restored original AddButton styling for inline positioning
- Created FixedAddButton component for scrolling mode with enhanced styling
- TabsContainer now dynamically adjusts positioning based on scrolling state
- Enhanced user experience with contextual button positioning that adapts to tab count

## [1.1.9] - 2025-07-09

### Changed
- Redesigned add tab button (+) to match browser-like interface behavior
- Fixed add button position next to tabs with absolute positioning
- Add button now remains in fixed position when tab scrolling is activated (10+ tabs)
- Enhanced add button styling with background, border, and proper z-index
- Reserved space in tabs container (48px padding-right) to prevent overlap with add button
- Add button is now always active and accessible regardless of tab count

## [1.1.8] - 2025-07-09

### Added
- Restored bottom status panel showing diagram name, node count, and connection count
- Status panel positioned at bottom-left of canvas as in previous versions

### Fixed
- Missing status information display that was accidentally removed in previous updates

## [1.1.7] - 2025-07-09

### Changed
- Adjusted tab scrolling activation threshold from 10 tabs to 9 tabs for better space utilization
- Updated tab width calculation ranges: 1-5 tabs (large), 6-7 tabs (medium), 8-9 tabs (compact), 10+ tabs (minimal with scrolling)
- Modified font size threshold to activate smaller text at 9+ tabs instead of 10+ tabs
- Improved tab overflow prevention by activating scrolling earlier to maintain consistent layout

## [1.1.6] - 2025-07-09

### Fixed
- Tab overflow issue where 11th+ tabs would extend beyond interface boundaries into toolbar area
- Enhanced tab scrolling functionality to activate automatically when more than 10 tabs are present
- Improved tab width calculation for better space utilization with different tab counts

### Changed
- Increased gap between FloatingTabPanel and ToolbarPanel from 8px to 16px for better visual separation
- Updated FloatingTabPanel maxWidth calculation to prevent overlap with toolbar
- Modified DiagramTabs to use scrollable variant only when needed (>10 tabs)
- Optimized tab sizing: 5 tabs or fewer get larger width, 8-10 tabs get medium width, 10+ tabs use compact width with scrolling

## [1.1.5] - 2025-07-09

### Changed
- Restructured toolbar to be positioned horizontally alongside FloatingTabPanel instead of vertically below it
- Created TopContainer component to manage horizontal layout of tabs and toolbar
- Split FloatingTabPanel and ToolbarPanel into separate components for better layout control
- Enhanced tab scrolling functionality to prevent toolbar overlap when there are many diagrams
- Improved workspace layout with toolbar positioned on the right side of the tab panel

### Removed
- Bottom status panel showing diagram name and connection count
- Vertical toolbar layout from previous implementation

## [1.1.4] - 2025-07-09

### Changed
- Integrated toolbar directly into FloatingTabPanel component instead of separate workspace area
- Modified FloatingTabPanel to use column layout with tabs on top and toolbar below
- Added ToolbarRow component for consistent toolbar styling within the unified panel
- Enhanced workspace layout by combining diagram tabs and toolbar controls in single cohesive interface
- Toolbar buttons are now disabled when no diagram is active for better UX

## [1.1.3] - 2025-07-09

### Changed
- Moved toolbar from ReactFlow Panel to standalone component in upper part of DiagramWorkspace
- Positioned toolbar below floating tabs with full-width styling to match design specifications
- Enhanced toolbar visual integration with right-aligned buttons and consistent spacing
- Improved workspace layout by positioning toolbar in dedicated area above the canvas

## [1.1.2] - 2025-07-09

### Changed
- Relocated canvas toolbar from top to bottom of DiagramWorkspace component
- Toolbar now appears above the status bar for improved visual hierarchy
- Updated toolbar positioning to create a cleaner, more minimalist interface
- Enhanced user experience with more balanced layout focusing on the main diagram canvas

## [1.1.1] - 2025-07-08

### Added
- CHANGELOG.md file for tracking project changes
- Changelog maintenance instructions in CLAUDE.md
- Development workflow for version management and change tracking

### Changed
- Enhanced development documentation with changelog guidelines

## [1.1.0] - 2025-07-08

### Added
- Unified application versioning system
- Single source of truth for version management in .env file
- APP_VERSION and VITE_APP_VERSION environment variables
- Backend API endpoint `/api/v1/version/` for version retrieval
- Dynamic version display in frontend sidebar
- Docker build arguments for proper version embedding in frontend

### Changed
- FastAPI application now uses version from environment settings
- Frontend version display moved from bottom-right to sidebar (bottom-left)
- Updated Dockerfile to accept version as build argument
- Updated docker-compose.yml to pass version as build argument

### Removed
- Hardcoded version strings in frontend and backend
- Redundant VersionDisplay component in bottom-right corner

### Fixed
- Version display now correctly shows v1.1 instead of v1.0
- Proper environment variable handling during Docker build process

