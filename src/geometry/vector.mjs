export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const scale = (v, k) => [v[0] * k, v[1] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const length = (v) => Math.hypot(v[0], v[1]);
export const normalize = (v) => {
  const magnitude = length(v);
  if (!Number.isFinite(magnitude) || magnitude <= 1e-12) throw new RangeError("Cannot normalize a zero-length vector");
  return scale(v, 1 / magnitude);
};
export const leftNormal = (v) => [-v[1], v[0]];
export const distance = (a, b) => length(sub(a, b));

export function lineIntersection(p, r, q, s, epsilon = 1e-10) {
  const denominator = cross(r, s);
  if (Math.abs(denominator) <= epsilon) return null;
  const t = cross(sub(q, p), s) / denominator;
  return add(p, scale(r, t));
}
