# ARQENVO 2.0 — Archicad 29 Wall Geometry Evidence Review

**Status:** Initial reverse-engineering analysis complete for eight selected routines; not full Archicad coverage.  
**Reference:** Graphisoft Archicad 29, macOS x86_64; Ghidra 12.1.4 dossiers generated through REA.  
**Evidence package:** `ARCHICAD29-AUTONOMOUS-WALL-AUDIT_WORK.zip` supplied by the project owner.  
**Target:** Independent, greenfield ARQENVO 2.0 implementation.

## 1. Scope and evidence quality

The interim inventory reports 286 valid function dossiers, zero invalid dossiers, 2,021 call-graph edges and 572 unresolved call sites. The supplied work archive contains 286 JSON dossiers under `functions/`. These are coverage statistics for a targeted extraction, not proof that the full Archicad wall subsystem has been captured.

The following eight dossier files were directly inspected. Pseudocode character and line counts below are measured from each dossier's `normalized_result.pseudocode` field; unresolved-call counts are from that dossier's `normalized_result.unresolved_calls` array.

| Routine | Dossier | Pseudocode | Lines | Unresolved calls |
|---|---|---:|---:|---:|
| AdjustWallGeometry | `VBElemEditingInteractions__37ee6.json` | 27,156 chars | 703 | 7 |
| MakeWall2PatStruct | `VBElemOperations__5b2bc.json` | 141,945 chars | 3,055 | 16 |
| CreateCompositeSkins | `VBElemOperations__3460.json` | 112,396 chars | 2,432 | 11 |
| GetComplexWallSkinsData | `VBElemOperations__82a82.json` | 35,853 chars | 784 | 4 |
| CheckLForJunctionCalculation | `VBTo3DConverter__e3823.json` | 14,727 chars | 341 | 68 |
| EndJunctionDomainsTest | `VBTo3DConverter__e443a.json` | 14,313 chars | 369 | 9 |
| PolyWallHolesCopySingleOpening | `VBTo3DConverter__1ee540.json` | 55,191 chars | 1,307 | 5 |
| Wall2HolesToCutShapes | `VBTo3DConverter__1edc60.json` | 8,740 chars | 219 | 1 |

**Correction to earlier interim notes:** the measured pseudocode fields for `CheckLForJunctionCalculation` and `EndJunctionDomainsTest` are 14,727 and 14,313 characters respectively. Do not use the smaller counts quoted in the earlier draft.

Ghidra pseudocode is decompiler output, not original Graphisoft source. Names and types can be inferred or incomplete. Unresolved/indirect calls remain unknown. This document describes observed control flow and derives independent engineering requirements; it does not reproduce proprietary source code.

## 2. Observed findings

### 2.1 Wall adjustment depends on connected neighbours

`AdjustWallGeometry` obtains the selected wall and project context, checks whether the connected-element set contains walls, obtains wall Z bounds, builds candidate connected-wall data and invokes helpers including `GetWall2DBox` and `AdjustWallParametersToOtherWall`.

**Observed:** wall adjustment is neighbour-aware and uses connected-wall geometry/context.  
**Engineering implication:** an edited wall must trigger discovery and recalculation of affected connected walls. Do not implement junction adjustment as an isolated endpoint move.

**Not established:** all candidate filtering, priority/tie-breaking rules, tolerance values and every junction type.

### 2.2 Wall section/pattern generation is contextual

`MakeWall2PatStruct` queries wall parameters and cross-section type, initializes a `CW2StructRec`, constructs composite information in relevant paths, calls `DivideSwWall2`, `GetDisplayOptionAndViewDepth` and `ComplexCalculateThicknessAndOffset`, and handles polygon/skin-related data and calculation context.

**Observed:** generated wall section/pattern data depends on wall type, composite/profile data and display/cut-plane context.  
**Engineering implication:** keep the persistent wall definition separate from derived section/skin geometry. Make calculation context explicit in requests and cache keys.

### 2.3 Composite skins carry polygon and presentation attributes

