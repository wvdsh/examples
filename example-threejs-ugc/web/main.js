import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

const WavedashJS = await window.WavedashJS;
WavedashJS.updateLoadProgressZeroToOne(0.3);

// Mirrors UGC_TYPE / UGC_VISIBILITY in wavedash convex/constants.
const UGC_TYPE_GAME_MANAGED = 3;
const UGC_VISIBILITY_PRIVATE = 2;

const SAVE_FILENAME = "scene.json";
const SAVE_NAME = "My scene";
const SAVE_VERSION = 2;
const UGC_ID_KEY = "example-threejs-ugc:ugc-id";
const KILL_Y = -20;

// halfHeight = distance from the body's center to its bottom; used to rest a
// freshly-placed object flush on whatever surface is under the cursor.
const SHAPES = {
  box: {
    label: "▣",
    halfHeight: 0.5,
    geom: () => new THREE.BoxGeometry(1, 1, 1),
    body: () => new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
  },
  sphere: {
    label: "●",
    halfHeight: 0.6,
    geom: () => new THREE.SphereGeometry(0.6, 24, 16),
    body: () => new CANNON.Sphere(0.6),
  },
  cone: {
    // cannon-es has no Cone, so approximate with a tapered Cylinder.
    label: "▲",
    halfHeight: 0.6,
    geom: () => new THREE.ConeGeometry(0.6, 1.2, 24),
    body: () => new CANNON.Cylinder(0.01, 0.6, 1.2, 16),
  },
  cylinder: {
    label: "▥",
    halfHeight: 0.55,
    geom: () => new THREE.CylinderGeometry(0.55, 0.55, 1.1, 24),
    body: () => new CANNON.Cylinder(0.55, 0.55, 1.1, 16),
  },
  torus: {
    // cannon-es has no Torus; bounding sphere is a cheap approximation.
    label: "◎",
    halfHeight: 0.7,
    geom: () => new THREE.TorusGeometry(0.55, 0.22, 16, 32),
    body: () => new CANNON.Sphere(0.7),
  },
};

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#facc15", "#14b8a6"];

/* ── Three.js ───────────────────────────────────────── */

const canvas = document.getElementById("wavedash-target");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0f172a");
scene.fog = new THREE.Fog("#0f172a", 25, 60);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(8, 8, 10);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.5, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 5;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2.05;

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -15;
sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15;
sun.shadow.camera.bottom = -15;
scene.add(sun);

const GROUND_SIZE = 30;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
  new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(GROUND_SIZE, 30, 0x334155, 0x1f2937);
grid.position.y = 0.001;
scene.add(grid);

function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

/* ── Physics ────────────────────────────────────────── */

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;

const defaultMaterial = new CANNON.Material("default");
world.defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.35,
  restitution: 0.15,
});

