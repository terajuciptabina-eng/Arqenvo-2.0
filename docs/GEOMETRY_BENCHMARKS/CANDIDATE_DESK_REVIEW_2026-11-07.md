# Geometry Kernel Candidate Desk Review — 2026-11-07

**Status:** Run #62 completed with 11/11 hosted jobs successful. BRepJS + OCCT-WASM passed the expanded suite on Ubuntu and macOS; K02/K10 passed separately. Manifold, WebKit, OpenGeometry browser and all license-inventory jobs also completed successfully. No production kernel is selected.  
**Decision authority:** Existing ADR-0002 remains in force until the complete benchmark and license gates are satisfied.

## 1. Executive conclusion

Continue an isolated prototype comparison, not production integration:

1. **BRepJS 20.18.0 + OCCT-WASM 5.15.0** — leading exact B-Rep prototype; Run #62 expanded suite passed on Ubuntu and macOS, including K12 geometric movement proof, K13 100 regenerations and K15 STEP round-trip.
2. **OpenGeometry 2.0.18** — run a limited browser Boolean probe against its pinned package API. Its measured output is tessellated mesh volume and must not be overstated as native exact-volume proof.
3. **Manifold 3.5.4** — mesh Boolean/topology control and possible secondary derived-mesh layer; not an exact B-Rep candidate.
4. **Direct opencascade.js** — retain as fallback investigation only if wrapper limitations block required OCCT operations.

Prototype order is not a performance ranking, production decision or legal approval.

## 2. Candidate comparison

| Candidate | Geometry model | Current evidence | Principal limitations |
|---|---|---|---|
| BRepJS + OCCT-WASM | Exact B-Rep | Run #62 full non-curved suite passed on Ubuntu/macOS; K02/K10 curved cases passed separately; K12 movement, K13 100 edits and K15 STEP round-trip passed | Independent topology audit, application BIM solver parity, physical iPad Safari, controlled memory/worker review, legal review remain |
| OpenGeometry 2.0.18 | Analytic B-Rep with tessellated mesh view | Run #62 browser probe passed on pinned 2.0.18 package | One straight cuboid case only; measured volume from BufferGeometry; no curved, multiskin, junction or STEP parity |
| Manifold 3.5.4 | Manifold triangle mesh | Run #62 Ubuntu/macOS K01/K03/K07 exact fixture matches | Not exact B-Rep; current fixture coverage narrow; skin metadata persistence untested |
| Direct opencascade.js | OCCT B-Rep | Desk review only | Package/OCCT version, browser build, API surface, maintenance and integration cost unverified |

## 3. Technical findings

### BRepJS + OCCT-WASM

Prior reports describe brepjs 20.18.0 with occt-wasm 5.15.0 and successful exact B-Rep volume operations. The browser harness previously passed Playwright WebKit desktop and iPad-like emulation using explicit kernel initialization. This is not physical iPad Safari validation.

The current runner source includes K01–K13 and K15. The main full-suite workflow sets `SKIP_CURVED_CASES=1`, and K02/K10 run as separate jobs. Thus a complete BRepJS verification needs both the main suite and both curved jobs. Run #37 has not yet completed at the time of this report update.

The source also shows important interpretation boundaries:
- K03/K04/K05 consume precomputed wall-end solids; they do not test ARQENVO BIM junction priority logic.
- K06/K07/K08 create separate skin solids and compare volumes; application-level material metadata persistence is not established.
- K12 compares normalized STEP Cartesian-point signatures as well as equal expected volumes. Run #62 confirms different geometry signatures on Ubuntu and macOS.
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
| BRepJS K01–K15 applicable suite | Run #62 passed on Ubuntu/macOS; K02/K10 separate jobs passed; K14 is WebKit emulation only |
| Wall junction geometry and BIM priority logic | Kernel Boolean fixtures only; BIM solver not tested |
| Composite skin identity/material attributes | Volumes separated; semantic persistence not verified |
| Door/window cuts, straight and curved | K07 earlier baseline; K08/K09/K10 require current evidence |
| Thickness/edit/move regeneration | K11–K13 passed; K12 STEP signatures prove movement; K13 completed 100 regenerations |
| STEP round-trip | Historical exports; current K15 artifact needs independent inspection |
| Browser and physical iPad Safari | Prior Playwright smoke; physical device not tested |
| Worker responsiveness and memory stability | Not sufficiently measured |
| Production license/legal review | Not approved |
| Replaceable adapter in application | Not implemented or approved |

