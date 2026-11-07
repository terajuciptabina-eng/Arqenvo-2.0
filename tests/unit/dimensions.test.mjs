import test from "node:test";
import assert from "node:assert/strict";
import { createDimension, createProject, createWall, validateProject } from "../../src/bim/model.mjs";
import { deriveDimensionPlan } from "../../src/geometry/dimension-derivation.mjs";

test("chain and total dimensions use their Archicad-style default offsets", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.b = createWall({ id: "b", baseline: [[3000, 0], [3000, 2000]], thickness: 200, height: 3000 });
  const chain = createDimension({ id: "chain", kind: "chain", anchors: [{ type: "wall-endpoint", wallId: "a", endpoint: "start" }, { type: "wall-endpoint", wallId: "a", endpoint: "end" }] });
  const total = createDimension({ id: "total", kind: "total", anchors: [{ type: "wall-endpoint", wallId: "a", endpoint: "start" }, { type: "wall-endpoint", wallId: "b", endpoint: "end" }] });
  project.dimensions.chain = chain;
  project.dimensions.total = total;
  assert.equal(validateProject(project), true);
  assert.equal(chain.offset, 1000);
  assert.equal(total.offset, 1400);
  assert.equal(deriveDimensionPlan(project, chain).totalValue, 3000);
  assert.equal(deriveDimensionPlan(project, total).totalValue, Math.hypot(3000, 2000));
});

test("dimensions reject references to missing walls and invalid offsets", () => {
  const project = createProject();
  project.dimensions.bad = createDimension({ id: "bad", anchors: [{ type: "wall-endpoint", wallId: "missing", endpoint: "start" }, { type: "point", point: [0, 0] }] });
  assert.throws(() => validateProject(project), /missing wall/);
  assert.throws(() => createDimension({ id: "bad-offset", offset: -100, anchors: [{ type: "point", point: [0, 0] }, { type: "point", point: [100, 0] }] }), /positive/);
});

test("chain dimensions derive segment values while total dimensions derive one overall value", () => {
  const project = createProject();
  project.walls.w = createWall({ id: "w", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  const anchors = [
    { type: "point", point: [0, 0] },
    { type: "point", point: [1500, 0] },
    { type: "point", point: [3000, 0] }
  ];
  const chain = createDimension({ id: "chain-3", kind: "chain", anchors });
  const total = createDimension({ id: "total-3", kind: "total", anchors });
  assert.equal(deriveDimensionPlan(project, chain).segments.length, 2);
  assert.equal(deriveDimensionPlan(project, total).segments.length, 1);
  assert.equal(deriveDimensionPlan(project, total).segments[0].value, 3000);
});
