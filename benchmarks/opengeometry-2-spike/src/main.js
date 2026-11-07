import { Cuboid, OpenGeometry, Vector3 } from "opengeometry";

const output = document.querySelector("#result");
const startedAt = performance.now();

function safeCall(target, name) {
  if (typeof target?.[name] !== "function") return { available: false };
  try {
    const value = target[name]();
    if (value && typeof value.then === "function") return { available: true, async: true };
    if (typeof value === "bigint") return { available: true, value: value.toString() };
    return { available: true, value };
  } catch (error) {
    return { available: true, error: error instanceof Error ? error.message : String(error) };
  }
}

try {
  await OpenGeometry.create({ wasmURL: "/opengeometry_bg.wasm" });
  const solid = new Cuboid({
    center: new Vector3(0, 0, 0),
    width: 1,
    height: 1,
    depth: 1,
    color: 0x33aa66
  });
  const prototype = Object.getPrototypeOf(solid);
  const apiMethods = Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor");
  const queryMethods = {};
  for (const name of ["getVolume", "volume", "measure", "getBounds", "isValid", "validity", "getBrep", "toBrep"]) {
    queryMethods[name] = safeCall(solid, name);
  }
  const result = {
    status: "pass",
    candidate: "opengeometry",
    version: "2.0.18",
    runtime: "browser WebAssembly",
    initializationAndConstructionMilliseconds: performance.now() - startedAt,
    wasmSupported: typeof WebAssembly === "object",
    cuboidConstructed: true,
    cuboidConstructor: solid.constructor.name,
    ownProperties: Object.keys(solid),
    apiMethods,
    queryMethods,
    openGeometryStaticMethods: Object.getOwnPropertyNames(OpenGeometry).filter((name) => typeof OpenGeometry[name] === "function"),
    userAgent: navigator.userAgent
  };
  window.__geometryBenchmark = result;
  output.dataset.status = "pass";
  output.textContent = JSON.stringify(result, null, 2);
  if (typeof solid.dispose === "function") solid.dispose();
} catch (error) {
  const result = {
    status: "fail",
    candidate: "opengeometry",
    version: "2.0.18",
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    wasmSupported: typeof WebAssembly === "object",
    userAgent: navigator.userAgent
  };
  window.__geometryBenchmark = result;
  output.dataset.status = "fail";
  output.textContent = JSON.stringify(result, null, 2);
}