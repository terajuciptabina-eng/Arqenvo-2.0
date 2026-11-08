# M2 — Wall geometry vertical slice

**Status:** First kernel-neutral semantic and derivation layer implemented. Not yet an Archicad-parity claim.

## Implemented

- Semantic wall, composite and opening records with finite-value, dimensional, host and reference checks; project validation rejects horizontally and vertically overlapping cuts on the same host while allowing vertically separated transom-style openings.
- Millimetre project coordinates, Z-up.
- Ordered composite skins with material identity and total-thickness closure.
- Straight-wall prism plans with center, left and right reference-line offsets.
- Door/window opening plans with center/left/right anchors, host-relative placement, sill elevation and through-skin cut extents.
- Deterministic pairwise junction classification for L, angled, T and cross intersections; L/angled miter and T branch-cap plans are applied to each composite skin footprint during project derivation.
- L/angled miter-point plans and T-branch cap plans; cross intersections explicitly require a later solid-union operation.
- Kernel adapter contract that keeps vendor-specific types outside the BIM domain.
- Atomic project transactions with undo/redo.
- Dependency graph: composite changes invalidate dependent walls; wall changes invalidate hosted openings and connected junction peers; opening edits invalidate the host wall representation.
- Simple 2D skin-footprint validation for finite coordinates, non-zero edges/area and self-intersection, reported per wall skin during project derivation.
- Node built-in unit tests and GitHub Actions CI.

## Evidence boundary

The REA dossier review supports neighbour-aware wall adjustment, staged L-junction eligibility and end-domain checks, per-skin/material-aware composite processing, and a separate opening-to-cut-shape stage. The dossiers have unresolved calls and do not disclose the complete priority decision table.

The current solver is therefore an independent deterministic first-pass geometry plan. It does not claim Graphisoft wall-priority parity. No proprietary algorithm or source is copied.

## Collinear baseline handling added 2026-11-08

- Parallel collinear baselines are now distinguished from non-collinear parallel walls.
- End-to-end collinear walls are reported as `STRAIGHT` junctions and explicitly deferred to wall-priority resolution; no unsupported trim is fabricated.
- Positive-length collinear baseline overlap is reported as `COLLINEAR_OVERLAP` with the overlap interval and length, and is blocked for manual review.
- Collinear endpoint-to-interior contact is reported as `COLLINEAR_TOUCH` and deferred for priority resolution.
- Parallel non-collinear baselines remain non-junctions.
- Regression coverage was added for straight joins, overlapping baselines and separated parallel walls. These checks detect relationships; they do not resolve Archicad wall priority or produce final joined solids.

## Staged junction candidate acceptance added 2026-11-08

- Junction geometry is now treated as a candidate update, not an immediate mutation of the derived wall plans.
- L/angled candidates are staged against cloned plans for both affected walls; T candidates are staged against the branch wall.
- Every affected skin footprint is validated before any staged plan is published.
- If an update cannot be applied or any candidate skin is invalid, the entire candidate is rejected and the previously accepted plans remain unchanged.
- The derivation result exposes `junctionResolutions` entries with `ACCEPTED`, `REJECTED` or `BLOCKED`, affected wall IDs, reason codes and candidate validation results.
- Junction types without supported candidate geometry—including cross and multi-wall cases—remain blocked rather than silently changing geometry.
- This is atomic acceptance at the derived-plan level. It does not yet implement persistent semantic wall-end updates, full domain tests, solid topology checks or Graphisoft priority rules.

## Composite skin-stack topology checks added 2026-11-08

- Added an ordered skin-stack validator for per-skin footprint validity, contiguous offset ranges, consistent vertical extents and coincident shared boundaries between adjacent skins.
- Junction candidate acceptance now validates the entire affected skin stack as well as each individual footprint before publishing any candidate plan.
- Final project derivation reports `skinStackValidation` per wall and emits `DERIVED_SKIN_STACK_INVALID` when the adjacency contract fails.
- Regression tests cover valid three-skin stacks, offset gaps, shared-boundary mismatch, and L/T junction candidates across composite skins.
- This is a 2D plan-level adjacency contract. It does not prove absence of 3D internal faces, manifoldness, watertight B-Rep validity or Boolean-union correctness.

