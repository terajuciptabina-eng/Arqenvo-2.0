# M2 — Browser workspace first slice

**Status:** Implemented as an initial 2D browser modelling surface. Not a production release.

## Available interaction

- Responsive desktop and iPad-like layout.
- Select, wall, door and window tools.
- Draw straight semantic walls by dragging.
- Place centered rectangular door/window openings on a selected host wall.
- Display wall outlines, composite skin boundaries and opening symbols in a 2D floor-plan canvas.
- Zoom with the wheel/trackpad; pan with middle mouse, right mouse or Alt-drag.
- Undo/redo and keyboard shortcuts 1–4, Escape, Ctrl/Cmd+Z and Ctrl/Cmd+Y.
- Element inspector shows semantic wall/opening properties.
- All geometry is derived from the semantic BIM model; the viewport is not the source of truth.

## Known limitations

- No 3D viewport, wall editing handles, multi-selection, snapping guides, dimensions, story manager, material editor, persistence or project import/export yet.
- Wall junction solver is not yet applied to multi-wall viewport rendering.
- Openings are rectangular through-cuts; door swing and window reveal details are not yet modelled.
- Touch testing in automation is limited to iPad-like WebKit viewport/emulation, not a physical iPad.
- No production deployment is enabled.

## Browser acceptance

The WebKit application smoke workflow exercises two perpendicular walls and live L-junction derivation, hosted door and window placement (including touch tap on the iPad-like profile), undo/redo and responsive inspector collapse on desktop and iPad-like profiles.
