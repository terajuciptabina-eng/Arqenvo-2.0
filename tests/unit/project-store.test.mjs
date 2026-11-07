import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createWall } from "../../src/bim/model.mjs";
import { ProjectStore } from "../../src/project/project-store.mjs";

test("project transactions are atomic and undo/redo restore snapshots", () => {
  const store = new ProjectStore(createProject({ id: "p" }));
  const wall = createWall({ id: "w", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000 });
  store.transact("add wall", (draft) => { draft.walls.w = wall; });
  assert.equal(store.snapshot.revision, 1);
  assert.equal(store.snapshot.walls.w.id, "w");
  assert.equal(store.undo(), true);
  assert.equal(store.snapshot.walls.w, undefined);
  assert.equal(store.redo(), true);
  assert.equal(store.snapshot.walls.w.id, "w");
  assert.throws(() => store.transact("invalid", (draft) => { draft.walls.bad = { id: "bad" }; }));
  assert.equal(store.snapshot.walls.bad, undefined);
});
