# Archicad 29 Reference Investigation Protocol

## Purpose

Create evidence-backed specifications for observable Archicad 29 workflows and results, then implement independent equivalents in ARQENVO 2.0.

## Investigation sources

Use, in order where applicable:
1. Controlled observation of the user's licensed Archicad 29 installation.
2. Official Graphisoft developer documentation and supported APIs.
3. REA inspection and analysis outputs.
4. Repeatable project files and test scenarios.
5. Native binary analysis only where lawful, necessary and within licensing/access boundaries.

REA is an investigation tool, not a source-code recovery guarantee. It may inspect application structure, runtime observations and native code metadata depending on installed providers and permissions. It does not guarantee access to every internal algorithm.

## Safety and legal boundaries

- Do not bypass license checks, authentication, access controls or anti-tamper mechanisms.
- Do not extract, reproduce or distribute Graphisoft proprietary source code, protected assets or confidential material.
- Do not install optional analysis providers such as Hopper without explicit user approval.
- Do not execute unknown binaries or scripts from the target application.
- Keep investigation evidence local unless the user explicitly chooses to share it.
- Respect Graphisoft licensing and developer terms.

## REA environment preparation

On the user's Mac, first record:
- macOS version and CPU architecture.
- Node.js and npm versions.
- Selected MCP-capable local agent.
- REA version and doctor/setup output.
- Archicad 29 exact application path and build/version.

REA currently documents Node.js requirements; verify current requirements against the official repository before setup. Use the official REA setup flow and review proposed configuration changes before approving them.

Ordinary ChatGPT chat is not itself a local MCP client for running REA against the user's Mac. Use a supported local MCP-capable agent such as Codex, Claude Code or Cursor where supported by the current REA release.

## Evidence record template

For every investigation, record:
- Evidence ID.
- Date and environment.
- Archicad version/build.
- Project/test file identifier.
- Initial conditions and relevant settings.
- Exact action sequence.
- Screenshots or screen recording references.
- Observable UI state changes.
- Element parameter changes.
- 2D and 3D geometry results.
- Measurements and tolerances.
- REA tool/provider and output reference, if used.
- Documented API references, if used.
- Observations vs hypotheses.
- Unknowns and confidence.
- ARQENVO acceptance test derived from the evidence.

## Initial investigation sequence

1. Workspace, Toolbox, Navigator and Info Box.
2. Selection, marquee and contextual editing.
3. Wall reference line and geometry methods.
4. Straight, curved and polygonal wall behaviour.
5. L-, T- and cross-junctions.
6. Wall priority, cleanup and connection behaviour where observable.
7. Door/window anchor, host and opening behaviour.
8. Host-wall edits and dependent-element updates.
9. 2D floor-plan and 3D model synchronisation.
10. Slab, beam, column and roof workflows.
11. Snapping, dimensions and associative references.
12. Documentation, Layout Book and publishing.

## Reporting standard

Never state that a proprietary internal algorithm has been recovered unless the evidence genuinely supports that claim. Prefer descriptions such as “observed behaviour”, “documented API behaviour”, “inferred model” and “independent implementation hypothesis”.
