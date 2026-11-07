import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const fixturePath = resolve(repoRoot, "docs/GEOMETRY_BENCHMARKS/fixtures/wall-core-fixtures.json");
const outputDir = resolve(here, "benchmark-output");
mkdirSync(outputDir, { recursive: true });

if (Number(process.versions.node.split(".")[0]) < 24) {
  throw new Error(`Node.js 24+ required; detected ${process.versions.node}`);
}

const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
const initStart = performance.now();
const {
  box, cut, cutAll, fuse, fuseAll, measureVolume, exportSTEP, importSTEP,
  Sketcher, revolve, unwrap
} = await import("brepjs/quick");
const initializationMilliseconds = performance.now() - initStart;
const packageJson = (name) => JSON.parse(readFileSync(resolve(here, "node_modules", name, "package.json"), "utf8"));
const candidateVersions = { brepjs: packageJson("brepjs").version, occtWasm: packageJson("occt-wasm").version };
const volumeOf = (shape) => unwrap(measureVolume(shape));
const getCase = (id) => {
  const value = fixtures.cases.find((item) => item.id === id);
  if (!value) throw new Error(`Missing fixture ${id}`);
  return value;
};
const results = [];
const failures = [];
const selectedCase = process.env.CASE_FILTER ?? null;
const skipCurvedCases = process.env.SKIP_CURVED_CASES === "1";
const memoryBeforeBytes = process.memoryUsage().rss;

async function saveStep(shape, filename) {
  const blob = unwrap(exportSTEP(shape));
  const bytes = Buffer.from(await blob.arrayBuffer());
  writeFileSync(resolve(outputDir, filename), bytes);
  return bytes.length;
}

async function runCase(id, fn) {
  if (selectedCase && selectedCase !== id) return;
  if (skipCurvedCases && (id === "K02" || id === "K10")) return;
  console.log(`[${id}] started`);
  const started = performance.now();
  try {
    const value = await fn();
    results.push({ id, status: "completed", operationMilliseconds: performance.now() - started, ...value });
    console.log(`[${id}] completed in ${results.at(-1).operationMilliseconds.toFixed(2)} ms`);
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    failures.push({ id, error: message });
    console.error(`[${id}] failed: ${message}`);
    results.push({ id, status: "failed", operationMilliseconds: performance.now() - started, error: message });
  }
}

function boxFromBounds({ boxMin, boxMax }) {
  const size = boxMax.map((value, index) => value - boxMin[index]);
  const center = boxMax.map((value, index) => (value + boxMin[index]) / 2);
  return box(...size, { at: center });
}

function radialProfile(innerRadius, outerRadius, height) {
  return new Sketcher("XZ")
    .movePointerTo([innerRadius, 0])
    .lineTo([outerRadius, 0])
    .lineTo([outerRadius, height])
    .lineTo([innerRadius, height])
    .close()
    .face();
}

function makeCurvedWall(wall) {
  return unwrap(revolve(radialProfile(wall.innerRadius, wall.outerRadius, wall.height), {
    angle: wall.sweepAngleRadians
  }));
}

function makeWallBox(wall, length) {
  return box(length, wall.thickness, wall.height, {
    at: [length / 2, 0, wall.baseElevation + wall.height / 2]
  });
}

function makeOpeningTool(wall, opening) {
  const overrun = opening.cutToolOverrunMm ?? 1;
  const wallDepth = wall.thickness ?? 200;
  return box(
    opening.width,
    wallDepth + 2 * overrun,
    opening.height,
    {
      at: [
        opening.hostPositionAlongBaseline,
        0,
        (wall.baseElevation ?? 0) + (opening.sillElevation ?? 0) + opening.height / 2
      ]
    }
  );
}

await runCase("K01", async () => {
  const item = getCase("K01");
  const [length, thickness, height] = item.expected.boundingDimensions;
  const wall = box(length, thickness, height, { at: [length / 2, 0, height / 2] });
  const measuredVolumeMm3 = volumeOf(wall);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredVolumeMm3,
    stepBytes: await saveStep(wall, "K01-straight-wall.step")
  };
});

