import { createProject, validateProject } from "../bim/model.mjs";
import { buildProjectDependencyGraph, changedProjectEntities } from "../bim/dependency-graph.mjs";

function clone(value) {
  return structuredClone(value);
}

export class ProjectStore {
  #state;
  #undo = [];
  #redo = [];

  constructor(project = createProject()) {
    validateProject(project);
    this.#state = clone(project);
  }

  get snapshot() {
    return clone(this.#state);
  }

  transact(label, mutator) {
    if (typeof mutator !== "function") throw new TypeError("Transaction mutator must be a function");
    const draft = clone(this.#state);
    const result = mutator(draft);
    validateProject(draft);
    const changedEntities = changedProjectEntities(this.#state, draft);
    const previousGraph = buildProjectDependencyGraph(this.#state);
    const nextGraph = buildProjectDependencyGraph(draft);
    const invalidated = [...new Set([...previousGraph.invalidate(changedEntities), ...nextGraph.invalidate(changedEntities)])].sort();
    this.#undo.push({ label, state: this.#state });
    this.#redo = [];
    draft.revision = this.#state.revision + 1;
    this.#state = draft;
    return { revision: draft.revision, result, changedEntities, invalidatedElementIds: invalidated };
  }

  undo() {
    const previous = this.#undo.pop();
    if (!previous) return false;
    this.#redo.push({ label: previous.label, state: this.#state });
    this.#state = clone(previous.state);
    return true;
  }

  redo() {
    const next = this.#redo.pop();
    if (!next) return false;
    this.#undo.push({ label: next.label, state: this.#state });
    this.#state = clone(next.state);
    return true;
  }
}