## Junction domain validation added 2026-11-08

- Added a generic domain gate before candidate geometry is staged: supported junction type, exactly two distinct existing wall IDs, finite junction point, endpoint identity against the source wall baselines, and geometry structure are checked.
- L/angled candidates must identify both matching wall endpoints and provide two distinct finite miter points.
- T candidates must identify exactly one branch endpoint, confirm the junction point lies on the host baseline, and provide a cap tied to the correct host and branch wall IDs.
- Invalid candidates are reported as `BLOCKED` with a stable reason code and `JUNCTION_DOMAIN_VALIDATION_FAILED`; no candidate plan is mutated.
- These are generic domain invariants inspired by the staged-validation shape in the evidence dossier. They are not a reconstruction of Graphisoft's proprietary `EndJunctionDomainsTest` or its missing priority decision table.

## Connected junction network validation added 2026-11-08

- Added a wall/junction graph pass that groups pairwise junctions into connected networks and reports sorted wall IDs, junction IDs, and per-wall junction counts.
- A wall may participate in more than one junction when the candidates consume distinct endpoints; the derivation pipeline applies those candidates sequentially to the latest accepted plan for that wall.
- A single wall endpoint cannot be claimed by multiple junction candidates. Conflicting candidates are blocked before plan staging with `WALL_ENDPOINT_CLAIMED_BY_MULTIPLE_JUNCTIONS` and `JUNCTION_NETWORK_VALIDATION_FAILED`.
- Network membership and summary ordering are deterministic under junction input reordering.
- This validates endpoint ownership and graph connectivity only. It does not solve multi-wall priority, simultaneous multi-junction trimming, 3D union topology, or Graphisoft's proprietary domain tests.

## Multi-junction order determinism added 2026-11-08

- A regression test comparing a three-wall chain under forward and reversed project wall insertion exposed a real defect: pair discovery order changed wallIds order while endpointA/endpointB remained positional, which could apply a cap to the wrong endpoint.
- The junction solver now sorts walls by stable wall ID before pair generation. This keeps each candidate's wall IDs, endpoint identities and geometry aligned, and makes the derived wall plans deterministic for the same semantic project regardless of object insertion order.
- The regression asserts equal derived plans and junction resolutions, both caps retained on the shared middle wall, and valid final skin polygon/stack results.
- This is deterministic pair discovery and staged endpoint application. It does not establish correctness of multi-wall priority, concurrent network geometry, 3D solid topology or Archicad parity.

## Known limitations and next gates

1. The current junction solver handles pairwise straight-segment intersections and applies candidate caps to per-skin footprints through staged acceptance. Multi-wall clusters are detected and deliberately withheld for priority resolution; acute/near-collinear miters are rejected by a configurable miter-ratio limit. Collinear overlaps and endpoint contacts are detected and blocked. Derived 2D skin footprints are checked for simple-polygon validity, but priority-based resolution, complete multi-polygon topology validation and 3D B-Rep validity remain unimplemented; current skin-stack checks cover only ordered 2D adjacency and Z-range consistency.
2. Composite skin offsets are generated from ordered thicknesses. Profile-based composites, variable skins, finish priority, cut surfaces and material/building-material semantics need more reference evidence.
3. Opening geometry currently models rectangular through-cuts. Library-part profiles, jamb/reveal/sill geometry, curved-host cut limits and partial-depth cuts remain open.
4. The adapter contract is defined but no kernel adapter is connected to the application. The BRepJS/OCCT prototype remains isolated in benchmarks.
5. ProjectStore now invalidates transitive semantic dependents on a committed change. Persistence, autosave and collaboration remain unimplemented.
6. A basic 2D canvas and derived isometric preview exist; a production 3D viewport and physical iPad Safari validation remain outstanding.

## Acceptance for this slice

Run `node --test tests/unit/*.test.mjs`. CI must pass before this slice is considered merged. The next vertical increment is deeper evidence-backed junction eligibility/domain validation, robust multi-polygon topology validation and a kernel-neutral geometry adapter integration plan. The existing browser editor remains a prototype and must not be treated as production-ready.
