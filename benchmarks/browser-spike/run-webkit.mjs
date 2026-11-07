import { createServer } from "vite";
import { webkit, devices } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(here, "benchmark-output");
mkdirSync(outputDir, { recursive: true });
const server = await createServer({
  configFile: false,
  root: here,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4173, strictPort: true }
});
let browser;
const results = [];
const failures = [];

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
    page.on("pageerror", (error) => browserErrors.push(error.message));
    const started = performance.now();
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForFunction(() => window.__geometryBenchmark?.status, { timeout: 60000 });
    const result = await page.evaluate(() => window.__geometryBenchmark);
    const elapsedMilliseconds = performance.now() - started;
    const record = {
      profile: profile.name,
      pageElapsedMilliseconds: elapsedMilliseconds,
      browserErrors,
      ...result
    };
    results.push(record);
    if (result.status !== "pass" || browserErrors.length > 0) {
      failures.push({ profile: profile.name, error: browserErrors.join("; ") || "Analytic volume mismatch" });
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
  candidate: "brepjs + occt-wasm",
  candidateVersions: { brepjs: "20.18.0", occtWasm: "5.15.0", playwright: "1.65.0", vite: "8.3.6" },
  runtime: { node: process.versions.node, platform: process.platform, architecture: process.arch },
  browser: "Playwright WebKit; not the installed Safari browser and not physical iPad hardware",
  cases: results,
  failures,
  limitations: [
    "WebKit automation is not a certification of Safari on a physical iPad or iPhone.",
    "The iPad-like profile emulates viewport, touch and device characteristics only.",
    "This is a browser WASM smoke test with one analytic solid, not the full geometry suite.",
    "No production geometry kernel is selected by this test."
  ]
};
writeFileSync(resolve(outputDir, "benchmark-results-webkit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
