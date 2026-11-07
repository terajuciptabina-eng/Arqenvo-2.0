# Isolated B-Rep kernel spike — brepjs + occt-wasm

This folder is an evaluation-only prototype. It is **not** ARQENVO application source and does not select a production geometry kernel.

## What it tests

The runner consumes the shared fixture file at `docs/GEOMETRY_BENCHMARKS/fixtures/wall-core-fixtures.json` and runs:

- K01 — straight wall solid and analytic volume.
- K03 — fuse two precomputed wall solids into an L-shaped result.
- K06 — three separate composite skin solids and per-skin volumes.
- K07 — subtract a door opening through all three skins and measure the remaining volumes.

It exports STEP files and writes a machine-readable JSON report. The K03 test intentionally does not implement BIM wall-junction priority; it tests only the kernel operation on identical, precomputed boundaries.

## Run on macOS

Requirements: Node.js 24+ and npm. Run from the repository root after pulling the latest `main`:

```bash
cd benchmarks/kernel-spike
node -v
npm install
npm run bench
```

The direct package versions are pinned in `package.json`. Keep the generated `package-lock.json` with the result so transitive dependencies are reproducible.

## Output

The runner creates `benchmark-output/` containing:

- `benchmark-results-brepjs.json`
- `K01-straight-wall.step`
- `K03-L-junction-union.step`
- `K06-*.step`
- `K07-*-door-cut.step`

Package the results for review:

```bash
cd benchmarks/kernel-spike
zip -r "$HOME/Desktop/ARQENVO2-BREPJS-SPIKE-RESULTS.zip" benchmark-output package-lock.json
```

Upload that ZIP for analysis. Do not upload `node_modules`.

## Interpretation limits

- The runner measures Node-side WASM geometry operations, not browser rendering or iPad Safari.
- The script records volume deltas but does not impose an unapproved geometric tolerance.
- Successful STEP export is useful evidence but is not a complete topology-validation suite.
- This is only the first B-Rep candidate spike. OpenGeometry and Manifold still require comparable isolated tests.
- No application code, production dependency or deployment configuration is changed by this prototype.