await runCase("K02", async () => {
  const item = getCase("K02");
  const curvedWall = makeCurvedWall(item.wall);
  const measuredVolumeMm3 = volumeOf(curvedWall);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredVolumeMm3,
    stepBytes: await saveStep(curvedWall, "K02-quarter-curved-wall.step")
  };
});

await runCase("K03", async () => {
  const item = getCase("K03");
  const solids = item.solidConstruction.map(boxFromBounds);
  const joined = unwrap(fuse(solids[0], solids[1]));
  const measuredVolumeMm3 = volumeOf(joined);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredVolumeMm3,
    stepBytes: await saveStep(joined, "K03-L-junction-union.step")
  };
});

await runCase("K04", async () => {
  const item = getCase("K04");
  const joined = unwrap(fuseAll(item.solidConstruction.map(boxFromBounds)));
  const measuredVolumeMm3 = volumeOf(joined);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredVolumeMm3,
    stepBytes: await saveStep(joined, "K04-T-junction-union.step")
  };
});

await runCase("K05", async () => {
  const item = getCase("K05");
  const joined = unwrap(fuseAll(item.solidConstruction.map(boxFromBounds)));
  const measuredVolumeMm3 = volumeOf(joined);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredVolumeMm3,
    stepBytes: await saveStep(joined, "K05-cross-junction-union.step")
  };
});

await runCase("K06", async () => {
  const item = getCase("K06");
  const [start, end] = item.wall.baseline;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  let y = -item.wall.thickness / 2;
  const measuredSkinVolumesMm3 = [];
  const stepBytesBySkin = [];
  for (const skin of item.skins) {
    const solid = box(length, skin.thickness, item.wall.height, {
      at: [length / 2, y + skin.thickness / 2, item.wall.baseElevation + item.wall.height / 2]
    });
    measuredSkinVolumesMm3.push(volumeOf(solid));
    stepBytesBySkin.push(await saveStep(solid, `K06-${skin.id}.step`));
    y += skin.thickness;
  }
  return {
    expectedSkinVolumesMm3: item.expected.skinVolumesMm3,
    measuredSkinVolumesMm3,
    expectedTotalVolumeMm3: item.expected.totalVolumeMm3,
    measuredTotalVolumeMm3: measuredSkinVolumesMm3.reduce((sum, value) => sum + value, 0),
    stepBytesBySkin
  };
});

await runCase("K07", async () => {
  const item = getCase("K07");
  const [start, end] = item.wall.baseline;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  let y = -item.wall.thickness / 2;
  const cutTool = makeOpeningTool(item.wall, item.opening);
  const measuredSkinVolumesMm3 = [];
  const stepBytesBySkin = [];
  for (const skin of item.skins) {
    const skinSolid = box(length, skin.thickness, item.wall.height, {
      at: [length / 2, y + skin.thickness / 2, item.wall.baseElevation + item.wall.height / 2]
    });
    const cutSkin = unwrap(cut(skinSolid, cutTool));
    measuredSkinVolumesMm3.push(volumeOf(cutSkin));
    stepBytesBySkin.push(await saveStep(cutSkin, `K07-${skin.id}-door-cut.step`));
    y += skin.thickness;
  }
  return {
    expectedRemainingSkinVolumesMm3: item.expected.remainingSkinVolumesMm3,
    measuredRemainingSkinVolumesMm3: measuredSkinVolumesMm3,
    expectedRemainingTotalVolumeMm3: item.expected.remainingTotalVolumeMm3,
    measuredRemainingTotalVolumeMm3: measuredSkinVolumesMm3.reduce((sum, value) => sum + value, 0),
    stepBytesBySkin
  };
});

