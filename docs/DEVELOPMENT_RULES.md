# ARQENVO 2.0 — Development Rules

These rules apply to all implementation and investigation work.

## Repository separation
- This repository is a new, independent project.
- Do not copy the existing ARQENVO application source as the foundation.
- Do not modify the existing `Arqenvo` repository or its production deployment as part of this project.
- Keep work on `main` unless the owner explicitly requests a branch.
- Do not create pull requests or additional branches unless requested.
- Never force-push or rewrite shared history without explicit approval.

## Evidence-first development
- Investigate Archicad 29 behaviour before implementing the corresponding feature.
- Separate observed facts, documented API behaviour, hypotheses and unknowns.
- Preserve evidence references and reproducible scenarios.
- Do not claim internal implementation details without evidence.
- Do not claim REA has inspected the user's Mac or Archicad unless the user has actually run the relevant workflow and supplied results.

## Engineering quality
- Trace defects to root cause.
- Do not layer patches over patches.
- Keep domain, geometry, UI and rendering concerns separated.
- BIM semantic data is authoritative; rendered meshes are derived.
- All geometry changes must be validated and transaction-safe.
- Maintain deterministic tests and regression coverage.
- Do not mark a feature complete based only on appearance.

## Platform
- Browser is the target platform.
- Test desktop and mobile input separately.
- Preserve iPad Safari and iPhone support.
- Provide alternatives for keyboard-only shortcuts and hover interactions.
- Avoid blocking the main UI thread with expensive geometry work.

## Geometry
- Do not select a kernel until benchmark results and license review are recorded.
- Do not leak kernel-specific types into domain interfaces.
- Record units, coordinate frames, tolerances and numeric precision.
- Test topology validity and repeated edits, not only initial shape generation.
- Test wall junction and hosted-opening logic as BIM workflows, not merely generic Boolean operations.

## Scope and releases
- Functional parity is the first priority.
- Do not introduce new product features during parity work unless explicitly approved.
- Do not deploy to production without an explicit release decision.
- Every architectural change must update the relevant documentation and tests.
