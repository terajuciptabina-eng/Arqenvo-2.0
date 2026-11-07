# ARQENVO 2.0 source boundaries

The first executable domain/geometry vertical slice is now implemented.

- `bim/model.mjs`: semantic walls, composites, openings and project validation.
- `geometry/vector.mjs`: deterministic 2D vector primitives.
- `geometry/junction-solver.mjs`: endpoint/interior classification, L/angled miter plans and T-branch cap plans; cross junctions explicitly require a later solid-union operation.
- `geometry/wall-derivation.mjs`: kernel-neutral per-skin prism and hosted-opening cut plans; project-level derivation applies L/angled miters and T-branch caps to skin footprints.
- `geometry/adapter-contract.mjs`: kernel adapter boundary; no candidate kernel is selected or imported by the domain layer.
- `bim/dependency-graph.mjs`: explicit wall/composite/opening/junction dependencies and transitive invalidation.
- `project/project-store.mjs`: atomic semantic transactions with undo/redo and dependency-aware invalidation.

All dimensions use millimetres and Z-up project coordinates. BIM semantics remain authoritative. Derived geometry is disposable and reproducible.

The current junction solver is an independent first-pass solver, not a claim of Archicad parity. Wall-priority rules, complex composites, curved junctions and library-part reveal profiles remain gated on further reference evidence.

- `app/main.mjs` and `app/app.css`: first responsive 2D browser workspace with basic and three-skin composite wall placement, draggable wall baseline endpoints, live L-junction-derived wall caps, hosted door/window placement, selection, wall/opening parameter editing, zoom/pan and undo/redo. This is an early plan-editor slice, not full CAD/BIM parity.
