import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createWall } from "../../src/bim/model.mjs";
import { solveWallJunctions } from "../../src/geometry/junction-solver.mjs";
import { validateJunctionNetwork } from "../../src/geometry/junction-network-validation.mjs";
import { deriveProjectPlan } from "../../src/geometry/wall-derivation.mjs";

test("network groups two distinct endpoint junctions on the same middle wall", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 100, height: 3000 });
  project.walls.middle = createWall({ id: "middle", baseline: [[1000, 0], [1000, 1000]], thickness: 100, height: 3000 });
  project.walls.c = createWall({ id: "c", baseline: [[1000, 1000], [2000, 1000]], thickness: 100, height: 3000 });
  const result = deriveProjectPlan(project);
  assert.equal(result.junctionNetworkValidation.valid, true);
  assert.equal(result.junctionNetworkValidation.networks.length, 1);
  const network = result.junctionNetworkValidation.networks[0];
  assert.equal(network.junctionCount, 2);
  assert.equal(network.wallJunctionCounts.middle, 2);
  assert.deepEqual(network.wallIds, ["a", "c", "middle"]);
  assert.equal(result.junctionResolutions.length, 2);
  assert.equal(result.junctionResolutions.every((item) => item.status === "ACCEPTED"), true);
  assert.equal(result.walls.middle.junctionCaps.length, 2);
});

test("network blocks two candidates that claim the same wall endpoint", () => {
  const project = createProject();
  project.walls.shared = createWall({ id: "shared", baseline: [[0, 0], [1000, 0]], thickness: 100, height: 3000 });
  project.walls.left = createWall({ id: "left", baseline: [[0, 0], [-1000, 0]], thickness: 100, height: 3000 });
  project.walls.up = createWall({ id: "up", baseline: [[0, 0], [0, 1000]], thickness: 100, height: 3000 });
  const junctions = [
    { id: "j-left", type: "L", wallIds: ["shared", "left"], point: [0, 0], endpointA: "start", endpointB: "start", geometry: { outer: [0, -50], inner: [50, 0] } },
    { id: "j-up", type: "L", wallIds: ["shared", "up"], point: [0, 0], endpointA: "start", endpointB: "start", geometry: { outer: [50, 0], inner: [0, 50] } }
  ];
  const result = validateJunctionNetwork(junctions, project);
  assert.equal(result.valid, false);
  assert.equal(result.networks.length, 1);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].wallId, "shared");
  assert.equal(result.conflicts[0].endpoint, "start");
  assert.deepEqual(result.conflicts[0].junctionIds, ["j-left", "j-up"]);
  assert.equal(result.resolutions.every((item) => !item.valid), true);
});

test("network component identity and counts are independent of junction order", () => {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 100, height: 3000 });
  project.walls.middle = createWall({ id: "middle", baseline: [[1000, 0], [1000, 1000]], thickness: 100, height: 3000 });
  project.walls.c = createWall({ id: "c", baseline: [[1000, 1000], [2000, 1000]], thickness: 100, height: 3000 });
  const junctions = solveWallJunctions(Object.values(project.walls)).junctions;
  const forward = validateJunctionNetwork(junctions, project);
  const reverse = validateJunctionNetwork([...junctions].reverse(), project);
  assert.deepEqual(forward.networks, reverse.networks);
  assert.deepEqual(forward.conflicts, reverse.conflicts);
});
