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
  ctx.textBaseline = "middle";
}

resize();

// --- Input ----------------------------------------------------------------

const input = { up: false, down: false, action: false };

const upKeys = new Set(["KeyW", "ArrowUp"]);
const downKeys = new Set(["KeyS", "ArrowDown"]);
const actionKeys = new Set(["Space", "Enter"]);

window.addEventListener("keydown", (e) => {
  if (upKeys.has(e.code)) { input.up = true; e.preventDefault(); }
  if (downKeys.has(e.code)) { input.down = true; e.preventDefault(); }
  if (actionKeys.has(e.code)) { input.action = true; e.preventDefault(); }
});

window.addEventListener("keyup", (e) => {
  if (upKeys.has(e.code)) { input.up = false; e.preventDefault(); }
  if (downKeys.has(e.code)) { input.down = false; e.preventDefault(); }
});

window.addEventListener("blur", () => {
  input.up = false;
  input.down = false;
  input.action = false;
});

// --- WASM imports ---------------------------------------------------------

function rgba(r, g, b, a) {
  return "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
}

let wasmInstance = null;
const textDecoder = new TextDecoder();

function readStr(ptr, len) {
  if (!wasmInstance || len === 0) return "";
  return textDecoder.decode(new Uint8Array(wasmInstance.exports.memory.buffer, ptr, len));
}

const imports = {
  env: {
    // --- Wavedash SDK (matches bevy's two calls) ---
    wavedash_init() {
      sdk.init({ debug: true });
    },
    wavedash_update_progress(p) {
      sdk.updateLoadProgressZeroToOne(p);
    },

    // --- Draw primitives ---
    js_clear(r, g, b, a) {
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.fillStyle = rgba(r, g, b, a);
      ctx.fillRect(0, 0, width, height);
    },
    js_fill_rect(x, y, w, h, r, g, b, a) {
      ctx.fillStyle = rgba(r, g, b, a);
      ctx.fillRect(x, y, w, h);
    },
    js_draw_text(ptr, len, x, y, size, r, g, b, a) {
      ctx.fillStyle = rgba(r, g, b, a);
      ctx.font = "700 " + Math.max(12, size) + "px system-ui, sans-serif";
      ctx.fillText(readStr(ptr, len), x, y);
    },

    // --- Score overlay ---
    js_update_score(player, ai) {
      playerScoreEl.textContent = player;
      aiScoreEl.textContent = ai;
    },
  },
};

// --- Instantiate WASM -----------------------------------------------------

const response = await fetch("./game.wasm");
const bytes = await response.arrayBuffer();
const result = await WebAssembly.instantiate(bytes, imports);
wasmInstance = result.instance;

const exports = wasmInstance.exports;

exports.wd_init(width, height);

window.addEventListener("resize", () => {
  resize();
  exports.wd_resize(width, height);
});

// --- Game loop ------------------------------------------------------------

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  exports.wd_tick(dt, input.up ? 1 : 0, input.down ? 1 : 0, input.action ? 1 : 0);
  input.action = false;

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
