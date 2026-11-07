# Geometry Kernel Evaluation

**Decision status: OPEN — no production kernel selected.**

## Isolated prototypes

- `../../benchmarks/kernel-spike/` — BRepJS + OCCT-WASM exact B-Rep spike. Evaluation-only; not application source.
- `../../benchmarks/manifold-spike/` — Manifold mesh-kernel control. Evaluation-only; not an exact B-Rep candidate.
- `../../benchmarks/opengeometry-2-spike/` — OpenGeometry 2.0.18 browser probe. Evaluation-only; not an application dependency.

## Current runtime evidence

- [First Runtime Benchmark Report — 2026-11-07](./FIRST_RUNTIME_BENCHMARK_REPORT_2026-11-07.md) records the initial baseline and the later Run #37 evidence.
- [Candidate Desk Review — 2026-11-07](./CANDIDATE_DESK_REVIEW_2026-11-07.md) records source-backed candidate findings and the prototype order, not a production decision.
- [Run #37](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42359457979) is the current verification run for commit `ddb407f352331b3ab9f3ac1c804b2c92f188c446`. Run #37 is now terminal with conclusion `cancelled`: Manifold Ubuntu completed successfully, while all other jobs were cancelled. A partial BRepJS Ubuntu artifact exists and is independently STEP-import audited for K01/K03/K04/K05/K06/K07/K09; see the runtime report. Do not treat Run #37 as a full suite pass. Workflow concurrency was corrected in commit `cd4ac8b1e049d9920c18036b23afaa514ed56ec4`.

## Shared fixtures

- `fixtures/wall-core-fixtures.json` is the canonical kernel-neutral input set for K01–K13 and K15. K14 is a browser/device compatibility test.
- Every candidate must consume the same semantic inputs. Unsupported capabilities must be marked unsupported or blocked; never silently approximate.
- The fixture tolerance policy is `not-yet-approved`. Candidate reports must record the actual configured tolerance and measurement method. Fixture tolerances are test-specific, not a blanket modelling tolerance.

## Required benchmark cases

| ID | Scenario | What it tests |
|---|---|---|
| K01 | Straight wall prism | Dimensions, closed solid and volume |
| K02 | Quarter-annular curved wall | Curved profile and revolve |
| K03 | L-junction | Union after fixed wall-end solution |
| K04 | T-junction | Multi-element Boolean union |
| K05 | Cross-junction | Four-way orthogonal wall union |
| K06 | Three-skin composite wall | Separate skin volumes, ordering and identity |
| K07 | Door through all skins | Opening cut through composite skins |
| K08 | Window through all skins | Raised opening and sill retention |
| K09 | Multiple doors | Multi-tool cut on one host |
| K10 | Curved-wall opening | Angular opening in curved host |
| K11 | Wall thickness edit | Regeneration from changed parameters |
| K12 | Opening moved on host | Actual opening placement and geometry change |
| K13 | 100 repeated regenerations | Determinism, validity and memory observation |
| K14 | Browser/device compatibility | Desktop browser, iPad-like emulation and physical iPad Safari |
| K15 | STEP round-trip | Export, reimport, geometry and volume comparison |

## Evidence and interpretation rules

- Distinguish exact B-Rep from tessellated mesh measurements.
- Distinguish kernel geometry from ARQENVO BIM junction/host dependency logic.
- Volume equality alone does not prove opening position, profile, topology or semantic identity.
- K12 requires a geometric comparison that proves the opening moved, not merely equal wall volumes.
- K13 requires repeated-run memory/validity evidence; a single before/after RSS reading is not a definitive leak test.
- K15 requires STEP content checks and imported-solid volume comparison.
- Desktop/iPad-like Playwright WebKit is not physical iPad Safari.
- Record exact package versions, OS/architecture, runtime/browser version, initialization and operation timing, memory method, topology/validity, failures, asset size and license notes.
- Do not compare raw timing as a kernel ranking when representation and validation depth differ.

## Selection gate

No production kernel is selected until the full applicable K01–K15 matrix, B-Rep/topology checks, wall junction and hosted-opening behaviour, repeat-edit stability, STEP exchange, desktop and physical iPad Safari, worker behavior, performance, and commercial license review have sufficient reproducible evidence.

Keep the kernel adapter replaceable. Do not integrate a candidate into production or modify the application's modeling architecture based only on the current prototype results.
