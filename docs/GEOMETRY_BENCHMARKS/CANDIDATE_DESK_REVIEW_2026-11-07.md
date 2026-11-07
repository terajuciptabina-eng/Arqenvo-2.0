# Geometry Kernel Candidate Desk Review — 2026-11-07

**Status:** Initial runtime baseline completed for K01, K03, K06 and K07. BRepJS + OCCT-WASM passed exact analytic-volume checks on Ubuntu and macOS and a Playwright WebKit desktop/iPad-like smoke test. Manifold passed the applicable mesh-control fixtures. The full K01–K15 matrix remains incomplete. No production kernel is selected.  
**Purpose:** Narrow the candidates for the first isolated ARQENVO 2.0 prototype.  
**Decision authority:** Existing ADR-0002 remains in force until the full benchmark and license gates pass.

## 1. Executive conclusion

Prioritise a controlled prototype comparison of:

1. **brepjs 20.x + occt-wasm 5.x** — currently published TypeScript API over an Open CASCADE WebAssembly kernel.
2. **OpenGeometry** — browser-native B-Rep CAD kernel with Rust/WASM and Three.js SDK; resolve the repository/npm release mismatch before implementation.
3. **Manifold 3.x** — robust manifold triangle-mesh Boolean library as a mesh-kernel control/possible secondary representation.

Keep direct **opencascade.js** as a fallback investigation if the wrappers fail to expose a required OCCT capability. Do not select based on documentation claims alone.

## 2. Candidate comparison

| Candidate | Geometry model | Browser/WASM evidence | Initial fit | Main risk |
|---|---|---|---|---|
| brepjs + occt-wasm | Exact B-Rep | WASM; worker-ready; Three.js mesh adapter | Strong B-Rep candidate with typed API and STEP workflow | OCCT kernel LGPL obligations; WASM SIMD/tail-call browser baseline; API/version policy |
| OpenGeometry | B-Rep solids and wires | Rust/WASM; Three.js SDK; tessellation worker | Strong browser-native candidate for extrude, sweep and Booleans | GitHub README describes 3.0.0 while npm search results surfaced 2.0.x packages; API/package mismatch must be resolved |
| Manifold 3.x | Manifold triangle meshes | JS/TS npm binding and browser WASM | Strong Boolean/topology robustness candidate for derived mesh operations | Not a B-Rep kernel; input must already be manifold |
| direct opencascade.js | OCCT B-Rep | Emscripten/WASM port | Broad OCCT capability and direct access if wrappers are insufficient | Low-level integration, bundler/build complexity, larger distribution and LGPL obligations |

## 3. Candidate findings from official project material

### brepjs + occt-wasm

The brepjs v20 documentation describes an exact B-Rep API, a TypeScript type system for topology invariants, an OCCT WASM kernel as the current default, Web Worker support, a Three.js mesh adapter and STEP/IGES/DXF/GLB-related exchange workflows. The official installation guide supports browser WASM and documents Vite bundling. Its first-solid and Boolean guides provide explicit primitive, Boolean, measurement and export calls.

The npm results retrieved on 2026-11-07 surfaced brepjs 20.18.0 and occt-wasm 5.15.0. Treat these as candidate versions observed during this review, not as an instruction to install unpinned latest versions later.

The brepjs wrapper is Apache-2.0, but the default occt-wasm kernel's compiled WASM output is LGPL-2.1-only. The optional brepkit kernel is described as AGPL-3.0-only or commercial in current 3.x documentation; do not adopt that optional kernel for a proprietary hosted product without a separate legal and commercial decision. brepjs's own license does not override the selected kernel's license.

The occt-wasm package states that its WASM build requires SIMD, tail calls and WASM exception support, and lists Safari 17.2+ as the earliest verified Safari version. This is a published compatibility floor, not proof of performance or stability on iPad Safari.

Potential fit: strong B-Rep abstraction and exact CAD workflow.  
Prototype questions: API maturity, memory lifetime/disposal, custom wall profile operations, browser worker integration, WASM payload and iPad Safari performance, LGPL distribution obligations, and whether the wrapper exposes all needed topology operations.

Official sources:
- https://brepjs.dev/
- https://brepjs.dev/getting-started/install
- https://brepjs.dev/getting-started/first-solid
- https://brepjs.dev/tasks/booleans
- https://www.npmjs.com/package/brepjs
- https://www.npmjs.com/package/occt-wasm

