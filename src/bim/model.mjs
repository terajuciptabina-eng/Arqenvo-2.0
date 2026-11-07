const EPSILON = 1e-9;

export function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

export function createWall(input) {
  const wall = {
    id: input.id,
    type: "wall",
    baseline: input.baseline.map((point) => [...point]),
    referenceLine: input.referenceLine ?? "center",
    thickness: input.thickness,
    baseElevation: input.baseElevation ?? 0,
    height: input.height,
    storyId: input.storyId ?? null,
    compositeId: input.compositeId ?? null,
    revision: input.revision ?? 1
  };
  validateWall(wall);
  return wall;
}

export function validateWall(wall) {
  if (!wall || typeof wall.id !== "string" || !wall.id.trim()) throw new TypeError("Wall id is required");
  if (!Array.isArray(wall.baseline) || wall.baseline.length !== 2 || wall.baseline.some((p) => !Array.isArray(p) || p.length !== 2)) {
    throw new TypeError("Wall baseline must contain two 2D points");
  }
  for (const [i, coordinate] of wall.baseline.flat().entries()) assertFiniteNumber(coordinate, `baseline[${i}]`);
  const [[ax, ay], [bx, by]] = wall.baseline;
  if (Math.hypot(bx - ax, by - ay) <= EPSILON) throw new RangeError("Wall baseline length must be greater than zero");
  if (!["center", "left", "right"].includes(wall.referenceLine)) throw new RangeError("Unsupported wall referenceLine");
  for (const key of ["thickness", "height", "baseElevation"]) assertFiniteNumber(wall[key], `wall.${key}`);
  if (wall.thickness <= 0 || wall.height <= 0) throw new RangeError("Wall thickness and height must be positive");
  if (!Number.isInteger(wall.revision) || wall.revision < 1) throw new RangeError("Wall revision must be a positive integer");
  return true;
}

export function createComposite(input) {
  const composite = {
    id: input.id,
    type: "composite",
    skins: input.skins.map((skin, order) => ({
      id: skin.id,
      order,
      thickness: skin.thickness,
      materialId: skin.materialId,
      function: skin.function ?? "other"
    })),
    revision: input.revision ?? 1
  };
  validateComposite(composite);
  return composite;
}

export function validateComposite(composite, expectedThickness = undefined, tolerance = 1e-6) {
  if (!composite || typeof composite.id !== "string" || !composite.id.trim()) throw new TypeError("Composite id is required");
  if (!Array.isArray(composite.skins) || composite.skins.length === 0) throw new RangeError("Composite must contain at least one skin");
  const ids = new Set();
  composite.skins.forEach((skin, index) => {
    if (!skin.id || ids.has(skin.id)) throw new RangeError("Skin ids must be present and unique");
    ids.add(skin.id);
    if (skin.order !== index) throw new RangeError("Skin order must be contiguous and deterministic");
    assertFiniteNumber(skin.thickness, `skin[${index}].thickness`);
    if (skin.thickness <= 0) throw new RangeError("Skin thickness must be positive");
    if (!skin.materialId || typeof skin.materialId !== "string") throw new TypeError("Every skin requires a materialId");
  });
  if (expectedThickness !== undefined) {
    assertFiniteNumber(expectedThickness, "expectedThickness");
    const total = composite.skins.reduce((sum, skin) => sum + skin.thickness, 0);
    if (Math.abs(total - expectedThickness) > tolerance) {
      throw new RangeError(`Composite thickness ${total} does not match wall thickness ${expectedThickness}`);
    }
  }
  return true;
}

export function createOpening(input) {
  const opening = {
    id: input.id,
    type: input.type,
    hostWallId: input.hostWallId,
    positionAlongBaseline: input.positionAlongBaseline,
    anchor: input.anchor ?? "center",
    width: input.width,
    height: input.height,
    sillElevation: input.sillElevation ?? 0,
    revision: input.revision ?? 1,
    revealDepth: input.revealDepth ?? 0
  };
  validateOpening(opening);
  return opening;
}

