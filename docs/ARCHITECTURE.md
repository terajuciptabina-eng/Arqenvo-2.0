# ARQENVO 2.0 — Initial Architecture

**Status:** Proposed architecture; implementation choices remain subject to prototypes and ADR approval.

## 1. Architectural constraints

- Browser-first application.
- Desktop and mobile browser interaction, including Safari on iPad/iPhone.
- Semantic BIM model is the source of design intent.
- Geometry kernel is replaceable behind a stable adapter.
- 2D, 3D and documentation derive from a consistent project model.
- Heavy geometry work must not block interaction; evaluate Web Workers/WASM.
- Persistence and editing must support transactions, undo/redo and recovery.

## 2. Logical layers

### A. Application shell
Owns application lifecycle, workspace composition, routing between project views, device capabilities and global commands. It must not own geometry algorithms.

### B. Presentation and interaction
Owns Toolbox, Navigator, Info Box, contextual toolbar, Pet Palette, selection presentation, pointer/touch/keyboard input and tool state machines. UI components call application commands rather than mutating BIM objects directly.

### C. Application services
Coordinates commands and use cases: create element, modify element, connect walls, host opening, regenerate representation, change story, save project and publish layout.

### D. BIM domain model
Owns semantic elements, stable IDs, parameters, attributes, stories, relationships, constraints and project state. It must not depend on a particular rendering library or geometry kernel.

### E. Geometry services and kernel adapter
Owns unit conversion, geometric validation, profiles, intersections, joins, Boolean requests, topology checks and derived representations. The adapter isolates vendor-specific kernel APIs.

### F. Representation and rendering
Owns 2D drawing representations, 3D meshes/B-rep display, selection overlays, annotation rendering and viewport camera state. Rendering output is not the authoritative BIM model.

### G. Persistence and infrastructure
Owns project serialization, local storage, autosave, recovery, file exchange, future cloud sync and collaboration transport.

## 3. Data flow

1. User interaction is translated into a typed command.
2. Application service validates command and permissions.
3. BIM domain state is updated within a transaction.
4. Affected relationships and geometry dependencies are identified.
5. Geometry services compute or request derived geometry.
6. Domain and derived representations are committed atomically, or the transaction is rolled back.
7. 2D/3D/documentation views are invalidated and refreshed.
8. Undo/redo history and persistence receive the committed change.

A failed geometry operation must not leave a partially modified project.

## 4. Semantic element model

Every element should have, as appropriate:
- Stable element ID.
- Element type and schema version.
- Story/building context.
- Typed parameters and attributes.
- Placement/reference geometry.
- Host and dependent relationships.
- Classification and layer.
- Derived 2D and 3D representation references.
- Revision/change metadata.

Do not store only a triangle mesh for a wall, door, window or other semantic BIM element. Meshes are derived display/analysis products.

## 5. Relationship graph

Represent explicit relationships such as:
- Wall-to-wall connection/junction.
- Door/window-to-host-wall.
- Opening-to-host-element.
- Slab-to-boundary and hosted openings.
- Element-to-story.
- Dimension-to-referenced elements.
- Drawing-to-view and layout.
- Dependent geometry and update propagation.

Relationship updates must be deterministic and transaction-safe.

## 6. Geometry kernel boundary

Define an internal adapter contract before choosing a kernel. It should cover:
- 2D points, vectors, curves and profiles.
- 3D points, vectors, planes and transforms.
- Curve/profile operations.
- Extrusion and sweep.
- Boolean operations.
- Intersection and projection.
- Topology validity and healing where supported.
- Bounding boxes and measurements.
- Serialization or reproducible reconstruction of kernel data.

Do not expose raw kernel-specific classes in the BIM domain model.

The kernel may be supplemented by ARQENVO-specific BIM algorithms. In particular, wall connection priorities, hosted openings and parametric relationships are application-domain responsibilities and must not be assumed to emerge automatically from a generic solid kernel.

## 7. Units and coordinates

- Define one canonical internal length unit and document it. Millimetres are the current preferred project unit.
- Keep display units configurable.
- Define project origin, local element coordinates, world coordinates and story elevation rules.
- Define angular units and tolerances.
- Avoid repeated lossy conversions.
- Define numeric precision and geometric tolerance policy before kernel integration.

## 8. Browser and mobile execution

Evaluate:
- Web Workers for geometry and other CPU-heavy work.
- WebAssembly for candidate kernels.
- OffscreenCanvas only where browser support and architecture justify it.
- Pointer Events with explicit mouse, pen and touch handling.
- Keyboard shortcuts plus mobile-accessible equivalents.
- Safari/iPad memory and performance constraints.
- Progressive loading and recovery from worker failure.

No feature may assume a physical keyboard or hover-only input.

## 9. Rendering

Three.js is a candidate renderer, not a geometry authority. The renderer consumes derived representations. Keep rendering IDs mapped to semantic element IDs so selection and editing remain BIM-aware.

## 10. Persistence

Start with a versioned project schema and deterministic serialization. IndexedDB is a candidate for browser-local storage. Define migrations, autosave, recovery and import/export before treating the format as stable.

## 11. Decisions still open

- Geometry kernel and adapter details.
- Exact frontend/state-management libraries.
- 2D rendering strategy.
- Project file container and serialization.
- Collaboration protocol and server architecture.
- Authentication and cloud persistence.
- Deployment and release pipeline.

Each must be resolved by a prototype or documented ADR, not assumption.