### OpenGeometry

The current OpenGeometry GitHub repository README describes version 3.0.0. It documents B-Rep solids, Boolean union/subtract/intersect, extrusion, sweep and revolve, STEP export, body validity queries, transaction marks/rollback and tessellation in a worker or inline. It integrates directly with Three.js and is distributed under MPL-2.0.

**Release mismatch discovered:** npm search results retrieved on 2026-11-07 surfaced OpenGeometry 2.0.x package versions, while the repository's current README describes 3.0.0. The exact 3.0.0 installable npm artifact was not established by this review. Do not write a production integration against the 3.0 README until the published package/version and its matching source/API are confirmed.

The project states that its API and package structure are evolving. Its 3.0 feature list excludes curves other than lines, circles and arcs, and lists some capabilities that existed in 2.0 as absent in 3.0. The prototype must therefore pin an exact published version and validate every required profile/curve workflow.

**Runtime probe update (2026-11-07):** The exact npm package `opengeometry@2.0.18` initialized its WASM runtime and constructed a `Cuboid` in Playwright WebKit desktop and iPad-like emulation. The first probe found that the `Cuboid` wrapper exposes placement/configuration/edit methods but no obvious public `volume`, `validity`, `getBrep` or `getBounds` query on the wrapper. A follow-up probe is inspecting the nested kernel and package exports. This is only a browser initialization/construction pass; no Boolean, curved-wall, topology or STEP result is claimed.

- Desktop WebKit: initialization + cuboid construction 45 ms.
- iPad-like WebKit: initialization + cuboid construction 39 ms.
- Package: opengeometry 2.0.18; Three.js 0.184.0; declared license MPL-2.0.
- The package's current npm readme uses the 2.0 API. The upstream repository README explicitly says it describes 3.0 and that the 2.0 line has a different API. Keep those API lines separate.

Potential fit: browser-first, Rust/WASM and Three.js integration.  
Prototype questions: published version/API alignment, custom profile boundaries, exact arc handling, B-Rep access, Boolean reliability for multiple wall skins/openings, iPad Safari memory, rollback semantics, and whether worker execution covers geometry computation or only tessellation.

Official sources:
- https://github.com/OpenGeometry-io/OpenGeometry
- https://www.npmjs.com/package/opengeometry
- https://opengeometry.io/

### Manifold

The official documentation describes Manifold as a library for creating and operating on manifold triangle meshes. It provides a JS/TS npm package and browser WASM support. Its stated goal is reliable manifold output and its Boolean algorithm is designed around manifold mesh input. It supports arbitrary vertex properties and material mapping.

Potential fit: a strong candidate for mesh Boolean and derived watertight display geometry.  
Limitation: it is not a B-Rep kernel. It cannot be the authoritative parametric CAD representation if ARQENVO requires exact curves, faces/edges/vertices and CAD exchange semantics. Its mesh output may still be useful as a secondary representation.

Official sources:
- https://manifoldcad.org/docs/html/
- https://manifoldcad.org/docs/jsapi/
- https://github.com/elalish/manifold

### Open CASCADE Technology / opencascade.js

The current official OCCT documentation describes a broad C++ CAD/CAM/CAE platform with geometric and topological modeling, modeling algorithms, mesh, visualization, STEP/IGES exchange and application framework capabilities. The official documentation identifies LGPL-2.1 with an additional exception and explicitly describes obligations for proprietary applications, including notices, source availability and ensuring users can run a modified OCCT component.

The opencascade.js project is an Emscripten/WASM port, but its published repository/package history needs careful version verification; the stable 1.1.1 package and current 2.0 beta documentation are not interchangeable. The project README has referenced an older OCCT version. Do not assume the latest native OCCT release is the version included in a particular WASM package.

Potential fit: extensive B-Rep/CAD functionality if the required APIs are exposed.  
Risk: integration/build complexity, WASM payload, wrapper maintenance and LGPL obligations.

Official sources:
- https://www.occt3d.com/dev/doc/overview/html/index.html
- https://github.com/donalffons/opencascade.js
- https://ocjs.org/

## 4. Preliminary ranking for prototype order (not final kernel selection)

