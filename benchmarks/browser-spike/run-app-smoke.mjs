import { createServer } from "vite";
import { webkit, devices } from "playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../..");
const server = await createServer({
  configFile: false,
  root: repositoryRoot,
  logLevel: "error",
  server: { host: "127.0.0.1", port: 4174, strictPort: true, hmr: false }
});
let browser;
const failures = [];
const results = [];

async function exerciseProfile(profile) {
  const context = await browser.newContext({ ...profile.options, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  try {
    await page.goto("http://127.0.0.1:4174/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__arqenvoReady === true, undefined, { timeout: 15000 });
    const canvas = page.locator("#plan-canvas");
    await canvas.waitFor({ state: "visible" });
    const bounds = await canvas.boundingBox();
    if (!bounds || bounds.width < 250 || bounds.height < 250) throw new Error("Drawing canvas has an invalid viewport size");

    await page.locator('[data-tool="wall"]').click();
    const y = bounds.y + bounds.height * 0.5;
    await page.mouse.move(bounds.x + bounds.width * 0.32, y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.68, y, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("1 walls"));

    // Add a perpendicular branch at the first wall's end to exercise live L-junction derivation.
    await page.locator('[data-tool="wall"]').click();
    await page.mouse.move(bounds.x + bounds.width * 0.68, y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.68, y + bounds.height * 0.22, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("2 walls"));

    await page.locator('[data-tool="door"]').click();
    await page.mouse.click(bounds.x + bounds.width * 0.5, y);
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("1 openings"));
    await page.locator('[data-tool="window"]').click();
    const windowX = bounds.x + bounds.width * 0.57;
    if (profile.name === "webkit-ipad-like") await page.touchscreen.tap(windowX, y);
    else await page.mouse.click(windowX, y);
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("2 openings"));

    await page.locator("#undo").click();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("1 openings"));
    await page.locator("#undo").click();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("0 openings"));
    await page.locator("#redo").click();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("1 openings"));
    await page.locator("#redo").click();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("2 openings"));

    if (profile.name === "webkit-desktop") {
      await page.locator('[data-tool="select"]').click();
      await page.mouse.click(bounds.x + bounds.width * 0.38, y);
      await page.locator('input[name="thickness"]').fill("250");
      await page.locator("#apply-element").click();
      await page.waitForFunction(() => document.querySelector('input[name="thickness"]')?.value === "250");
      if (await page.locator('input[name="thickness"]').inputValue() !== "250") throw new Error("Wall thickness edit was not committed");

      await page.locator('[data-tool="select"]').click();
      await page.mouse.click(bounds.x + bounds.width * 0.46, y);
      await page.locator('input[name="width"]').fill("850");
      await page.locator("#apply-element").click();
      if (await page.locator('input[name="width"]').inputValue() !== "850") throw new Error("Opening width edit was not committed");
      await page.locator("#undo").click();
      await page.locator('[data-tool="select"]').click();
      await page.mouse.click(bounds.x + bounds.width * 0.46, y);
      if (await page.locator('input[name="width"]').inputValue() !== "900") throw new Error("Opening edit undo did not restore width");
      await page.locator("#redo").click();
    }

    await page.locator('[data-tool="composite"]').click();
    await page.mouse.move(bounds.x + bounds.width * 0.15, y + bounds.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.45, y + bounds.height * 0.3, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("#element-count")?.textContent?.includes("3 walls"));
    if (profile.name === "webkit-desktop") {
      await page.locator('[data-tool="select"]').click();
      await page.mouse.click(bounds.x + bounds.width * 0.30, y + bounds.height * 0.3);
      const inspectorText = await page.locator("#inspector-content").innerText();
      if (!inspectorText.includes("material-brick") || !inspectorText.includes("material-concrete") || !inspectorText.includes("material-plaster")) {
        throw new Error("Composite skin material identity is not shown in the inspector");
      }
    }

    const downloadPromise = page.waitForEvent("download");
    await page.locator("#export-project").click();
    const download = await downloadPromise;
    const exportedPath = await download.path();
    if (!download.suggestedFilename().endsWith(".arqenvo.json")) throw new Error("Project export filename is incorrect");
    await page.locator("#import-project-button").click();
    await page.locator("#import-project-file").setInputFiles({
      name: "roundtrip.arqenvo.json",
      mimeType: "application/json",
      buffer: await readFile(exportedPath)
    });
    await page.waitForFunction(() => document.querySelector("#canvas-status")?.textContent?.includes("Project imported"));
    await page.locator("#save-project").click();
    await page.waitForFunction(() => document.querySelector("#canvas-status")?.textContent?.startsWith("Saved locally"));
    await page.reload();
    await page.waitForFunction(() => window.__arqenvoReady === true && document.querySelector("#element-count")?.textContent?.includes("3 walls") && document.querySelector("#element-count")?.textContent?.includes("2 openings"), undefined, { timeout: 15000 });

    if (profile.name === "webkit-ipad-like") {
      const inspectorDisplay = await page.locator(".inspector").evaluate((node) => getComputedStyle(node).display);
      if (inspectorDisplay !== "none") throw new Error("Responsive inspector should collapse on iPad-like viewport");
      if (!(await page.locator('[data-tool="window"]').isVisible())) throw new Error("Window tool is not visible on iPad-like viewport");
    }
    if (errors.length) throw new Error(errors.join("\n"));
    results.push({ profile: profile.name, status: "pass", viewport: profile.options.viewport, walls: 3, openings: 2, junction: "L", compositeSkins: 3, doorWindow: "pass", undoRedo: "pass", browserErrors: errors });
  } catch (error) {
    failures.push({ profile: profile.name, error: error instanceof Error ? error.stack ?? error.message : String(error), browserErrors: errors });
  } finally {
    await context.close();
  }
}

try {
  await server.listen();
  browser = await webkit.launch({ headless: true });
  await exerciseProfile({ name: "webkit-desktop", options: { viewport: { width: 1440, height: 900 } } });
  await exerciseProfile({ name: "webkit-ipad-like", options: { ...devices["iPad (gen 7)"] } });
} finally {
  if (browser) await browser.close();
  await server.close();
}

console.log(JSON.stringify({ runtime: process.versions.node, browser: "Playwright WebKit", results, failures }, null, 2));
if (failures.length) process.exitCode = 1;
