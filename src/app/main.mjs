import { createComposite, createOpening, createProject, createWall } from "../bim/model.mjs";
import { deriveProjectPlan } from "../geometry/wall-derivation.mjs";
import { ProjectStore } from "../project/project-store.mjs";
import { createIndexedDbProjectRepository, createMemoryProjectRepository } from "../storage/project-repository.mjs";

const canvas = document.querySelector("#plan-canvas");
const context = canvas.getContext("2d");
const statusText = document.querySelector("#status-text");
const canvasStatus = document.querySelector("#canvas-status");
const inspector = document.querySelector("#inspector-content");
const emptyState = document.querySelector("#empty-state");
const elementCount = document.querySelector("#element-count");
const scaleReadout = document.querySelector("#scale-readout");
const viewName = document.querySelector("#view-name");
const viewMode = document.querySelector("#view-mode");
const projectId = "arqenvo-local-project";
let repository;
let restoredProject = null;
let persistenceMode = "indexeddb";
try {
  repository = createIndexedDbProjectRepository();
  restoredProject = await repository.load(projectId);
} catch (error) {
  repository = createMemoryProjectRepository();
  persistenceMode = "memory";
  console.warn("IndexedDB persistence unavailable; using session-only memory storage", error);
}
const store = new ProjectStore(restoredProject ?? createProject({ id: projectId }));
let saveQueue = Promise.resolve();

let activeTool = "select";
let activeView = "plan";
let selected = null;
let draftStart = null;
let draftPoint = null;
let wallHandleDrag = null;
let isPanning = false;
let lastPointer = null;
let camera = { x: 0, y: 0, scale: 0.16 };
let width = 0;
let height = 0;
let dpr = 1;
const restoredSnapshot = store.snapshot;
let nextWallNumber = Math.max(0, ...Object.keys(restoredSnapshot.walls).map((id) => Number(id.match(/^wall-(\d+)$/)?.[1] ?? 0))) + 1;
let nextOpeningNumber = Math.max(0, ...Object.keys(restoredSnapshot.openings).map((id) => Number(id.match(/^(?:door|window)-(\d+)$/)?.[1] ?? 0))) + 1;
let nextCompositeNumber = Math.max(0, ...Object.keys(restoredSnapshot.composites).map((id) => Number(id.match(/^composite-(\d+)$/)?.[1] ?? 0))) + 1;
function refreshElementCounters(project) {
  nextWallNumber = Math.max(0, ...Object.keys(project.walls).map((id) => Number(id.match(/^wall-(\d+)$/)?.[1] ?? 0))) + 1;
  nextOpeningNumber = Math.max(0, ...Object.keys(project.openings).map((id) => Number(id.match(/^(?:door|window)-(\d+)$/)?.[1] ?? 0))) + 1;
  nextCompositeNumber = Math.max(0, ...Object.keys(project.composites).map((id) => Number(id.match(/^composite-(\d+)$/)?.[1] ?? 0))) + 1;
}

const setStatus = (message) => {
  statusText.textContent = message;
  canvasStatus.textContent = message;
};
function persistProject() {
  const projectSnapshot = store.snapshot;
  saveQueue = saveQueue.then(async () => {
    const result = await repository.save(projectSnapshot);
    setStatus(persistenceMode === "indexeddb" ? `Saved locally · ${result.savedAt}` : "Saved for this browser session only");
  }).catch((error) => {
    setStatus(`Save failed · ${error instanceof Error ? error.message : String(error)}`);
  });
  return saveQueue;
}
const snapshot = () => store.snapshot;
const snap = (value, step = 50) => Math.round(value / step) * step;
const toScreen = ([x, y]) => [width / 2 + (x - camera.x) * camera.scale, height / 2 - (y - camera.y) * camera.scale];
const toWorld = (x, y) => [camera.x + (x - width / 2) / camera.scale, camera.y - (y - height / 2) / camera.scale];

function pathPolygon(points) {
  if (!points.length) return;
  const first = toScreen(points[0]);
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) {
    const screen = toScreen(point);
    context.lineTo(screen[0], screen[1]);
  }
  context.closePath();
}

