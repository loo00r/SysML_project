# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