**Runtime update (2026-11-07):** BRepJS + OCCT-WASM has now passed the initial exact-BRep fixture set (K01, K03, K06, K07) on Ubuntu x64 and macOS arm64, and passed one browser WASM solid test in Playwright WebKit desktop and iPad-like emulation. Manifold 3.5.4 matched its applicable K01, K03 and K07 mesh-control volumes and reported `NoError`. See [First Runtime Benchmark Report](./FIRST_RUNTIME_BENCHMARK_REPORT_2026-11-07.md). These results establish a prototype lead, not a final production selection.

| Priority | Candidate | Reason to test |
|---:|---|---|
| 1 | brepjs + occt-wasm | Current published v20/v5 package line, exact B-Rep API, explicit WASM/worker integration and browser guidance |
| 2 | OpenGeometry | Strong browser-native direction, but confirm published package/API alignment before coding |
| 3 | Manifold | Establish robust mesh Boolean baseline and evaluate as a possible secondary mesh engine |
| 4 | direct opencascade.js | Retain as fallback if higher-level wrappers block required OCCT operations |

This ranking only orders the prototype work. It is not a performance, quality or legal-compliance verdict.

## 5. Benchmark plan mapped to ARQENVO wall evidence

Use identical semantic input fixtures and tolerances for every candidate. Keep the ARQENVO wall-junction algorithm outside the kernel so the benchmark distinguishes BIM connection logic from generic solid operations.

| Test | Scenario | Required observation |
|---|---|---|
| K01 | 1000 × 200 × 3000 mm straight wall | exact dimensions, valid closed solid, mesh generation |
| K02 | Arc/curved wall segment | exact arc/profile support and stable sweep/extrude |
| K03 | L-junction of two walls | wall solver output can be converted to valid solid(s) |
| K04 | T-junction | no invalid topology after wall-end trimming |
| K05 | Cross-junction | deterministic multi-solid result and no unintended internal faces |
| K06 | 3-skin composite wall | separate skin boundaries and material IDs retained |
| K07 | Door opening through all skins | Boolean success, valid solid and correct opening dimensions |
| K08 | Window with sill/reveal | wall cut plus independent reveal/jamb geometry |
| K09 | Multiple openings | repeated Boolean success and stable topology |
| K10 | Curved wall opening | valid cut limits and topology |
| K11 | Rebuild after wall thickness change | no stale geometry and deterministic result |
| K12 | Rebuild after host/opening movement | dependency invalidation and regeneration |
| K13 | 100 repeated edits | no accumulating drift, leaks or invalid shapes |
| K14 | iPad Safari | load time, peak memory, interaction responsiveness, worker/WASM support |
| K15 | export/reimport | STEP round-trip if supported; otherwise record limitation |

Record for each run: exact package/version, browser/device/OS, WASM size, initialisation time, operation latency, peak memory if measurable, validity result, topology counts, dimensional deviation, worker responsiveness, failure logs and license review.

## 6. Selection gate

Do not approve a production kernel until all of the following are complete:

- [ ] Candidate versions pinned and reproducible.
- [ ] Same K01–K15 fixtures run on each applicable candidate.
- [ ] Topology validity and dimensional checks pass agreed tolerances.
- [ ] L/T/cross wall joins are tested with ARQENVO's own BIM solver.
- [ ] Composite skins retain per-skin identity and material attributes.
- [ ] Door/window cuts pass on straight and curved hosts.
- [ ] Repeated edits do not leave stale geometry or memory leaks.
- [ ] Desktop and iPad Safari tests completed.
- [ ] License and hosted-service/distribution obligations reviewed.
- [ ] Kernel adapter remains replaceable.
- [ ] ADR-0002 is updated with results and final decision.

## 7. Immediate next engineering action

The first isolated spike is now in place and K01, K03, K06 and K07 have an automated baseline. Next, expand the shared fixture schema and adapters to K02, K04, K05, K08–K13 and K15, then prove the exact published OpenGeometry package/API line. Keep the benchmark separate from application source code. If a candidate cannot preserve skin identity, generate a valid junction or reliably cut a hosted opening, record the failure rather than adding a one-off workaround. K14 remains a real-device Safari validation gate: the automated WebKit iPad-like profile is only a preliminary browser check.