function drawGrid() {
  const step = camera.scale > 0.55 ? 100 : camera.scale > 0.25 ? 200 : 500;
  const left = camera.x - width / (2 * camera.scale);
  const right = camera.x + width / (2 * camera.scale);
  const bottom = camera.y - height / (2 * camera.scale);
  const top = camera.y + height / (2 * camera.scale);
  context.lineWidth = 1;
  for (let x = Math.floor(left / step) * step; x <= right; x += step) {
    const p1 = toScreen([x, bottom]);
    const p2 = toScreen([x, top]);
    context.strokeStyle = x === 0 ? "#c0cad5" : "#dce2e9";
    context.beginPath(); context.moveTo(p1[0], p1[1]); context.lineTo(p2[0], p2[1]); context.stroke();
  }
  for (let y = Math.floor(bottom / step) * step; y <= top; y += step) {
    const p1 = toScreen([left, y]);
    const p2 = toScreen([right, y]);
    context.strokeStyle = y === 0 ? "#c0cad5" : "#dce2e9";
    context.beginPath(); context.moveTo(p1[0], p1[1]); context.lineTo(p2[0], p2[1]); context.stroke();
  }
}

function drawWall(wall, project, plan) {
  const outer = plan.skins[0].footprint;
  const last = plan.skins[plan.skins.length - 1].footprint;
  const outline = [outer[0], outer[1], last[2], last[3]];
  pathPolygon(outline);
  context.fillStyle = selected?.type === "wall" && selected.id === wall.id ? "#b7d9d3" : "#c9d1d9";
  context.fill();
  context.strokeStyle = selected?.type === "wall" && selected.id === wall.id ? "#168f82" : "#526174";
  context.lineWidth = selected?.type === "wall" && selected.id === wall.id ? 2.5 : 1.5;
  context.stroke();

  for (const skin of plan.skins.slice(0, -1)) {
    const edge = skin.footprint[2];
    const start = toScreen(skin.footprint[3]);
    const end = toScreen(edge);
    context.strokeStyle = "#9aa8b7";
    context.lineWidth = 1;
    context.beginPath(); context.moveTo(start[0], start[1]); context.lineTo(end[0], end[1]); context.stroke();
  }

  for (const opening of plan.openings) {
    pathPolygon(opening.cutPolygon);
    context.fillStyle = "#edf1f5";
    context.fill();
    context.strokeStyle = selected?.type === "opening" && selected.id === opening.id ? "#168f82" : "#526174";
    context.lineWidth = 1.5;
    context.stroke();
    const [a, b] = opening.cutPolygon;
    const [c, d] = opening.cutPolygon.slice(2);
    for (const [p, q] of [[a, d], [b, c]]) {
      const sp = toScreen(p), sq = toScreen(q);
      context.beginPath(); context.moveTo(sp[0], sp[1]); context.lineTo(sq[0], sq[1]); context.stroke();
    }
    if (opening.type === "window") {
      const mid1 = [(a[0] + d[0]) / 2, (a[1] + d[1]) / 2];
      const mid2 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
      const p = toScreen(mid1), q = toScreen(mid2);
      context.strokeStyle = "#168f82";
      context.beginPath(); context.moveTo(p[0], p[1]); context.lineTo(q[0], q[1]); context.stroke();
    }
  }
  if (selected?.type === "wall" && selected.id === wall.id) {
    for (const endpoint of wall.baseline) {
      const point = toScreen(endpoint);
      context.beginPath();
      context.arc(point[0], point[1], 5, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
      context.strokeStyle = "#168f82";
      context.lineWidth = 2;
      context.stroke();
    }
  }
}

function toIso(point, z = 0) {
  const x = point[0] - camera.x;
  const y = point[1] - camera.y;
  const isoScale = camera.scale * 0.78;
  return [
    width / 2 + (x - y) * isoScale,
    height * 0.72 - (x + y) * isoScale * 0.34 - z * isoScale * 0.9
  ];
}

function pathIso(points) {
  if (!points.length) return;
  const first = toIso(points[0].slice(0, 2), points[0][2]);
  context.beginPath();
  context.moveTo(first[0], first[1]);
  for (const point of points.slice(1)) {
    const projected = toIso(point.slice(0, 2), point[2]);
    context.lineTo(projected[0], projected[1]);
  }
  context.closePath();
}

function draw3DGrid() {
  const extent = 6000;
  const step = 500;
  context.lineWidth = 1;
  for (let value = -extent; value <= extent; value += step) {
    const a = toIso([value, -extent], 0);
    const b = toIso([value, extent], 0);
    context.strokeStyle = value === 0 ? "#b8c5d1" : "#dce2e9";
    context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke();
    const c = toIso([-extent, value], 0);
    const d = toIso([extent, value], 0);
    context.beginPath(); context.moveTo(c[0], c[1]); context.lineTo(d[0], d[1]); context.stroke();
  }
}

function draw3DWall(wall, plan) {
  for (const skin of plan.skins) {
    const footprint = skin.footprint;
    const [z0, z1] = skin.zRange;
    for (let i = 0; i < footprint.length; i += 1) {
      const next = (i + 1) % footprint.length;
      pathIso([
        [footprint[i][0], footprint[i][1], z0],
        [footprint[next][0], footprint[next][1], z0],
        [footprint[next][0], footprint[next][1], z1],
        [footprint[i][0], footprint[i][1], z1]
      ]);
      context.fillStyle = i === 0 ? "#aab7c4" : i === 2 ? "#d1d9e1" : "#bcc7d2";
      context.fill();
      context.strokeStyle = "#657487";
      context.lineWidth = selected?.type === "wall" && selected.id === wall.id ? 1.8 : 0.9;
      context.stroke();
    }
    pathIso(footprint.map((point) => [point[0], point[1], z1]));
    context.fillStyle = skin.function === "core" ? "#c3cdd7" : "#dbe1e7";
    context.fill();
    context.strokeStyle = selected?.type === "wall" && selected.id === wall.id ? "#168f82" : "#718094";
    context.lineWidth = selected?.type === "wall" && selected.id === wall.id ? 2 : 1;
    context.stroke();
  }
}

function draw3DOpenings(project, derived) {
  for (const wall of Object.values(project.walls)) {
    const plan = derived.walls[wall.id];
    const direction = plan.direction;
    const normal = plan.normal;
    for (const opening of plan.openings) {
      for (const skin of plan.skins) {
        const [offsetMin, offsetMax] = skin.offsetRange;
        const [start, end] = opening.localRange;
        const [z0, z1] = opening.zRange;
        for (const offset of [offsetMin, offsetMax]) {
          const a = [wall.baseline[0][0] + direction[0] * start + normal[0] * offset, wall.baseline[0][1] + direction[1] * start + normal[1] * offset];
          const b = [wall.baseline[0][0] + direction[0] * end + normal[0] * offset, wall.baseline[0][1] + direction[1] * end + normal[1] * offset];
          pathIso([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]]);
          context.fillStyle = "#edf1f5";
          context.fill();
          context.strokeStyle = "#526174";
          context.lineWidth = 1;
          context.stroke();
        }
      }
    }
  }
}

