import { validateComposite, validateOpening, validateWall } from "../bim/model.mjs";
import { dot, leftNormal, normalize, scale, sub } from "./vector.mjs";
import { solveWallJunctions } from "./junction-solver.mjs";

export function deriveWallPlan(wall, composite = null, openings = []) {
  validateWall(wall);
  if (composite) validateComposite(composite, wall.thickness);
  for (const opening of openings) validateOpening(opening, wall);
  const direction = normalize(sub(wall.baseline[1], wall.baseline[0]));
  const normal = leftNormal(direction);
  const length = Math.hypot(wall.baseline[1][0] - wall.baseline[0][0], wall.baseline[1][1] - wall.baseline[0][1]);
  const skins = composite
    ? composite.skins.map((skin) => ({ ...skin }))
    : [{ id: `${wall.id}:core`, order: 0, thickness: wall.thickness, materialId: null, function: "core" }];
  const referenceOffset = wall.referenceLine === "left" ? -wall.thickness : wall.referenceLine === "right" ? 0 : -wall.thickness / 2;
  let cursor = referenceOffset;
  const skinPlans = skins.map((skin) => {
    const minOffset = cursor;
    const maxOffset = cursor + skin.thickness;
    cursor = maxOffset;
    const offsetPoint = (distance) => scale(normal, distance);
    return {
      id: skin.id,
      order: skin.order,
      materialId: skin.materialId,
      function: skin.function,
      thickness: skin.thickness,
      offsetRange: [minOffset, maxOffset],
      footprint: [
        [wall.baseline[0][0] + offsetPoint(minOffset)[0], wall.baseline[0][1] + offsetPoint(minOffset)[1]],
        [wall.baseline[1][0] + offsetPoint(minOffset)[0], wall.baseline[1][1] + offsetPoint(minOffset)[1]],
        [wall.baseline[1][0] + offsetPoint(maxOffset)[0], wall.baseline[1][1] + offsetPoint(maxOffset)[1]],
        [wall.baseline[0][0] + offsetPoint(maxOffset)[0], wall.baseline[0][1] + offsetPoint(maxOffset)[1]]
      ],
      zRange: [wall.baseElevation, wall.baseElevation + wall.height]
    };
  });
  const openingPlans = openings.map((opening) => {
    const center = opening.anchor === "center"
      ? opening.positionAlongBaseline
      : opening.anchor === "left"
        ? opening.positionAlongBaseline + opening.width / 2
        : opening.positionAlongBaseline - opening.width / 2;
    const start = center - opening.width / 2;
    const end = center + opening.width / 2;
    const cutStart = [wall.baseline[0][0] + direction[0] * start, wall.baseline[0][1] + direction[1] * start];
    const cutEnd = [wall.baseline[0][0] + direction[0] * end, wall.baseline[0][1] + direction[1] * end];
    return {
      id: opening.id,
      type: opening.type,
      hostWallId: wall.id,
      anchor: opening.anchor,
      centerAlongBaseline: center,
      localRange: [start, end],
      width: opening.width,
      height: opening.height,
      zRange: [wall.baseElevation + opening.sillElevation, wall.baseElevation + opening.sillElevation + opening.height],
      cutDepth: "through-all-skins",
      cutPolygon: [
        [cutStart[0] + normal[0] * (referenceOffset - 1), cutStart[1] + normal[1] * (referenceOffset - 1)],
        [cutEnd[0] + normal[0] * (referenceOffset - 1), cutEnd[1] + normal[1] * (referenceOffset - 1)],
        [cutEnd[0] + normal[0] * (referenceOffset + wall.thickness + 1), cutEnd[1] + normal[1] * (referenceOffset + wall.thickness + 1)],
        [cutStart[0] + normal[0] * (referenceOffset + wall.thickness + 1), cutStart[1] + normal[1] * (referenceOffset + wall.thickness + 1)]
      ]
    };
  });
  return {
    wallId: wall.id,
    sourceRevision: wall.revision,
    coordinateSystem: "project-mm",
    baselineLength: length,
    direction,
    normal,
    thickness: wall.thickness,
    zRange: [wall.baseElevation, wall.baseElevation + wall.height],
    skins: skinPlans,
    openings: openingPlans
  };
}

function interpolatePoint(a, b, amount) {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount];
}

function applyEndpointCap(plan, wall, endpoint, capPoints) {
  if (!capPoints || capPoints.length !== 2) return false;
  const direction = normalize(sub(wall.baseline[1], wall.baseline[0]));
  const normal = leftNormal(direction);
  const joint = endpoint === "start" ? wall.baseline[0] : wall.baseline[1];
  const ordered = [...capPoints].sort((a, b) => dot(sub(a, joint), normal) - dot(sub(b, joint), normal));
  const totalMin = plan.skins[0].offsetRange[0];
  const totalMax = plan.skins[plan.skins.length - 1].offsetRange[1];
  const totalThickness = totalMax - totalMin;
  if (totalThickness <= 0) return false;
  for (const skin of plan.skins) {
    const low = (skin.offsetRange[0] - totalMin) / totalThickness;
    const high = (skin.offsetRange[1] - totalMin) / totalThickness;
    const lowPoint = interpolatePoint(ordered[0], ordered[1], low);
    const highPoint = interpolatePoint(ordered[0], ordered[1], high);
    if (endpoint === "start") {
      skin.footprint[0] = lowPoint;
      skin.footprint[3] = highPoint;
    } else {
      skin.footprint[1] = lowPoint;
      skin.footprint[2] = highPoint;
    }
  }
  plan.junctionCaps ??= [];
  plan.junctionCaps.push({ endpoint, points: ordered });
  return true;
}

export function deriveProjectPlan(project, options = {}) {
  const walls = Object.values(project.walls ?? {});
  const junctionResult = solveWallJunctions(walls, options);
  const plans = Object.fromEntries(walls.map((wall) => {
    const composite = wall.compositeId ? project.composites?.[wall.compositeId] : null;
    const openings = Object.values(project.openings ?? {}).filter((opening) => opening.hostWallId === wall.id);
    return [wall.id, deriveWallPlan(wall, composite, openings)];
  }));
  for (const junction of junctionResult.junctions) {
    if (!junction.geometry) continue;
    if (junction.type === "L" || junction.type === "ANGLED") {
      const wallA = project.walls[junction.wallIds[0]];
      const wallB = project.walls[junction.wallIds[1]];
      applyEndpointCap(plans[wallA.id], wallA, junction.endpointA, [junction.geometry.outer, junction.geometry.inner]);
      applyEndpointCap(plans[wallB.id], wallB, junction.endpointB, [junction.geometry.outer, junction.geometry.inner]);
    } else if (junction.type === "T") {
      const branchId = junction.endpointA ? junction.wallIds[0] : junction.wallIds[1];
      const endpoint = junction.endpointA ?? junction.endpointB;
      const branch = project.walls[branchId];
      applyEndpointCap(plans[branchId], branch, endpoint, junction.geometry.cap);
    }
  }
  return { walls: plans, junctions: junctionResult.junctions, diagnostics: junctionResult.diagnostics };
}
