// Resolve the WavedashJS promise injected by `wavedash dev`.
const sdk = await window.WavedashJS;

const canvas = document.getElementById("renderCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");

// --- Canvas sizing --------------------------------------------------------

let width = 0;
let height = 0;
let pixelRatio = 1;

function resize() {
  width = Math.max(320, Math.floor(window.innerWidth));
  height = Math.max(240, Math.floor(window.innerHeight));
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

resize();

// --- Input ----------------------------------------------------------------

const input = { up: false, down: false };

const upKeys = new Set(["KeyW", "ArrowUp"]);
const downKeys = new Set(["KeyS", "ArrowDown"]);

window.addEventListener("keydown", (e) => {
  if (upKeys.has(e.code)) { input.up = true; e.preventDefault(); }
  if (downKeys.has(e.code)) { input.down = true; e.preventDefault(); }
});

window.addEventListener("keyup", (e) => {
  if (upKeys.has(e.code)) { input.up = false; e.preventDefault(); }
  if (downKeys.has(e.code)) { input.down = false; e.preventDefault(); }
});

window.addEventListener("blur", () => {
  input.up = false;
  input.down = false;
});

// --- Globals called from C# via [JSImport] --------------------------------

function rgb(r, g, b) {
  return "rgb(" + r + "," + g + "," + b + ")";
}

globalThis.wavedashInit = function () {
  sdk.init({ debug: true });
};

globalThis.wavedashProgress = function (p) {
  sdk.updateLoadProgressZeroToOne(p);
};

globalThis.jsClear = function (r, g, b) {
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = rgb(r, g, b);
  ctx.fillRect(0, 0, width, height);
};

globalThis.jsFillRect = function (x, y, w, h, r, g, b) {
  ctx.fillStyle = rgb(r, g, b);
  ctx.fillRect(x, y, w, h);
};

globalThis.jsUpdateScore = function (player, ai) {
  playerScoreEl.textContent = player;
  aiScoreEl.textContent = ai;
};

// --- Boot .NET runtime ----------------------------------------------------

import { dotnet } from "./_framework/dotnet.js";

const { getAssemblyExports } = await dotnet.create();
const exports = await getAssemblyExports("Pong.dll");

const WdInit = exports.Interop.WdInit;
const WdResize = exports.Interop.WdResize;
const WdTick = exports.Interop.WdTick;

// --- Start game -----------------------------------------------------------

WdInit(width, height);

window.addEventListener("resize", () => {
  resize();
  WdResize(width, height);
});

// --- Game loop ------------------------------------------------------------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  WdTick(dt, input.up ? 1 : 0, input.down ? 1 : 0);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