function draw3DPreview(project, derived) {
  draw3DGrid();
  const walls = Object.values(project.walls).sort((a, b) => {
    const av = a.baseline[0][0] + a.baseline[0][1] + a.baseline[1][0] + a.baseline[1][1];
    const bv = b.baseline[0][0] + b.baseline[0][1] + b.baseline[1][0] + b.baseline[1][1];
    return bv - av;
  });
  for (const wall of walls) draw3DWall(wall, derived.walls[wall.id]);
  draw3DOpenings(project, derived);
  context.fillStyle = "#607187";
  context.font = "10px Inter, sans-serif";
  context.fillText("ISOMETRIC PREVIEW · DERIVED FROM BIM PARAMETERS", 14, height - 16);
}

function drawPreview() {
  if (wallHandleDrag && draftPoint) {
    const wall = snapshot().walls[wallHandleDrag.wallId];
    if (wall) {
      const baseline = wall.baseline.map((point) => [...point]);
      baseline[wallHandleDrag.endpoint === "start" ? 0 : 1] = draftPoint;
      const a = toScreen(baseline[0]), b = toScreen(baseline[1]);
      context.save();
      context.setLineDash([6, 4]);
      context.strokeStyle = "#168f82";
      context.lineWidth = 2.5;
      context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke();
      context.restore();
    }
    return;
  }
  if (!draftStart || !draftPoint) return;
  const a = toScreen(draftStart), b = toScreen(draftPoint);
  context.save();
  context.setLineDash([6, 4]);
  context.strokeStyle = "#168f82";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke();
  context.restore();
}

