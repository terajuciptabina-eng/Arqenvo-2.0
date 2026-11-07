# Geometry Kernel Candidate Desk Review — 2026-11-07

**Status:** Preliminary technical comparison. BRepJS + OCCT-WASM has historical baseline evidence and Run #37 is in progress. Manifold Ubuntu has a verified Run #37 baseline for K01, K03 and K07. OpenGeometry 2.0.18 has a single Boolean browser probe whose final Run #37 result is still pending. No production kernel is selected.  
**Decision authority:** Existing ADR-0002 remains in force until the complete benchmark and license gates are satisfied.

## 1. Executive conclusion

Continue an isolated prototype comparison, not production integration:

1. **BRepJS 20.18.0 + OCCT-WASM 5.15.0** — leading exact B-Rep prototype based on prior results; Run #37's expanded suite remains unverified while jobs are pending.
2. **OpenGeometry 2.0.18** — run a limited browser Boolean probe against its pinned package API. Its measured output is tessellated mesh volume and must not be overstated as native exact-volume proof.
3. **Manifold 3.5.4** — mesh Boolean/topology control and possible secondary derived-mesh layer; not an exact B-Rep candidate.
4. **Direct opencascade.js** — retain as fallback investigation only if wrapper limitations block required OCCT operations.

Prototype order is not a performance ranking, production decision or legal approval.

## 2. Candidate comparison

| Candidate | Geometry model | Current evidence | Principal limitations |
|---|---|---|---|
| BRepJS + OCCT-WASM | Exact B-Rep | Earlier K01/K03/K06/K07 and Playwright WebKit smoke baseline; Run #37 expanded suite pending | Need full fixture coverage, independent validity/topology inspection, physical iPad Safari, memory/worker review, LGPL review |
| OpenGeometry 2.0.18 | Analytic B-Rep with tessellated mesh view | Probe source performs one cuboid subtraction and calls serialized-BRep validation; Run #37 job pending | One straight case only; measured volume from BufferGeometry; no curved, multiskin, junction or STEP parity |
| Manifold 3.5.4 | Manifold triangle mesh | Run #37 Ubuntu K01/K03/K07 exact volume match; `NoError` | Not exact B-Rep; current fixture coverage narrow; skin metadata persistence untested |
| Direct opencascade.js | OCCT B-Rep | Desk review only | Package/OCCT version, browser build, API surface, maintenance and integration cost unverified |

## 3. Technical findings

### BRepJS + OCCT-WASM

Prior reports describe brepjs 20.18.0 with occt-wasm 5.15.0 and successful exact B-Rep volume operations. The browser harness previously passed Playwright WebKit desktop and iPad-like emulation using explicit kernel initialization. This is not physical iPad Safari validation.

The current runner source includes K01–K13 and K15. The main full-suite workflow sets `SKIP_CURVED_CASES=1`, and K02/K10 run as separate jobs. Thus a complete BRepJS verification needs both the main suite and both curved jobs. Run #37 has not yet completed at the time of this report update.

The source also shows important interpretation boundaries:
- K03/K04/K05 consume precomputed wall-end solids; they do not test ARQENVO BIM junction priority logic.
- K06/K07/K08 create separate skin solids and compare volumes; application-level material metadata persistence is not established.
- K12 compares initial and moved opening cut volumes. Equal volumes are expected and do not establish the opening position changed geometrically.
- K13 alternates regenerated box dimensions 100 times. RSS before/after is only a coarse process observation, not a controlled leak test.
- K15 exports/imports STEP and compares volume; independent STEP structure/topology inspection is still required.

The earlier package/compatibility review notes that the brepjs wrapper is Apache-2.0 while the default occt-wasm kernel is LGPL-2.1-only. This must receive a proper distribution and hosted-service legal review before production.

### OpenGeometry 2.0.18

The repository upstream README currently describes a separate 3.0 API line; the benchmark pins npm `opengeometry@2.0.18`. Do not mix 2.0 package declarations with 3.0 repository examples.

