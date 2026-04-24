import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as CANNON from "cannon-es";

const Wavedash = await window.Wavedash;
Wavedash.updateLoadProgressZeroToOne(0.3);

// Mirrors UGC_TYPE / UGC_VISIBILITY in wavedash convex/constants.
const UGC_TYPE_COMMUNITY = 2;
const UGC_VISIBILITY_PUBLIC = 0;

// userfs path where the player's own save lives. Paths are user-relative —
// the SDK prefixes `{gameCloudId}/userfs/{userId}/` before hitting R2.
const SAVE_PATH = "scenes/main.json";

// A second local path used only as a scratch buffer when downloading shared
// UGC content so the read doesn't overwrite the player's own save file.
const IMPORT_SCRATCH_PATH = "scenes/_import_scratch.json";

const SCENE_VERSION = 2;

// localStorage keys — persist across page reloads so a player can still
// Unpublish the item they created in a previous session.
const PUBLISH_UGC_ID_KEY = "example-threejs-cloud:publish-ugc-id";

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
    version: SCENE_VERSION,
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

const paletteEl = document.getElementById("palette");

const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const deleteBtn = document.getElementById("delete-btn");
const clearBtn = document.getElementById("clear-btn");
const saveStatusEl = document.getElementById("save-status");

const publishBtn = document.getElementById("publish-btn");
const updatePublishBtn = document.getElementById("update-publish-btn");
const copyUgcIdBtn = document.getElementById("copy-ugc-id-btn");
const unpublishBtn = document.getElementById("unpublish-btn");
const publishStatusEl = document.getElementById("publish-status");

const importIdInput = document.getElementById("import-ugc-id");
const importBtn = document.getElementById("import-btn");
const importStatusEl = document.getElementById("import-status");

function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("err", isError);
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

clearBtn.addEventListener("click", () => {
  clearScene();
});

/* ── Scene <-> JSON helpers ────────────────────────── */

function sceneToBytes() {
  return new TextEncoder().encode(JSON.stringify(serializeScene()));
}

function applySceneFromBytes(bytes) {
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || !Array.isArray(data.objects)) throw new Error("bad scene format");
  clearScene();
  for (const o of data.objects) {
    addObject({
      type: o.type,
      position: { x: o.x, y: o.y, z: o.z },
      quaternion: o.qw != null ? { x: o.qx, y: o.qy, z: o.qz, w: o.qw } : undefined,
      color: o.color,
    });
  }
  return data.objects.length;
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  return `${(n / 1024).toFixed(1)}KB`;
}

/* ── Save file (userfs) ────────────────────────────── */

async function save() {
  saveBtn.disabled = true;
  setStatus(saveStatusEl, "Saving…");
  try {
    const bytes = sceneToBytes();
    const wrote = await Wavedash.writeLocalFile(SAVE_PATH, bytes);
    if (!wrote) throw new Error("writeLocalFile failed");

    // userfs is single-step — no presigned URL round-trip on the game side;
    // uploadRemoteFile resolves only when R2 has accepted the PUT.
    const uploadResponse = await Wavedash.uploadRemoteFile(SAVE_PATH);
    if (!uploadResponse || !uploadResponse.success) {
      throw new Error(uploadResponse?.error || "uploadRemoteFile failed");
    }

    setStatus(saveStatusEl, `Saved ${formatBytes(bytes.length)} to userfs://${SAVE_PATH}`);
  } catch (err) {
    console.error("[example-threejs-cloud] save", err);
    setStatus(saveStatusEl, `Save failed: ${err.message}`, true);
  } finally {
    saveBtn.disabled = false;
  }
}

async function load() {
  loadBtn.disabled = true;
  saveBtn.disabled = true;
  setStatus(saveStatusEl, "Loading…");
  try {
    const downloadResponse = await Wavedash.downloadRemoteFile(SAVE_PATH);
    if (!downloadResponse || !downloadResponse.success) {
      throw new Error(downloadResponse?.error || "downloadRemoteFile failed");
    }
    const bytes = await Wavedash.readLocalFile(SAVE_PATH);
    if (!bytes) throw new Error("readLocalFile returned null");
    const count = applySceneFromBytes(bytes);
    setStatus(saveStatusEl, `Loaded ${count} object${count === 1 ? "" : "s"} from userfs://${SAVE_PATH}`);
  } catch (err) {
    console.warn("[example-threejs-cloud] load", err);
    setStatus(saveStatusEl, `Load failed: ${err.message}`, true);
  } finally {
    loadBtn.disabled = false;
    saveBtn.disabled = false;
  }
}

