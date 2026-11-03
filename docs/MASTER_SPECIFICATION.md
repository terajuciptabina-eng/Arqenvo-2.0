# ARQENVO 2.0 — Master Technical Specification

## 1. Product objective

Develop a new, independent, browser-based CAD/BIM application. Graphisoft Archicad 29 is the primary behavioural and workflow reference.

The first product objective is the closest technically achievable functional parity with the reference workflows. Improvements and new capabilities follow only after the corresponding baseline behaviour is implemented and validated.

“100% mimic” is the product ambition for observable user-facing workflows and results, not a claim that proprietary internal implementation can or should be copied. Some internal behaviours may be inaccessible or protected; gaps must be recorded honestly.

## 2. Project boundaries

- Greenfield codebase; do not use the existing ARQENVO source as the foundation.
- Existing ARQENVO repository and production site remain untouched.
- Independent implementation; do not copy Graphisoft proprietary source, protected assets or confidential materials.
- Use lawful observation, user-owned installation, documented developer APIs and permitted runtime/static analysis.
- Do not bypass licensing, authentication, access controls or anti-tamper protections.

## 3. Product principles

1. Observe before specifying.
2. Specify before implementing.
3. BIM design intent is authoritative; geometry is derived.
4. A BIM element remains a semantic element, not merely a mesh.
5. Maintain one coherent project model for plan, 3D and documentation.
6. Deterministic geometry and explicit tolerances.
7. Root-cause engineering; no patch stacking.
8. Regression tests for every accepted behaviour.
9. Desktop, iPad and iPhone are supported product targets.
10. Do not call a tool complete because its interface renders; validate behaviour, geometry and relationships.

## 4. Functional scope

### Workspace and interaction
- Toolbox, Navigator, Info Box, contextual toolbar and Pet Palette.
- Selection, multi-selection, marquee selection and element highlighting.
- Drag, rotate, mirror, offset, stretch, trim, extend, split and other reference workflows.
- Snap points, guides, trackers, constraints and coordinate input.
- Pick Up and Inject parameter workflows.

### Architectural elements
- Walls: straight, curved and other reference-supported geometry methods; reference line, thickness, height, joins and connections.
- Doors and windows: anchors, host relationships, openings, parameter changes and host updates.
- Slabs: boundaries, holes, elevation, thickness and editing.
- Beams and columns: placement, geometry, parameters and relationships.
- Roofs: reference geometry, planes, edges, joins and editing.
- Grids and other construction aids.

### Documentation
- Floor plans, sections, elevations and details.
- Dimensions, labels, text and annotations.
- Associativity and update behaviour.
- Views, drawing placement, scales and layout organisation.
- Layout Book, master layouts, title blocks and PDF publishing.

### Project management
- Stories, layers, attributes, classifications and project settings.
- Persistent element identity and relationships.
- Save, autosave, recovery, undo and redo.
- Import/export and project versioning.
- Collaboration and conflict handling, after core single-user reliability.

### Viewports
- 2D plan/documentation viewport.
- 3D model viewport.
- Synchronized model changes and selection.
- Camera navigation and element interaction.

## 5. Core engineering subsystems

- Application shell and responsive workspace.
- Tool and interaction framework.
- BIM domain model and relationship graph.
- Geometry-kernel adapter and geometry services.
- 2D representation and documentation.
- 3D representation and rendering.
- Project persistence and transactions.
- Layout and publishing.
- Collaboration services.
- Automated testing and reference validation.

## 6. Functional parity evidence

Every parity claim must be supported by a reference scenario containing:
- Archicad version and environment.
- Preconditions and project settings.
- Exact user action sequence.
- Expected UI state and interaction.
- Expected semantic element state.
- Expected 2D and 3D result.
- Relevant dimensions and tolerances.
- Observed differences and limitations.
- ARQENVO test case and result.

A parity item is not accepted on visual resemblance alone.

## 7. Milestones

- M0: repository, specifications, rules and investigation plan.
- M1: Archicad 29 reference investigation and geometry-kernel evaluation.
- M2: core coordinate model, semantic BIM schema and transaction model.
- M3: workspace, selection, snapping and tool framework.
- M4: wall geometry, junctions and wall relationships.
- M5: hosted openings, doors and windows.
- M6: slabs, beams, columns, roofs, dimensions and remaining tools.
- M7: documentation, Layout Book and publishing.
- M8: project reliability, collaboration and platform validation.
- M9: functional parity review.
- M10: post-parity improvements.

Milestone order may be refined only through documented architecture decisions and evidence.

## 8. Technology policy

The application is browser-based. React, TypeScript, Vite, Three.js, WebAssembly and Web Workers are candidates, not yet all binding decisions.

Geometry kernel selection is explicitly deferred. Evaluate at minimum:
- Open CASCADE Technology / OpenCascade.js.
- OpenGeometry.
- Manifold.
- brepjs.

The final selection must consider geometric robustness, B-Rep/topology capabilities, Boolean operations, editability, performance, memory, bundle size, Safari/iOS support, WebAssembly integration, maintenance, license obligations and commercial distribution.

## 9. Acceptance and change control

- Keep a written acceptance checklist per subsystem.
- Record architecture decisions in ADR files.
- Record reference observations separately from assumptions.
- Do not silently change accepted behaviour.
- Do not introduce unrelated improvements during parity work.
- Preserve reproducible tests and reference files.
- Do not enable production deployment until explicitly approved.