export function validateOpening(opening, hostWall = undefined) {
  if (!opening || typeof opening.id !== "string" || !opening.id.trim()) throw new TypeError("Opening id is required");
  if (!["door", "window", "opening"].includes(opening.type)) throw new RangeError("Opening type must be door, window or opening");
  if (!opening.hostWallId) throw new TypeError("Opening must reference a host wall");
  if (!["center", "left", "right"].includes(opening.anchor)) throw new RangeError("Opening anchor must be center, left or right");
  for (const key of ["positionAlongBaseline", "width", "height", "sillElevation", "revealDepth"]) {
    assertFiniteNumber(opening[key], `opening.${key}`);
  }
  if (opening.width <= 0 || opening.height <= 0 || opening.revealDepth < 0) throw new RangeError("Opening dimensions must be positive and revealDepth non-negative");
  if (!Number.isInteger(opening.revision) || opening.revision < 1) throw new RangeError("Opening revision must be a positive integer");
  if (hostWall) {
    validateWall(hostWall);
    if (opening.hostWallId !== hostWall.id) throw new RangeError("Opening hostWallId does not match supplied host");
    const center = opening.anchor === "center"
      ? opening.positionAlongBaseline
      : opening.anchor === "left"
        ? opening.positionAlongBaseline + opening.width / 2
        : opening.positionAlongBaseline - opening.width / 2;
    const start = center - opening.width / 2;
    const end = center + opening.width / 2;
    if (start < -1e-6 || end > Math.hypot(hostWall.baseline[1][0] - hostWall.baseline[0][0], hostWall.baseline[1][1] - hostWall.baseline[0][1]) + 1e-6) {
      throw new RangeError("Opening must fit within its host wall baseline");
    }
    if (opening.sillElevation < 0 || opening.sillElevation + opening.height > hostWall.height + 1e-6) {
      throw new RangeError("Opening vertical extent must fit within its host wall");
    }
  }
  return true;
}

export function createProject(input = {}) {
  return {
    schemaVersion: 1,
    id: input.id ?? "project",
    revision: 0,
    walls: {},
    composites: {},
    openings: {},
    junctions: {},
    metadata: { units: "mm", coordinateSystem: "right-handed", upAxis: "Z" }
  };
}

export function validateProject(project) {
  if (project.schemaVersion !== 1) throw new RangeError("Unsupported project schema version");
  for (const wall of Object.values(project.walls)) validateWall(wall);
  for (const composite of Object.values(project.composites)) validateComposite(composite);
  for (const opening of Object.values(project.openings)) {
    const host = project.walls[opening.hostWallId];
    if (!host) throw new RangeError(`Opening ${opening.id} references missing host wall ${opening.hostWallId}`);
    validateOpening(opening, host);
  }
  const openingsByHost = new Map();
  for (const opening of Object.values(project.openings)) {
    const host = project.walls[opening.hostWallId];
    const center = opening.anchor === "center"
      ? opening.positionAlongBaseline
      : opening.anchor === "left"
        ? opening.positionAlongBaseline + opening.width / 2
        : opening.positionAlongBaseline - opening.width / 2;
    const range = {
      id: opening.id,
      start: center - opening.width / 2,
      end: center + opening.width / 2,
      sill: opening.sillElevation,
      head: opening.sillElevation + opening.height
    };
    if (!openingsByHost.has(host.id)) openingsByHost.set(host.id, []);
    openingsByHost.get(host.id).push(range);
  }
  for (const [hostId, ranges] of openingsByHost) {
    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const a = ranges[i], b = ranges[j];
        const horizontalOverlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
        const verticalOverlap = Math.min(a.head, b.head) - Math.max(a.sill, b.sill);
        if (horizontalOverlap > 1e-6 && verticalOverlap > 1e-6) {
          throw new RangeError(`Openings ${a.id} and ${b.id} overlap on host wall ${hostId}`);
        }
      }
    }
  }
  for (const wall of Object.values(project.walls)) {
    if (wall.compositeId) {
      const composite = project.composites[wall.compositeId];
      if (!composite) throw new RangeError(`Wall ${wall.id} references missing composite ${wall.compositeId}`);
      validateComposite(composite, wall.thickness);
    }
  }
  return true;
}
