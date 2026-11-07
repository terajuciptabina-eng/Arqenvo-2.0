import test from "node:test";
import assert from "node:assert/strict";
import { createDimension, createProject, createWall } from "../../src/bim/model.mjs";
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
import { createOpening, createComposite } from "../../src/bim/model.mjs";

test("changing a wall invalidates its hosted opening and connected junction peers", () => {
  const project = createProject();
  const a = createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000 });
  const b = createWall({ id: "b", baseline: [[1000, 0], [1000, 1000]], thickness: 200, height: 3000 });
  project.walls.a = a;
  project.walls.b = b;
  project.openings.door = createOpening({ id: "door", type: "door", hostWallId: "a", positionAlongBaseline: 500, width: 800, height: 2100 });
  project.junctions.j1 = { id: "j1", wallIds: ["a", "b"] };
  const store = new ProjectStore(project);
  const result = store.transact("change wall thickness", (draft) => {
    draft.walls.a = { ...draft.walls.a, thickness: 250, revision: 2 };
  });
  assert.deepEqual(result.changedEntities, ["wall:a"]);
  assert.deepEqual(result.invalidatedElementIds, ["geometry:wall:a", "geometry:wall:b", "junction:j1", "opening:door", "wall:a", "wall:b"]);
});

test("changing a composite invalidates every wall that uses it", () => {
  const project = createProject();
  const composite = createComposite({ id: "c", skins: [{ id: "skin", thickness: 200, materialId: "brick" }] });
  project.composites.c = composite;
  project.walls.a = createWall({ id: "a", baseline: [[0, 0], [1000, 0]], thickness: 200, height: 3000, compositeId: "c" });
  const store = new ProjectStore(project);
  const result = store.transact("change material identity", (draft) => {
    draft.composites.c = { ...draft.composites.c, skins: [{ ...draft.composites.c.skins[0], materialId: "stone" }], revision: 2 };
  });
  assert.deepEqual(result.invalidatedElementIds, ["composite:c", "geometry:wall:a", "wall:a"]);
});

test("editing an opening invalidates the host wall representation", () => {
  const project = createProject();
  project.walls.w = createWall({ id: "w", baseline: [[0, 0], [2000, 0]], thickness: 200, height: 3000 });
  project.openings.d = createOpening({ id: "d", type: "door", hostWallId: "w", positionAlongBaseline: 1000, width: 900, height: 2100 });
  const store = new ProjectStore(project);
  const result = store.transact("move opening", (draft) => {
    draft.openings.d = { ...draft.openings.d, positionAlongBaseline: 1100, revision: 2 };
  });
  assert.deepEqual(result.invalidatedElementIds, ["geometry:wall:w", "opening:d"]);
});

test("replacing a project validates before atomically committing and supports undo", () => {
  const store = new ProjectStore(createProject({ id: "before" }));
  const imported = createProject({ id: "imported" });
  imported.walls.w = createWall({ id: "w", baseline: [[0, 0], [1500, 0]], thickness: 200, height: 3000 });
  const result = store.replaceProject(imported, "Import project");
  assert.equal(result.revision, 1);
  assert.equal(store.snapshot.id, "imported");
  assert.equal(store.snapshot.walls.w.id, "w");
  assert.equal(store.undo(), true);
  assert.equal(store.snapshot.id, "before");
  assert.equal(store.snapshot.walls.w, undefined);
  assert.throws(() => store.replaceProject({ schemaVersion: 99, id: "invalid" }), /Unsupported project schema/);
  assert.equal(store.snapshot.id, "before");
});

test("moving a wall invalidates associative dimensions anchored to its endpoints", () => {
  const project = createProject();
  project.walls.w = createWall({ id: "w", baseline: [[0, 0], [2000, 0]], thickness: 200, height: 3000 });
  project.dimensions.d = createDimension({ id: "d", kind: "chain", anchors: [
    { type: "wall-endpoint", wallId: "w", endpoint: "start" },
    { type: "wall-endpoint", wallId: "w", endpoint: "end" }
  ] });
  const store = new ProjectStore(project);
  const result = store.transact("extend dimensioned wall", (draft) => {
    draft.walls.w = { ...draft.walls.w, baseline: [[0, 0], [2500, 0]], revision: 2 };
  });
  assert.ok(result.invalidatedElementIds.includes("dimension:d"));
});
