const WavedashJS = await window.WavedashJS;


/* ── Canvas & context ─────────────────────────────── */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", resize);


/* ── Constants ────────────────────────────────────── */

const FIELD_W = 16;
const FIELD_H = 9;
const PADDLE_W = 0.35;
const PADDLE_H = 2;
const BALL_SIZE = 0.35;
const PLAYER_SPEED = 9;
const AI_SPEED = 5.5;
const BALL_SPEED_X = 6.5;
const BALL_SPEED_Y = 2.8;
const MAX_VX = 12;
const MAX_VY = 8;
const WIN_SCORE = 7;

/* ── State ────────────────────────────────────────── */

let playerY = 0, aiY = 0;
let ballX = 0, ballY = 0, ballVx = 0, ballVy = 0;
let playerScore = 0, aiScore = 0;
let serving = true;
let serveDir = Math.random() < 0.5 ? 1 : -1;

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");


/* ── Input ────────────────────────────────────────── */

const input = { up: false, down: false };
const MOVE_KEYS = new Set(["KeyW", "ArrowUp", "KeyS", "ArrowDown"]);

window.addEventListener("keydown", (e) => {
  if (!MOVE_KEYS.has(e.code)) return;
  e.preventDefault();
  if (e.code === "KeyW" || e.code === "ArrowUp") input.up = true;
  if (e.code === "KeyS" || e.code === "ArrowDown") input.down = true;
});
window.addEventListener("keyup", (e) => {
  if (!MOVE_KEYS.has(e.code)) return;
  e.preventDefault();
  if (e.code === "KeyW" || e.code === "ArrowUp") input.up = false;
  if (e.code === "KeyS" || e.code === "ArrowDown") input.down = false;
});
window.addEventListener("blur", () => { input.up = false; input.down = false; });

/* ── Helpers ──────────────────────────────────────── */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function ppu() {
  return Math.min(innerWidth / (FIELD_W + 1.4), innerHeight / (FIELD_H + 1.4));
}

function toX(gx) { return innerWidth / 2 + gx * ppu(); }
function toY(gy) { return innerHeight / 2 - gy * ppu(); }

function resetBall(dir) {
  ballX = 0; ballY = 0;
  ballVx = dir * BALL_SPEED_X;
  ballVy = (Math.random() - 0.5) * BALL_SPEED_Y * 2;
  if (Math.abs(ballVy) < 1.2) ballVy = ballVy < 0 ? -1.5 : 1.5;
  serving = false;
}

function serve() {
  resetBall(serveDir);
}

/* ── Draw ─────────────────────────────────────────── */

function draw() {
  const s = ppu();
  const w = innerWidth, h = innerHeight;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);

  /* center dashes */
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let y = -FIELD_H / 2 + 0.5; y <= FIELD_H / 2 - 0.5; y += 0.9) {
    ctx.fillRect(toX(-0.04), toY(y + 0.2), 0.08 * s, 0.4 * s);
  }

  /* player paddle */
  ctx.fillStyle = "#3b82f6";
  const px = -FIELD_W / 2 + 0.9;
  ctx.fillRect(toX(px - PADDLE_W / 2), toY(playerY + PADDLE_H / 2), PADDLE_W * s, PADDLE_H * s);

  /* ai paddle */
  ctx.fillStyle = "#ef4444";
  const ax = FIELD_W / 2 - 0.9;
  ctx.fillRect(toX(ax - PADDLE_W / 2), toY(aiY + PADDLE_H / 2), PADDLE_W * s, PADDLE_H * s);

  /* ball */
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(toX(ballX - BALL_SIZE / 2), toY(ballY + BALL_SIZE / 2), BALL_SIZE * s, BALL_SIZE * s);
}

/* ── Update ───────────────────────────────────────── */

function update(dt) {
  /* serve */
  if (serving) serve();

  /* player */
  const dir = (input.up ? 1 : 0) + (input.down ? -1 : 0);
  const padMax = FIELD_H / 2 - PADDLE_H / 2;
  playerY = clamp(playerY + dir * PLAYER_SPEED * dt, -padMax, padMax);

  /* ai */
  const aiDelta = ballY - aiY;
  const aiStep = AI_SPEED * dt;
  aiY = clamp(aiY + clamp(aiDelta, -aiStep, aiStep), -padMax, padMax);

  /* ball movement */
  ballX += ballVx * dt;
  ballY += ballVy * dt;

  /* wall bounce */
  const halfBall = BALL_SIZE / 2;
  if (ballY + halfBall > FIELD_H / 2) { ballY = FIELD_H / 2 - halfBall; ballVy = -Math.abs(ballVy); }
  if (ballY - halfBall < -FIELD_H / 2) { ballY = -FIELD_H / 2 + halfBall; ballVy = Math.abs(ballVy); }

  /* paddle collision - player */
  const px = -FIELD_W / 2 + 0.9;
  if (
    ballVx < 0 &&
    ballX - halfBall <= px + PADDLE_W / 2 &&
    ballX + halfBall >= px - PADDLE_W / 2 &&
    ballY + halfBall >= playerY - PADDLE_H / 2 &&
    ballY - halfBall <= playerY + PADDLE_H / 2
  ) {
    const impact = clamp((ballY - playerY) / (PADDLE_H / 2), -1, 1);
    ballVx = Math.min(Math.abs(ballVx) * 1.05 + 0.4, MAX_VX);
    ballVy = clamp(ballVy + impact * 3.5, -MAX_VY, MAX_VY);
    ballX = px + PADDLE_W / 2 + halfBall;
  }

  /* paddle collision - ai */
  const ax = FIELD_W / 2 - 0.9;
  if (
    ballVx > 0 &&
    ballX + halfBall >= ax - PADDLE_W / 2 &&
    ballX - halfBall <= ax + PADDLE_W / 2 &&
    ballY + halfBall >= aiY - PADDLE_H / 2 &&
    ballY - halfBall <= aiY + PADDLE_H / 2
  ) {
    const impact = clamp((ballY - aiY) / (PADDLE_H / 2), -1, 1);
    ballVx = -Math.min(Math.abs(ballVx) * 1.05 + 0.4, MAX_VX);
    ballVy = clamp(ballVy + impact * 3.5, -MAX_VY, MAX_VY);
    ballX = ax - PADDLE_W / 2 - halfBall;
  }

  /* scoring */
  if (ballX < -FIELD_W / 2 - 1) {
    aiScore++;
    aiScoreEl.textContent = aiScore;
    if (aiScore >= WIN_SCORE) { playerScore = 0; aiScore = 0; playerScoreEl.textContent = 0; aiScoreEl.textContent = 0; }
    playerY = 0; aiY = 0; serveDir = -1; serving = true;
  }
  if (ballX > FIELD_W / 2 + 1) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    if (playerScore >= WIN_SCORE) { playerScore = 0; aiScore = 0; playerScoreEl.textContent = 0; aiScoreEl.textContent = 0; }
    playerY = 0; aiY = 0; serveDir = 1; serving = true;
  }
}

/* ── Main loop ────────────────────────────────────── */

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.init({ debug: true });

let last = performance.now();
(function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
})(last);
