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

test("three-wall node is withheld for explicit cluster priority resolution", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[1000, 0], [1000, 1000]], thickness: 200, height: 3000 }),
    createWall({ id: "c", baseline: [[1000, 0], [2000, 1000]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].type, "MULTI_WALL");
  assert.equal(result.junctions[0].wallIds.length, 3);
  assert.equal(result.junctions[0].operation, "manual-review");
  assert.ok(result.diagnostics.some((item) => item.code === "MULTI_WALL_CLUSTER_REQUIRES_PRIORITY_RESOLUTION"));
});

test("near-parallel L junction is rejected when its miter exceeds the safety ratio", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[1000, 0], [0, 17.45]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions[0].type, "ANGLED");
  assert.equal(result.junctions[0].geometry, null);
  assert.ok(result.diagnostics.some((item) => item.code === "MITER_LIMIT_EXCEEDED"));
});

test("collinear end-to-end walls are detected and deferred for priority resolution", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[3000, 0], [5000, 0]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].type, "STRAIGHT");
  assert.equal(result.junctions[0].operation, "priority-resolution-required");
  assert.deepEqual(result.junctions[0].point, [3000, 0]);
  assert.ok(result.diagnostics.some((item) => item.code === "STRAIGHT_WALL_JOIN_REQUIRES_PRIORITY_RESOLUTION"));
});

test("collinear overlapping wall baselines are detected rather than silently ignored", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[1500, 0], [4000, 0]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].type, "COLLINEAR_OVERLAP");
  assert.equal(result.junctions[0].overlap.length, 1500);
  assert.equal(result.junctions[0].operation, "manual-review");
  assert.ok(result.diagnostics.some((item) => item.code === "COLLINEAR_WALL_BASELINES_OVERLAP"));
});

test("parallel non-collinear wall baselines are not reported as junctions", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[0, 500], [3000, 500]], thickness: 200, height: 3000 })
  ];
  const result = solveWallJunctions(walls);
  assert.equal(result.junctions.length, 0);
  assert.equal(result.diagnostics.length, 0);
});


test("multi-wall clustering is transitive across a tolerance chain", () => {
  const tolerance = 1e-6;
  const walls = [
    createWall({ id: "a", baseline: [[-1, 0], [1, 0]], thickness: 100, height: 3000 }),
    createWall({ id: "b", baseline: [[0, -1], [0, 1]], thickness: 100, height: 3000 }),
    createWall({ id: "c", baseline: [[-1, 1 + 0.75 * tolerance], [1, -1 + 0.75 * tolerance]], thickness: 100, height: 3000 })
  ];
  const result = solveWallJunctions(walls, { tolerance });
  assert.equal(result.junctions.length, 1);
  assert.equal(result.junctions[0].type, "MULTI_WALL");
  assert.equal(result.junctions[0].pairCount, 3);
  assert.equal(result.junctions[0].junctionIds.length, 3);
  assert.deepEqual(result.junctions[0].wallIds, ["a", "b", "c"]);
});

test("multi-wall cluster identity is stable when wall input order changes", () => {
  const walls = [
    createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000 }),
    createWall({ id: "b", baseline: [[1000, 0], [1000, 1000]], thickness: 200, height: 3000 }),
    createWall({ id: "c", baseline: [[1000, 0], [2000, 1000]], thickness: 200, height: 3000 }),
    createWall({ id: "d", baseline: [[1000, 0], [0, 1000]], thickness: 200, height: 3000 })
  ];
  const forward = solveWallJunctions(walls).junctions[0];
  const reversed = solveWallJunctions([...walls].reverse()).junctions[0];
  assert.equal(forward.type, "MULTI_WALL");
  assert.equal(reversed.type, "MULTI_WALL");
  assert.deepEqual(forward.wallIds, reversed.wallIds);
  assert.deepEqual(forward.junctionIds, reversed.junctionIds);
  assert.deepEqual(forward.point, reversed.point);
});
