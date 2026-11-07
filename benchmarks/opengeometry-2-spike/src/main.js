import * as OpenGeometryPackage from "opengeometry";
import { AnalyticSolid, Cuboid, OpenGeometry, Vector3, booleanSubtraction, validateAnalyticBrep } from "opengeometry";

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
  const frame = {
    origin: [0, 0, 0],
    x: [1, 0, 0],
    y: [0, 0, -1],
    z: [0, 1, 0]
  };
  const analyticHost = new AnalyticSolid({
    kind: "cuboid",
    width: 1,
    depth: 0.2,
    height: 3,
    frame
  });
  const analyticCutter = new AnalyticSolid({
    kind: "cuboid",
    width: 0.9,
    depth: 0.4,
    height: 2.1,
    frame: { ...frame, origin: [0.05, 0, 0.1] }
  });
  const analyticCut = booleanSubtraction(analyticHost, analyticCutter, { deflection: 0.01 });
  function meshVolume(meshGeometry) {
    const positions = meshGeometry?.getAttribute?.("position");
    if (!positions) return null;
    const indices = meshGeometry.index?.array;
    const triangleCount = indices ? indices.length / 3 : positions.count / 3;
    let signedVolume = 0;
    for (let triangle = 0; triangle < triangleCount; triangle++) {
      const ia = indices ? indices[triangle * 3] : triangle * 3;
      const ib = indices ? indices[triangle * 3 + 1] : triangle * 3 + 1;
      const ic = indices ? indices[triangle * 3 + 2] : triangle * 3 + 2;
      const ax = positions.getX(ia), ay = positions.getY(ia), az = positions.getZ(ia);
      const bx = positions.getX(ib), by = positions.getY(ib), bz = positions.getZ(ib);
      const cx = positions.getX(ic), cy = positions.getY(ic), cz = positions.getZ(ic);
      signedVolume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
    return Math.abs(signedVolume / 6);
  }
  const analyticBrepSerialized = analyticCut.getBrepSerialized();
  const analyticValidation = validateAnalyticBrep(analyticBrepSerialized);
  const analyticCutGeometry = analyticCut.surface?.geometry;
  const result = {
    status: Math.abs(meshVolume(analyticCutGeometry) - 0.222) <= 1e-6 ? "pass" : "fail",
    candidate: "opengeometry",
    version: "2.0.18",
    runtime: "browser WebAssembly",
    initializationAndConstructionMilliseconds: performance.now() - startedAt,
    wasmSupported: typeof WebAssembly === "object",
    cuboidConstructed: true,
    cuboidConstructor: solid.constructor.name,
    analyticSolidConstructor: analyticHost.constructor.name,
    analyticSolidMethods: prototypeMethods(analyticHost),
    analyticBooleanStatus: analyticCut ? "completed" : "missing-result",
    analyticCutMeshVolumeM3: meshVolume(analyticCutGeometry),
    expectedAnalyticCutVolumeM3: 0.222,
    analyticCutMeshVolumeDeltaM3: meshVolume(analyticCutGeometry) === null ? null : meshVolume(analyticCutGeometry) - 0.222,
    analyticBrepSerializedBytes: new TextEncoder().encode(analyticBrepSerialized).length,
    analyticValidation: typeof analyticValidation === "string" ? analyticValidation : analyticValidation,
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
  if (typeof analyticHost.dispose === "function") analyticHost.dispose();
  if (typeof analyticCutter.dispose === "function") analyticCutter.dispose();
  if (typeof analyticCut.dispose === "function") analyticCut.dispose();
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