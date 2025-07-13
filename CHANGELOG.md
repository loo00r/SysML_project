# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

