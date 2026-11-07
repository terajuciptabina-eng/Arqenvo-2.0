import test from "node:test";
import assert from "node:assert/strict";
import { createWall } from "../../src/bim/model.mjs";
import { solveWallJunctions } from "../../src/geometry/junction-solver.mjs";

test("L junction produces deterministic miter points", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[3000, 0], [3000, 2000]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions[0].type, "L");
  assert.equal(result.junctions[0].operation, "trim-plan");
  assert.equal(result.junctions[0].geometry.outer.every(Number.isFinite), true);
  assert.equal(result.junctions[0].geometry.inner.every(Number.isFinite), true);
});

test("T junction resolves a branch cap against the host wall", () => {
  const walls = [
    createWall({ id: "host", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "branch", baseline: [[1500, 0], [1500, 2000]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions[0].type, "T");
  assert.equal(result.junctions[0].geometry.hostWallId, "host");
  assert.equal(result.junctions[0].geometry.cap.length, 2);
});

test("cross junction is classified for explicit kernel union", () => {
  const walls = [
    createWall({ id: "h", baseline: [[-1500, 0], [1500, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "v", baseline: [[0, -1500], [0, 1500]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions[0].type, "CROSS");
  assert.equal(result.junctions[0].operation, "kernel-union-required");
});