function render() {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#edf1f5";
  context.fillRect(0, 0, width, height);
  const project = snapshot();
  const derived = deriveProjectPlan(project);
  if (activeView === "plan") {
    drawGrid();
    Object.values(project.walls).forEach((wall) => drawWall(wall, project, derived.walls[wall.id]));
    drawPreview();
  } else {
    draw3DPreview(project, derived);
  }
  const walls = Object.keys(project.walls).length;
  const openings = Object.keys(project.openings).length;
  emptyState.classList.toggle("hidden", walls + openings > 0 || activeTool === "wall" || activeTool === "composite");
  elementCount.textContent = `${walls} walls · ${openings} openings`;
  scaleReadout.textContent = `Zoom ${Math.round(camera.scale * 1000) / 10}%`;
  updateInspector(project);
}

function bindInspectorForm(type, id) {
  const form = inspector.querySelector("#element-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = (name) => Number(form.elements.namedItem(name).value);
    try {
      let invalidated = [];
      if (type === "wall") {
        const transaction = store.transact("Edit wall parameters", (draft) => {
          const current = draft.walls[id];
          draft.walls[id] = {
            ...current,
            thickness: value("thickness"),
            height: value("height"),
            baseElevation: value("baseElevation"),
            referenceLine: form.elements.namedItem("referenceLine").value,
            revision: current.revision + 1
          };
        });
        invalidated = transaction.invalidatedElementIds;
      } else {
        const transaction = store.transact("Edit hosted opening", (draft) => {
          const current = draft.openings[id];
          draft.openings[id] = {
            ...current,
            positionAlongBaseline: value("positionAlongBaseline"),
            width: value("width"),
            height: value("height"),
            sillElevation: value("sillElevation"),
            anchor: form.elements.namedItem("anchor").value,
            revision: current.revision + 1
          };
        });
        invalidated = transaction.invalidatedElementIds;
      }
      void persistProject();
      setStatus(`Updated ${type} · ${Math.max(0, invalidated.length - 1)} dependent element(s) invalidated`);
      render();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  });
}

function updateInspector(project) {
  if (!selected) {
    inspector.innerHTML = '<div class="inspector-empty"><div class="inspector-glyph">◇</div><strong>No selection</strong><p>Select a wall or opening to inspect its semantic properties.</p></div>';
    return;
  }
  if (selected.type === "wall") {
    const wall = project.walls[selected.id];
    if (!wall) { selected = null; return updateInspector(project); }
    const hosted = Object.values(project.openings).filter((o) => o.hostWallId === wall.id);
    const composite = wall.compositeId ? project.composites[wall.compositeId] : null;
    const compositeInfo = composite ? `<div class="property-group"><h3>COMPOSITE SKINS</h3>${composite.skins.map((skin) => `<div class="property-row"><span>${skin.id}</span><span>${skin.thickness} mm</span></div><div class="property-row"><span>Material</span><span>${skin.materialId}</span></div>`).join("")}</div>` : "";
    inspector.innerHTML = `<div class="property-group"><h3>WALL ELEMENT</h3><div class="property-row"><span>Element ID</span><span>${wall.id}</span></div><div class="property-row"><span>Revision</span><span>${wall.revision}</span></div><div class="property-row"><span>Baseline length</span><span>${Math.round(Math.hypot(wall.baseline[1][0] - wall.baseline[0][0], wall.baseline[1][1] - wall.baseline[0][1]))} mm</span></div></div>
      <form id="element-form" class="property-form">
        <label>Reference line<select name="referenceLine"><option value="center" ${wall.referenceLine === "center" ? "selected" : ""}>Center</option><option value="left" ${wall.referenceLine === "left" ? "selected" : ""}>Left</option><option value="right" ${wall.referenceLine === "right" ? "selected" : ""}>Right</option></select></label>
        <label>Thickness (mm)<input name="thickness" type="number" min="1" step="1" required value="${wall.thickness}"></label>
        <label>Height (mm)<input name="height" type="number" min="1" step="1" required value="${wall.height}"></label>
        <label>Base elevation (mm)<input name="baseElevation" type="number" step="1" required value="${wall.baseElevation}"></label>
        <button id="apply-element" class="save-button" type="submit">Apply wall changes</button>
      </form>
      <div class="property-group"><h3>RELATIONSHIPS</h3><div class="property-row"><span>Hosted openings</span><span>${hosted.length}</span></div><div class="property-row"><span>Composite</span><span>${wall.compositeId ?? "Basic"}</span></div></div>${compositeInfo}`;
    bindInspectorForm("wall", wall.id);
  } else {
    const opening = project.openings[selected.id];
    if (!opening) { selected = null; return updateInspector(project); }
    inspector.innerHTML = `<div class="property-group"><h3>${opening.type.toUpperCase()} OPENING</h3><div class="property-row"><span>Element ID</span><span>${opening.id}</span></div><div class="property-row"><span>Host wall</span><span>${opening.hostWallId}</span></div><div class="property-row"><span>Revision</span><span>${opening.revision}</span></div></div>
      <form id="element-form" class="property-form">
        <label>Anchor<select name="anchor"><option value="center" ${opening.anchor === "center" ? "selected" : ""}>Center</option><option value="left" ${opening.anchor === "left" ? "selected" : ""}>Left</option><option value="right" ${opening.anchor === "right" ? "selected" : ""}>Right</option></select></label>
        <label>Position along wall (mm)<input name="positionAlongBaseline" type="number" min="0" step="1" required value="${opening.positionAlongBaseline}"></label>
        <label>Width (mm)<input name="width" type="number" min="1" step="1" required value="${opening.width}"></label>
        <label>Height (mm)<input name="height" type="number" min="1" step="1" required value="${opening.height}"></label>
        <label>Sill elevation (mm)<input name="sillElevation" type="number" min="0" step="1" required value="${opening.sillElevation}"></label>
        <button id="apply-element" class="save-button" type="submit">Apply opening changes</button>
      </form>`;
    bindInspectorForm("opening", opening.id);
  }
}

