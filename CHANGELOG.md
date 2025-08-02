# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.79] - 2025-08-02

### Removed
- Removed unused 'Diagram Type' dropdown from AI Diagram Generator panel
- Removed unused 'Style' dropdown from AI Diagram Generator panel
- Cleaned up associated useState hooks and event handlers for removed dropdowns
- Removed unnecessary MUI imports (Select, MenuItem, FormControl, InputLabel, SelectChangeEvent)

### Changed
- Simplified AI Diagram Generator interface to show only functional controls
- Updated generateDiagram function call to remove unused style parameter
- Streamlined component props and state management

### Improved
- Cleaner and more focused AI generator UI with reduced visual clutter
- Smaller bundle size by removing unused MUI components
- Better user experience with simplified interface showing only relevant options
- Reduced code complexity and maintenance overhead

## [1.1.78] - 2025-08-02

### Fixed
- Fixed sidebar lock state synchronization for AI-generated diagrams
- IBD Block now correctly becomes disabled immediately after AI creates new BDD diagrams
- Enhanced IBD block locking logic to include both 'bdd' and 'bdd_enhanced' diagram types
- Resolved sidebar component not re-rendering in response to active diagram type changes

### Changed
- Updated Sidebar component to use direct state subscription for active diagram type
- Replaced computed state dependency with live state tracking for better reactivity
- Improved lock state logic to handle all BDD diagram variants consistently

### Improved
- Sidebar now instantly reflects the correct element availability when switching between tabs
- Better user experience with consistent element locking across manual and AI-generated diagrams
- Enhanced state management for real-time UI updates without manual refresh

## [1.1.77] - 2025-08-02

### Added
- Smart conditional centering system for new diagrams vs user-modified viewport states
- `needsCentering` flag to DiagramInstance interface for distinguishing auto-generated content
- `clearCenteringFlag` action to reset centering flag after fitView execution

### Fixed
- New AI-generated diagrams now properly center on canvas while preserving user viewport changes
- IBD diagrams from API and cache now automatically center when first opened
- Empty fallback IBD diagrams center correctly for better user experience

### Changed
- Enhanced diagram creation workflow with conditional fitView logic
- Added useEffect in DiagramWorkspace to handle smart centering with proper cleanup
- Updated AI generation and IBD creation to set needsCentering flag

### Improved
- Perfect balance between automatic centering for new content and viewport persistence for user modifications
- Better user experience with predictable diagram positioning behavior
- Clean separation of centering logic from viewport management

## [1.1.76] - 2025-08-02

### Fixed
- Removed automatic viewport centering when switching between diagram tabs
- Fixed ReactFlow TypeScript compatibility by reverting to supported API props
- Eliminated fitView auto-centering that was resetting user's custom zoom/pan positions

### Changed
- Reverted from `viewport`/`onViewportChange` to `defaultViewport`/`onMove` props for ReactFlow v11 compatibility
- Removed `fitView` prop to preserve user-defined viewport positions across tab switches

### Improved
- True viewport persistence - zoom and pan positions remain exactly as set when switching tabs
- Better user experience with preserved custom viewport states
- Enhanced diagram navigation workflow without unexpected viewport resets

## [1.1.75] - 2025-08-02

### Fixed
- Enforced strict viewport isolation with controlled React Flow component state
- Eliminated remaining viewport sharing between diagram tabs
- Fixed minimap sync issues with per-diagram viewport states

### Changed
- Converted React Flow from uncontrolled to controlled component pattern
- Replaced `defaultViewport` and `onMove` with `viewport` and `onViewportChange` props
- Enhanced viewport state management for instant and reliable restoration

### Improved
- Complete viewport isolation between BDD and IBD diagrams
- More reliable pan and zoom state persistence across tab switches
- Better React Flow component performance with controlled state pattern

## [1.1.74] - 2025-08-02

### Fixed
- Decoupled canvas viewport state between BDD and IBD diagrams
- Each diagram tab now maintains its own unique pan and zoom position
- Fixed issue where panning/zooming in one diagram affected all other open diagrams

### Changed
- Added `viewport` property to `DiagramInstance` interface for per-diagram viewport storage
- Added `onViewportChange` action to Zustand store for viewport state management
- Updated `DiagramWorkspace` component to use individual viewport states with React Flow key-based remounting

