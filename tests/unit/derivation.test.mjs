import test from "node:test";
import assert from "node:assert/strict";
import { createComposite, createOpening, createWall } from "../../src/bim/model.mjs";
import { deriveWallPlan } from "../../src/geometry/wall-derivation.mjs";

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