await runCase("K08", async () => {
  const item = getCase("K08");
  const [start, end] = item.wall.baseline;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  let y = -item.wall.thickness / 2;
  const cutTool = makeOpeningTool(item.wall, item.opening);
  const measuredSkinVolumesMm3 = [];
  for (const skin of item.skins) {
    const skinSolid = box(length, skin.thickness, item.wall.height, {
      at: [length / 2, y + skin.thickness / 2, item.wall.baseElevation + item.wall.height / 2]
    });
    const cutSkin = unwrap(cut(skinSolid, cutTool));
    measuredSkinVolumesMm3.push(volumeOf(cutSkin));
    y += skin.thickness;
  }
  return {
    expectedRemainingSkinVolumesMm3: item.expected.remainingSkinVolumesMm3,
    measuredRemainingSkinVolumesMm3: measuredSkinVolumesMm3,
    expectedRemainingTotalVolumeMm3: item.expected.remainingTotalVolumeMm3,
    measuredRemainingTotalVolumeMm3: measuredSkinVolumesMm3.reduce((sum, value) => sum + value, 0)
  };
});

await runCase("K09", async () => {
  const item = getCase("K09");
  const wall = makeWallBox(item.wall, item.wall.baseline[1][0] - item.wall.baseline[0][0]);
  const tools = item.openings.map((opening) => makeOpeningTool(item.wall, opening));
  const result = unwrap(cutAll(wall, tools));
  return {
    expectedVolumeMm3: item.expected.remainingVolumeMm3,
    measuredVolumeMm3: volumeOf(result),
    openingCount: item.openings.length,
    stepBytes: await saveStep(result, "K09-multiple-door-openings.step")
  };
});

await runCase("K10", async () => {
  const item = getCase("K10");
  const wall = makeCurvedWall(item.wall);
  const cutterProfile = radialProfile(
    item.opening.innerRadius,
    item.opening.outerRadius,
    item.opening.height
  );
  const cutter = unwrap(revolve(cutterProfile, { angle: item.opening.sweepAngleRadians }));
  const result = unwrap(cut(wall, cutter));
  return {
    expectedVolumeMm3: item.expected.remainingVolumeMm3,
    measuredVolumeMm3: volumeOf(result),
    stepBytes: await saveStep(result, "K10-curved-wall-sector-opening.step")
  };
});

await runCase("K11", async () => {
  const item = getCase("K11");
  const length = item.wall.baseline[1][0] - item.wall.baseline[0][0];
  const initial = box(length, item.wall.baseThickness, item.wall.height, {
    at: [length / 2, 0, item.wall.height / 2]
  });
  const regenerated = box(length, item.wall.editedThickness, item.wall.height, {
    at: [length / 2, 0, item.wall.height / 2]
  });
  return {
    expectedInitialVolumeMm3: item.expected.initialVolumeMm3,
    measuredInitialVolumeMm3: volumeOf(initial),
    expectedEditedVolumeMm3: item.expected.editedVolumeMm3,
    measuredEditedVolumeMm3: volumeOf(regenerated),
    staleGeometryRetained: volumeOf(regenerated) === volumeOf(initial)
  };
});

await runCase("K12", async () => {
  const item = getCase("K12");
  const length = item.wall.baseline[1][0] - item.wall.baseline[0][0];
  const wall = makeWallBox(item.wall, length);
  const makeTool = (position) => box(
    item.opening.width,
    item.wall.thickness + 2,
    item.opening.height,
    { at: [position, 0, item.opening.sillElevation + item.opening.height / 2] }
  );
  const initial = unwrap(cut(wall, makeTool(item.opening.initialPositionAlongBaseline)));
  const moved = unwrap(cut(wall, makeTool(item.opening.movedPositionAlongBaseline)));
  return {
    expectedInitialVolumeMm3: item.expected.initialVolumeMm3,
    measuredInitialVolumeMm3: volumeOf(initial),
    expectedMovedVolumeMm3: item.expected.movedVolumeMm3,
    measuredMovedVolumeMm3: volumeOf(moved),
    stepBytes: await saveStep(moved, "K12-moved-host-opening.step")
  };
});