`CreateCompositeSkins` references composite skin and face-line collections, skin allocation, cut-surface and building-material attributes, profile contours/edges, and polygon operations including strip/cut/orientation-related operations.

**Observed:** skin generation involves per-skin polygon geometry and material/cut/presentation attributes.  
**Engineering implication:** do not reduce a composite wall to one undifferentiated solid/material. Preserve ordered skins, material references, boundaries, face-line attributes and cut-surface presentation data.

### 2.4 Complex skin extraction depends on view/floor context

`GetComplexWallSkinsData` constructs a wall parameter query, obtains floor/display context, creates cut-plane data and a wall pattern structure, calls `MakeWall2PatStruct`, then traverses component/border data to build skin parameter arrays.

**Observed:** skin data is calculated in an environment, not merely fetched from a static composite definition.  
**Engineering implication:** context must be part of the geometry input and cache key.

### 2.5 L-junction calculation is staged

`CheckLForJunctionCalculation` first invokes a lower-level `CheckL` gate, obtains side information from wall wrappers, checks junction-mode/flag conditions, creates grown-wall representations in applicable paths, updates wall-end state through `UpdateWallT`, and invokes `EndJunctionDomainsTest` to validate candidate end domains. Alternate branches inspect wall-side state, wall flags/type and building-material attributes.

**Observed:** L-junction handling has eligibility, side classification, candidate updates and domain-validation stages.  
**Engineering implication:** implement an explicit junction pipeline with accept/reject/fallback. Do not use unconditional line intersection followed by trimming.

**Coverage warning:** this routine has 68 unresolved call sites. Some invoked behaviour is not recoverable from this dossier alone.

### 2.6 Opening collection and cut-shape generation are separate stages

`PolyWallHolesCopySingleOpening` processes opening fillers and library-part wall-hole definitions, and accesses jamb/reveal/sill-related data before invoking cut-shape conversion.

`Wall2HolesToCutShapes` iterates hole records, applies state/flag checks, branches on wall type, includes curved non-complex wall cut-depth handling, obtains wall limit points, sets hole limits and adds holes to cut-shape geometry.

**Observed:** the opening source/filler data is transformed into wall-aware cut records/shapes; curved, complex and polygonal wall paths are not identical.  
**Engineering implication:** keep semantic Opening, derived HoleRecord and final CutShape as distinct stages. Support library-defined profiles and jamb/reveal parameters; do not assume every opening is a simple rectangular Boolean.

## 3. ARQENVO 2.0 implementation requirements

These are independent design recommendations inferred from the evidence, not claims about Archicad's internal class architecture.

### A. Authoritative semantic model

Persist semantic parameters and relationships, not generated meshes as the source of truth.

- Wall: stable ID, baseline, reference-line mode, thickness/profile/composite reference, height, base/top elevations, wall type, orientation, story and relevant display/renovation attributes.
- Wall skin: ordered index, thickness, material/building-material reference, offset and skin-specific presentation/cut attributes.
- Opening: stable ID, host wall ID, host-relative placement, width/height, sill/head, orientation/anchor, jamb/reveal settings and optional library/custom profile reference.
- Junction: connected wall IDs and endpoint identities, classification, solver inputs/result and affected revisions.

### B. Derived geometry pipeline

1. Resolve wall parameters and calculation context.
2. Resolve effective composite/profile and skin definitions.
3. Generate section and per-skin polygon data.
4. Discover candidate connected walls in a bounded spatial neighbourhood.
5. Classify connected endpoints and junction types.
6. Evaluate junction eligibility and side/priority context.
7. Calculate candidate wall-end/skin boundaries.
8. Validate end domains and topology; reject/fallback without corrupting source parameters.
9. Resolve hosted openings and library/custom hole definitions.
10. Derive wall-specific hole limits and cut shapes.
11. Generate 2D and 3D representations from the same model revision.
12. Validate and atomically publish the new derived revision.

### C. Junction solver contract

**Input:** edited wall, connected-wall candidates, endpoint identities, side data, wall type/flags, material/priority context and tolerance policy.  
**Output:** proposed end/skin updates, accepted/rejected result, diagnostics and affected element IDs.