function exportProjectFile() {
  const project = store.snapshot;
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.id || "arqenvo-project"}.arqenvo.json`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setStatus("Project export started");
}

async function importProjectFile(file) {
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const result = store.replaceProject(imported, "Import project");
    refreshElementCounters(store.snapshot);
    selected = null;
    await persistProject();
    render();
    setStatus(`Project imported · ${result.invalidatedElementIds.length} element(s) invalidated`);
  } catch (error) {
    setStatus(`Import failed · ${error instanceof Error ? error.message : String(error)}`);
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function setTool(tool) {
  activeTool = tool;
  draftStart = null;
  draftPoint = null;
  document.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === tool));
  wallHandleDrag = null;
  const descriptions = {
    select: "Select · Tap an element to inspect it",
    wall: "Wall · Drag to draw a straight wall",
    composite: "Composite wall · Drag to draw a three-skin wall",
    door: "Door · Tap a wall to host a 900 × 2100 mm door",
    window: "Window · Tap a wall to host an 800 × 1200 mm window"
  };
  setStatus(descriptions[tool]);
  canvas.style.cursor = tool === "select" ? "default" : "crosshair";
  render();
}


function setView(view) {
  activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  viewName.textContent = view === "plan" ? "Floor Plan" : "3D Preview";
  viewMode.textContent = view === "plan" ? "2D" : "3D";
  if (view === "3d") {
    draftStart = null;
    draftPoint = null;
    setStatus("3D preview · read-only derived view; switch to Plan to edit");
  } else {
    setStatus("Floor Plan · semantic model editing");
  }
  render();
}

function projectToSegment(point, wall) {
  const [a, b] = wall.baseline;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  const nearest = [a[0] + t * dx, a[1] + t * dy];
  return { nearest, distance: Math.hypot(point[0] - nearest[0], point[1] - nearest[1]), along: t * Math.hypot(dx, dy) };
}

function nearestWall(point, project, maxDistance = 180) {
  let best = null;
  for (const wall of Object.values(project.walls)) {
    const hit = projectToSegment(point, wall);
    if (hit.distance <= maxDistance && (!best || hit.distance < best.distance)) best = { wall, ...hit };
  }
  return best;
}

function createHostedOpening(type, point) {
  const project = snapshot();
  const hit = nearestWall(point, project);
  if (!hit) return setStatus("No host wall nearby · Move closer to a wall");
  const width = type === "door" ? 900 : 800;
  const height = type === "door" ? 2100 : 1200;
  const sillElevation = type === "door" ? 0 : 900;
  const id = `${type}-${nextOpeningNumber++}`;
  try {
    const opening = createOpening({ id, type, hostWallId: hit.wall.id, positionAlongBaseline: snap(hit.along, 10), anchor: "center", width, height, sillElevation });
    store.transact(`Add ${type}`, (draft) => { draft.openings[id] = opening; });
    void persistProject();
    selected = { type: "opening", id };
    setStatus(`${type === "door" ? "Door" : "Window"} hosted on ${hit.wall.id}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
  render();
}

