# First Runtime Benchmark Report — 2026-11-07

**Status:** Initial Node/WASM baseline completed. No production kernel selected.  
**Runner commits:** BRepJS validation `b6b2009852c67f8ce14e8f36597a93d2b00ec461`; Manifold validation `b58aa3ff711e417af7b108e91011973210186b0c`.  
**Geometry validation:** [Geometry Kernel Benchmark run #8](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42356622815) — all four Ubuntu/macOS jobs succeeded with `validation.status = exact-match`.  
**Browser verification:** [Geometry Kernel Benchmark run #17](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42356963936) — BRepJS + OCCT-WASM passed desktop WebKit and iPad-like WebKit smoke tests.

## 1. Candidates and environment

| Candidate | Exact package versions | Representation |
|---|---|---|
| BRepJS + OCCT-WASM | brepjs 20.18.0 / occt-wasm 5.15.0 | Exact B-Rep |
| Manifold | manifold-3d 3.5.4 | Manifold triangle mesh; control/secondary representation only |

Both candidates ran under Node 24.22.2 on GitHub-hosted Ubuntu x64 and macOS Apple Silicon arm64.

## 2. Analytic fixture results

All tested volumes matched the shared analytic fixtures exactly on both operating systems.

| Case | Expected volume | BRepJS + OCCT | Manifold |
|---|---:|---:|---:|
| K01 — straight wall | 600,000,000 mm³ | Exact match | Exact match |
| K03 — pre-solved L-junction union | 2,970,000,000 mm³ | Exact match | Exact match |
| K06 — three independent skins | 600,000,000 mm³ total | Exact match, all 3 skins | Not run in Manifold spike |
| K07 — door through all 3 skins | 222,000,000 mm³ | Exact match, all 3 skins | Exact match, all 3 skins |

Manifold returned `NoError` for the tested solids. BRepJS exported STEP for all tested BRep cases. The current BRepJS smoke test does not yet perform a separate full topology inspection.

## 3. Timing results

Times are one run per case and are **not** a statistically controlled performance ranking. Values are milliseconds.

| Candidate / platform | WASM init | K01 | K03 | K06 | K07 | Peak RSS |
|---|---:|---:|---:|---:|---:|---:|
| BRepJS / macOS arm64 | 94.47 | 65.48 | 81.71 | 9.12 | 38.40 | 381.3 MB |
| BRepJS / Ubuntu x64 | 268.86 | 228.57 | 220.18 | 39.14 | 184.07 | 323.2 MB |
| Manifold / macOS arm64 | 12.05 | 2.78 | 3.53 | — | 1.28 | 60.5 MB |
| Manifold / Ubuntu x64 | 18.78 | 2.77 | 7.52 | — | 2.18 | 60.8 MB |

Do not interpret the raw timing gap as a like-for-like kernel victory: Manifold operates on triangle meshes, while BRepJS + OCCT operates on exact B-Rep geometry. Their output representations, validation depth and downstream CAD capabilities differ.

## 4. Important benchmark corrections made

The first run exposed benchmark-fixture placement errors, not kernel failures:

1. Box placement coordinates were treated as minimum corners, while the constructors use the supplied placement as a centre. The benchmark now computes box centres from the analytic min/max coordinates.
2. The door cutter was extended 1 mm above the door head. The fixture's overrun applies to the through-wall depth, not the vertical opening height. The cutter now extends through wall thickness only and keeps the exact sill/head elevations.
3. Strict analytic volume comparisons are now written into the runner report and cause CI to fail when a measured volume differs from the fixture. This strict check is only for the current axis-aligned analytic box cases; it is not a general approved modelling tolerance.

These corrections changed the K03 and K07 outputs to exact analytic matches. They are documented to prevent repeating the earlier false results.

## 5. Interpretation

- **BRepJS + OCCT-WASM is the current leading B-Rep prototype candidate.** It passed K01, K03, K06 and K07 analytic volume checks on both hosted platforms and produced STEP exports.
- **Manifold is a very fast mesh Boolean control.** It also matched K01, K03 and K07 analytic volumes, but it is not a replacement for an authoritative parametric B-Rep model. It remains relevant as a possible derived-mesh or secondary operation layer.
- This report does not prove Archicad-equivalent wall junction behaviour. K03 supplies precomputed wall-end boundaries and tests only the solid union. BIM wall priority/trim logic remains outside the kernel test.
- This report does not prove actual iPad Safari compatibility or performance.
- No candidate has passed the complete K01–K15 plan, browser/device checks, topology inspection, or legal review.


## 7. Browser WebKit smoke test

The BRepJS + OCCT-WASM browser smoke test also passed in GitHub Actions on macOS arm64 using Playwright WebKit 27.2, Node 24.22.2, Vite 8.3.6 and Playwright 1.65.0.

| Profile | Result | Browser-side geometry operation | Page elapsed |
|---|---|---:|---:|
| WebKit desktop | Pass; 600,000,000 mm³ exact | 247 ms | 691.84 ms |
| iPad-like WebKit emulation | Pass; 600,000,000 mm³ exact | 158 ms | 325.16 ms |

Both profiles reported no browser errors, console errors or failed requests.

**Integration finding:** the browser harness uses explicit kernel initialization with `OcctKernel.init({ wasm: wasmUrl })` followed by `registerKernel("occt-wasm", OcctWasmAdapter.fromKernel(kernel))`. The initial `brepjs/quick` Vite import path failed in this harness during backend loading; the explicit initialization path passed. This is why the app integration should use explicit startup/loading/error handling rather than assuming the quick entry is suitable for every bundler context.

This is a Playwright WebKit build with an iPad-like emulation profile. It is not Apple's installed Safari and does not replace testing on a physical iPad/iPhone.

## 8. Remaining candidate work and selection gate

| Candidate | Next action | Status |
|---|---|---|
| BRepJS + OCCT-WASM | Expand to curved walls, T/cross junctions, repeated edits, validity checks, STEP round-trip, browser worker and iPad Safari | Initial baseline passed |
| Manifold | Extend mesh control to more opening/curved/complex mesh cases; assess whether a secondary mesh role is useful | Initial baseline passed |
| OpenGeometry | Resolve exact published 2.0 package/API versus repository 3.0 API before writing an adapter; pin and test one exact release | Blocked on version/API alignment |
| Direct opencascade.js | Verify current WASM release, exposed APIs, build size and maintenance before deciding whether to run as a separate fallback | Not yet benchmarked |

Production selection remains deferred until the full shared fixture suite, browser/device tests, topology validation, adapter proof and license review are complete.
