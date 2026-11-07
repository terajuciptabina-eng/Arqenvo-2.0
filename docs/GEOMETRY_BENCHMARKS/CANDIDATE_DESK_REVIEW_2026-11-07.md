# Geometry Kernel Candidate Desk Review — 2026-11-07

**Status:** Desk research only. No runtime benchmark has been executed. No kernel is selected.  
**Purpose:** Narrow the candidates for the first isolated ARQENVO 2.0 prototype.  
**Decision authority:** Existing ADR-0002 remains in force until the full benchmark and license gates pass.

## 1. Executive conclusion

Prioritise a controlled prototype comparison of:

1. **OpenGeometry 3.x** — browser-native B-Rep CAD kernel with Rust/WASM and Three.js SDK.
2. **brepjs v20 + occt-wasm** — typed TypeScript API over an Open CASCADE WebAssembly kernel.
3. **Manifold 3.x** — robust manifold triangle-mesh Boolean library as a mesh-kernel control/possible secondary representation.

Keep direct **opencascade.js** as a fallback investigation if the wrappers fail to expose a required OCCT capability. Do not select based on documentation claims alone.

## 2. Candidate comparison

| Candidate | Geometry model | Browser/WASM evidence | Initial fit | Main risk |
|---|---|---|---|---|
| OpenGeometry 3.x | B-Rep solids and wires | Rust/WASM; Three.js SDK; tessellation worker | Strong browser-native candidate for extrude, sweep and Booleans | Project states API/package is evolving; published feature list omits some curves/features available in earlier 2.0 line |
| brepjs v20 + occt-wasm | Exact B-Rep | WASM; worker-ready; Three.js mesh adapter | Strong B-Rep candidate with typed API and STEP workflow | OCCT kernel LGPL obligations; kernel abstraction and version policy need review |
| Manifold 3.x | Manifold triangle meshes | JS/TS npm binding and browser WASM | Strong Boolean/topology robustness candidate for derived mesh operations | Not a B-Rep kernel; input must already be manifold |
| direct opencascade.js | OCCT B-Rep | Emscripten/WASM port | Broad OCCT capability and direct access if wrappers are insufficient | Low-level integration, bundler/build complexity, large distribution and LGPL obligations |

## 3. Candidate findings from official project material

### OpenGeometry

The current repository README describes version 3.0.0. It documents B-Rep solids, Boolean union/subtract/intersect, extrusion, sweep and revolve, STEP export, body validity queries, transaction marks/rollback and tessellation in a worker or inline. It integrates directly with Three.js and is distributed under MPL-2.0.

The same README says the API and package structure are evolving. Its 3.0 feature list excludes curves other than lines, circles and arcs, and lists some capabilities that existed in 2.0 as absent in 3.0. The project must therefore pin an exact version and validate every required profile/curve workflow.

Potential fit: browser-first, relatively direct WASM setup and worker-backed tessellation.  
Prototype questions: custom profile boundaries, exact arc handling, B-Rep access, Boolean reliability for multiple wall skins/openings, iPad Safari memory, rollback semantics, and whether worker execution covers geometry computation or only tessellation.

Official sources:
- https://github.com/OpenGeometry-io/OpenGeometry
- https://opengeometry.io/

### brepjs + occt-wasm

The brepjs website describes version 20, an exact B-Rep API, a TypeScript type system for topology invariants, an OCCT WASM kernel as the current default, worker-ready operation, a Three.js adapter and STEP/IGES/DXF/GLB-related exchange workflows. The website reports approximately 4.7 MB brotli for occt-wasm.

The brepjs wrapper is Apache-2.0, but the default occt-wasm kernel is identified by the brepjs project as LGPL-2.1-only. The optional brepkit kernel is described as AGPL-3.0-only or commercial in the current 3.x documentation; do not adopt that optional kernel for a proprietary hosted product without a separate legal and commercial decision. brepjs's own license does not override the selected kernel's license.

Potential fit: strong B-Rep abstraction and exact CAD workflow.  
Prototype questions: API maturity, memory lifetime/disposal, custom wall profile operations, browser worker integration, WASM payload and Safari performance, LGPL distribution obligations, and whether the wrapper exposes all needed topology operations.

Official sources:
- https://brepjs.dev/
- https://brepjs.dev/getting-started/install
- https://github.com/andymai/brepjs

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

| Priority | Candidate | Reason to test |
|---:|---|---|
| 1 | OpenGeometry 3.x | Directly browser-native, B-Rep, Three.js and worker support; test evolving API against wall-profile requirements |
| 2 | brepjs v20 + occt-wasm | Strong exact B-Rep abstraction and typed API; test legal obligations and wrapper capability |
| 3 | Manifold 3.x | Establish robust mesh Boolean baseline and evaluate as a possible secondary mesh engine |
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

Create an isolated kernel spike only after the benchmark fixture schema is agreed. It must not become application source code and must not decide the final architecture by accident. First prove K01, K03, K06 and K07 for the two leading B-Rep candidates, then expand to the full matrix. If one candidate cannot preserve skin identity or reliably cut a hosted opening, record the failure rather than adding a one-off workaround.
