# First Runtime Benchmark Report — 2026-11-07

**Status:** Expanded hosted benchmark matrix passed; production kernel selection remains open.  
**Earlier evidence:** The initial BRepJS/Manifold baselines are recorded below as historical run evidence. Their original runs are distinct from Run #37.  
**Current verification:** [Geometry Kernel Benchmark Run #62](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42383737199), commit `3038f019b92414a5f4781846703cc3ca61297384` (11/11 jobs successful). Run #37 remains historical evidence.

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

## 3. Historical Run #37 — partial evidence

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

## 8. Runner improvements committed for next run

Commit [`d274fd1`](https://github.com/terajuciptabina-eng/Arqenvo-2.0/commit/d274fd1b94bd3f6a844e678ad850b77f8cea8bf1) updates the BRepJS runner:

- K12 now exports the initial and moved opening results to STEP, extracts normalized `CARTESIAN_POINT` coordinate sets, and requires the geometric signatures to differ while both volumes match the expected equal volumes. If the STEP coordinate extraction yields no points, the movement check fails closed.
- K13 now samples process RSS at edit 1, every 10 edits and edit 100; checks 100 finite volume observations and exactly two alternating volumes; then exports/imports the final regenerated solid and compares its volume.
- K15 STEP content detection now checks the ISO-10303-21 envelope and solid/surface geometry entities rather than assuming one specific `MANIFOLD_SOLID_BREP` token.

K13 RSS sampling remains observational only: no forced garbage collection or controlled repeated-run memory slope is claimed. K12's STEP coordinate signature is a geometric point-set comparison, not a substitute for application-level host dependency tests.

## 9. License evidence collection

The workflow now includes a package-license inventory job for the pinned BRepJS/OCCT-WASM, Manifold and OpenGeometry dependency trees. It records package name/version, declared license metadata, repository metadata and top-level LICENSE/COPYING/NOTICE files. This is an inventory for legal review, not a legal opinion or approval; transitive license obligations, binary redistribution terms and hosted-service implications still require review.

## 10. Remaining verification gate

The hosted geometry benchmark matrix is complete for Run #62. Remaining work before any production-kernel decision is independent topology/STEP inspection across the complete fixture set, application-level wall-priority and host-dependency tests, semantic material identity persistence, physical iPad Safari testing, controlled worker/performance/memory testing, and legal review of redistribution and hosted-service obligations. Do not treat the hosted prototype matrix as production certification.

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


## 11. Run #62 — final hosted benchmark matrix (2026-11-07)

[Run #62](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42383737199), commit 3038f019b92414a5f4781846703cc3ca61297384, completed with **11/11 jobs successful**.

### 11.1 BRepJS + OCCT-WASM full suite

Both Ubuntu x64 and macOS arm64 benchmark reports have validation status pass and empty failure arrays. The main suite completed K01, K03–K09, K11–K13 and K15; K02 and K10 were run as separate curved-geometry jobs.

K12 passed on both platforms:

| Platform | K12 operation | Initial volume | Moved volume | Geometry changed |
|---|---:|---:|---:|---|
| Ubuntu x64 | 78.92 ms | 1,422,000,000 mm³ | 1,422,000,000 mm³ | Yes |
| macOS arm64 | 19.41 ms | 1,422,000,000 mm³ | 1,422,000,000 mm³ | Yes |

Both outputs have 51 STEP Cartesian points, different normalized geometry signatures, and zero volume delta from expected values. This verifies that the opening position changed rather than relying on equal volume alone.

K13 completed 100 regenerations on both platforms, with all volume samples finite, two expected alternating volumes, and a final STEP export/import volume delta of zero. This is repeat-regeneration evidence, not a controlled memory-leak proof. K15 passed STEP export/import and geometry-content checks with zero volume delta.

### 11.2 Curved geometry

- K02 passed on macOS arm64: expected 942,477,796.0769379 mm³, measured 942,477,796.0769384 mm³, absolute delta approximately 0.000000477 mm³, fixture tolerance 0.1 mm³.
- K10 passed on macOS arm64: expected 795,870,138.9094143 mm³, measured 795,870,138.9094145 mm³, absolute delta approximately 0.000000238 mm³, fixture tolerance 0.5 mm³.

### 11.3 Other candidate and browser jobs

- Manifold 3.5.4 passed K01, K03 and K07 on Ubuntu and macOS with exact fixture volume matches and no reported failures. It remains a mesh-kernel control, not an exact B-Rep replacement.
- BRepJS WebKit desktop and iPad-like emulation both passed the 600,000,000 mm³ browser smoke test with no browser errors or failed requests. This does not certify physical iPad Safari.
- OpenGeometry 2.0.18 browser probe passed its current single cuboid-subtraction test. Its volume observation is based on tessellated mesh geometry and does not establish parity with the full wall fixture matrix.
- License inventories completed for BRepJS/OCCT-WASM, Manifold and OpenGeometry. These are inventories only, not legal approval.

### 11.4 K12 root cause and correction

The K12 fixture omitted wall.baseElevation. The BRepJS wall-box helper previously added that value directly to the wall vertical center; an omitted value could therefore propagate NaN into the generated host geometry. The K12 cutter also omitted the wall base elevation from its vertical placement.

The correction adds baseElevation 0 to the K12 fixture, defaults a missing wall base elevation to zero in the shared wall-box helper, includes the wall base elevation in K12 cutter placement, and builds independent host solids for the initial and moved opening states.

After correction, isolated K12 passed on Ubuntu and macOS, then passed again inside the complete BRepJS suite on both platforms. No tolerance was relaxed.

### 11.5 Decision

Run #62 closes the current hosted prototype benchmark and runner verification task. It does not select a production kernel. Remaining gates are application-level BIM wall junction/priority logic, host dependency behavior, material metadata persistence, physical iPad Safari, controlled worker/performance/memory tests, independent topology inspection, and qualified legal review.
