import { validateProject } from "../bim/model.mjs";

function clone(value) {
  return structuredClone(value);
}

function validateForStorage(project) {
  validateProject(project);
  if (typeof project.id !== "string" || !project.id.trim()) throw new TypeError("Project id is required for persistence");
  return clone(project);
}

export function createMemoryProjectRepository() {
  const records = new Map();
  return Object.freeze({
    async save(project) {
      const safe = validateForStorage(project);
      records.set(safe.id, { project: safe, savedAt: new Date().toISOString() });
      return { id: safe.id, savedAt: records.get(safe.id).savedAt };
    },
    async load(id) {
      const record = records.get(id);
      return record ? clone(record.project) : null;
    },
    async list() {
      return [...records.values()].map(({ project, savedAt }) => ({ id: project.id, savedAt })).sort((a, b) => a.id.localeCompare(b.id));
    },
    async delete(id) {
      return records.delete(id);
    }
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export function createIndexedDbProjectRepository(options = {}) {
  const indexedDb = options.indexedDB ?? globalThis.indexedDB;
  if (!indexedDb) throw new Error("IndexedDB is not available in this browser");
  const databaseName = options.databaseName ?? "arqenvo2-projects";
  const storeName = "projects";
  let closed = false;
  const databasePromise = new Promise((resolve, reject) => {
    const request = indexedDb.open(databaseName, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open project database"));
    request.onblocked = () => reject(new Error("Project database upgrade is blocked by another open tab"));
  });

  async function database() {
    if (closed) throw new Error("Project repository is closed");
    return databasePromise;
  }

  return Object.freeze({
    async save(project) {
      const safe = validateForStorage(project);
      const db = await database();
      const transaction = db.transaction(storeName, "readwrite");
      const done = transactionDone(transaction);
      const savedAt = new Date().toISOString();
      transaction.objectStore(storeName).put({ id: safe.id, project: safe, savedAt });
      await done;
      return { id: safe.id, savedAt };
    },
    async load(id) {
      const db = await database();
      const transaction = db.transaction(storeName, "readonly");
      const done = transactionDone(transaction);
      const record = await requestResult(transaction.objectStore(storeName).get(id));
      await done;
      return record ? clone(record.project) : null;
    },
    async list() {
      const db = await database();
      const transaction = db.transaction(storeName, "readonly");
      const done = transactionDone(transaction);
      const records = await requestResult(transaction.objectStore(storeName).getAll());
      await done;
      return records.map(({ id, savedAt }) => ({ id, savedAt })).sort((a, b) => a.id.localeCompare(b.id));
    },
    async delete(id) {
      const db = await database();
      const transaction = db.transaction(storeName, "readwrite");
      const done = transactionDone(transaction);
      const store = transaction.objectStore(storeName);
      const existed = await requestResult(store.getKey(id));
      store.delete(id);
      await done;
      return existed !== undefined;
    },
    async close() {
      const db = await database();
      db.close();
      closed = true;
    }
  });
}