### Improved
- Better user experience with isolated viewport controls for each diagram
- Viewport state is now persisted and restored when switching between tabs
- Enhanced tabbed interface with proper viewport isolation

## [1.1.73] - 2025-07-30

### Fixed
- Implemented upsert logic for IBD storage to prevent duplicate database entries
- IBD generation now updates existing records instead of creating duplicates for the same block
- Eliminated database clutter from repeated AI generation on the same blocks

### Changed
- Added `get_ibd_by_parent_and_block` function to check for existing IBD records
- Added `update_ibd` function to update existing IBD nodes and edges
- Replaced IBD creation loops with upsert logic in both RAG and create-diagram endpoints
- Simplified `get_ibd_by_block_id` function to basic query without duplicate handling

### Improved
- Cleaner database with one IBD record per block within each parent diagram
- Better database performance by eliminating unnecessary duplicate rows
- More efficient IBD retrieval without complex duplicate resolution logic
- Enhanced debugging with print statements for IBD creation/update operations

## [1.1.72] - 2025-07-28

### Changed
- Implemented hybrid IBD edge label styling combining above-line positioning with opaque background
- IBD edge labels now positioned 15px above connection lines using translateY(-15px) transform
- Both label text and background moved together synchronously for perfect visual alignment
- Enhanced readability through combination of vertical offset and solid background

### Improved
- Optimal IBD label positioning that avoids interference with visual flow while maintaining perfect readability
- Synchronized movement of text and background elements preventing misalignment issues
- Clean appearance with labels floating above connection lines with solid opaque backgrounds
- Maximum clarity against any underlying grid or edge lines through hybrid approach

### Fixed
- Label positioning that combines the best aspects of above-line placement and opaque background coverage
- Consistent visual separation between labels and connection paths in all IBD diagrams
- Maintained stroke-width: 4px padding effect while adding vertical positioning transform

## [1.1.71] - 2025-07-28

### Changed
- Finalized IBD edge label styling with centered positioning and fully opaque background
- IBD edge labels now use ReactFlow's default centering for consistent placement on all connection orientations
- Enhanced background opacity with stroke-width: 4px for improved padding effect around label text
- Implemented clean "cutout" effect that completely obscures connection lines and background grid