function selectAt(point) {
  const project = snapshot();
  let closestOpening = null;
  for (const opening of Object.values(project.openings)) {
    const wall = project.walls[opening.hostWallId];
    if (!wall) continue;
    const hit = projectToSegment(point, wall);
    const center = opening.anchor === "center" ? opening.positionAlongBaseline : opening.anchor === "left" ? opening.positionAlongBaseline + opening.width / 2 : opening.positionAlongBaseline - opening.width / 2;
    if (hit.distance < 110 && Math.abs(hit.along - center) <= opening.width / 2 + 30) closestOpening = opening;
  }
  if (closestOpening) selected = { type: "opening", id: closestOpening.id };
  else {
    const hit = nearestWall(point, project, 140);
    selected = hit ? { type: "wall", id: hit.wall.id } : null;
  }
  setStatus(selected ? `Selected ${selected.type} · ${selected.id}` : "Selection cleared");
  render();
}

function pointerDown(event) {
  canvas.setPointerCapture(event.pointerId);
  const rect = canvas.getBoundingClientRect();
  const point = toWorld(event.clientX - rect.left, event.clientY - rect.top);
  if (event.button === 1 || event.button === 2 || event.altKey) {
    isPanning = true;
    lastPointer = [event.clientX, event.clientY];
    event.preventDefault();
    return;
  }
  if (activeView === "3d") {
    setStatus("3D preview is read-only · switch to Plan to edit elements");
    return;
  }
  if (activeTool === "wall" || activeTool === "composite") {
    draftStart = [snap(point[0]), snap(point[1])];
    draftPoint = draftStart;
    render();
  } else if (activeTool === "select" && selected?.type === "wall") {
    const wall = snapshot().walls[selected.id];
    const startDistance = Math.hypot(point[0] - wall.baseline[0][0], point[1] - wall.baseline[0][1]);
    const endDistance = Math.hypot(point[0] - wall.baseline[1][0], point[1] - wall.baseline[1][1]);
    if (Math.min(startDistance, endDistance) <= 180) {
      wallHandleDrag = { wallId: wall.id, endpoint: startDistance <= endDistance ? "start" : "end" };
      draftPoint = [snap(point[0]), snap(point[1])];
      render();
    } else {
      selectAt(point);
    }
  } else if (activeTool === "door" || activeTool === "window") {
    createHostedOpening(activeTool, point);
  } else {
    selectAt(point);
  }
}

function pointerMove(event) {
  if (isPanning && lastPointer) {
    const dx = event.clientX - lastPointer[0], dy = event.clientY - lastPointer[1];
    camera.x -= dx / camera.scale;
    camera.y += dy / camera.scale;
    lastPointer = [event.clientX, event.clientY];
    render();
    return;
  }
  if (wallHandleDrag || draftStart) {
    const rect = canvas.getBoundingClientRect();
    const point = toWorld(event.clientX - rect.left, event.clientY - rect.top);
    draftPoint = [snap(point[0]), snap(point[1])];
    render();
  }
}

function pointerCancel() {
  wallHandleDrag = null;
  draftStart = null;
  draftPoint = null;
  isPanning = false;
  lastPointer = null;
  render();
}

