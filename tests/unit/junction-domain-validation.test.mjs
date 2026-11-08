import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createWall } from "../../src/bim/model.mjs";
import { solveWallJunctions } from "../../src/geometry/junction-solver.mjs";
import { validateJunctionCandidate } from "../../src/geometry/junction-domain-validation.mjs";

function lProject() {
  const project = createProject();
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.b = createWall({ id: "b", baseline: [[3000, 0], [3000, 2000]], thickness: 200, height: 3000 });
  return project;
}

test("junction domain accepts an L candidate with matching endpoint identities", () => {
  const project = lProject();
  const junction = solveWallJunctions(Object.values(project.walls)).junctions[0];
  const result = validateJunctionCandidate(junction, project);
  assert.equal(result.valid, true);
  assert.deepEqual(result.affectedWallIds, ["a", "b"]);
  assert.equal(result.endpointCount, 2);
});

test("junction domain rejects an L candidate whose endpoint identity is inconsistent", () => {
  const project = lProject();
  const junction = structuredClone(solveWallJunctions(Object.values(project.walls)).junctions[0]);
  junction.endpointA = "start";
  const result = validateJunctionCandidate(junction, project);
  assert.equal(result.valid, false);
  assert.equal(result.code, "JUNCTION_ENDPOINT_IDENTITY_MISMATCH");
});

test("junction domain accepts a T candidate only when branch endpoint and host segment agree", () => {
  const project = createProject();
  project.walls.host = createWall({ id: "host", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.branch = createWall({ id: "branch", baseline: [[1500, 0], [1500, 2000]], thickness: 200, height: 3000 });
  const junction = solveWallJunctions(Object.values(project.walls)).junctions[0];
  const result = validateJunctionCandidate(junction, project);
  assert.equal(result.valid, true);
  assert.deepEqual(result.affectedWallIds, ["branch", "host"]);
  assert.equal(result.endpointCount, 1);
});

test("junction domain rejects a T candidate with a mismatched host domain", () => {
  const project = createProject();
  project.walls.host = createWall({ id: "host", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  project.walls.branch = createWall({ id: "branch", baseline: [[1500, 0], [1500, 2000]], thickness: 200, height: 3000 });
  const junction = structuredClone(solveWallJunctions(Object.values(project.walls)).junctions[0]);
  junction.point = [5000, 0];
  const result = validateJunctionCandidate(junction, project);
  assert.equal(result.valid, false);
  assert.equal(result.code, "T_JUNCTION_DOMAIN_MISMATCH");
});

test("junction domain rejects missing walls, duplicate IDs and malformed cap geometry", () => {
  const project = lProject();
  const junction = solveWallJunctions(Object.values(project.walls)).junctions[0];
  assert.equal(validateJunctionCandidate({ ...junction, wallIds: ["a", "a"] }, project).code, "JUNCTION_WALL_IDS_INVALID");
  assert.equal(validateJunctionCandidate({ ...junction, wallIds: ["a", "missing"] }, project).code, "JUNCTION_WALL_MISSING");

  const tProject = createProject();
  tProject.walls.host = createWall({ id: "host", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });
  tProject.walls.branch = createWall({ id: "branch", baseline: [[1500, 0], [1500, 2000]], thickness: 200, height: 3000 });
  const tJunction = structuredClone(solveWallJunctions(Object.values(tProject.walls)).junctions[0]);
  tJunction.geometry.cap = [[1, 2], [1, 2]];
  assert.equal(validateJunctionCandidate(tJunction, tProject).code, "T_JUNCTION_CAP_GEOMETRY_INVALID");
});
