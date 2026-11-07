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
  throw new Error(`Node.js 24+ is required by the current brepjs documentation. Detected ${process.versions.node}.`);
}

const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
const initStart = performance.now();
const { box, cut, fuse, measureVolume, exportSTEP, unwrap } = await import("brepjs/quick");
const initializationMilliseconds = performance.now() - initStart;

const packageJson = (name) => JSON.parse(
  readFileSync(resolve(here, "node_modules", name, "package.json"), "utf8")
);

const brepjsVersion = packageJson("brepjs").version;
const occtWasmVersion = packageJson("occt-wasm").version;

const volumeOf = (shape) => unwrap(measureVolume(shape));

async function saveStep(shape, filename) {
  const blob = unwrap(exportSTEP(shape));
  const bytes = Buffer.from(await blob.arrayBuffer());
  writeFileSync(resolve(outputDir, filename), bytes);
  return bytes.length;
}

const results = [];
const failures = [];

function recordFailure(id, error) {
  failures.push({ id, error: error instanceof Error ? error.message : String(error) });
}

async function runCase(id, fn) {
  const started = performance.now();
  try {
    const result = await fn();
    results.push({
      id,
      status: "completed",
      operationMilliseconds: performance.now() - started,
      ...result
    });
  } catch (error) {
    recordFailure(id, error);
    results.push({
      id,
      status: "failed",
      operationMilliseconds: performance.now() - started,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const k01 = fixtures.cases.find((item) => item.id === "K01");
await runCase("K01", async () => {
  const [length, thickness, height] = k01.expected.boundingDimensions;
  const wall = box(length, thickness, height, {
    at: [length / 2, 0, k01.wall.baseElevation + height / 2]
  });
  const volumeMm3 = volumeOf(wall);
  const stepBytes = await saveStep(wall, "K01-straight-wall.step");
  return {
    expectedVolumeMm3: k01.expected.volumeMm3,
    measuredVolumeMm3: volumeMm3,
    volumeDeltaMm3: volumeMm3 - k01.expected.volumeMm3,
    stepExportSucceeded: true,
    stepBytes
  };
});

const k03 = fixtures.cases.find((item) => item.id === "K03");
await runCase("K03", async () => {
  const solids = k03.solidConstruction.map(({ boxMin, boxMax }) => {
    const [x0, y0, z0] = boxMin;
    const [x1, y1, z1] = boxMax;
    return box(x1 - x0, y1 - y0, z1 - z0, { at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2] });
  });
  const joined = unwrap(fuse(solids[0], solids[1]));
  const volumeMm3 = volumeOf(joined);
  const stepBytes = await saveStep(joined, "K03-L-junction-union.step");
  return {
    expectedVolumeMm3: k03.expected.volumeMm3,
    measuredVolumeMm3: volumeMm3,
    volumeDeltaMm3: volumeMm3 - k03.expected.volumeMm3,
    stepExportSucceeded: true,
    stepBytes
  };
});

const k06 = fixtures.cases.find((item) => item.id === "K06");
await runCase("K06", async () => {
  const [start, end] = k06.wall.baseline;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  let y = -k06.wall.thickness / 2;
  const measuredSkinVolumesMm3 = [];
  const stepBytesBySkin = [];

  for (const skin of k06.skins) {
    const solid = box(length, skin.thickness, k06.wall.height, {
      at: [length / 2, y + skin.thickness / 2, k06.wall.baseElevation + k06.wall.height / 2]
    });
    measuredSkinVolumesMm3.push(volumeOf(solid));
    stepBytesBySkin.push(await saveStep(solid, `K06-${skin.id}.step`));
    y += skin.thickness;
  }

  return {
    expectedSkinVolumesMm3: k06.expected.skinVolumesMm3,
    measuredSkinVolumesMm3,
    skinVolumeDeltasMm3: measuredSkinVolumesMm3.map((value, index) => value - k06.expected.skinVolumesMm3[index]),
    expectedTotalVolumeMm3: k06.expected.totalVolumeMm3,
    measuredTotalVolumeMm3: measuredSkinVolumesMm3.reduce((sum, value) => sum + value, 0),
    stepBytesBySkin
  };
});

const k07 = fixtures.cases.find((item) => item.id === "K07");
await runCase("K07", async () => {
  const [start, end] = k07.wall.baseline;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const overrun = k07.opening.cutToolOverrunMm;
  const wall = k07.wall;
  const opening = k07.opening;
  const cutTool = box(
    opening.width,
    wall.thickness + 2 * overrun,
    opening.height + 2 * overrun,
    {
      at: [
        opening.hostPositionAlongBaseline,
        0,
        wall.baseElevation + opening.sillElevation + opening.height / 2
      ]
    }
  );

  let y = -wall.thickness / 2;
  const measuredSkinVolumesMm3 = [];
  const stepBytesBySkin = [];

  for (const skin of k07.skins) {
    const skinSolid = box(length, skin.thickness, wall.height, {
      at: [length / 2, y + skin.thickness / 2, wall.baseElevation + wall.height / 2]
    });
    const cutSkin = unwrap(cut(skinSolid, cutTool));
    measuredSkinVolumesMm3.push(volumeOf(cutSkin));
    stepBytesBySkin.push(await saveStep(cutSkin, `K07-${skin.id}-door-cut.step`));
    y += skin.thickness;
  }

  return {
    expectedRemainingSkinVolumesMm3: k07.expected.remainingSkinVolumesMm3,
    measuredRemainingSkinVolumesMm3: measuredSkinVolumesMm3,
    skinVolumeDeltasMm3: measuredSkinVolumesMm3.map((value, index) => value - k07.expected.remainingSkinVolumesMm3[index]),
    expectedRemainingTotalVolumeMm3: k07.expected.remainingTotalVolumeMm3,
    measuredRemainingTotalVolumeMm3: measuredSkinVolumesMm3.reduce((sum, value) => sum + value, 0),
    stepBytesBySkin
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  candidate: "brepjs + occt-wasm",
  candidateVersions: { brepjs: brepjsVersion, occtWasm: occtWasmVersion },
  runtime: {
    node: process.versions.node,
    platform: process.platform,
    architecture: process.arch
  },
  initializationMilliseconds,
  configuredTolerance: "candidate default; exact value not yet instrumented",
  peakRssBytesAfterRun: process.memoryUsage().rss,
  cases: results,
  failures,
  limitations: [
    "Node-side geometry smoke/benchmark only; not a browser or iPad Safari performance result.",
    "STEP export success is recorded but does not replace a dedicated topology validity inspection.",
    "The L-junction test fuses the shared precomputed solid boundaries; it does not implement Archicad wall-priority or BIM junction rules.",
    "The composite skin tests preserve separate skin solids; material rendering/identity must be verified in the later viewport prototype.",
    "No production geometry kernel is selected by this spike."
  ]
};

writeFileSync(resolve(outputDir, "benchmark-results-brepjs.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