## 5. Runner verification improvements

Commits `d274fd1b94bd3f6a844e678ad850b77f8cea8bf1` and `4104be2099685d0d9100af0c4bdc6e884237b7c6` strengthen K12/K13. Run #62 validates K12 STEP movement signatures and K13 100-edit/round-trip checks on Ubuntu and macOS. K13 memory samples remain observational and do not establish leak freedom.

## 6. Licensing evidence

A new workflow job inventories declared licenses and package license files for all three pinned candidate dependency trees. Its artifact is evidence collection only; it does not determine compatibility with ARQENVO's distribution model. Review LGPL obligations for the OCCT-WASM binary and wrapper distribution, transitive dependencies, notices and the actual hosted/distributed delivery model with qualified counsel before production use.

## 7. Current recommendation

Do not select or integrate a production geometry kernel yet.

Keep BRepJS + OCCT-WASM as the lead exact B-Rep prototype for further verification, retain OpenGeometry 2.0.18 as a limited browser candidate pending broader proof, and retain Manifold only as a mesh control/possible secondary layer. Do not decide on timing numbers alone.

Run #37 is terminal with conclusion `cancelled`. Its BRepJS Ubuntu artifact was partially uploaded and independently STEP-import audited: 11 STEP files for K01/K03/K04/K05/K06/K07/K09 imported as valid single solids with volumes matching their fixtures. The benchmark JSON is absent from that artifact, and remaining jobs were cancelled. The workflow concurrency has been corrected in commit `cd4ac8b1e049d9920c18036b23afaa514ed56ec4`. The next gate is a fresh protected benchmark run, followed by independent K12/K13/K15, broader OpenGeometry fixtures, physical-device Safari, controlled performance/memory checks, and license review.


## 8. Run #62 final evidence and K12 correction

[Run #62](https://github.com/terajuciptabina-eng/Arqenvo-2.0/actions/runs/42383737199), commit 3038f019b92414a5f4781846703cc3ca61297384, completed with 11/11 jobs successful.

BRepJS + OCCT-WASM passed its full applicable suite on Ubuntu x64 and macOS arm64. K02 and K10 passed separately. K12 passed on both platforms with initial/moved expected and measured volumes of 1,422,000,000 mm³, different normalized STEP geometry signatures, and movementGeometryChanged true. K13 completed 100 regenerations and final STEP round-trip; K15 passed STEP round-trip and geometry-content checks.

The K12 hang was caused by an omitted wall.baseElevation in the fixture while the wall generator used that value directly in its Z coordinate. The fixture now declares zero, the shared generator and cutter safely default missing base elevation to zero, and the initial/moved states use independent host solids. Corrected K12 first passed in isolation on Ubuntu/macOS and then passed in the complete BRepJS matrix on both platforms.

Run #62 also passed Manifold on Ubuntu/macOS, BRepJS WebKit desktop/iPad-like emulation, the OpenGeometry 2.0.18 browser probe, and all package-license inventory jobs. Physical iPad Safari remains untested; WebKit emulation is not device certification. OpenGeometry remains a single cuboid probe with tessellated-volume measurement. Manifold remains a mesh kernel. License inventories are not legal approval.

**Decision:** BRepJS + OCCT-WASM remains the leading exact B-Rep prototype, but no production kernel is selected until application BIM junction/priority logic, host dependency behavior, semantic skin metadata, physical iPad Safari, controlled performance/worker/memory testing, independent topology inspection and legal review are complete.
