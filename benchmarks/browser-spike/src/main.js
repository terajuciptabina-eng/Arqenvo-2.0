import { OcctKernel } from "occt-wasm";
import { registerKernel, OcctWasmAdapter, box, measureVolume, unwrap } from "brepjs";
import wasmUrl from "occt-wasm/dist/occt-wasm.wasm?url";

const output = document.querySelector("#result");
const startedAt = performance.now();

try {
  const kernel = await OcctKernel.init({ wasm: wasmUrl });
  registerKernel("occt-wasm", OcctWasmAdapter.fromKernel(kernel));
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
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    userAgent: navigator.userAgent,
    wasmSupported: typeof WebAssembly === "object"
  };
  window.__geometryBenchmark = result;
  output.dataset.status = "fail";
  output.textContent = JSON.stringify(result, null, 2);
}