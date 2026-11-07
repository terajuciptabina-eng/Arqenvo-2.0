import * as OpenGeometryPackage from "opengeometry";
import { Cuboid, OpenGeometry, Vector3 } from "opengeometry";

const output = document.querySelector("#result");
const startedAt = performance.now();

function prototypeMethods(value) {
  if (!value) return [];
  return Object.getOwnPropertyNames(Object.getPrototypeOf(value))
    .filter((name) => name !== "constructor");
}

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
  const geometry = solid.surface?.geometry;
  const kernel = solid.kernel;
  const result = {
    status: "pass",
    candidate: "opengeometry",
    version: "2.0.18",
    runtime: "browser WebAssembly",
    initializationAndConstructionMilliseconds: performance.now() - startedAt,
    wasmSupported: typeof WebAssembly === "object",
    cuboidConstructed: true,
    cuboidConstructor: solid.constructor.name,
    packageExports: Object.keys(OpenGeometryPackage).sort(),
    cuboidApiMethods: prototypeMethods(solid),
    kernelConstructor: kernel?.constructor?.name ?? null,
    kernelApiMethods: prototypeMethods(kernel),
    kernelOwnProperties: kernel ? Object.keys(kernel) : [],
    config: safeCall(solid, "getConfig"),
    placement: safeCall(solid, "getPlacement"),
    editCapabilities: safeCall(solid, "getEditCapabilities"),
    geometry: geometry ? {
      constructor: geometry.constructor?.name,
      positionAttributeCount: geometry.getAttribute?.("position")?.count ?? null,
      indexCount: geometry.index?.count ?? null,
      boundingBox: geometry.boundingBox ? {
        min: geometry.boundingBox.min.toArray(),
        max: geometry.boundingBox.max.toArray()
      } : null
    } : null,
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