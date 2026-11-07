export class DependencyGraph {
  #forward = new Map();

  addDependency(sourceId, dependentId) {
    if (!sourceId || !dependentId || sourceId === dependentId) throw new TypeError("Dependency endpoints must be distinct non-empty ids");
    if (!this.#forward.has(sourceId)) this.#forward.set(sourceId, new Set());
    this.#forward.get(sourceId).add(dependentId);
    return this;
  }

  removeDependency(sourceId, dependentId) {
    const dependents = this.#forward.get(sourceId);
    if (!dependents) return false;
    const removed = dependents.delete(dependentId);
    if (dependents.size === 0) this.#forward.delete(sourceId);
    return removed;
  }

  getDependents(sourceIds, options = {}) {
    const transitive = options.transitive ?? true;
    const visited = new Set();
    const queue = [...new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds])];
    while (queue.length) {
      const current = queue.shift();
      for (const dependent of this.#forward.get(current) ?? []) {
        if (visited.has(dependent)) continue;
        visited.add(dependent);
        if (transitive) queue.push(dependent);
      }
    }
    return [...visited].sort();
  }

  invalidate(sourceIds) {
    const sources = [...new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds])];
    return [...new Set([...sources, ...this.getDependents(sources)])].sort();
  }
}

export function buildProjectDependencyGraph(project) {
  const graph = new DependencyGraph();
  for (const wall of Object.values(project.walls ?? {})) {
    if (wall.compositeId) graph.addDependency(`composite:${wall.compositeId}`, `wall:${wall.id}`);
  }
  for (const opening of Object.values(project.openings ?? {})) {
    graph.addDependency(`wall:${opening.hostWallId}`, `opening:${opening.id}`);
  }
  for (const junction of Object.values(project.junctions ?? {})) {
    const junctionKey = `junction:${junction.id}`;
    for (const wallId of junction.wallIds ?? []) {
      graph.addDependency(`wall:${wallId}`, junctionKey);
      graph.addDependency(junctionKey, `wall:${wallId}`);
    }
  }
  return graph;
}

export function changedProjectEntities(before, after) {
  const changed = [];
  for (const type of ["walls", "composites", "openings", "junctions"]) {
    const oldItems = before[type] ?? {};
    const newItems = after[type] ?? {};
    for (const id of new Set([...Object.keys(oldItems), ...Object.keys(newItems)])) {
      if (JSON.stringify(oldItems[id]) !== JSON.stringify(newItems[id])) {
        const prefix = type === "walls" ? "wall" : type === "composites" ? "composite" : type === "openings" ? "opening" : "junction";
        changed.push(`${prefix}:${id}`);
      }
    }
  }
  return changed.sort();
}
