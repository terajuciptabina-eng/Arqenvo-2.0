import test from "node:test";
import assert from "node:assert/strict";
import { createComposite, createOpening, createWall, createProject, validateProject } from "../../src/bim/model.mjs";

const wall = () => createWall({ id: "w1", baseline: [[0, 0], [3000, 0]], thickness: 200, height: 3000 });

test("wall uses millimetres and finite semantic parameters", () => {
  assert.equal(wall().baseElevation, 0);
  assert.throws(() => createWall({ id: "bad", baseline: [[0, 0], [0, 0]], thickness: 200, height: 3000 }), /length/);
  assert.throws(() => createWall({ id: "bad", baseline: [[0, 0], [100, 0]], thickness: NaN, height: 3000 }), /finite/);
});

test("composite preserves ordered skins and material identity", () => {
  const composite = createComposite({ id: "c1", skins: [
    { id: "external", thickness: 20, materialId: "brick" },
    { id: "core", thickness: 160, materialId: "concrete" },
    { id: "internal", thickness: 20, materialId: "plaster" }
  ] });
  assert.equal(validateProject({ ...createProject(), walls: { w1: { ...wall(), compositeId: "c1" } }, composites: { c1: composite }, openings: {}, junctions: {} }), true);
  assert.deepEqual(composite.skins.map((skin) => skin.materialId), ["brick", "concrete", "plaster"]);
  assert.throws(() => createComposite({ id: "bad", skins: [{ id: "a", thickness: 0, materialId: "m" }] }), /positive/);
});

test("opening anchors resolve and host bounds are enforced", () => {
  const host = wall();
  const left = createOpening({ id: "d1", type: "door", hostWallId: host.id, anchor: "left", positionAlongBaseline: 500, width: 900, height: 2100 });
  assert.equal(left.positionAlongBaseline, 500);
  assert.throws(() => createOpening({ id: "d2", type: "window", hostWallId: host.id, positionAlongBaseline: 100, width: 900, height: 1200, sillElevation: 900 }) && validateProject({ ...createProject(), walls: { w1: host }, composites: {}, openings: { d2: { id:"d2",type:"window",hostWallId:"w1",anchor:"center",positionAlongBaseline:100,width:900,height:1200,sillElevation:900,revealDepth:0,revision:1 } }, junctions:{} }), /fit/);
});
