import { createServer } from "vite";
import { webkit, devices } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(here, "benchmark-output");
const publicDir = resolve(here, "public");
mkdirSync(outputDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });
copyFileSync(resolve(here, "node_modules/opengeometry/opengeometry_bg.wasm"), resolve(publicDir, "opengeometry_bg.wasm"));

const pkg = JSON.parse(readFileSync(resolve(here, "node_modules/opengeometry/package.json"), "utf8"));
function walkFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}
const declarationFiles = walkFiles(resolve(here, "node_modules/opengeometry")).filter((path) => path.endsWith(".d.ts"));
const declarationPatterns = [
  "booleanSubtraction", "booleanUnion", "executeBooleanSubtractionMany",
  "class Cuboid", "class Solid", "class Opening", "OGAnalyticBrep",
  "boolean_brep", "get_bounds", "get_brep_serialized", "exportBrepToStep"
];
const declarationEvidence = [];
for (const path of declarationFiles) {
  const lines = readFileSync(path, "utf8").split("\n");
  for (let index = 0; index < lines.length; index++) {
    if (declarationPatterns.some((pattern) => lines[index].includes(pattern))) {
      declarationEvidence.push({
        file: path.slice(resolve(here, "node_modules/opengeometry").length + 1),
        line: index + 1,
        excerpt: lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 5)).join("\n")
      });
    }
  }
}

const server = await createServer({
  configFile: false,
  root: here,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4174, strictPort: true, hmr: false },
  build: { target: "esnext" }
});
let browser;
const cases = [];
const failures = [];
const serverStarted = performance.now();

try {
  await server.listen();
  browser = await webkit.launch({ headless: true });
  const profiles = [
    { name: "webkit-desktop", options: { viewport: { width: 1440, height: 900 } } },
    { name: "webkit-ipad-like", options: { ...devices["iPad (gen 7)"] } }
  ];
  for (const profile of profiles) {
    const context = await browser.newContext(profile.options);
    const page = await context.newPage();
    const browserErrors = [];
    const consoleMessages = [];
    const failedRequests = [];
    page.on("pageerror", (error) => browserErrors.push(error.stack ?? error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleMessages.push(message.text()); });
    page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" }));
    const started = performance.now();
    try {
      await page.goto("http://127.0.0.1:4174/", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForFunction(() => window.__geometryBenchmark?.status, undefined, { timeout: 30000 });
      const result = await page.evaluate(() => window.__geometryBenchmark);
      cases.push({ profile: profile.name, elapsedMilliseconds: performance.now() - started, browserErrors, consoleMessages, failedRequests, ...result });
      if (result.status !== "pass" || browserErrors.length || consoleMessages.length || failedRequests.length) {
        failures.push({ profile: profile.name, error: "Browser runtime or console errors were reported" });
      }
    } catch (error) {
      const bodyText = await page.locator("body").innerText().catch(() => "");
      failures.push({ profile: profile.name, error: error instanceof Error ? error.stack ?? error.message : String(error), browserErrors, consoleMessages, failedRequests, bodyText });
    }
    await context.close();
  }
} catch (error) {
  failures.push({ profile: "runner", error: error instanceof Error ? error.stack ?? error.message : String(error) });
} finally {
  if (browser) await browser.close();
  await server.close();
}

const report = {
  generatedAt: new Date().toISOString(),
  candidate: "OpenGeometry 2.0 API line",
  candidateVersions: { opengeometry: pkg.version, three: JSON.parse(readFileSync(resolve(here, "node_modules/three/package.json"), "utf8")).version },
  declarationFiles: declarationFiles.map((path) => path.slice(resolve(here, "node_modules/opengeometry").length + 1)),
  declarationEvidence,
  license: pkg.license,
  runtime: { node: process.versions.node, platform: process.platform, architecture: process.arch },
  browser: "Playwright WebKit; desktop and iPad-like emulation, not physical Safari hardware",
  harnessElapsedMilliseconds: performance.now() - serverStarted,
  cases,
  failures,
  limitations: [
    "This spike intentionally pins npm opengeometry 2.0.18 because the current upstream GitHub README describes a different 3.0 API.",
    "Boolean coverage is one analytic cuboid subtraction on a single straight host; it does not establish multi-skin, curved-wall, junction or STEP parity.",
    "Cut volume is computed from tessellated BufferGeometry; serialized B-Rep validation is reported separately and is not a native exact-volume measurement.",
    "iPad-like WebKit is emulation, not a physical iPad Safari validation."
  ]
};
writeFileSync(resolve(outputDir, "benchmark-results-opengeometry-2.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