async function deleteSave() {
  deleteBtn.disabled = true;
  setStatus(saveStatusEl, "Deleting…");
  try {
    const deleteResponse = await Wavedash.deleteRemoteFile(SAVE_PATH);
    if (!deleteResponse || !deleteResponse.success) {
      throw new Error(deleteResponse?.error || "deleteRemoteFile failed");
    }
    setStatus(saveStatusEl, `Deleted userfs://${SAVE_PATH}`);
  } catch (err) {
    console.error("[example-threejs-cloud] delete", err);
    setStatus(saveStatusEl, `Delete failed: ${err.message}`, true);
  } finally {
    deleteBtn.disabled = false;
  }
}

saveBtn.addEventListener("click", save);
loadBtn.addEventListener("click", load);
deleteBtn.addEventListener("click", deleteSave);

/**
 * Show whether the player has a save on the server + its size.
 *
 * This also exercises listRemoteDirectory — a cheap way to get size/mtime
 * without downloading the file itself. Called on boot and after mutations.
 */
async function refreshSaveMeta() {
  try {
    const parent = SAVE_PATH.slice(0, SAVE_PATH.lastIndexOf("/")) || "";
    const listResponse = await Wavedash.listRemoteDirectory(parent);
    if (!listResponse || !listResponse.success) {
      throw new Error(listResponse?.error || "listRemoteDirectory failed");
    }
    const entry = listResponse.data.find((f) => f.key === SAVE_PATH);
    if (entry) {
      const when = new Date(entry.lastModified * 1000).toLocaleString();
      setStatus(saveStatusEl, `Save on server: ${formatBytes(entry.size)} · updated ${when}`);
    }
  } catch (err) {
    // Non-fatal — the listRemoteDirectory call may 404 for an empty directory
    // depending on platform behavior; don't surface that as an error.
    console.debug("[example-threejs-cloud] refreshSaveMeta", err);
  }
}

/* ── Publish + Unpublish (UGC write) ───────────────── */

let publishedUgcId = localStorage.getItem(PUBLISH_UGC_ID_KEY) || null;

function renderPublishUi() {
  publishBtn.hidden = !!publishedUgcId;
  updatePublishBtn.hidden = !publishedUgcId;
  copyUgcIdBtn.hidden = !publishedUgcId;
  unpublishBtn.hidden = !publishedUgcId;
}

async function publish() {
  publishBtn.disabled = true;
  setStatus(publishStatusEl, "Publishing…");
  try {
    const bytes = sceneToBytes();
    const wrote = await Wavedash.writeLocalFile(SAVE_PATH, bytes);
    if (!wrote) throw new Error("writeLocalFile failed");

    const response = await Wavedash.createUGCItem(
      UGC_TYPE_COMMUNITY,
      undefined, // title
      undefined, // description
      UGC_VISIBILITY_PUBLIC,
      SAVE_PATH
    );
    if (!response || !response.success) throw new Error(response?.error || "createUGCItem failed");

    publishedUgcId = response.data;
    localStorage.setItem(PUBLISH_UGC_ID_KEY, publishedUgcId);
    renderPublishUi();
    setStatus(publishStatusEl, `Published · ${formatBytes(bytes.length)}`);
  } catch (err) {
    console.error("[example-threejs-cloud] publish", err);
    setStatus(publishStatusEl, `Publish failed: ${err.message}`, true);
  } finally {
    publishBtn.disabled = false;
  }
}

