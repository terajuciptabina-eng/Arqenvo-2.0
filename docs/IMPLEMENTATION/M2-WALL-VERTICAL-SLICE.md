# M2 — Wall geometry vertical slice

**Status:** First kernel-neutral semantic and derivation layer implemented. Not yet an Archicad-parity claim.

## Implemented

- Semantic wall, composite and opening records with finite-value, dimensional, host and reference checks.
- Millimetre project coordinates, Z-up.
- Ordered composite skins with material identity and total-thickness closure.
- Straight-wall prism plans with center, left and right reference-line offsets.
- Door/window opening plans with center/left/right anchors, host-relative placement, sill elevation and through-skin cut extents.
- Deterministic pairwise junction classification for L, angled, T and cross intersections; L/angled miter and T branch-cap plans are applied to each composite skin footprint during project derivation.
- L/angled miter-point plans and T-branch cap plans; cross intersections explicitly require a later solid-union operation.
- Kernel adapter contract that keeps vendor-specific types outside the BIM domain.
- Atomic project transactions with undo/redo.
- Dependency graph: composite changes invalidate dependent walls; wall changes invalidate hosted openings and connected junction peers.
- Node built-in unit tests and GitHub Actions CI.

## Evidence boundary

The REA dossier review supports neighbour-aware wall adjustment, staged L-junction eligibility and end-domain checks, per-skin/material-aware composite processing, and a separate opening-to-cut-shape stage. The dossiers have unresolved calls and do not disclose the complete priority decision table.

The current solver is therefore an independent deterministic first-pass geometry plan. It does not claim Graphisoft wall-priority parity. No proprietary algorithm or source is copied.

## Known limitations and next gates

1. The current junction solver handles pairwise straight-segment intersections and applies the resulting cap to per-skin footprints. Multi-wall cluster resolution, overlap/coincident baselines, acute-angle limits, wall priorities and complete polygon topology validation remain unimplemented.
2. Composite skin offsets are generated from ordered thicknesses. Profile-based composites, variable skins, finish priority, cut surfaces and material/building-material semantics need more reference evidence.
3. Opening geometry currently models rectangular through-cuts. Library-part profiles, jamb/reveal/sill geometry, curved-host cut limits and partial-depth cuts remain open.
4. The adapter contract is defined but no kernel adapter is connected to the application. The BRepJS/OCCT prototype remains isolated in benchmarks.
5. ProjectStore now invalidates transitive semantic dependents on a committed change. Persistence, autosave and collaboration remain unimplemented.
6. No browser UI, canvas, 2D/3D viewport or physical iPad Safari test exists yet.

## Acceptance for this slice

Run `node --test tests/unit/*.test.mjs`. CI must pass before this slice is considered merged. The next vertical increment is multi-wall junction resolution, dependency invalidation and a browser-visible wall/door/window editor backed by these semantic records.
