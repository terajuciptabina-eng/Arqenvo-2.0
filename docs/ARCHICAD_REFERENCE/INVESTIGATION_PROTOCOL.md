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

REA is an investigation tool, not a source-code recovery guarantee. It can inspect application structure and, where supported providers are available, native code and runtime evidence. It does not guarantee access to every internal algorithm or proprietary behaviour.

## Safety and legal boundaries
- Do not bypass license checks, authentication, access controls or anti-tamper mechanisms.
- Do not extract, reproduce or distribute Graphisoft proprietary source code, protected assets or confidential material.
- Do not install optional analysis providers such as Hopper, Ghidra or IDA without explicit user approval.
- Do not execute unknown binaries or scripts from the target application.
- Keep investigation evidence local unless the user explicitly chooses to share it.
- Respect Graphisoft licensing and developer terms.

## REA environment preparation (macOS)
Run the read-only preflight commands in Terminal on the Mac that has the licensed Archicad 29 installation:

```bash
sw_vers
uname -m
node -v
npm -v
find /Applications -maxdepth 6 -iname "*archicad*29*.app" -print
```

Record the outputs. Do not install or upgrade Node.js until the current version has been checked.

The current official REA installation guide states support for Node.js 22.x >=22.19, 24.x >=24.11, and 26+. Node.js 23, 25 and prereleases are unsupported. Verify the current guide before setup because these requirements can change:
- https://github.com/morluto/rea/blob/main/docs/installation.md

## REA setup
Use an MCP-capable local agent supported by the current REA release (for example Codex, Claude Code or Cursor). Ordinary ChatGPT text chat is not itself a local MCP client and cannot directly inspect the Mac's installed Archicad application.

From a trusted working directory outside the Archicad application bundle and outside the ARQENVO 2.0 repository, run:

```bash
npx rea-agents@latest setup
```

Then:
1. Review the exact setup plan and target client(s).
2. Approve only the MCP/skill configuration changes you intend.
3. Decline optional Hopper installation unless separately discussed and explicitly approved.
4. Restart/reconnect the selected local agent.
5. Run the current REA doctor command and inspect its output.
6. Check the current CLI help before invoking any inspection command; do not rely on remembered flags or stale examples.

REA setup's npm package-download approval is separate from approval of REA's proposed configuration changes. Setup should be treated as a reviewed configuration transaction, not as a silent install.

Official REA sources:
- https://github.com/morluto/rea
- https://github.com/morluto/rea/blob/main/docs/installation.md

## Initial target discovery
Locate the actual Archicad 29 application path using the preflight command above. Confirm the application name, version/build and path in Finder or Archicad's About dialog before analysis.

Use the exact path returned by the Mac. Never guess or hardcode an application bundle path.

Before using a REA desktop-inspection command:
- Check `rea --help` or the package's current command help.
- Check the specific command's `--help`.
- Confirm the operation is bounded/read-only and understand its output destination.
- Save evidence to a user-approved local folder, not inside the Archicad application bundle.
- Do not run deeper native analysis or install a provider without explicit approval.

## Evidence record template
For every investigation, record:
- Evidence ID.
- Date and environment.
- macOS version and CPU architecture.
- Archicad version/build.
- REA version and selected local agent.
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

## First investigation package: Wall Tool
Capture the following as separate reproducible scenarios before coding:
- Wall placement methods and reference-line placement.
- Wall geometry method and construction settings.
- Wall thickness, height, base/top constraints and offsets.
- Straight and curved wall placement.
- L-junction, T-junction and cross-junction outcomes.
- Wall intersection priorities and cleanup controls visible in the UI.
- Behaviour when one connected wall is moved, stretched, rotated or deleted.
- Behaviour when thickness, reference line or height changes.
- Door/window placement, anchor choices and host-wall opening.
- Behaviour when the host wall is edited or removed.
- Corresponding floor-plan and 3D results after each edit.

For every scenario, preserve a clean starting project and a copy after the operation. Record dimensions and settings rather than relying only on screenshots.

## Reporting standard
Never state that a proprietary internal algorithm has been recovered unless the evidence genuinely supports that claim. Prefer descriptions such as "observed behaviour", "documented API behaviour", "inferred model" and "independent implementation hypothesis".

A subsystem is ready for implementation only when its key scenarios, expected results, edge cases and acceptance tests are documented.