async function updatePublish() {
  if (!publishedUgcId) return;
  updatePublishBtn.disabled = true;
  setStatus(publishStatusEl, "Updating published item…");
  try {
    const bytes = sceneToBytes();
    const wrote = await Wavedash.writeLocalFile(SAVE_PATH, bytes);
    if (!wrote) throw new Error("writeLocalFile failed");

    const response = await Wavedash.updateUGCItem(
      publishedUgcId,
      undefined, // title unchanged
      undefined, // description unchanged
      undefined, // visibility unchanged
      SAVE_PATH
    );
    if (!response || !response.success) throw new Error(response?.error || "updateUGCItem failed");

    setStatus(publishStatusEl, `Updated · ${formatBytes(bytes.length)}`);
  } catch (err) {
    console.error("[example-threejs-cloud] updatePublish", err);
    setStatus(publishStatusEl, `Update failed: ${err.message}`, true);
  } finally {
    updatePublishBtn.disabled = false;
  }
}

async function unpublish() {
  if (!publishedUgcId) return;
  unpublishBtn.disabled = true;
  setStatus(publishStatusEl, "Unpublishing…");
  try {
    const response = await Wavedash.deleteUGCItem(publishedUgcId);
    if (!response || !response.success) throw new Error(response?.error || "deleteUGCItem failed");

    publishedUgcId = null;
    localStorage.removeItem(PUBLISH_UGC_ID_KEY);
    renderPublishUi();
    setStatus(publishStatusEl, "Unpublished");
  } catch (err) {
    console.error("[example-threejs-cloud] unpublish", err);
    setStatus(publishStatusEl, `Unpublish failed: ${err.message}`, true);
  } finally {
    unpublishBtn.disabled = false;
  }
}

publishBtn.addEventListener("click", publish);
updatePublishBtn.addEventListener("click", updatePublish);
unpublishBtn.addEventListener("click", unpublish);

copyUgcIdBtn.addEventListener("click", async () => {
  if (!publishedUgcId) return;
  try {
    await navigator.clipboard.writeText(publishedUgcId);
    setStatus(publishStatusEl, "Copied to clipboard");
  } catch (err) {
    setStatus(publishStatusEl, `Copy failed: ${err.message}`, true);
  }
});

/* ── Import (UGC read) ─────────────────────────────── */

async function importScene() {
  const id = importIdInput.value.trim();
  if (!id) {
    setStatus(importStatusEl, "Paste a UGC ID first.", true);
    importIdInput.focus();
    return;
  }
  importBtn.disabled = true;
  setStatus(importStatusEl, `Downloading ${id}…`);
  try {
    // Scratch path — we don't want to clobber the player's own save file
    // with someone else's scene. The local sandbox is per-user anyway.
    const response = await Wavedash.downloadUGCItem(id, IMPORT_SCRATCH_PATH);
    if (!response || !response.success) throw new Error(response?.error || "downloadUGCItem failed");
    const bytes = await Wavedash.readLocalFile(IMPORT_SCRATCH_PATH);
    if (!bytes) throw new Error("readLocalFile returned null");
    const count = applySceneFromBytes(bytes);
    setStatus(importStatusEl, `Imported ${count} object${count === 1 ? "" : "s"}`);
  } catch (err) {
    console.warn("[example-threejs-cloud] import", err);
    setStatus(importStatusEl, `Import failed: ${err.message}`, true);
  } finally {
    importBtn.disabled = false;
  }
}

importBtn.addEventListener("click", importScene);
importIdInput.addEventListener("keydown", (evt) => {
  if (evt.key === "Enter") importScene();
});

/* ── Boot ───────────────────────────────────────────── */

addObject({ type: "box",    position: { x: -1, y: SHAPES.box.halfHeight,    z:  0 }, color: "#3b82f6" });
addObject({ type: "sphere", position: { x:  1, y: SHAPES.sphere.halfHeight, z:  1 }, color: "#ef4444" });
addObject({ type: "cone",   position: { x:  0, y: SHAPES.cone.halfHeight,   z: -2 }, color: "#facc15" });

renderPublishUi();

Wavedash.updateLoadProgressZeroToOne(1);
Wavedash.init({ debug: true });

// After init — surface whether the player has a save on the server, without
// auto-loading it (they might want to see the seed scene first, or publish
// a different one).
refreshSaveMeta();
