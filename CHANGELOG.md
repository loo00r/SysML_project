# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/satoro/SysML_project/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/satoro/SysML_project/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/satoro/SysML_project/releases/tag/v1.1.0