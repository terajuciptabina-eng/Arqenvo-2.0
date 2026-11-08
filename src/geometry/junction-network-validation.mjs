import { validateJunctionCandidate } from "./junction-domain-validation.mjs";

/**
 * Analyse the graph formed by pairwise wall junctions.
 * Multiple junctions on one wall are allowed when they consume distinct endpoints.
 * A wall endpoint cannot be owned by two separate junction candidates.
 */
export function validateJunctionNetwork(junctions, project, options = {}) {
  const tolerance = options.tolerance ?? 1e-6;
  const entries = (junctions ?? []).map((junction) => ({
    junction,
    domain: validateJunctionCandidate(junction, project, { tolerance })
  }));
  const parent = entries.map((_, index) => index);
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
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  const wallOwners = new Map();
  entries.forEach(({ junction }, index) => {
    for (const wallId of junction.wallIds ?? []) {
      if (!wallOwners.has(wallId)) wallOwners.set(wallId, []);
      wallOwners.get(wallId).push(index);
    }
  });
  for (const indices of wallOwners.values()) {
    for (let i = 1; i < indices.length; i += 1) unite(indices[0], indices[i]);
  }

  const endpointClaims = new Map();
  const claim = (wallId, endpoint, junctionId) => {
    const key = `${wallId}:${endpoint}`;
    if (!endpointClaims.has(key)) endpointClaims.set(key, []);
    endpointClaims.get(key).push(junctionId);
  };
  for (const { junction, domain } of entries) {
    if (!domain.valid) continue;
    if (junction.type === "L" || junction.type === "ANGLED") {
      claim(junction.wallIds[0], junction.endpointA, junction.id);
      claim(junction.wallIds[1], junction.endpointB, junction.id);
    } else if (junction.type === "T") {
      const branchId = junction.endpointA ? junction.wallIds[0] : junction.wallIds[1];
      claim(branchId, junction.endpointA ?? junction.endpointB, junction.id);
    }
  }

  const conflicts = [];
  for (const [key, ids] of endpointClaims) {
    const uniqueIds = [...new Set(ids)].sort();
    if (uniqueIds.length > 1) {
      const separator = key.lastIndexOf(":");
      conflicts.push({
        code: "WALL_ENDPOINT_CLAIMED_BY_MULTIPLE_JUNCTIONS",
        wallId: key.slice(0, separator),
        endpoint: key.slice(separator + 1),
        junctionIds: uniqueIds
      });
    }
  }
  const conflictByJunction = new Map();
  for (const conflict of conflicts) {
    for (const junctionId of conflict.junctionIds) {
      if (!conflictByJunction.has(junctionId)) conflictByJunction.set(junctionId, []);
      conflictByJunction.get(junctionId).push(conflict);
    }
  }

  const components = new Map();
  entries.forEach(({ junction }, index) => {
    const root = find(index);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(junction);
  });
  const networks = [...components.values()].map((members) => {
    const wallIds = [...new Set(members.flatMap((junction) => junction.wallIds ?? []))].sort();
    const junctionIds = members.map((junction) => junction.id).sort();
    return {
      id: `network:${wallIds.join(":")}`,
      wallIds,
      junctionIds,
      junctionCount: junctionIds.length,
      wallJunctionCounts: Object.fromEntries(wallIds.map((wallId) => [
        wallId,
        members.filter((junction) => junction.wallIds?.includes(wallId)).length
      ]))
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const resolutions = entries.map(({ junction, domain }) => ({
    junctionId: junction.id,
    valid: domain.valid && !conflictByJunction.has(junction.id),
    domain,
    conflicts: conflictByJunction.get(junction.id) ?? []
  }));
  return { valid: conflicts.length === 0, networks, conflicts, resolutions };
}