await runCase("K13", async () => {
  const item = getCase("K13");
  let current;
  const editVolumes = [];
  for (let edit = 1; edit <= item.editCount; edit++) {
    const thickness = edit % 2 === 0 ? item.wall.baseThickness : item.wall.alternateThickness;
    current = box(item.wall.length, thickness, item.wall.height, {
      at: [item.wall.length / 2, 0, item.wall.height / 2]
    });
    editVolumes.push(volumeOf(current));
  }
  return {
    editCount: item.editCount,
    expectedFinalThickness: item.expected.finalThickness,
    measuredFinalVolumeMm3: volumeOf(current),
    expectedFinalVolumeMm3: item.expected.finalVolumeMm3,
    firstEditVolumeMm3: editVolumes[0],
    lastEditVolumeMm3: editVolumes.at(-1),
    distinctVolumesObserved: [...new Set(editVolumes)].length
  };
});

await runCase("K15", async () => {
  const item = getCase("K15");
  const [length, thickness, height] = item.solid.dimensions;
  const original = box(length, thickness, height, { at: [length / 2, 0, height / 2] });
  const stepBlob = unwrap(exportSTEP(original));
  const stepBytes = Buffer.from(await stepBlob.arrayBuffer());
  const imported = unwrap(await importSTEP(new Blob([stepBytes])));
  const measuredOriginalVolumeMm3 = volumeOf(original);
  const measuredRoundTripVolumeMm3 = volumeOf(imported);
  return {
    expectedVolumeMm3: item.expected.volumeMm3,
    measuredOriginalVolumeMm3,
    measuredRoundTripVolumeMm3,
    roundTripVolumeDeltaMm3: measuredRoundTripVolumeMm3 - measuredOriginalVolumeMm3,
    stepBytes: stepBytes.length,
    stepFileContainsGeometry: stepBytes.length > 0 && stepBytes.toString("utf8").includes("MANIFOLD_SOLID_BREP")
  };
});

