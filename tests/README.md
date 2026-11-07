# ARQENVO 2.0 — Test Strategy

The first executable greenfield vertical slice is covered by Node's built-in test runner. No third-party runtime or test dependency is required.

Run from repository root:

```bash
node --test tests/unit/*.test.mjs
```

Current automated coverage:
- Semantic wall validation, finite parameters and positive dimensions.
- Composite skin order, thickness closure and material identity.
- Door/window host, anchor, elevation and bounds.
- Kernel-neutral wall and opening derivation plans.
- Deterministic L/T/cross junction classification and trim-plan generation.
- Atomic project transactions and undo/redo.

Next required layers:
- Kernel contract tests shared by every adapter.
- Exact B-Rep topology and Boolean regression tests.
- Application-level dependency invalidation and regeneration.
- Browser interaction and rendering tests.
- Physical iPad Safari validation.
