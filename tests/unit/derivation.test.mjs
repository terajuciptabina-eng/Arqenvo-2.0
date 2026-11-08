import test from "node:test";
import assert from "node:assert/strict";
import { createComposite, createOpening, createWall, createProject } from "../../src/bim/model.mjs";
import { deriveProjectPlan, deriveWallPlan } from "../../src/geometry/wall-derivation.mjs";
import { validateSimplePolygon } from "../../src/geometry/polygon-validation.mjs";

test("three-skin wall derives ordered material-preserving prisms", () => {
  const wall = createWall({ id: "w", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000, baseElevation: 100 });
  const composite = createComposite({ id: "c", skins: [
    { id: "s1", thickness: 20, materialId: "brick" },
    { id: "s2", thickness: 160, materialId: "concrete" },
    { id: "s3", thickness: 20, materialId: "plaster" }
  ] });
  const plan = deriveWallPlan(wall, composite);
  assert.deepEqual(plan.skins.map((s) => s.offsetRange), [[-100, -80], [-80, 80], [80, 100]]);
  assert.deepEqual(plan.skins.map((s) => s.materialId), ["brick", "concrete", "plaster"]);
  assert.deepEqual(plan.zRange, [100, 3100]);
});

test("hosted door/window cut plans respect anchors and elevations", () => {
  const wall = createWall({ id: "w", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  const door = createOpening({ id: "d", type: "door", hostWallId: "w", anchor: "center", positionAlongBaseline: 900, width: 900, height: 2100 });
  const window = createOpening({ id: "win", type: "window", hostWallId: "w", anchor: "left", positionAlongBaseline: 1600, width: 800, height: 1200, sillElevation: 900 });
  const plan = deriveWallPlan(wall, null, [door, window]);
  assert.deepEqual(plan.openings.map((o) => o.localRange), [[450, 1350], [1600, 2400]]);
  assert.deepEqual(plan.openings[1].zRange, [900, 2100]);
  assert.equal(plan.openings.every((o) => o.cutDepth === "through-all-skins"), true);
});

test("left and right reference lines offset the wall body from the drawn baseline", () => {
  const leftWall = createWall({ id: "left", baseline: [[0, 0], [1000, 0]], referenceLine: "left", thickness: 200, height: 3000 });
  const rightWall = createWall({ id: "right", baseline: [[0, 0], [1000, 0]], referenceLine: "right", thickness: 200, height: 3000 });
  const leftPlan = deriveWallPlan(leftWall);
  const rightPlan = deriveWallPlan(rightWall);
  assert.deepEqual(leftPlan.skins[0].offsetRange, [-200, 0]);
  assert.deepEqual(rightPlan.skins[0].offsetRange, [0, 200]);
});

test("project derivation applies an L-junction miter to both wall skins", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.b = createWall({ id: "b", baseline: [[3000, 0], [3000, 2000]], thickness: 200, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.junctions[0].type, "L");
  assert.equal(result.walls.a.junctionCaps.length, 1);
  assert.equal(result.walls.b.junctionCaps.length, 1);
  assert.deepEqual(result.walls.a.junctionCaps[0].points, result.walls.b.junctionCaps[0].points);
  assert.notDeepEqual(result.walls.a.skins[0].footprint[1], [3000, -100]);
});

test("project derivation trims a T branch but preserves its host wall baseline", () => {
  const project = createProject();
  project.walls.host = createWall({ id: "host", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.branch = createWall({ id: "branch", baseline: [[1500, 0], [1500, 2000]], thickness: 200, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.junctions[0].type, "T");
  assert.equal(result.walls.host.junctionCaps, undefined);
  assert.equal(result.walls.branch.junctionCaps.length, 1);
});

test("simple polygon validation accepts a rectangular wall footprint", () => {
  const result = validateSimplePolygon([[0, 0], [1000, 0], [1000, 200], [0, 200]]);
  assert.equal(result.valid, true);
  assert.equal(result.area, 200000);
  assert.equal(result.winding, "counterclockwise");
});

test("simple polygon validation rejects a self-intersecting footprint", () => {
  const result = validateSimplePolygon([[0, 0], [4, 4], [0, 4], [3, 0]]);
  assert.equal(result.valid, false);
  assert.equal(result.code, "POLYGON_SELF_INTERSECTION");
});

test("simple polygon validation rejects zero-length edges and non-finite coordinates", () => {
  assert.equal(validateSimplePolygon([[0, 0], [0, 0], [1, 1]]).code, "POLYGON_ZERO_LENGTH_EDGE");
  assert.equal(validateSimplePolygon([[0, 0], [1, 0], [0, Number.NaN]]).code, "POLYGON_POINT_NOT_FINITE");
});

test("derived wall plans expose footprint validity for every skin", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.b = createWall({ id: "b", baseline: [[3000, 0], [3000, 2000]], thickness: 200, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.geometryValidation.a.length, 1);
  assert.equal(result.geometryValidation.b.length, 1);
  assert.equal(result.geometryValidation.a[0].valid, true);
  assert.equal(result.geometryValidation.b[0].valid, true);
  assert.equal(result.diagnostics.some((item) => item.code === "DERIVED_SKIN_FOOTPRINT_INVALID"), false);
});

test("reversed baseline directions preserve valid L-junction skin footprints", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[3000, 0], [0, 0]], thickness: 200, height: 3000 });
  project.walls.b = createWall({ id: "b", baseline: [[3000, 2000], [3000, 0]], thickness: 200, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].type, "L");
  assert.equal(result.geometryValidation.a[0].valid, true);
  assert.equal(result.geometryValidation.b[0].valid, true);
  assert.equal(result.diagnostics.some((item) => item.code === "DERIVED_SKIN_FOOTPRINT_INVALID"), false);
});

test("reversed host and branch baselines preserve valid T-junction branch footprint", () => {
  const project = createProject();
  project.walls.host = createWall({ id: "host", baseline: [[3000, 0], [0, 0]], thickness: 200, height: 3000 });
  project.walls.branch = createWall({ id: "branch", baseline: [[1500, 2000], [1500, 0]], thickness: 200, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.junctions[0].type, "T");
  assert.equal(result.geometryValidation.host[0].valid, true);
  assert.equal(result.geometryValidation.branch[0].valid, true);
});