function buildValidation(caseResults) {
  const byId = new Map(caseResults.map((item) => [item.id, item]));
  const checks = [];
  const add = (caseId, metric, expected, measured, tolerance = 0) => {
    const present = Number.isFinite(measured);
    const delta = present ? measured - expected : null;
    checks.push({
      caseId, metric, expected, measured: present ? measured : null, delta,
      tolerance,
      pass: present && Math.abs(delta) <= tolerance
    });
  };
  const result = (id) => byId.get(id);
  for (const id of ["K01", "K03", "K04", "K05"]) {
    const item = result(id);
    if (item) add(id, "volumeMm3", item.expectedVolumeMm3, item.measuredVolumeMm3, 0.01);
  }
  for (const id of ["K02", "K10"]) {
    const item = result(id);
    if (item) add(id, "volumeMm3", item.expectedVolumeMm3, item.measuredVolumeMm3, getCase(id).expected.absoluteVolumeToleranceMm3);
  }
  for (const id of ["K06", "K07", "K08"]) {
    const item = result(id);
    if (!item) continue;
    const expected = id === "K06" ? item.expectedSkinVolumesMm3 : item.expectedRemainingSkinVolumesMm3;
    const measured = id === "K06" ? item.measuredSkinVolumesMm3 : item.measuredRemainingSkinVolumesMm3;
    expected.forEach((value, index) => add(id, `skin[${index}].volumeMm3`, value, measured?.[index], 0.01));
  }
  const k06 = result("K06");
  if (k06) add("K06", "totalVolumeMm3", k06.expectedTotalVolumeMm3, k06.measuredTotalVolumeMm3, 0.01);
  for (const id of ["K07", "K08"]) {
    const item = result(id);
    if (item) add(id, "remainingTotalVolumeMm3", item.expectedRemainingTotalVolumeMm3, item.measuredRemainingTotalVolumeMm3, 0.01);
  }
  const k09 = result("K09");
  if (k09) add("K09", "remainingVolumeMm3", getCase("K09").expected.remainingVolumeMm3, k09.measuredVolumeMm3, getCase("K09").expected.absoluteVolumeToleranceMm3);
  const k11 = result("K11");
  if (k11) {
    add("K11", "initialVolumeMm3", getCase("K11").expected.initialVolumeMm3, k11.measuredInitialVolumeMm3, 0.01);
    add("K11", "editedVolumeMm3", getCase("K11").expected.editedVolumeMm3, k11.measuredEditedVolumeMm3, 0.01);
  }
  const k12 = result("K12");
  if (k12) {
    add("K12", "initialVolumeMm3", getCase("K12").expected.initialVolumeMm3, k12.measuredInitialVolumeMm3, 0.01);
    add("K12", "movedVolumeMm3", getCase("K12").expected.movedVolumeMm3, k12.measuredMovedVolumeMm3, 0.01);
  }
  const k13 = result("K13");
  if (k13) add("K13", "finalVolumeMm3", getCase("K13").expected.finalVolumeMm3, k13.measuredFinalVolumeMm3, 0.01);
  const k15 = result("K15");
  if (k15) {
    add("K15", "originalVolumeMm3", getCase("K15").expected.volumeMm3, k15.measuredOriginalVolumeMm3, 0.01);
    add("K15", "roundTripVolumeMm3", getCase("K15").expected.volumeMm3, k15.measuredRoundTripVolumeMm3, getCase("K15").expected.absoluteVolumeToleranceMm3);
  }
  const expectedIds = selectedCase ? [selectedCase] : fixtures.cases.filter((item) => item.id !== "K14" && !(skipCurvedCases && (item.id === "K02" || item.id === "K10"))).map((item) => item.id);
  const missingCases = expectedIds.filter((id) => !byId.has(id) || byId.get(id).status !== "completed");
  return {
    status: checks.length > 0 && checks.every((check) => check.pass) && missingCases.length === 0 ? "pass" : "fail",
    method: "analytic fixture comparisons; exact box volume checks use 0.01 mm3 and curved/re-import cases use fixture-declared absolute tolerances",
    checks,
    missingOrFailedCases: missingCases
  };
}

const validation = buildValidation(results);
const memoryAfterBytes = process.memoryUsage().rss;
const report = {
  generatedAt: new Date().toISOString(),
  candidate: "brepjs + occt-wasm",
  selectedCase,
  skippedCurvedCases,
  candidateVersions,
  runtime: { node: process.versions.node, platform: process.platform, architecture: process.arch },
  initializationMilliseconds,
  configuredTolerance: "0.01 mm3 for analytic box fixtures; per-fixture absolute tolerances for curved and STEP round-trip cases",
  memoryBeforeBytes,
  memoryAfterBytes,
  memoryDeltaBytes: memoryAfterBytes - memoryBeforeBytes,
  peakRssBytesAfterRun: memoryAfterBytes,
  cases: results,
  validation,
  failures,
  limitations: [
    "K03/K04/K05 use precomputed wall-end solids; they test Boolean geometry, not ARQENVO wall-priority/trim solving.",
    "K06/K07/K08 preserve skin solids as separate outputs; material metadata persistence in the viewport model remains untested.",
    "K11/K12/K13 regenerate solids from semantic parameters; this does not yet validate the application dependency graph or long-lived kernel object disposal.",
    "K13 records process RSS before and after; it is not a controlled memory-leak test with forced garbage collection.",
    "K14 is covered only by a separate Playwright WebKit emulation job; physical iPad Safari remains untested.",
    "No production kernel is selected by this isolated spike."
  ]
};
writeFileSync(resolve(outputDir, "benchmark-results-brepjs.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0 || validation.status !== "pass") process.exitCode = 1;
