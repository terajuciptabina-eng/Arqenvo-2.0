# ARQENVO 2.0

**Independent browser-based CAD/BIM application.**

ARQENVO 2.0 is a greenfield development. Its initial product objective is to reproduce the observable workflows and functional behaviour of Graphisoft Archicad 29 as closely as technically and legally possible, then introduce improvements without disrupting established workflows.

## Project principles

- New source code and independent architecture.
- Archicad 29 is the primary behavioural reference.
- Evidence before implementation: observe, document, specify, implement, validate.
- BIM design intent and relationships remain authoritative; geometry is derived from them.
- Geometry-kernel choice is deferred until comparative benchmarks are complete.
- Desktop, iPad and iPhone browser support are architectural requirements.
- Root-cause fixes only; no patch-over-patch development.
- Existing ARQENVO repository remains separate and untouched.

## Current status

**Stage:** M2 — greenfield BIM domain and wall-geometry vertical slice  
**Production application:** Core semantic model, wall derivation, L/T junction plans, composite skins, hosted door/window editing, three-skin composite walls, dependency invalidation, first 2D browser workspace and IndexedDB save/restore implemented; 3D viewport, full junction priorities, advanced material editing and project cloud exchange remain open  
**Platform:** Browser target; core modules are dependency-free ECMAScript modules  
**Geometry strategy:** Run #63 passed 11/11 hosted benchmark jobs; BRepJS + OCCT-WASM remains a prototype candidate behind an adapter, not a production selection  
**Reference:** Graphisoft Archicad 29 on macOS; independent implementation only  
**Deployment:** GitHub Pages remains preferred; no production deployment enabled.

## Repository guide

- `docs/MASTER_SPECIFICATION.md` — product scope and parity principles.
- `docs/ARCHITECTURE.md` — proposed system boundaries and data flow.
- `docs/DEVELOPMENT_RULES.md` — mandatory engineering rules.
- `docs/ARCHICAD_REFERENCE/INVESTIGATION_PROTOCOL.md` — REA and reference-observation workflow.
- `docs/ARCHICAD_REFERENCE/WALL_GEOMETRY_REVERSE_ENGINEERING.md` — dossier-based wall, junction, composite-skin and opening findings.
- `docs/GEOMETRY_BENCHMARKS/README.md` — kernel evaluation plan and acceptance tests.
- `docs/GEOMETRY_BENCHMARKS/CANDIDATE_DESK_REVIEW_2026-11-07.md` — current candidate comparison; desk research only, not runtime results.
- `benchmarks/kernel-spike/` — isolated brepjs + occt-wasm smoke/benchmark runner; not production application source.
- `docs/ARCHITECTURE_DECISIONS/` — decisions and deferred choices.

## Current non-goals

- Copying Graphisoft proprietary source code or assets.
- Circumventing licensing, access controls or technical protections.
- Choosing a geometry kernel based only on a demo or marketing claims.
- Reusing the existing ARQENVO implementation as the new foundation.
- Enabling production deployment before the application and tests are ready.

## Development sequence

1. Establish architecture and investigation records.
2. Investigate Archicad 29 with REA, supported APIs and controlled observation.
3. Benchmark candidate geometry kernels against architectural scenarios.
4. Approve the kernel and core data model.
5. Build the application foundation and Archicad-equivalent workflows.
6. Validate subsystem-by-subsystem against recorded reference scenarios.
7. Introduce improvements after parity acceptance.

See the documents under `docs/` before proposing architectural or implementation changes.
