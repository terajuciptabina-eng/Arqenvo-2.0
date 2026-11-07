# First Runtime Benchmark Report — 2026-11-07

**Status:** Preliminary baseline only. No production kernel selected.  
**Earlier evidence:** The initial BRepJS/Manifold baselines are recorded below as historical run evidence. Their original runs are distinct from Run #37.  
**Current verification:** [Geometry Kernel Benchmark Run #37](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42359457979), commit `ddb407f352331b3ab9f3ac1c804b2c92f188c446`.

## 1. Candidates and environment

| Candidate | Pinned package versions | Representation |
|---|---|---|
| BRepJS + OCCT-WASM | brepjs 20.18.0 / occt-wasm 5.15.0 | Exact B-Rep |
| Manifold | manifold-3d 3.5.4 | Manifold triangle mesh; control/possible secondary representation |
| OpenGeometry | opengeometry 2.0.18 / three 0.184.0 / Playwright 1.65.0 / Vite 8.3.6 | Browser/WASM analytic B-Rep API with tessellated mesh observation |

## 2. Initial baseline — historical runs

The initial baseline runs reported exact fixture volume matches for the cases shown in the earlier report:

| Case | Expected volume | BRepJS + OCCT | Manifold |
|---|---:|---:|---:|
| K01 — straight wall | 600,000,000 mm³ | Exact match | Exact match |
| K03 — pre-solved L-junction union | 2,970,000,000 mm³ | Exact match | Exact match |
| K06 — three independent skins | 600,000,000 mm³ total | Exact match, all 3 skins | Not run in the initial Manifold baseline |
| K07 — door through all 3 skins | 222,000,000 mm³ | Exact match, all 3 skins | Exact match, all 3 skins |

These results are historical evidence from their cited runs; they must not be presented as Run #37 results.

Manifold reported `NoError` for the tested mesh solids. BRepJS exported STEP files in its earlier benchmark. The earlier BRepJS suite did not establish complete independent topology inspection or architectural BIM solver parity.

## 3. Run #37 — verified evidence as of 2026-11-07

Run #37 was created from commit `ddb407f352331b3ab9f3ac1c804b2c92f188c446`.

### 3.1 Manifold Ubuntu

<badge>SUCCESS</badge> for the job `manifold-3d / ubuntu-latest`.

- Package: `manifold-3d 3.5.4`
- Runtime: Node 24.22.2, Ubuntu 26.04.1, Linux x64
- Initialization: 19.8146 ms
- Peak RSS reported after run: 61,992,960 bytes
- K01: expected 600,000,000 mm³; measured 600,000,000 mm³; `NoError`
- K03: expected 2,970,000,000 mm³; measured 2,970,000,000 mm³; `NoError`
- K07: expected/measured remaining skin volumes 22,200,000 / 177,600,000 / 22,200,000 mm³; all deltas 0; each `NoError`
- Total K07: expected/measured 222,000,000 mm³
- Validation: `exact-match`; failures array empty

The artifact `manifold-kernel-spike-ubuntu-latest` was downloaded and its JSON independently inspected. This is a mesh volume/topology result for the tested solids, not an exact B-Rep or CAD semantic validation. K07's separate skin outputs do not establish persistence of material identity through an application model.

### 3.2 Other Run #37 jobs

At the latest direct GitHub jobs query during this report update:

| Job | Observed state | Interpretation |
|---|---|---|
| BRepJS Ubuntu | In progress | No final result available |
| BRepJS macOS | Queued | Not tested in this run yet |
| Manifold macOS | Queued | Not tested in this run yet |
| BRepJS browser WebKit | Queued | Not tested in this run yet |
| OpenGeometry 2.0.18 browser probe | Queued | Not tested in this run yet |
| BRepJS curved K02 | Queued | Not tested in this run yet |
| BRepJS curved K10 | Queued | Not tested in this run yet |

The GitHub API returned `BlobNotFound` when the live log endpoint was requested for the running/queued jobs. This is not a benchmark failure. Their status must be refreshed before further interpretation.

## 4. Timing results — historical, not a current performance ranking

The following values are from the earlier baseline report, not Run #37. They are one-run observations, not statistically controlled benchmarks.

| Candidate / platform | WASM init | K01 | K03 | K06 | K07 | Peak RSS |
|---|---:|---:|---:|---:|---:|---:|
| BRepJS / macOS arm64 | 94.47 ms | 65.48 ms | 81.71 ms | 9.12 ms | 38.40 ms | 381.3 MB |
| BRepJS / Ubuntu x64 | 268.86 ms | 228.57 ms | 220.18 ms | 39.14 ms | 184.07 ms | 323.2 MB |
| Manifold / macOS arm64 | 12.05 ms | 2.78 ms | 3.53 ms | — | 1.28 ms | 60.5 MB |
| Manifold / Ubuntu x64 | 18.78 ms | 2.77 ms | 7.52 ms | — | 2.18 ms | 60.8 MB |

Do not interpret this as a like-for-like kernel victory: Manifold operates on triangle meshes, while BRepJS + OCCT operates on exact B-Rep geometry.

## 5. Historical browser WebKit smoke test

An earlier BRepJS + OCCT-WASM browser smoke run passed Playwright WebKit desktop and iPad-like emulation:

| Profile | Result | Browser geometry operation | Page elapsed |
|---|---|---:|---:|
| WebKit desktop | Pass; 600,000,000 mm³ | 247 ms | 691.84 ms |
| iPad-like WebKit emulation | Pass; 600,000,000 mm³ | 158 ms | 325.16 ms |

This does not represent Run #37's still-queued browser job, nor Apple's installed Safari or physical iPad/iPhone hardware.

## 6. OpenGeometry 2.0.18 probe scope

Source audit of `benchmarks/opengeometry-2-spike/src/main.js` confirms that the current probe:
- initializes OpenGeometry 2.0.18 in browser WASM;
- constructs a `Cuboid`;
- constructs one analytic cuboid host and cutter;
- calls `booleanSubtraction`;
- computes cut volume from tessellated Three.js `BufferGeometry`;
- serializes the analytic B-Rep and calls `validateAnalyticBrep`;
- reports the validation output separately.

The browser benchmark passes its primary status check only when the tessellated mesh volume is within 1e-6 m³ of 0.222 m³. This is one straight cuboid subtraction. It is not a complete architectural wall test, a native exact-volume proof, multi-skin test, curved-wall test, STEP round-trip or full topology gate.

## 7. Interpretation and known limitations

- BRepJS + OCCT-WASM remains the leading B-Rep prototype to evaluate, based on earlier baseline evidence, not a production selection.
- Manifold is a mesh-kernel control and may still be useful as a derived-mesh layer. It is not an authoritative parametric B-Rep candidate.
- K03 uses precomputed wall-end boundaries and tests Boolean union only; it does not establish Archicad-like wall priority or trim rules.
- K06/K07 separate skin solids and test their volumes; material identity persistence through a BIM model remains unproven.
- K12's current runner compares equal volumes before/after movement. It does not itself prove the opening actually moved geometrically.
- K13 regenerates shapes from parameters and records process RSS observations. It is not a definitive long-duration memory-leak test.
- K15 exports/imports STEP and compares volume in the runner, but STEP content and topology evidence must be reviewed independently.
- No physical iPad Safari test, full topology/validity inspection across the suite, production worker integration, controlled performance study or legal approval has been completed.

## 8. Next verification gate

1. Refresh Run #37 until all jobs reach terminal states.
2. Download and inspect every available BRepJS, curved, WebKit and OpenGeometry artifact.
3. Verify K12 position/geometry differences, K13 repeat stability and memory methodology, and K15 STEP geometry and round-trip values.
4. Examine any failed case against the fixture and actual kernel output. Do not relax expected values to manufacture a pass.
5. Update this report with terminal job conclusions and evidence links.
6. Keep production kernel selection open pending full benchmark, device, performance, worker and licensing checks.

## Run #37 artifact audit supplement (2026-11-07)

Run #37 overall conclusion: `cancelled`, not passed. The workflow was interrupted after a documentation push because its prior concurrency setting used `cancel-in-progress: true`. Only the Manifold Ubuntu job completed normally; the BRepJS Ubuntu artifact had already uploaded before cancellation. All other jobs were cancelled before final evidence was produced.

The BRepJS Ubuntu artifact was downloaded and independently inspected. It contains 11 STEP files for K01, K03, K04, K05, K06 (three separate skins), K07 (three separate cut skins) and K09. The benchmark JSON report was not present in the artifact, so this review does not infer operation timings or the runner's final validation result from missing output.

Each of the 11 STEP files was imported using an independent OCCT-based Python reader and checked with `BRepCheck_Analyzer`. All imported as one valid solid each. Imported volumes matched the relevant analytic references:
- K01: 600,000,000 mm³
- K03: 2,970,000,000 mm³
- K04: 2,940,000,000 mm³
- K05: 3,480,000,000 mm³
- K06: 60,000,000 / 480,000,000 / 60,000,000 mm³
- K07: 22,200,000 / 177,600,000 / 22,200,000 mm³
- K09: 1,128,000,000 mm³

This independently supports STEP readability, single-solid import and valid imported topology for those exported samples. It does not recover the missing benchmark report or establish K08/K11/K12/K13/K15 completion. It also does not prove ARQENVO BIM junction rules or semantic skin metadata.

The workflow concurrency setting has since been corrected to `cancel-in-progress: false` in commit `cd4ac8b1e049d9920c18036b23afaa514ed56ec4`. That correction protects future runs but cannot restore jobs cancelled in Run #37.
