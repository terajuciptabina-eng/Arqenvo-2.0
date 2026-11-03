# ADR-0001: Browser-first application platform

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision owners:** ARQENVO 2.0 project owner

## Context

ARQENVO 2.0 must support desktop, iPad and iPhone workflows while remaining accessible through a browser. Existing ARQENVO is browser-based, but its source and architecture are not the foundation for this project.

## Decision

Build ARQENVO 2.0 as a browser-based application. Treat responsive desktop and mobile interaction, including iPad Safari, as first-class architectural requirements.

## Consequences

- UI input must support mouse, pen, touch and keyboard.
- Expensive geometry operations must not block the main interaction thread.
- Browser memory, WebAssembly and Safari constraints must be evaluated.
- Local project persistence and recovery require explicit design.
- Native desktop packaging is not part of the initial platform decision.

## Not decided by this ADR

This decision does not lock React, Vite, Three.js, a state-management library, a geometry kernel or cloud backend. Those require separate evaluation.
