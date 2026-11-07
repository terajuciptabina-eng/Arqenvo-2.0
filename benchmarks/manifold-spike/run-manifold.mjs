import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import Module from "manifold-3d";

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
const wasm = await Module();
wasm.setup();
const initializationMilliseconds = performance.now() - initStart;
const { Manifold } = wasm;
const packageJson = JSON.parse(readFileSync(resolve(here, "node_modules/manifold-3d/package.json"), "utf8"));
const boxAt = (x, y, z, cx, cy, cz) =>
  Manifold.cube([x, y, z], true).translate([cx, cy, cz]);

const results = [];
const failures = [];
const live = new Set();
function own(shape) { live.add(shape); return shape; }
function runCase(id, fn) {
  const started = performance.now();
  try {
    const result = fn();
    results.push({ id, status: "completed", operationMilliseconds: performance.now() - started, ...result });
  } catch (error) {
    failures.push({ id, error: error instanceof Error ? error.message : String(error) });
    results.push({ id, status: "failed", operationMilliseconds: performance.now() - started, error: error instanceof Error ? error.message : String(error) });
  }
}

const k01 = fixtures.cases.find((item) => item.id === "K01");
runCase("K01", () => {
  const [length, thickness, height] = k01.expected.boundingDimensions;
  const wall = own(boxAt(length, thickness, height, length / 2, 0, k01.wall.baseElevation + height / 2));
  return {
    expectedVolumeMm3: k01.expected.volumeMm3,
    measuredVolumeMm3: wall.volume(),
    topologyStatus: wall.status()
  };
});

const k03 = fixtures.cases.find((item) => item.id === "K03");
runCase("K03", () => {
  const [a, b] = k03.solidConstruction;
  const make = ({ boxMin, boxMax }) => {
    const size = boxMax.map((v, i) => v - boxMin[i]);
    const center = boxMax.map((v, i) => (v + boxMin[i]) / 2);
    return own(boxAt(...size, ...center));
  };
  const first = make(a);
  const second = make(b);
  const joined = own(first.add(second));
  return {
    expectedVolumeMm3: k03.expected.volumeMm3,
    measuredVolumeMm3: joined.volume(),
    topologyStatus: joined.status()
  };
});

const k07 = fixtures.cases.find((item) => item.id === "K07");
runCase("K07", () => {
  const { wall, opening, skins } = k07;
  const length = Math.hypot(
    wall.baseline[1][0] - wall.baseline[0][0],
    wall.baseline[1][1] - wall.baseline[0][1]
  );
  const overrun = opening.cutToolOverrunMm;
  const cutter = own(boxAt(
    opening.width,
    wall.thickness + 2 * overrun,
    opening.height,
    opening.hostPositionAlongBaseline,
    0,
    wall.baseElevation + opening.sillElevation + opening.height / 2
  ));
  const measured = [];
  const statuses = [];
  let y = -wall.thickness / 2;
  for (const skin of skins) {
    const solid = own(boxAt(
      length,
      skin.thickness,
      wall.height,
      length / 2,
      y + skin.thickness / 2,
      wall.baseElevation + wall.height / 2
    ));
    const cutResult = own(solid.subtract(cutter));
    measured.push(cutResult.volume());
    statuses.push(cutResult.status());
    y += skin.thickness;
  }
  return {
    expectedRemainingSkinVolumesMm3: k07.expected.remainingSkinVolumesMm3,
    measuredRemainingSkinVolumesMm3: measured,
    skinVolumeDeltasMm3: measured.map((v, i) => v - k07.expected.remainingSkinVolumesMm3[i]),
    expectedRemainingTotalVolumeMm3: k07.expected.remainingTotalVolumeMm3,
    measuredRemainingTotalVolumeMm3: measured.reduce((sum, v) => sum + v, 0),
    topologyStatuses: statuses
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  candidate: "manifold-3d",
  candidateVersions: { manifold3d: packageJson.version },
  representation: "manifold triangle mesh; comparison control, not an exact B-Rep candidate",
  runtime: { node: process.versions.node, platform: process.platform, architecture: process.arch },
  initializationMilliseconds,
  peakRssBytesAfterRun: process.memoryUsage().rss,
  cases: results,
  failures,
  limitations: [
    "Manifold is a triangle-mesh kernel, not an exact CAD B-Rep kernel.",
    "This Node/WASM run is not browser rendering or iPad Safari performance.",
    "The benchmark compares analytic volumes and mesh-kernel Boolean output; it does not validate Archicad BIM junction rules.",
    "Topology status and dimensional deviation must be reviewed alongside timing.",
    "No production kernel is selected by this spike."
  ]
};

writeFileSync(resolve(outputDir, "benchmark-results-manifold.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
for (const shape of live) shape.delete();
if (failures.length > 0) process.exitCode = 1;
