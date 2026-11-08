import { assertFiniteNumber } from "../bim/model.mjs";

function isPoint2D(point) {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pointOnSegment(point, start, end, tolerance) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= tolerance * tolerance) return false;
  const t = ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared;
  if (t < -tolerance || t > 1 + tolerance) return false;
  const projection = [start[0] + t * dx, start[1] + t * dy];
  return distance(point, projection) <= tolerance;
}

function endpointMatches(wall, endpoint, point, tolerance) {
  if (!["start", "end"].includes(endpoint)) return false;
  return distance(wall.baseline[endpoint === "start" ? 0 : 1], point) <= tolerance;
}

/**
 * Validate generic junction-domain invariants before a geometry candidate is staged.
 * This is an independent contract, not Graphisoft EndJunctionDomainsTest parity.
 */
export function validateJunctionCandidate(junction, project, options = {}) {
  const tolerance = options.tolerance ?? 1e-6;
  if (!Number.isFinite(tolerance) || tolerance <= 0) throw new RangeError("Junction tolerance must be a positive finite number");
  if (!junction || typeof junction.id !== "string" || !junction.id.trim()) {
    return { valid: false, code: "JUNCTION_ID_INVALID" };
  }
  if (!["L", "ANGLED", "T"].includes(junction.type)) {
    return { valid: false, code: "JUNCTION_TYPE_UNSUPPORTED" };
  }
  if (!Array.isArray(junction.wallIds) || junction.wallIds.length !== 2
    || junction.wallIds.some((id) => typeof id !== "string" || !id.trim())
    || new Set(junction.wallIds).size !== 2) {
    return { valid: false, code: "JUNCTION_WALL_IDS_INVALID" };
  }
  const [wallAId, wallBId] = junction.wallIds;
  const wallA = project?.walls?.[wallAId];
  const wallB = project?.walls?.[wallBId];
  if (!wallA || !wallB) return { valid: false, code: "JUNCTION_WALL_MISSING" };
  if (!isPoint2D(junction.point)) return { valid: false, code: "JUNCTION_POINT_INVALID" };
  try {
    junction.point.forEach((value, index) => assertFiniteNumber(value, `junction.point[${index}]`));
  } catch {
    return { valid: false, code: "JUNCTION_POINT_INVALID" };
  }

  const geometry = junction.geometry;
  if (!geometry || typeof geometry !== "object") return { valid: false, code: "JUNCTION_GEOMETRY_MISSING" };
  if (junction.type === "L" || junction.type === "ANGLED") {
    if (!endpointMatches(wallA, junction.endpointA, junction.point, tolerance)
      || !endpointMatches(wallB, junction.endpointB, junction.point, tolerance)) {
      return { valid: false, code: "JUNCTION_ENDPOINT_IDENTITY_MISMATCH" };
    }
    if (!isPoint2D(geometry.outer) || !isPoint2D(geometry.inner)
      || distance(geometry.outer, geometry.inner) <= tolerance) {
      return { valid: false, code: "JUNCTION_MITER_GEOMETRY_INVALID" };
    }
    return { valid: true, affectedWallIds: [wallAId, wallBId].sort(), endpointCount: 2 };
  }

  const branchIsA = Boolean(junction.endpointA) && junction.endpointB === null;
  const branchIsB = Boolean(junction.endpointB) && junction.endpointA === null;
  if (!branchIsA && !branchIsB) return { valid: false, code: "T_JUNCTION_ENDPOINT_IDENTITY_INVALID" };
  const branch = branchIsA ? wallA : wallB;
  const host = branchIsA ? wallB : wallA;
  const branchEndpoint = branchIsA ? junction.endpointA : junction.endpointB;
  if (!endpointMatches(branch, branchEndpoint, junction.point, tolerance)
    || !pointOnSegment(junction.point, host.baseline[0], host.baseline[1], tolerance)) {
    return { valid: false, code: "T_JUNCTION_DOMAIN_MISMATCH" };
  }
  if (geometry.branchWallId !== branch.id || geometry.hostWallId !== host.id
    || !Array.isArray(geometry.cap) || geometry.cap.length !== 2
    || !geometry.cap.every(isPoint2D)
    || distance(geometry.cap[0], geometry.cap[1]) <= tolerance) {
    return { valid: false, code: "T_JUNCTION_CAP_GEOMETRY_INVALID" };
  }
  return { valid: true, affectedWallIds: [branch.id, host.id].sort(), endpointCount: 1 };
}
