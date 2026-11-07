import { add, distance, leftNormal, normalize, scale, sub } from "./vector.mjs";

function resolveAnchor(anchor, project) {
  if (anchor.type === "point") return [...anchor.point];
  const wall = project.walls[anchor.wallId];
  return [...wall.baseline[anchor.endpoint === "start" ? 0 : 1]];
}

export function deriveDimensionPlan(project, dimension) {
  const points = dimension.anchors.map((anchor) => resolveAnchor(anchor, project));
  const direction = normalize(sub(points[points.length - 1], points[0]));
  const normal = leftNormal(direction);
  const dimensionPoints = points.map((point) => add(point, scale(normal, dimension.offset)));
  const segments = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      index,
      start: dimensionPoints[index],
      end: dimensionPoints[index + 1],
      witnessStart: points[index],
      witnessEnd: points[index + 1],
      value: distance(points[index], points[index + 1]),
      label: `${Math.round(distance(points[index], points[index + 1]))} mm`
    });
  }
  return {
    id: dimension.id,
    kind: dimension.kind,
    offset: dimension.offset,
    points,
    dimensionPoints,
    segments,
    totalValue: distance(points[0], points[points.length - 1]),
    totalLabel: `${Math.round(distance(points[0], points[points.length - 1]))} mm`
  };
}

export function deriveProjectDimensions(project) {
  return Object.values(project.dimensions ?? {}).map((dimension) => deriveDimensionPlan(project, dimension));
}