Stages: broad-phase neighbour query → exact intersection/side classification → junction eligibility → solver selection → candidate end update → domain/topology validation → accept/reject/fallback.

Preview must not mutate committed baselines. Commit all affected wall updates in one transaction.

### D. Composite skin contract

Each skin retains ordering, material, thickness/offset, polygon boundary, face-line and cut-surface attributes. Validate closure, orientation, self-intersection and adjacency. Support simple composite and profile-derived boundaries.

### E. Opening contract

Opening parameters remain independent from generated hole/cut geometry. Recompute host-relative placement, jamb/reveal/sill behaviour, wall-specific clipping limits and the affected skin cuts. Host changes invalidate dependent geometry.

### F. Cache and invalidation

A derived-geometry key must include wall model revision, connected-wall revisions, composite/profile revision, opening revisions, floor/cut-plane/display context and geometry tolerance. Invalidate downstream geometry whenever any dependency changes. Never reuse a mesh with stale dependency revisions.

## 4. Required first vertical-slice acceptance tests

| ID | Scenario | Acceptance |
|---|---|---|
| W01 | Two straight walls form 90° L | closed junction; no visible gap or unintended overlap |
| W02 | L-junction acute/obtuse angles | deterministic result with correct side orientation |
| W03 | T-junction | correct host/terminating wall relationship and cleanup |
| W04 | Cross-junction | deterministic four-way connection; no duplicate internal faces |
| W05 | Two-/three-/five-skin composite | skin order/material retained and boundaries meet |
| W06 | Reversed baseline direction | same semantic result with correctly oriented skins |
| W07 | Centered/left/right door opening | correct host-relative position and full required cut |
| W08 | Window with sill and reveal | opening limits and reveal geometry correct |
| W09 | Change one connected wall | all and only dependent geometry regenerates |
| W10 | Move/resize hosted opening | host wall cuts regenerate; no stale mesh |
| W11 | Undo/redo after junction edit | exact prior semantic and derived state restored |
| W12 | Near-parallel/coincident/short segments | no NaN, zero-area faces or non-deterministic output |

Acceptance must check semantic relationships, dimensions, topology and regenerated 2D/3D output—not appearance alone.

## 5. Remaining evidence gaps

| Area | What is supported | What remains unknown |
|---|---|---|
| Connected-wall processing | neighbour-aware calls and wall bounds/bounding-box helpers | complete filtering, priorities and tolerances |
| Composite generation | skin/polygon/material/presentation processing | full field semantics and all merge rules |
| L-junction | staged gates, side information, wall-end update and domain test | 68 unresolved calls and full edge-case decision table |
| Opening cuts | hole record iteration, wall-type branches, limits and cut-shape stage | complete hole schema and all Boolean internals |
| Overall wall subsystem | targeted partial evidence | full Archicad coverage and all observable workflows |

## 6. Targeted follow-up only

Do not repeat the broad 600-function extraction. If the corresponding dossiers already exist, inspect these helpers next:

1. `CalcWallBegEndClass::AdjustWallParametersToOtherWall` and `GetWall2DBox`.
2. `CheckL`, `UpdateWallT`, junction algorithm selection and the full `EndJunctionDomainsTest` flow.
3. `DivideSwWall2`, `ComplexCalculateThicknessAndOffset`, `WallSkinMergeStrategy` and `CW2StructRec` field usage.
4. `AddHoleToCutshape`, `GetWallLimitPoints`, `SetHoleLimits` and curved-wall depth limiter.

Only perform a targeted new extraction if a specifically required helper is confirmed absent.

## 7. First implementation slice

After the geometry-kernel benchmark gate is satisfied, build one complete workflow:

**two connected straight walls → L-junction solve → composite skins → hosted door opening → 3D cut → edit either wall → dependent regeneration without cracks or stale geometry.**

The BIM semantic model remains authoritative. Kernel geometry is a derived representation behind an ARQENVO-owned adapter.
