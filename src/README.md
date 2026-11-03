# Source code boundaries

The application source tree will be introduced after the architecture and geometry-kernel evaluation gates.

Planned domains:
- app: application composition and lifecycle.
- interface: workspace and UI components.
- tools: modelling/documentation tool implementations.
- interaction: input, selection, snapping and tool state machines.
- bim: semantic elements, parameters and relationships.
- geometry: kernel adapter and application geometry services.
- viewport: 2D/3D rendering and camera.
- documentation: views, annotations, layouts and publishing.
- project: project state, transactions and commands.
- storage: persistence, migration, autosave and recovery.

Do not create placeholder implementations that imply an unapproved architecture decision.
