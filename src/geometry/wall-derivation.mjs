import { validateComposite, validateOpening, validateWall } from "../bim/model.mjs";
import { leftNormal, normalize, scale, sub } from "./vector.mjs";

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