const groundBody = new CANNON.Body({ mass: 0, material: defaultMaterial, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

/* ── Objects ────────────────────────────────────────── */

const objectsGroup = new THREE.Group();
scene.add(objectsGroup);

let selectedShapeId = "box";

function addObject({ type, position, quaternion, color }) {
  const spec = SHAPES[type];
  if (!spec) return null;

  const mesh = new THREE.Mesh(
    spec.geom(),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const body = new CANNON.Body({ mass: 5, material: defaultMaterial });
  body.addShape(spec.body());
  body.position.set(position.x, position.y, position.z);
  if (quaternion) body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.1;
  body.sleepTimeLimit = 1;

  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
  mesh.userData = { type, color, body };

  objectsGroup.add(mesh);
  world.addBody(body);
  return mesh;
}

function removeObject(mesh) {
  objectsGroup.remove(mesh);
  world.removeBody(mesh.userData.body);
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function clearScene() {
  while (objectsGroup.children.length) {
    removeObject(objectsGroup.children[objectsGroup.children.length - 1]);
  }
}

function serializeScene() {
  return {
    version: SAVE_VERSION,
    objects: objectsGroup.children.map((m) => {
      const p = m.userData.body.position;
      const q = m.userData.body.quaternion;
      return {
        type: m.userData.type,
        x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3),
        qx: +q.x.toFixed(4), qy: +q.y.toFixed(4), qz: +q.z.toFixed(4), qw: +q.w.toFixed(4),
        color: m.userData.color,
      };
    }),
  };
}

/* ── Main loop ──────────────────────────────────────── */

const FIXED_DT = 1 / 60;
let lastTime = performance.now();

renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  world.step(FIXED_DT, dt, 3);

  for (let i = objectsGroup.children.length - 1; i >= 0; i--) {
    const mesh = objectsGroup.children[i];
    const body = mesh.userData.body;
    if (body.position.y < KILL_Y) {
      removeObject(mesh);
      continue;
    }
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  controls.update();
  renderer.render(scene, camera);
});

/* ── Pointer ────────────────────────────────────────── */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDown = null;

function updatePointer(evt) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
}

canvas.addEventListener("pointerdown", (evt) => {
  if (evt.button !== 0) return;
  pointerDown = { x: evt.clientX, y: evt.clientY, shift: evt.shiftKey };
});

canvas.addEventListener("pointerup", (evt) => {
  if (!pointerDown || evt.button !== 0) return;
  const down = pointerDown;
  pointerDown = null;
  const dx = evt.clientX - down.x;
  const dy = evt.clientY - down.y;
  if (dx * dx + dy * dy > 16) return; // ignore drags

  updatePointer(evt);
  raycaster.setFromCamera(pointer, camera);

  if (down.shift) {
    const hit = raycaster.intersectObjects(objectsGroup.children, false)[0];
    if (hit) removeObject(hit.object);
    return;
  }

  // Spawn at the click's x/z, resting on whatever surface is under the cursor:
  // ground by default, or the top of any stacked object. A second downward
  // raycast finds the highest surface; new object's center sits at topY + its
  // halfHeight so it's flush, not floating and not clipping.
  const clickTargets = [ground, ...objectsGroup.children];
  const clickHit = raycaster.intersectObjects(clickTargets, false)[0];
  if (!clickHit) return;
  const { x, z } = clickHit.point;

  const downRay = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  const downHit = downRay.intersectObjects(clickTargets, false)[0];
  const topY = downHit ? downHit.point.y : 0;

  addObject({
    type: selectedShapeId,
    position: { x, y: topY + SHAPES[selectedShapeId].halfHeight, z },
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  });
});

/* ── UI ─────────────────────────────────────────────── */

const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const clearBtn = document.getElementById("clear-btn");
const paletteEl = document.getElementById("palette");

function setStatus(text) {
  statusEl.textContent = text;
}

function renderPalette() {
  paletteEl.textContent = "";
  for (const id of Object.keys(SHAPES)) {
    const b = document.createElement("button");
    b.className = "btn shape" + (id === selectedShapeId ? " active" : "");
    b.textContent = SHAPES[id].label;
    b.title = id;
    b.addEventListener("click", () => {
      selectedShapeId = id;
      renderPalette();
    });
    paletteEl.appendChild(b);
  }
}
renderPalette();

clearBtn.addEventListener("click", clearScene);

/* ── UGC save / load ────────────────────────────────── */

let ugcId = localStorage.getItem(UGC_ID_KEY) || null;

async function save() {
  saveBtn.disabled = true;
  const creating = !ugcId;
  setStatus(creating ? "Creating…" : "Updating…");
  try {
    const json = JSON.stringify(serializeScene());
    const bytes = new TextEncoder().encode(json);

    const wrote = await WavedashJS.writeLocalFile(SAVE_FILENAME, bytes);
    if (!wrote) throw new Error("writeLocalFile failed");

    const desc = `${objectsGroup.children.length} object(s)`;
    const response = creating
      ? await WavedashJS.createUGCItem(UGC_TYPE_GAME_MANAGED, SAVE_NAME, desc, UGC_VISIBILITY_PRIVATE, SAVE_FILENAME)
      : await WavedashJS.updateUGCItem(ugcId, undefined, desc, undefined, SAVE_FILENAME);
    if (!response || !response.success) throw new Error(response?.error || "SDK call failed");

    if (creating) {
      ugcId = response.data;
      localStorage.setItem(UGC_ID_KEY, ugcId);
    }
    setStatus(`${creating ? "Created" : "Updated"} ${ugcId} · ${bytes.length}B`);
  } catch (err) {
    console.error("[example-threejs-ugc]", err);
    setStatus(`${creating ? "Create" : "Update"} failed: ${err.message}`);
  } finally {
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener("click", save);

async function load() {
  if (!ugcId) {
    setStatus("No save yet — click Save first.");
    return;
  }
  loadBtn.disabled = true;
  saveBtn.disabled = true;
  setStatus(`Loading ${ugcId}…`);
  try {
    const dl = await WavedashJS.downloadUGCItem(ugcId, SAVE_FILENAME);
    if (!dl || !dl.success) throw new Error(dl?.error || "downloadUGCItem failed");
    const bytes = await WavedashJS.readLocalFile(SAVE_FILENAME);
    if (!bytes) throw new Error("readLocalFile returned null");
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || !Array.isArray(data.objects)) throw new Error("bad save format");

    clearScene();
    for (const o of data.objects) {
      addObject({
        type: o.type,
        position: { x: o.x, y: o.y, z: o.z },
        quaternion: o.qw != null ? { x: o.qx, y: o.qy, z: o.qz, w: o.qw } : undefined,
        color: o.color,
      });
    }
    setStatus(`Loaded ${data.objects.length} object${data.objects.length === 1 ? "" : "s"} from ${ugcId}`);
  } catch (err) {
    console.warn("[example-threejs-ugc] load failed:", err);
    setStatus(`Load failed: ${err.message}`);
  } finally {
    loadBtn.disabled = false;
    saveBtn.disabled = false;
  }
}

loadBtn.addEventListener("click", load);

/* ── Boot ───────────────────────────────────────────── */

addObject({ type: "box",    position: { x: -1, y: SHAPES.box.halfHeight,    z:  0 }, color: "#3b82f6" });
addObject({ type: "sphere", position: { x:  1, y: SHAPES.sphere.halfHeight, z:  1 }, color: "#ef4444" });
addObject({ type: "cone",   position: { x:  0, y: SHAPES.cone.halfHeight,   z: -2 }, color: "#facc15" });

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.init({ debug: true });