function pointerUp() {
  if (isPanning) {
    isPanning = false;
    lastPointer = null;
    return;
  }
  if (wallHandleDrag && draftPoint) {
    const drag = wallHandleDrag;
    const wall = snapshot().walls[drag.wallId];
    const baseline = wall.baseline.map((point) => [...point]);
    baseline[drag.endpoint === "start" ? 0 : 1] = draftPoint;
    wallHandleDrag = null;
    draftPoint = null;
    try {
      const transaction = store.transact("Move wall endpoint", (draft) => {
        const current = draft.walls[drag.wallId];
        draft.walls[drag.wallId] = { ...current, baseline, revision: current.revision + 1 };
      });
      void persistProject();
      selected = { type: "wall", id: drag.wallId };
      setStatus(`Moved wall endpoint · ${Math.max(0, transaction.invalidatedElementIds.length - 1)} dependent element(s) invalidated`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
    render();
    return;
  }
  if (!draftStart || !draftPoint) return;
  const start = draftStart, end = draftPoint;
  draftStart = null; draftPoint = null;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (length < 100) {
    setStatus("Wall not created · Minimum length is 100 mm");
    render();
    return;
  }
  const id = `wall-${nextWallNumber++}`;
  try {
    if (activeTool === "composite") {
      const compositeId = `composite-${nextCompositeNumber++}`;
      const composite = createComposite({
        id: compositeId,
        skins: [
          { id: `${compositeId}:external`, thickness: 20, materialId: "material-brick", function: "finish" },
          { id: `${compositeId}:core`, thickness: 160, materialId: "material-concrete", function: "core" },
          { id: `${compositeId}:internal`, thickness: 20, materialId: "material-plaster", function: "finish" }
        ]
      });
      const wall = createWall({ id, baseline: [start, end], referenceLine: "center", thickness: 200, baseElevation: 0, height: 3000, compositeId });
      store.transact("Add composite wall", (draft) => { draft.composites[compositeId] = composite; draft.walls[id] = wall; });
    } else {
      const wall = createWall({ id, baseline: [start, end], referenceLine: "center", thickness: 200, baseElevation: 0, height: 3000 });
      store.transact("Add wall", (draft) => { draft.walls[id] = wall; });
    }
    void persistProject();
    selected = { type: "wall", id };
    setStatus(`Created ${activeTool === "composite" ? "composite " : ""}${id} · ${Math.round(length)} mm`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
  render();
}

function zoomAt(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = event.clientX - rect.left, py = event.clientY - rect.top;
  if (activeView === "3d") {
    camera.scale = Math.max(0.035, Math.min(1.2, camera.scale * (event.deltaY < 0 ? 1.12 : 0.89)));
    render();
    return;
  }
  const before = toWorld(px, py);
  camera.scale = Math.max(0.035, Math.min(1.2, camera.scale * (event.deltaY < 0 ? 1.12 : 0.89)));
  const after = toWorld(px, py);
  camera.x += before[0] - after[0];
  camera.y += before[1] - after[1];
  render();
}

document.querySelectorAll("[data-tool]").forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelector("#start-wall").addEventListener("click", () => setTool("wall"));
document.querySelector("#undo").addEventListener("click", () => { if (store.undo()) { selected = null; void persistProject(); setStatus("Undo completed"); render(); } });
document.querySelector("#redo").addEventListener("click", () => { if (store.redo()) { selected = null; void persistProject(); setStatus("Redo completed"); render(); } });
document.querySelector("#reset-view").addEventListener("click", () => { camera = { x: 0, y: 0, scale: 0.16 }; render(); setStatus("View reset"); });
canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerCancel);
canvas.addEventListener("wheel", zoomAt, { passive: false });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.querySelector("#save-project").addEventListener("click", () => { void persistProject(); });
document.querySelector("#export-project").addEventListener("click", exportProjectFile);
document.querySelector("#import-project-button").addEventListener("click", () => document.querySelector("#import-project-file").click());
document.querySelector("#import-project-file").addEventListener("change", (event) => { void importProjectFile(event.target.files?.[0]); event.target.value = ""; });
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (store.undo()) { selected = null; void persistProject(); render(); setStatus("Undo completed"); } }
  else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); if (store.redo()) { selected = null; void persistProject(); render(); setStatus("Redo completed"); } }
  else if (event.key === "Escape") { draftStart = null; draftPoint = null; setTool("select"); }
  else if (event.key === "1") setTool("select");
  else if (event.key === "2") setTool("wall");
  else if (event.key === "3") setTool("door");
  else if (event.key === "4") setTool("window");
});
new ResizeObserver(resize).observe(canvas);
resize();
setTool("select");
if (restoredProject) setStatus("Restored saved project from this browser");
window.__arqenvoReady = true;