### Fixed
- Consistent IBD label positioning that works for both horizontal and vertical connection lines
- Robust visual clarity through fully opaque background matching canvas color (#fafafa)
- Professional appearance with definitive styling that replaces all previous experimental approaches

### Improved
- Final, production-ready IBD edge label implementation with optimal readability
- Enhanced visual separation between label text and underlying diagram elements
- Maintained BDD label styling unchanged while perfecting IBD-specific appearance

## [1.1.70] - 2025-07-28

### Changed
- Repositioned IBD edge labels to start near source nodes instead of above connection lines
- IBD edge labels now use text-anchor: start alignment for better readability in complex diagrams
- Updated label positioning with translate(15px, -15px) to position near connection handle without overlapping nodes
- Enhanced label-to-source relationship for clearer visual association with originating components

### Improved
- Better readability for IBD diagrams with multiple outgoing edges from single nodes
- Reduced visual clutter by anchoring labels to their source nodes
- Professional appearance with clear source-to-target relationship indication
- Eliminated label overlap issues in complex multi-connection IBD layouts

## [1.1.69] - 2025-07-28

### Changed
- Repositioned IBD edge labels above connection lines instead of centered within them
- Removed opaque background from IBD edge labels for cleaner visual appearance
- IBD edge labels now display 15px above connection paths using CSS transform
- Enhanced label positioning with transparent background eliminating "cutout" effect

### Improved
- Cleaner aesthetic for IBD diagrams with labels positioned cleanly above connection lines
- Better visual separation between text labels and connection paths
- Maintained BDD label styling unchanged while updating only IBD edge labels
- Enhanced readability through improved label-to-line relationship

## [1.1.68] - 2025-07-27

### Fixed
- Made IBD edge label backgrounds fully opaque to eliminate faint visibility of connection lines and grid through background
- Added opacity: 1 to IBD edge label background CSS ensuring complete visual cutout effect

### Improved
- Clean and distinct "cutout" effect for IBD edge labels with no background bleeding
- Enhanced visual clarity by completely obscuring connection lines behind label backgrounds
- Professional appearance with solid white backgrounds that properly interrupt edge paths
- Maintained selective application only to IBD labels while preserving BDD label styling

## [1.1.67] - 2025-07-27

### Fixed
- Resolved IBD edge label text misalignment with its opaque background
- Removed overly specific CSS positioning rules that conflicted with ReactFlow's internal SVG text positioning
- IBD edge label text now perfectly centers within its background using ReactFlow's default mechanism

### Changed
- Simplified IBD edge label CSS by removing !important flags and explicit positioning attributes
- Removed transform: none, text-anchor: middle, and dominant-baseline: middle from IBD text styling
- Enhanced background styling with stroke-width: 2px for improved "padding" effect around text

### Improved
- Perfect horizontal and vertical centering of IBD edge label text within opaque backgrounds
- Clean "cutout" effect with text and background properly interrupting edge lines
- Better compatibility with ReactFlow's SVG text rendering system
- Eliminated text offset issues that made labels appear broken

## [1.1.66] - 2025-07-27

### Fixed
- Resolved CSS specificity conflict preventing IBD edge labels from centering on connection lines
- Removed conflicting CSS rules that positioned IBD labels above lines instead of in center
- IBD edge labels now properly render in the center of connection paths with opaque backgrounds

### Changed  
- Updated IBD edge label CSS selectors to use higher specificity (.react-flow__edge.ibd-edge)
- Added !important flags to ensure IBD label positioning rules take precedence
- Enhanced IBD label positioning with transform: none, text-anchor: middle, and dominant-baseline: middle

### Removed
- Conflicting CSS rules (.react-flow__edge.ibd-animated-edge .react-flow__edge-text) with translateY(-15px)
- Old background hiding rules that interfered with new opaque background implementation

### Improved
- IBD edge labels now correctly display in center of connection lines with cutout effect
- Better visual integration of labels with connection paths
- Eliminated positioning conflicts between old and new CSS rules

## [1.1.65] - 2025-07-27

### Changed
- Centered IBD edge labels for improved readability and professional appearance
- IBD edge labels now render in the center of connection paths instead of offset positioning
- Added opaque background (#fafafa) to IBD edge labels creating "cutout" effect on connection lines

### Removed
- Previous CSS transform rules that positioned IBD edge labels above connection lines
- text-anchor: start and transform: translate(15px, -15px) positioning for IBD edge labels

### Improved
- Enhanced visual integration of IBD edge labels with diagram flow
- Better text legibility through opaque backgrounds matching canvas color
- Cleaner, more professional appearance of IBD connection labels
- Connection lines now appear visually "interrupted" by label backgrounds for clear text readability

## [1.1.64] - 2025-07-27

### Fixed
- Removed dynamic edge routing logic from IBD diagrams that caused inconsistent connection styles
- All IBD connections now use consistent orthogonal (smoothstep) lines regardless of node count
- Eliminated conditional edge type selection that switched between straight and angled lines based on node count

### Changed
- Unified IBD edge styling to always use smoothstep type for consistent visual appearance
- Updated both manual connection creation (onConnect) and API-driven IBD generation to use consistent edge types
- Simplified edge type logic by removing node count-based conditional styling

### Improved
- Better visual consistency across all IBD diagrams with uniform connection styles
- Eliminated potential layout issues caused by mixed edge types in same diagram
- More predictable IBD connection behavior for users regardless of diagram complexity

## [1.1.63] - 2025-07-26

### Changed
- Radically increased horizontal spacing (rankSep: 350) for IBD diagrams to prevent node overlap
- Repositioned IBD edge labels to the start of connection lines instead of center position
- Enhanced edge label positioning with CSS transform for cleaner visual presentation

### Fixed
- Eliminated edge label overlap with nodes in IBD diagrams through aggressive horizontal spacing
- Improved label readability by moving labels away from the center of connection lines
- Better visual separation in complex IBD layouts with multiple interconnected components

## [1.1.62] - 2025-07-26

### Added
- Configurable spacing options for Dagre layout engine through applyDagreLayout function
- Enhanced spacing control with nodeSep and rankSep parameters for better IBD readability

### Changed  
- IBD diagrams now use increased spacing (nodeSep: 150, rankSep: 250) for better visual separation
- Updated dagreLayout.ts to accept spacing configuration options for flexible layout customization
- Enhanced IBD edge labels with solid background for improved readability and contrast

### Fixed
- IBD edge label overlap issues by adding solid background matching canvas color
- Text visibility improvements for IBD connection labels with enhanced contrast
- Better visual separation between IBD nodes preventing cluttered appearance

## [1.1.61] - 2025-07-24

### Changed
- Updated IBD diagrams to use horizontal Left-to-Right (LR) Dagre layout instead of vertical Top-to-Bottom (TB)
- IBD blocks now arrange horizontally to align with their left-to-right connection handles
- Enhanced layout logic to automatically select LR direction for IBD diagrams and TB direction for BDD diagrams
- Improved visual consistency between IBD block connections and their horizontal positioning

### Fixed
- IBD diagrams now properly utilize horizontal space with left-to-right component arrangement
- Better alignment between IBD block connection handles (left/right sides) and automatic positioning

## [1.1.60] - 2025-07-24

### Fixed
- Restored original simple Dagre positioning approach for AI-generated diagrams
- Eliminated chaotic positioning by reverting to proven Dagre TB (Top-Bottom) layout algorithm
- Applied consistent Dagre layout to both AI-generated and API-retrieved IBD diagrams
- Enhanced IBD edge label positioning to display near source blocks instead of center

### Changed
- Updated diagramStore.ts openIbdForBlock function to apply Dagre layout to API-retrieved IBDs
- Simplified positioning logic by removing complex semicircle algorithms in favor of clean vertical layouts
- Enhanced IBD edge labels with translateX(-30px) translateY(-15px) positioning and text-anchor: start

### Improved
- Clean vertical hierarchical layouts in all AI-generated diagrams
- Better visual organization with proper top-to-bottom element arrangement
- Consistent positioning approach across all diagram generation methods

## [1.1.59] - 2025-07-24

### Fixed
- Fixed AI-generated IBD edges that were hardcoded to use straight lines regardless of node count
- AI-generated IBD diagrams now properly use dynamic edge routing (straight for ≤2 nodes, angled for 3+ nodes)
- IBD edge type logic now works consistently for both manual connections and AI-generated diagrams

### Changed
- Updated AI edge transformation logic in diagramStore.ts to use dynamic type selection
- Enhanced consistency between manual and AI-generated IBD connection styles

## [1.1.58] - 2025-07-24

### Changed
- Implemented dynamic edge routing for IBD diagrams based on node count
- IBD connections now use straight lines when there are 2 nodes or fewer
- IBD connections automatically switch to angled lines (smoothstep) when there are 3 or more nodes
- Enhanced visual layout management for complex IBD diagrams with multiple components

### Improved
- Better connection routing that adapts to diagram complexity
- Cleaner visual appearance for simple 2-node IBD connections
- More organized layout for complex multi-node IBD diagrams

## [1.1.57] - 2025-07-24

### Fixed
- Fixed IBD rendering crash caused by conditional nodeTypes registration
- IBD nodes now always render with proper green styling instead of default white rectangles
- Eliminated application crashes when interacting with AI-generated IBD nodes
- ReactFlow now receives unified nodeTypes object with all components registered at all times

### Changed
- Unified nodeTypes object now statically includes BlockNode, SensorNode, ProcessorNode, PortNode, ConnectionNode, and IBDNode
- Removed conditional nodeTypes logic that caused race conditions between diagram types
- Enhanced IBD node type mapping with both 'ibd' and 'ibd_block' keys pointing to IBDNode component

## [1.1.56] - 2025-07-22

### Fixed
- Critical IBD edges not displaying in UI due to API response formatting bug
- IBD router incorrectly processing edges as relationships instead of preserving edges data
- Missing animated connections between IBD components despite correct AI generation and database storage
- DiagramPositioning incorrectly handling IBD edges through relationships field

### Changed
- IBD API endpoint now returns edges directly from database without transformation
- Removed incorrect edges-to-relationships mapping in IBD positioning logic
- Enhanced AI prompt with mandatory IBD connection rules and detailed examples
- Added bootstrap RAG examples with properly connected IBD components

### Added
- Comprehensive AI prompt rules for generating connected IBD components (Rules 8-12)
- Bootstrap seeding examples with 3-component IBD structures and multiple edge connections
- Debug logging for AI generation to track edges through the entire pipeline
- Enhanced one-shot examples demonstrating proper IBD edge structure

### Improved
- IBD diagrams now display animated dashed lines connecting internal components
- AI consistently generates 2-3 interconnected IBD components with meaningful connections
- Enhanced AI understanding of internal component relationships and data flow
- Better semantic accuracy in connection labels (Data Bus, Control Signals, Memory Access)

## [1.1.55] - 2025-07-21

### Fixed
- Critical data structure mismatch between API and ReactFlow causing "Cannot destructure property 'label'" error
- IBD nodes crashing application due to undefined data properties in React components
- API response format incompatibility where backend returned `name` field but frontend expected `data.label`
- Unsafe destructuring in all node components causing crashes when data was undefined

### Changed
- Added data transformation layer in openIbdForBlock to convert API format to ReactFlow format
- Enhanced all node components with safe destructuring and fallback values
- API nodes with `name` field now properly mapped to ReactFlow `data.label` structure
- Improved error handling with detailed logging for IBD opening process

### Added
- Comprehensive data transformation for IBD nodes from backend API format to ReactFlow format
- Safe destructuring patterns with fallback values in all node components (Block, Sensor, Processor, Port, Connection, IBD)
- Detailed logging of API data structure and transformation process for debugging
- Proper IBD edge formatting with animated dashed lines and IBD-specific styling

### Improved
- IBD diagrams now open successfully without "Something went wrong" errors
- All node types now handle undefined or malformed data gracefully
- Better user experience with meaningful fallback labels when data is missing
- Enhanced robustness of ReactFlow integration with backend-generated diagram data

## [1.1.54] - 2025-07-21

### Fixed
- Critical frontend nodeTypes registration bug causing IBD nodes to render as white blocks
- Race condition in conditional nodeTypes logic that crashed application when interacting with IBD nodes  
- Type mapping mismatch where backend generated `ibd_block` type nodes but frontend only registered `ibd` key
- ReactFlow rendering failures for IBD diagrams due to missing node component mappings

### Changed
- Unified nodeTypes object now includes all node components (Block, Sensor, Processor, Port, Connection, IBD)
- Removed conditional nodeTypes switching logic that caused race conditions between diagram types
- Added proper mapping of both `ibd` and `ibd_block` types to IBDNode component for backend compatibility
- Enhanced nodeTypes registration to prevent white block rendering issues

### Improved
- IBD nodes now render consistently with proper green styling and interactive functionality
- Eliminated application crashes when clicking or interacting with IBD nodes
- Better ReactFlow stability with unified component registration approach
- Enhanced compatibility between frontend node rendering and backend IBD generation

## [1.1.53] - 2025-07-21

### Fixed
- Critical IBD retrieval bug caused by duplicate block IDs in database from repeated AI testing
- Internal Server Error (500) when accessing IBD endpoint with duplicated parent_block_id records
- Empty IBD displays in UI due to failed API calls from database constraint violations
- CRUD function now resilient to duplicate data by retrieving most recent record for any given block ID

### Changed
- Updated `get_ibd_by_block_id` function to use `ORDER BY created_at DESC` with `first()` instead of `scalar_one_or_none()`
- Enhanced database query to handle multiple records gracefully by selecting the most recent IBD
- Improved error handling for IBD retrieval to prevent 500 errors from database duplicates

### Improved
- IBD endpoint now returns 200 OK with populated data even when duplicate block IDs exist in database  
- UI now properly displays populated IBDs instead of empty diagrams
- System stability enhanced with resilient database query patterns for duplicate scenarios
- Better handling of test data artifacts without affecting production functionality

## [1.1.52] - 2025-07-21

### Added
- Strengthened AI prompt with mandatory IBD population rule to eliminate empty internal diagrams
- Non-negotiable constraint (Rule #8) requiring populated nodes array when internal_diagram is created
- Enhanced AI instruction clarity to overcome hesitation in generating nested IBD content

### Fixed
- Empty IBD generation eliminated through explicit prompt engineering requiring at least one relevant component
- AI now consistently populates internal_diagram nodes based on user description content
- Enhanced diagram generation reliability with mandatory internal structure population

### Improved
- More reliable enhanced diagram generation with guaranteed populated IBDs when internal complexity is detected
- Consistent BDD connection generation between external components and complex blocks
- Better AI compliance with internal diagram creation requirements through explicit rule enforcement

### Changed
- BDD_ENHANCED_PROMPT_TEMPLATE now includes strict rule mandating non-empty IBD nodes arrays
- AI generation behavior now requires populated internal structures when creating internal_diagram objects
- Enhanced prompt engineering to ensure IBD content matches user description requirements

## [1.1.51] - 2025-07-21

### Added
- Refined RAG seeding system with exclusive ibd_block node typing for internal block diagrams
- Enhanced AI training examples that enforce consistent IBD visual design (green ibd_block styling)
- Flexible IBD component naming system that adapts to user prompt context

### Fixed
- IBD visual consistency by ensuring all internal components use ibd_block type instead of mixed types
- AI generation now properly follows established design patterns with green IBD block styling
- Context-aware component naming that reflects user descriptions (CPU, Memory Module, AI Decision Maker, etc.)

### Changed
- Refined seeding strategy to teach AI proper IBD structure with universal ibd_block typing
- Enhanced RAG examples now demonstrate flexible naming with consistent visual presentation
- Improved AI learning pattern for generating contextually appropriate IBD component names

### Improved
- Enhanced diagrams now generate visually consistent IBDs with proper green styling across all components
- Better semantic accuracy in IBD component naming based on user prompts
- Maintained functional correctness while achieving visual design consistency

## [1.1.50] - 2025-07-21

### Added
- RAG database seeding capability for enhanced diagram generation
- Temporary hardcoded example injection system for bootstrapping enhanced diagrams
- Successful seeding of first high-quality bdd_enhanced example into RAG database

### Fixed
- Chicken-and-egg problem where enhanced diagrams lacked populated IBD content due to missing RAG examples
- Enhanced diagram generation now produces properly populated internal block diagrams with meaningful components and connections
- RAG system now has quality examples for future enhanced diagram generation requests

### Changed
- Enhanced diagrams now benefit from seeded RAG examples, producing richer internal structures
- Post-seeding generations create complex IBDs with multiple interconnected components (processors, sensors, communication modules, power management units)
- Improved AI generation quality through strategic example seeding approach

## [1.1.49] - 2025-07-21

### Added
- Unified RAG endpoint supporting both 'bdd' and 'bdd_enhanced' diagram types
- Complete IBD parsing and storage logic integrated into RAG generation workflow
- Enhanced semantic search that leverages BDD examples for improved enhanced generation
- Single endpoint architecture eliminating duplicate generation logic

### Changed
- Simplified frontend to always use unified `/api/v1/rag/generate-diagram-with-context/` endpoint
- Enhanced RAG endpoint now handles both simple and complex diagram requests with contextual examples
- Improved AI generation consistency by using RAG context for all diagram types
- Streamlined request flow with unified parameter structure

### Removed
- Dependency on separate `/api/v1/create-diagram/` endpoint for enhanced generation
- Conditional endpoint selection logic in frontend useAIGeneration hook
- Code duplication between RAG and non-RAG generation paths

### Fixed
- Enhanced diagrams now properly benefit from RAG context, resulting in better populated nested IBDs
- Consistent diagram generation experience regardless of diagram complexity
- Unified error handling and response format across all generation types

## [1.1.48] - 2025-07-21

### Added
- Async IBD fetching functionality for AI-generated blocks with `has_ibd` flags
- Complete end-to-end IBD retrieval from backend API when blocks contain nested diagrams
- API-driven IBD loading with automatic fallback to manual creation if needed
- Enhanced IBD existence checking incorporating both manual creation and AI-generated flags

### Changed
- Updated `openIbdForBlock` function in diagramStore to be async and support API fetching
- Modified all node components (BlockNode, SensorNode, ProcessorNode) to handle async IBD operations
- Enhanced IBD detection logic to check both manual existence and `has_ibd` API flags
- Improved IBD opening workflow with priority: existing tabs > local storage > API fetch > manual creation

### Fixed
- TypeScript compilation issues with async function implementations
- Proper error handling for API calls during IBD fetching
- Fallback mechanisms when API endpoints return 404 for expected IBDs
- Integration between frontend IBD display and backend IBD storage

## [1.1.47] - 2025-07-21

### Added
- Enhanced BDD generation flow in frontend with "Generate with Internal Diagrams" toggle switch
- Material-UI Switch control in AIGeneratorPanel for enabling enhanced generation
- Support for `has_ibd` flag recognition in all node components (BlockNode, SensorNode, ProcessorNode)
- Automatic "View IBD" indicator display for AI-generated blocks with nested IBDs

### Changed
- Updated useAIGeneration hook to support both 'bdd' and 'bdd_enhanced' diagram types
- Enhanced API call logic to use new create-diagram endpoint for enhanced generation
- Modified node components to check both manual IBD existence and API-provided has_ibd flag
- AIGenerationOptions interface extended to include isEnhanced parameter

### Improved
- Seamless integration between enhanced AI generation and existing IBD functionality
- Better user experience with clear indication of blocks containing generated IBDs
- Maintained backward compatibility with existing manual IBD creation workflow
- Enhanced visual feedback for generated diagrams with nested internal structures

## [1.1.46] - 2025-07-21

### Added
- Complete API endpoints for BDD+IBD generation and retrieval
- New CRUD operations for Internal Block Diagrams in `app/crud/crud_ibd.py`
- Enhanced POST `/api/v1/create-diagram/` endpoint supporting both 'bdd' and 'bdd_enhanced' types
- New GET `/api/v1/diagrams/ibd/{parent_block_id}` endpoint for IBD retrieval
- Automatic parsing and separation of nested IBD data from AI responses
- Database storage of IBDs linked to parent BDD diagrams via foreign keys

### Changed
- Updated create_diagram endpoint to handle enhanced AI generation with nested IBDs
- Enhanced diagram parsing logic to extract internal_diagram objects and mark blocks with `has_ibd: true`
- DiagramRequest model now supports diagram_type parameter and diagram naming
- DiagramResponse model includes diagram_id for referencing stored diagrams

### Improved
- End-to-end flow for generating, parsing, storing, and retrieving enhanced diagrams
- Automatic positioning applied to both BDD and retrieved IBD diagrams
- Complete separation between BDD storage and IBD storage in database
- Enhanced error handling and database transaction management

## [1.1.45] - 2025-07-21

### Added
- New enhanced AI generation logic for BDD+IBD diagrams
- BDD_ENHANCED_PROMPT_TEMPLATE for comprehensive system diagrams with nested Internal Block Diagrams
- Support for 'bdd_enhanced' diagram type that can include internal_diagram structures within blocks
- Raw JSON response handling without automatic positioning for complex nested structures

### Changed
- Refactored generate_diagram function into generate_sysml_diagram with diagram_type parameter
- Enhanced AI prompt selection logic to choose appropriate template based on diagram_type ('bdd' or 'bdd_enhanced')
- Updated generation flow to return raw diagram data for later processing at API layer
- Maintained backward compatibility with legacy generate_diagram function

### Improved
- Better separation of concerns between AI generation and diagram processing
- More flexible AI generation system supporting both simple and complex diagram structures
- Enhanced prompt engineering for nested IBD creation within BDD context

## [1.1.44] - 2025-07-21

### Added
- New database schema for nested Internal Block Diagrams (IBDs)
- InternalBlockDiagram SQLAlchemy model with foreign key relationship to parent BDD diagrams
- Database table `internal_block_diagrams` for relational IBD storage
- Support for parent-child relationship between BDD diagrams and their IBDs via `parent_bdd_diagram_id`
- Block-specific IBD identification using `parent_block_id` field
- Source tracking for IBDs (AI-generated vs manual creation)
- Pydantic models (InternalBlockDiagramCreate, InternalBlockDiagramResponse) for API validation

### Changed
- Enhanced database architecture to avoid storing large JSON objects in parent diagrams
- Updated configuration to include DB_URL_SYNC for Alembic migrations
- Database schema now supports proper relational structure for nested diagram storage

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

