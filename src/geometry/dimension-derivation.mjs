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
  const pairs = dimension.kind === "total"
    ? [[0, points.length - 1]]
    : points.slice(0, -1).map((_, index) => [index, index + 1]);
  for (const [startIndex, endIndex] of pairs) {
    const value = distance(points[startIndex], points[endIndex]);
    segments.push({
      index: startIndex,
      start: dimensionPoints[startIndex],
      end: dimensionPoints[endIndex],
      witnessStart: points[startIndex],
      witnessEnd: points[endIndex],
      value,
      label: `${Math.round(value)} mm`
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
