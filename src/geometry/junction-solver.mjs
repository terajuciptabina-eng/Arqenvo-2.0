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

function collinearRelationship(a, b, c, d, tolerance, epsilon) {
  const axis = sub(b, a);
  const axisLength = Math.hypot(axis[0], axis[1]);
  const unit = scale(axis, 1 / axisLength);
  const distanceC = Math.abs(cross(unit, sub(c, a)));
  const distanceD = Math.abs(cross(unit, sub(d, a)));
  if (distanceC > tolerance || distanceD > tolerance) return null;

  const projectionC = (c[0] - a[0]) * unit[0] + (c[1] - a[1]) * unit[1];
  const projectionD = (d[0] - a[0]) * unit[0] + (d[1] - a[1]) * unit[1];
  const overlapStart = Math.max(0, Math.min(projectionC, projectionD));
  const overlapEnd = Math.min(axisLength, Math.max(projectionC, projectionD));
  if (overlapEnd < overlapStart - tolerance) return null;

  if (overlapEnd - overlapStart > tolerance) {
    return {
      type: "COLLINEAR_OVERLAP",
      intervalA: [overlapStart, overlapEnd],
      intervalB: [projectionC, projectionD],
      overlapLength: overlapEnd - overlapStart
    };
  }

  const point = add(a, scale(unit, (overlapStart + overlapEnd) / 2));
  const endpointA = endpointAt({ baseline: [a, b] }, point, tolerance);
  const endpointB = endpointAt({ baseline: [c, d] }, point, tolerance);
  return {
    type: endpointA && endpointB ? "STRAIGHT" : "COLLINEAR_TOUCH",
    point,
    endpointA,
    endpointB,
    parameters: {
      tA: (point[0] - a[0]) * unit[0] / axisLength + (point[1] - a[1]) * unit[1] / axisLength,
      tB: Math.hypot(d[0] - c[0], d[1] - c[1]) > epsilon
        ? ((point[0] - c[0]) * (d[0] - c[0]) + (point[1] - c[1]) * (d[1] - c[1])) / ((d[0] - c[0]) ** 2 + (d[1] - c[1]) ** 2)
        : 0
    }
  };
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

function lMiter(wallA, endA, wallB, endB, point, epsilon, maxMiterRatio) {
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
  const maxMiterDistance = Math.max(wallA.thickness, wallB.thickness) * maxMiterRatio;
  if (distance(outer, point) > maxMiterDistance || distance(inner, point) > maxMiterDistance) return { reason: "MITER_LIMIT_EXCEEDED" };
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
  const maxMiterRatio = options.maxMiterRatio ?? 10;
  const junctions = [];
  const diagnostics = [];
  // Canonical pair order keeps wallIds aligned with endpointA/endpointB and
  // makes candidate geometry independent of project object insertion order.
  const orderedWalls = [...walls].sort((a, b) => a.id.localeCompare(b.id));
  for (let i = 0; i < orderedWalls.length; i += 1) {
    for (let j = i + 1; j < orderedWalls.length; j += 1) {
      const a = orderedWalls[i];
      const b = orderedWalls[j];
      const hit = segmentIntersection(a.baseline[0], a.baseline[1], b.baseline[0], b.baseline[1], epsilon);
      if (!hit) {
        const collinear = collinearRelationship(...a.baseline, ...b.baseline, tolerance, epsilon);
        if (!collinear) continue;
        const id = `junction:${[a.id, b.id].sort().join(":")}`;
        if (collinear.type === "COLLINEAR_OVERLAP") {
          junctions.push({
            id, type: "COLLINEAR_OVERLAP", wallIds: [a.id, b.id],
            geometry: null, operation: "manual-review",
            overlap: { intervalA: collinear.intervalA, intervalB: collinear.intervalB, length: collinear.overlapLength }
          });
          diagnostics.push({ code: "COLLINEAR_WALL_BASELINES_OVERLAP", junctionId: id, wallIds: [a.id, b.id], overlapLength: collinear.overlapLength });
        } else {
          junctions.push({
            id, type: collinear.type, wallIds: [a.id, b.id],
            point: collinear.point, endpointA: collinear.endpointA, endpointB: collinear.endpointB,
            parameters: collinear.parameters, geometry: null,
            operation: "priority-resolution-required"
          });
          diagnostics.push({
            code: collinear.type === "STRAIGHT" ? "STRAIGHT_WALL_JOIN_REQUIRES_PRIORITY_RESOLUTION" : "COLLINEAR_ENDPOINT_TOUCH_REQUIRES_PRIORITY_RESOLUTION",
            junctionId: id, wallIds: [a.id, b.id], point: collinear.point
          });
        }
        continue;
      }
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
      if (type === "L" || type === "ANGLED") {
        geometry = lMiter(a, endA, b, endB, hit.point, epsilon, maxMiterRatio);
        if (geometry?.reason) {
          diagnostics.push({ code: geometry.reason, wallIds: [a.id, b.id], point: hit.point });
          geometry = null;
        }
      }
      if (type === "T") {
        const branch = endA ? a : b;
        const host = endA ? b : a;
        geometry = tCap(branch, endA ? endA : endB, host, hit.point, epsilon);
      }
      const junction = {
        id: `junction:${[a.id, b.id].sort().join(":")}`,
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
  // Build connected components of nearby junction points. Union-find makes
  // tolerance clustering transitive and independent of pair-discovery order.
  const pointJunctions = junctions.filter((junction) => junction.point);
  const parent = pointJunctions.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const unite = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
  };
  for (let i = 0; i < pointJunctions.length; i += 1) {
    for (let j = i + 1; j < pointJunctions.length; j += 1) {
      if (distance(pointJunctions[i].point, pointJunctions[j].point) <= tolerance) unite(i, j);
    }
  }

  const components = new Map();
  for (let i = 0; i < pointJunctions.length; i += 1) {
    const root = find(i);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(pointJunctions[i]);
  }
  const resolvedJunctions = [];
  const clustered = new Set();
  for (const items of components.values()) {
    const wallIds = [...new Set(items.flatMap((item) => item.wallIds))].sort();
    if (wallIds.length > 2) {
      const points = items.map((item) => item.point).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const point = [
        points.reduce((sum, value) => sum + value[0], 0) / points.length,
        points.reduce((sum, value) => sum + value[1], 0) / points.length
      ];
      const junctionIds = items.map((item) => item.id).sort();
      const id = `junction:cluster:${wallIds.join(":")}`;
      resolvedJunctions.push({
        id, type: "MULTI_WALL", wallIds, point,
        geometry: null, operation: "manual-review",
        pairCount: items.length, junctionIds
      });
      diagnostics.push({
        code: "MULTI_WALL_CLUSTER_REQUIRES_PRIORITY_RESOLUTION",
        junctionId: id, wallIds, junctionIds
      });
      for (const item of items) clustered.add(item);
    }
  }
  for (const junction of junctions) {
    if (!clustered.has(junction)) resolvedJunctions.push(junction);
  }
  return { junctions: resolvedJunctions, diagnostics, tolerance, maxMiterRatio };
}
