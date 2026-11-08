import { assertFiniteNumber } from "../bim/model.mjs";

function cross(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function onSegment(a, b, p, tolerance) {
  return Math.abs(cross(a, b, p)) <= tolerance * Math.max(distance(a, b), 1)
    && p[0] >= Math.min(a[0], b[0]) - tolerance
    && p[0] <= Math.max(a[0], b[0]) + tolerance
    && p[1] >= Math.min(a[1], b[1]) - tolerance
    && p[1] <= Math.max(a[1], b[1]) + tolerance;
}

function segmentsIntersect(a, b, c, d, tolerance) {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  const epsAB = tolerance * Math.max(distance(a, b), 1);
  const epsCD = tolerance * Math.max(distance(c, d), 1);

  if (((abC > epsAB && abD < -epsAB) || (abC < -epsAB && abD > epsAB))
    && ((cdA > epsCD && cdB < -epsCD) || (cdA < -epsCD && cdB > epsCD))) return true;

  return (Math.abs(abC) <= epsAB && onSegment(a, b, c, tolerance))
    || (Math.abs(abD) <= epsAB && onSegment(a, b, d, tolerance))
    || (Math.abs(cdA) <= epsCD && onSegment(c, d, a, tolerance))
    || (Math.abs(cdB) <= epsCD && onSegment(c, d, b, tolerance));
}

/**
 * Validate a simple, non-degenerate 2D polygon.
 * This validates the plan footprint only; it does not prove a valid 3D B-Rep.
 */
export function validateSimplePolygon(points, options = {}) {
  const tolerance = options.tolerance ?? 1e-7;
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Polygon tolerance must be a positive finite number");
  if (!Array.isArray(points) || points.length < 3) {
    return { valid: false, code: "POLYGON_REQUIRES_THREE_POINTS" };
  }

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    if (!Array.isArray(point) || point.length !== 2) {
      return { valid: false, code: "POLYGON_POINT_MUST_BE_2D", pointIndex: i };
    }
    try {
      assertFiniteNumber(point[0], `polygon[${i}][0]`);
      assertFiniteNumber(point[1], `polygon[${i}][1]`);
    } catch {
      return { valid: false, code: "POLYGON_POINT_NOT_FINITE", pointIndex: i };
    }
  }

  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    if (distance(points[i], points[next]) <= tolerance) {
      return { valid: false, code: "POLYGON_ZERO_LENGTH_EDGE", edgeIndex: i };
    }
  }

  let twiceArea = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  const area = twiceArea / 2;
  if (Math.abs(area) <= tolerance * tolerance) {
    return { valid: false, code: "POLYGON_ZERO_AREA", area };
  }

  for (let i = 0; i < points.length; i += 1) {
    const iNext = (i + 1) % points.length;
    for (let j = i + 1; j < points.length; j += 1) {
      const jNext = (j + 1) % points.length;
      if (i === j || iNext === j || jNext === i) continue;
      if (segmentsIntersect(points[i], points[iNext], points[j], points[jNext], tolerance)) {
        return { valid: false, code: "POLYGON_SELF_INTERSECTION", edgeIndices: [i, j], area };
      }
    }
  }

  return { valid: true, area, winding: area > 0 ? "counterclockwise" : "clockwise" };
}


/**
 * Validate the adjacency contract for an ordered wall-skin stack.
 * This checks 2D shared boundaries and Z-range consistency, not 3D solid topology.
 */
export function validateSkinStack(skins, options = {}) {
  const tolerance = options.tolerance ?? 1e-7;
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Skin-stack tolerance must be a positive finite number");
  if (!Array.isArray(skins) || skins.length === 0) {
    return { valid: false, code: "SKIN_STACK_EMPTY" };
  }

  for (let index = 0; index < skins.length; index += 1) {
    const skin = skins[index];
    if (!skin || !Number.isInteger(skin.order) || skin.order !== index) {
      return { valid: false, code: "SKIN_STACK_ORDER_INVALID", skinIndex: index };
    }
    if (!Array.isArray(skin.offsetRange) || skin.offsetRange.length !== 2
      || !skin.offsetRange.every(Number.isFinite) || skin.offsetRange[1] <= skin.offsetRange[0]) {
      return { valid: false, code: "SKIN_OFFSET_RANGE_INVALID", skinIndex: index };
    }
    if (!Array.isArray(skin.zRange) || skin.zRange.length !== 2
      || !skin.zRange.every(Number.isFinite) || skin.zRange[1] <= skin.zRange[0]) {
      return { valid: false, code: "SKIN_Z_RANGE_INVALID", skinIndex: index };
    }
    const footprint = validateSimplePolygon(skin.footprint, { tolerance });
    if (!footprint.valid) {
      return { valid: false, code: "SKIN_FOOTPRINT_INVALID", skinIndex: index, reason: footprint.code };
    }
  }

  for (let index = 0; index < skins.length - 1; index += 1) {
    const current = skins[index];
    const next = skins[index + 1];
    if (Math.abs(current.offsetRange[1] - next.offsetRange[0]) > tolerance) {
      return { valid: false, code: "SKIN_OFFSET_GAP_OR_OVERLAP", skinIndices: [index, index + 1] };
    }
    if (Math.abs(current.zRange[0] - next.zRange[0]) > tolerance
      || Math.abs(current.zRange[1] - next.zRange[1]) > tolerance) {
      return { valid: false, code: "SKIN_Z_RANGE_MISMATCH", skinIndices: [index, index + 1] };
    }
    const sharedBoundaryMatches =
      distance(current.footprint[2], next.footprint[1]) <= tolerance
      && distance(current.footprint[3], next.footprint[0]) <= tolerance;
    if (!sharedBoundaryMatches) {
      return { valid: false, code: "SKIN_SHARED_BOUNDARY_MISMATCH", skinIndices: [index, index + 1] };
    }
  }

  return { valid: true, skinCount: skins.length };
}
