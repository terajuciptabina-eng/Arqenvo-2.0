# ADR-0002: Defer geometry-kernel selection pending benchmarks

- **Status:** Accepted — selection deferred
- **Date:** 2026-11-04
- **Decision owners:** ARQENVO 2.0 project owner

## Context

A robust architectural CAD/BIM application needs reliable curves, profiles, intersections, solid operations and topology. No candidate has yet been benchmarked against ARQENVO's architectural scenarios.

## Decision

Do not select a production geometry kernel at this stage. Evaluate Open CASCADE Technology/OpenCascade.js, OpenGeometry, Manifold and brepjs using the documented benchmark suite.

## Evaluation criteria

- Architectural geometry correctness.
- B-Rep and/or mesh capabilities and trade-offs.
- Boolean robustness and topology validity.
- Curve, profile, extrusion and sweep support.
- Performance and memory.
- WebAssembly packaging and browser compatibility.
- Safari on iPad/iPhone.
- API quality, maintenance and ecosystem.
- Commercial use, redistribution and license obligations.
- Ability to isolate the kernel behind an ARQENVO-owned adapter.

## Consequences

The BIM model and application services must not depend on a candidate-specific API. Prototype code must remain isolated until a kernel is approved. A hybrid approach may be considered if evidence shows that one kernel is not optimal for every geometry workload.
