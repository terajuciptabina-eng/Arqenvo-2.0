import { add, cross, distance, leftNormal, lineIntersection, normalize, scale, sub } from "./vector.mjs";

function endpointAt(wall, point, tolerance) {
  if (distance(wall.baseline[0], point) <= tolerance) return "start";
  if (distance(wall.baseline[1], point) <= tolerance) return "end";
  return null;
}

function segmentIntersection(a, b, c, d, epsilon) {
  const r = sub(b, a);
  const s = sub(d, c);
  const denominator = cross(r, s);
  if (Math.abs(denominator) <= epsilon) return null;
  const t = cross(sub(c, a), s) / denominator;
  const u = cross(sub(c, a), r) / denominator;
  if (t < -epsilon || t > 1 + epsilon || u < -epsilon || u > 1 + epsilon) return null;
  return { point: add(a, scale(r, t)), t, u };
}

function rayFromEndpoint(wall, endpoint) {
  const direction = normalize(sub(wall.baseline[1], wall.baseline[0]));
  return endpoint === "start" ? direction : scale(direction, -1);
}

function offsetLine(wall, endpoint, side) {
  const ray = rayFromEndpoint(wall, endpoint);
  const normal = leftNormal(ray);
  const joint = endpoint === "start" ? wall.baseline[0] : wall.baseline[1];
  return { point: add(joint, scale(normal, side * wall.thickness / 2)), direction: ray };
}

function lMiter(wallA, endA, wallB, endB, point, epsilon) {
  const rayA = rayFromEndpoint(wallA, endA);
  const rayB = rayFromEndpoint(wallB, endB);
  const turn = cross(rayA, rayB);
  if (Math.abs(turn) <= epsilon) return null;
  const side = Math.sign(turn);
  const aOuter = offsetLine(wallA, endA, side);
  const bOuter = offsetLine(wallB, endB, -side);
  const aInner = offsetLine(wallA, endA, -side);
  const bInner = offsetLine(wallB, endB, side);
  const outer = lineIntersection(aOuter.point, aOuter.direction, bOuter.point, bOuter.direction, epsilon);
  const inner = lineIntersection(aInner.point, aInner.direction, bInner.point, bInner.direction, epsilon);
  if (!outer || !inner || !outer.every(Number.isFinite) || !inner.every(Number.isFinite)) return null;
  return { point, outer, inner };
}

function tCap(branch, branchEnd, host, point, epsilon) {
  const ray = rayFromEndpoint(branch, branchEnd);
  const branchNormal = leftNormal(ray);
  const hostDirection = normalize(sub(host.baseline[1], host.baseline[0]));
  const hostNormal = leftNormal(hostDirection);
  const hostA = add(point, scale(hostNormal, host.thickness / 2));
  const hostB = add(point, scale(hostNormal, -host.thickness / 2));
  const branchSideA = add(point, scale(branchNormal, branch.thickness / 2));
  const branchSideB = add(point, scale(branchNormal, -branch.thickness / 2));
  const a = lineIntersection(branchSideA, ray, hostA, hostDirection, epsilon);
  const b = lineIntersection(branchSideB, ray, hostB, hostDirection, epsilon);
  return a && b ? { point, cap: [a, b], hostWallId: host.id, branchWallId: branch.id } : null;
}

export function solveWallJunctions(walls, options = {}) {
  const tolerance = options.tolerance ?? 1e-6;
  const angularToleranceDegrees = options.angularToleranceDegrees ?? 1;
  const epsilon = options.epsilon ?? 1e-10;
  const junctions = [];
  const diagnostics = [];
  for (let i = 0; i < walls.length; i += 1) {
    for (let j = i + 1; j < walls.length; j += 1) {
      const a = walls[i];
      const b = walls[j];
      const hit = segmentIntersection(a.baseline[0], a.baseline[1], b.baseline[0], b.baseline[1], epsilon);
      if (!hit) continue;
      const endA = endpointAt(a, hit.point, tolerance);
      const endB = endpointAt(b, hit.point, tolerance);
      const endpointCount = Number(Boolean(endA)) + Number(Boolean(endB));
      let type = endpointCount === 2 ? "L" : endpointCount === 1 ? "T" : "CROSS";
      if (type === "L") {
        const rayA = rayFromEndpoint(a, endA);
        const rayB = rayFromEndpoint(b, endB);
        const angle = Math.acos(Math.max(-1, Math.min(1, rayA[0] * rayB[0] + rayA[1] * rayB[1]))) * 180 / Math.PI;
        if (Math.abs(angle - 90) > angularToleranceDegrees) type = "ANGLED";
      }
      let geometry = null;
      if (type === "L" || type === "ANGLED") geometry = lMiter(a, endA, b, endB, hit.point, epsilon);
      if (type === "T") {
        const branch = endA ? a : b;
        const host = endA ? b : a;
        geometry = tCap(branch, endA ? endA : endB, host, hit.point, epsilon);
      }
      const junction = {
        id: `junction:${a.id}:${b.id}`,
        type,
        wallIds: [a.id, b.id],
        point: hit.point,
        endpointA: endA,
        endpointB: endB,
        parameters: { tA: hit.t, tB: hit.u },
        geometry,
        operation: type === "CROSS" ? "kernel-union-required" : geometry ? "trim-plan" : "manual-review"
      };
      junctions.push(junction);
      if (!geometry && type !== "CROSS") diagnostics.push({ code: "JUNCTION_GEOMETRY_UNRESOLVED", junctionId: junction.id });
    }
  }
  return { junctions, diagnostics, tolerance };
}