The current browser source:
- initializes WASM and creates a Cuboid;
- creates one analytic cuboid host/cutter;
- calls `booleanSubtraction`;
- measures the resulting Three.js `BufferGeometry` volume against 0.222 m³;
- serializes the B-Rep and calls `validateAnalyticBrep`.

This probe is useful evidence that the pinned 2.0 browser path has a real Boolean operation, not merely initialization. However, it is a single straight cuboid case. Mesh volume and serialized-BRep validation are separate outputs; neither should be generalized to wall junctions, multiskin openings, curved profiles or STEP workflows without additional evidence.

### Manifold 3.5.4

Run #37 Ubuntu produced:
- K01 600,000,000 mm³ exact match, `NoError`;
- K03 2,970,000,000 mm³ exact match, `NoError`;
- K07 remaining skin volumes 22,200,000 / 177,600,000 / 22,200,000 mm³ exact match, each `NoError`;
- total K07 222,000,000 mm³ exact match;
- no benchmark failures.

Manifold's representation is a triangle mesh. This result does not qualify it as the authoritative B-Rep model. It may be evaluated for mesh Boolean or derived display geometry only.

### Direct opencascade.js

Keep as a fallback pending exact package/OCCT version verification, browser build reproducibility, exposed API inspection, memory and asset cost, and maintenance review. Do not infer the version of OCCT embedded in a package from the current native OCCT release.

## 4. Selection gate and outstanding evidence

| Requirement | Status |
|---|---|
| Identical semantic inputs and documented tolerance | Partial; fixture shared, tolerance policy not approved |
| BRepJS K01–K15 applicable suite | Run #37 pending; K02/K10 separate jobs |
| Wall junction geometry and BIM priority logic | Kernel Boolean fixtures only; BIM solver not tested |
| Composite skin identity/material attributes | Volumes separated; semantic persistence not verified |
| Door/window cuts, straight and curved | K07 earlier baseline; K08/K09/K10 require current evidence |
| Thickness/edit/move regeneration | K11–K13 need output review; K12 requires geometric position proof |
| STEP round-trip | Historical exports; current K15 artifact needs independent inspection |
| Browser and physical iPad Safari | Prior Playwright smoke; physical device not tested |
| Worker responsiveness and memory stability | Not sufficiently measured |
| Production license/legal review | Not approved |
| Replaceable adapter in application | Not implemented or approved |

## 5. Runner verification improvements

Commit `d274fd1b94bd3f6a844e678ad850b77f8cea8bf1` strengthens the evidence contract for K12 (actual STEP coordinate-set movement, not only equal volume) and K13 (100 finite volume observations, alternating dimensions, RSS samples and final STEP round-trip). These checks are committed but not yet validated by a completed workflow run. K13 memory samples are observational and do not establish leak freedom.

## 6. Licensing evidence

A new workflow job inventories declared licenses and package license files for all three pinned candidate dependency trees. Its artifact is evidence collection only; it does not determine compatibility with ARQENVO's distribution model. Review LGPL obligations for the OCCT-WASM binary and wrapper distribution, transitive dependencies, notices and the actual hosted/distributed delivery model with qualified counsel before production use.

## 7. Current recommendation

Do not select or integrate a production geometry kernel yet.

Keep BRepJS + OCCT-WASM as the lead exact B-Rep prototype for further verification, retain OpenGeometry 2.0.18 as a limited browser candidate pending broader proof, and retain Manifold only as a mesh control/possible secondary layer. Do not decide on timing numbers alone.

Run #37 is terminal with conclusion `cancelled`. Its BRepJS Ubuntu artifact was partially uploaded and independently STEP-import audited: 11 STEP files for K01/K03/K04/K05/K06/K07/K09 imported as valid single solids with volumes matching their fixtures. The benchmark JSON is absent from that artifact, and remaining jobs were cancelled. The workflow concurrency has been corrected in commit `cd4ac8b1e049d9920c18036b23afaa514ed56ec4`. The next gate is a fresh protected benchmark run, followed by independent K12/K13/K15, broader OpenGeometry fixtures, physical-device Safari, controlled performance/memory checks, and license review.
