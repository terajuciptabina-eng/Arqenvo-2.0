# Geometry Kernel Evaluation

**Decision status: OPEN — no production kernel selected.**

## Isolated prototype

- `../../benchmarks/kernel-spike/` — first Node-side brepjs + occt-wasm spike. Run instructions and limitations are documented in its README. It does not select a production kernel and does not replace iPad Safari testing.

## First runtime benchmark

- [First Runtime Benchmark Report — 2026-11-07](./FIRST_RUNTIME_BENCHMARK_REPORT_2026-11-07.md) — initial BRepJS/OCCT and Manifold Node/WASM results on Ubuntu and macOS. All current analytic volume fixtures matched after correcting benchmark placement and cutter bounds. The report now includes an automated Playwright WebKit desktop and iPad-like smoke pass; it is still not a physical iPad Safari result or a final kernel selection.

## Shared fixtures

- `fixtures/wall-core-fixtures.json` — canonical, kernel-neutral analytic inputs for K01–K13 (excluding K14) and K15. K14 is the browser/device compatibility test. Each candidate must consume the same semantic fixtures; unsupported capabilities must be recorded as unsupported rather than silently approximated. All candidate spikes must consume these same fixtures and record the configured tolerance; do not modify fixtures per candidate.

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
| K01 | Straight wall prism | Baseline dimensions, solid and volume |
| K02 | Quarter-annular curved wall | Exact curved profile/revolve |
| K03 | L-junction | Union after fixed wall-end solution |
| K04 | T-junction | Multi-element Boolean union |
| K05 | Cross-junction | Four-way orthogonal wall union |
| K06 | Three-skin composite wall | Separate skin volumes and ordering |
| K07 | Door through all skins | Hosted door cut through composite |
| K08 | Window through all skins | Raised opening and sill retention |
| K09 | Multiple doors | Multi-tool cut on one host |
| K10 | Curved-wall opening | Angular opening in curved wall |
| K11 | Wall thickness edit | Regeneration from changed parameters |
| K12 | Opening moved on host | Rebuild after host/opening dependency change |
| K13 | 100 repeated regenerations | Repeated edit stability and memory observation |
| K14 | Browser/device compatibility | Desktop WebKit and iPad-like emulation; physical iPad Safari still required |
| K15 | STEP round-trip | Export, import and volume comparison |

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
