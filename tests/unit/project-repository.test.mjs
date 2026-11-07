import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createWall } from "../../src/bim/model.mjs";
import { createMemoryProjectRepository } from "../../src/storage/project-repository.mjs";

test("project repository saves, clones, lists and deletes versioned project data", async () => {
  const repository = createMemoryProjectRepository();
  const project = createProject({ id: "persistence-test" });
  project.walls.w1 = createWall({ id: "w1", baseline: [[0, 0], [1200, 0]], thickness: 200, height: 3000 });
  const saved = await repository.save(project);
  assert.equal(saved.id, "persistence-test");
  project.walls.w1.thickness = 999;
  const loaded = await repository.load("persistence-test");
  assert.equal(loaded.walls.w1.thickness, 200);
  assert.deepEqual((await repository.list()).map((item) => item.id), ["persistence-test"]);
  assert.equal(await repository.delete("persistence-test"), true);
  assert.equal(await repository.load("persistence-test"), null);
});
