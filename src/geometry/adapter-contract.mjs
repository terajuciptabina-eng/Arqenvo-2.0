const REQUIRED_METHODS = ["createPrism", "booleanSubtract", "union", "validate", "measure", "dispose"];

export function assertGeometryAdapter(adapter) {
  const missing = REQUIRED_METHODS.filter((name) => typeof adapter?.[name] !== "function");
  if (missing.length) throw new TypeError(`Geometry adapter is missing: ${missing.join(", ")}`);
  return true;
}

export function createGeometryService(adapter) {
  assertGeometryAdapter(adapter);
  return Object.freeze({
    async buildWall(plan) {
      const solids = [];
      for (const skin of plan.skins) {
        const solid = await adapter.createPrism({
          profile: skin.footprint,
          zMin: skin.zRange[0],
          zMax: skin.zRange[1],
          metadata: { skinId: skin.id, materialId: skin.materialId, order: skin.order }
        });
        const validation = await adapter.validate(solid);
        if (!validation?.valid) throw new Error(`Invalid wall skin solid: ${skin.id}`);
        let result = solid;
        const cuts = plan.openings.filter((opening) => opening.cutDepth === "through-all-skins");
        for (const opening of cuts) {
          result = await adapter.booleanSubtract(result, {
            profile: opening.cutPolygon,
            zMin: opening.zRange[0],
            zMax: opening.zRange[1],
            metadata: { openingId: opening.id }
          });
        }
        solids.push({ skinId: skin.id, materialId: skin.materialId, solid: result, validation: await adapter.validate(result), volume: await adapter.measure(result) });
      }
      return solids;
    },
    async union(solids) {
      if (!Array.isArray(solids) || solids.length === 0) throw new RangeError("At least one solid is required");
      return adapter.union(solids);
    },
    async dispose() {
      await adapter.dispose();
    }
  });
}
