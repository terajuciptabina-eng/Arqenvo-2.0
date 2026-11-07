import { box, measureVolume, unwrap } from "brepjs/quick";

const output = document.querySelector("#result");
const startedAt = performance.now();

try {
  const solid = box(1000, 200, 3000);
  const volumeMm3 = unwrap(measureVolume(solid));
  const operationMilliseconds = performance.now() - startedAt;
  const expectedVolumeMm3 = 600000000;
  const result = {
    status: volumeMm3 === expectedVolumeMm3 ? "pass" : "fail",
    engine: "brepjs + occt-wasm",
    runtime: "browser WebKit",
    expectedVolumeMm3,
    measuredVolumeMm3: volumeMm3,
    operationMilliseconds,
    userAgent: navigator.userAgent,
    wasmSupported: typeof WebAssembly === "object"
  };
  window.__geometryBenchmark = result;
  output.dataset.status = result.status;
  output.textContent = JSON.stringify(result, null, 2);
} catch (error) {
  const result = {
    status: "fail",
    engine: "brepjs + occt-wasm",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    userAgent: navigator.userAgent,
    wasmSupported: typeof WebAssembly === "object"
  };
  window.__geometryBenchmark = result;
  output.dataset.status = "fail";
  output.textContent = JSON.stringify(result, null, 2);
}