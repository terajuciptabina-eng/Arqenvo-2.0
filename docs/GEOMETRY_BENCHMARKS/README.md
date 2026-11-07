# Geometry Kernel Evaluation

**Decision status: OPEN — no production kernel selected.**

## Shared fixtures

- `fixtures/wall-core-fixtures.json` — canonical, kernel-neutral analytic inputs for K01, K03, K06 and K07. All candidate spikes must consume these same fixtures and record the configured tolerance; do not modify fixtures per candidate.

## Current candidate review

See [Candidate Desk Review — 2026-11-07](./CANDIDATE_DESK_REVIEW_2026-11-07.md) for the source-backed preliminary comparison of OpenGeometry 3.x, brepjs + occt-wasm, Manifold 3.x and direct opencascade.js.

The review is desk research only. No runtime benchmark, iPad Safari test or final license approval has been completed. Do not treat the preliminary prototype order as a kernel selection.

## Candidates

Evaluate:
- Open CASCADE Technology / OpenCascade.js.
- OpenGeometry.
- Manifold.
- brepjs.

Candidate availability, maturity, API, build instructions, browser support and license terms must be rechecked against official project sources at evaluation time.

## Evaluation principles

- Run identical test inputs and expected outputs.
- Record exact package version, build options and browser/device.
- Separate kernel capability from ARQENVO BIM logic.
- Record failures, invalid topology and numeric drift.
- Include license and commercial-distribution review.
- Do not infer Archicad-equivalent wall joins from generic Boolean support.

## Required benchmark cases

| ID | Scenario | What it tests |
|---|---|---|
| G01 | Straight wall prism | Profile extrusion and dimensions |
| G02 | Curved wall | Curved path/profile handling |
| G03 | L-junction | Intersections and corner cleanup |
| G04 | T-junction | Multi-element intersection |
| G05 | Cross-junction | Multi-way connection stability |
| G06 | Thickness edit | Regeneration and numeric stability |
| G07 | Single door opening | Through-opening and Boolean reliability |
| G08 | Window opening | Opening placement and host relation |
| G09 | Multiple openings | Repeated Boolean and topology validity |
| G10 | Slab with hole | Profile with inner loop |
| G11 | Roof-like solid | Sloped planar geometry |
| G12 | Host modification | Recompute dependent geometry |
| G13 | 2D/3D agreement | Shared dimensions and coordinate transforms |
| G14 | Repeated edits | Stability after many modifications |
| G15 | iPad Safari | Runtime compatibility and memory/performance |

## Measurements

Record:
- Geometric deviation against reference geometry.
- Topology validity.
- Boolean success/failure rate.
- Runtime per operation.
- Peak memory where measurable.
- Initial WASM and asset download size.
- Worker compatibility and responsiveness.
- Safari/iPad/iPhone behaviour.
- API ergonomics and maintenance activity.
- License obligations and redistribution implications.

## Benchmark report format

For each candidate, include:
1. Version and source URL.
2. License and obligations reviewed.
3. Build/runtime configuration.
4. Test environment.
5. Results for G01–G15.
6. Failed cases with reproducible inputs.
7. Performance measurements.
8. Known limitations.
9. Adapter complexity.
10. Recommendation and confidence.

## Selection gate

No production kernel is selected until:
- All critical architectural tests have been run or explicitly marked blocked.
- Failures and workarounds are documented.
- Browser support is validated on desktop and iPad Safari.
- License review is complete.
- A prototype demonstrates that kernel types can remain behind the adapter.
- The decision is recorded in an Architecture Decision Record.
