const WavedashJS = await window.WavedashJS;

WavedashJS.init({ debug: true });
WavedashJS.updateLoadProgressZeroToOne(0.2);

/* ── constants ─────────────────────────────────────────────── */

const FIELD_W = 16;
const FIELD_H = 9;
const PADDLE_W = 0.32;
const PADDLE_H = 2;
const BALL_SIZE = 0.32;
const PLAYER_SPEED = 9.2;
const AI_SPEED = 5.5;
const START_BALL_VX = 6.7;
const START_BALL_VY = 2.8;
const MAX_BALL_VX = 12.5;
const MAX_BALL_VY = 8.5;
const WIN_SCORE = 7;

const PLAYER_X = -(FIELD_W * 0.5) + 0.9;
const AI_X = (FIELD_W * 0.5) - 0.9;

const BG = 0x111111;
const BOARD_COL = 0x222222;
const RAIL_COL = 0x333333;
const DASH_COL = 0x444444;
const PLAYER_COL = 0x3b82f6;
const AI_COL = 0xef4444;
const BALL_COL = 0xf1f5f9;

/* ── PixiJS app ────────────────────────────────────────────── */

const container = document.getElementById("pixiCanvas");
const app = new PIXI.Application();
await app.init({ background: BG, resizeTo: container, antialias: true });
container.appendChild(app.canvas);
WavedashJS.updateLoadProgressZeroToOne(0.5);

/* ── scene objects ─────────────────────────────────────────── */

const board = new PIXI.Graphics();
const topRail = new PIXI.Graphics();
const bottomRail = new PIXI.Graphics();
const dashes = new PIXI.Graphics();
const playerGfx = new PIXI.Graphics();
const aiGfx = new PIXI.Graphics();
const ballGfx = new PIXI.Graphics();
app.stage.addChild(board, topRail, bottomRail, dashes, playerGfx, aiGfx, ballGfx);

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
WavedashJS.updateLoadProgressZeroToOne(0.8);

/* ── game state ────────────────────────────────────────────── */

let playerScore = 0;
let aiScore = 0;
let playerY = 0;
let aiY = 0;
let aiTargetY = 0;
let aiRetargetIn = 0;
let ballX = 0;
let ballY = 0;
let ballVx = 0;
let ballVy = 0;
let mode = "serve"; // serve | play | gameover
let serveDir = 1;

let ppu = 50; // pixels per unit
let cx = 0;   // screen center x
let cy = 0;   // screen center y

/* ── helpers ───────────────────────────────────────────────── */

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }

function reflectY(y, lo, hi) {
  let v = y, g = 0;
  while ((v < lo || v > hi) && g < 8) {
    if (v < lo) v = lo + (lo - v);
    else v = hi - (v - hi);
    g++;
  }
  return clamp(v, lo, hi);
}

function sx(gx) { return cx + gx * ppu; }
function sy(gy) { return cy - gy * ppu; }

function recalcScale() {
  const w = app.screen.width;
  const h = app.screen.height;
  ppu = Math.min(w / (FIELD_W + 1.4), h / (FIELD_H + 1.4));
  cx = w * 0.5;
  cy = h * 0.5;
}

/* ── drawing ───────────────────────────────────────────────── */

function draw() {
  const s = ppu;

  board.clear();
  board.rect(sx(-(FIELD_W + 1.2) * 0.5), sy((FIELD_H + 0.8) * 0.5), (FIELD_W + 1.2) * s, (FIELD_H + 0.8) * s).fill(BOARD_COL);

  topRail.clear();
  topRail.rect(sx(-(FIELD_W + 1.4) * 0.5), sy(FIELD_H * 0.5 + 0.32), (FIELD_W + 1.4) * s, 0.16 * s).fill(RAIL_COL);

  bottomRail.clear();
  bottomRail.rect(sx(-(FIELD_W + 1.4) * 0.5), sy(-FIELD_H * 0.5 - 0.16), (FIELD_W + 1.4) * s, 0.16 * s).fill(RAIL_COL);

  dashes.clear();
  for (let y = -(FIELD_H * 0.5) + 0.7; y <= (FIELD_H * 0.5) - 0.7; y += 0.9) {
    dashes.rect(sx(-0.04), sy(y + 0.21), 0.08 * s, 0.42 * s).fill({ color: DASH_COL, alpha: 0.65 });
  }

  playerGfx.clear();
  playerGfx.rect(sx(PLAYER_X - PADDLE_W * 0.5), sy(playerY + PADDLE_H * 0.5), PADDLE_W * s, PADDLE_H * s).fill(PLAYER_COL);

  aiGfx.clear();
  aiGfx.rect(sx(AI_X - PADDLE_W * 0.5), sy(aiY + PADDLE_H * 0.5), PADDLE_W * s, PADDLE_H * s).fill(AI_COL);

  ballGfx.clear();
  ballGfx.rect(sx(ballX - BALL_SIZE * 0.5), sy(ballY + BALL_SIZE * 0.5), BALL_SIZE * s, BALL_SIZE * s).fill(BALL_COL);
}

/* ── input ─────────────────────────────────────────────────── */

const input = { up: false, down: false };
const UP = new Set(["KeyW", "ArrowUp"]);
const DOWN = new Set(["KeyS", "ArrowDown"]);

window.addEventListener("keydown", (e) => {
  if (UP.has(e.code)) { input.up = true; e.preventDefault(); }
  if (DOWN.has(e.code)) { input.down = true; e.preventDefault(); }
});
window.addEventListener("keyup", (e) => {
  if (UP.has(e.code)) { input.up = false; e.preventDefault(); }
  if (DOWN.has(e.code)) { input.down = false; e.preventDefault(); }
});
window.addEventListener("blur", () => { input.up = false; input.down = false; });

/* ── game logic ────────────────────────────────────────────── */

function resetBall() { ballX = 0; ballY = 0; ballVx = 0; ballVy = 0; }

function prepareServe(dir) {
  mode = "serve";
  serveDir = dir;
  aiRetargetIn = 0;
  aiTargetY = 0;
  playerY = 0;
  aiY = 0;
  resetBall();
}

function restartMatch() {
  playerScore = 0;
  aiScore = 0;
  prepareServe(Math.random() < 0.5 ? -1 : 1);
}

function startServe() {
  mode = "play";
  ballX = 0;
  ballY = 0;
  ballVx = serveDir * START_BALL_VX;
  ballVy = rand(-START_BALL_VY, START_BALL_VY);
  if (Math.abs(ballVy) < 1.2) ballVy = ballVy < 0 ? -1.5 : 1.5;
}

function awardPoint(playerScored) {
  if (playerScored) {
    playerScore++;
    if (playerScore >= WIN_SCORE) { mode = "gameover"; resetBall(); return; }
    prepareServe(1);
  } else {
    aiScore++;
    if (aiScore >= WIN_SCORE) { mode = "gameover"; resetBall(); return; }
    prepareServe(-1);
  }
}

function bounceFromPaddle(leftSide, paddleY) {
  const impact = clamp((ballY - paddleY) / (PADDLE_H * 0.5), -1, 1);
  const nvx = Math.min(Math.abs(ballVx) * 1.05 + 0.45, MAX_BALL_VX);
  let nvy = clamp(ballVy + impact * 3.6, -MAX_BALL_VY, MAX_BALL_VY);
  if (Math.abs(nvy) < 1.25) nvy = impact < 0 ? -1.5 : 1.5;
  nvy += rand(-0.25, 0.25);

  if (leftSide) {
    ballX = PLAYER_X + PADDLE_W * 0.5 + BALL_SIZE * 0.5;
    ballVx = nvx;
  } else {
    ballX = AI_X - PADDLE_W * 0.5 - BALL_SIZE * 0.5;
    ballVx = -nvx;
  }
  ballVy = nvy;
}

function step(dt) {
  if (mode === "serve") startServe();
  else if (mode === "gameover") restartMatch();

  // player
  const minPY = -(FIELD_H * 0.5) + PADDLE_H * 0.5;
  const maxPY = (FIELD_H * 0.5) - PADDLE_H * 0.5;
  const dir = (input.up ? 1 : 0) + (input.down ? -1 : 0);
  playerY = clamp(playerY + dir * PLAYER_SPEED * dt, minPY, maxPY);

  // ai
  if (mode === "play" && ballVx > 0) {
    aiRetargetIn -= dt;
    if (aiRetargetIn <= 0) {
      aiRetargetIn = rand(0.18, 0.35);
      const dist = AI_X - ballX;
      const lead = ballVx > 0 && dist > 0 ? dist / ballVx : 0;
      const proj = reflectY(ballY + ballVy * lead, -(FIELD_H * 0.5) + BALL_SIZE * 0.5, (FIELD_H * 0.5) - BALL_SIZE * 0.5);
      const miss = PADDLE_H * rand(0.35, 0.75);
      aiTargetY = proj + rand(-miss, miss);
    }
  } else {
    aiRetargetIn = 0;
    aiTargetY = 0;
  }
  const maxMove = AI_SPEED * dt;
  aiY = clamp(aiY + clamp(aiTargetY - aiY, -maxMove, maxMove), minPY, maxPY);

  // ball
  if (mode !== "play") return;
  const hb = BALL_SIZE * 0.5;
  const hp = PADDLE_H * 0.5;
  const hw = PADDLE_W * 0.5;

  ballX += ballVx * dt;
  ballY += ballVy * dt;

  if (ballY + hb >= FIELD_H * 0.5) { ballY = FIELD_H * 0.5 - hb; ballVy = -Math.abs(ballVy); }
  else if (ballY - hb <= -FIELD_H * 0.5) { ballY = -FIELD_H * 0.5 + hb; ballVy = Math.abs(ballVy); }

  if (ballVx < 0 && ballX - hb <= PLAYER_X + hw && ballX + hb >= PLAYER_X - hw && ballY - hb <= playerY + hp && ballY + hb >= playerY - hp)
    bounceFromPaddle(true, playerY);
  if (ballVx > 0 && ballX + hb >= AI_X - hw && ballX - hb <= AI_X + hw && ballY - hb <= aiY + hp && ballY + hb >= aiY - hp)
    bounceFromPaddle(false, aiY);

  if (ballX + hb < -FIELD_W * 0.5) awardPoint(false);
  else if (ballX - hb > FIELD_W * 0.5) awardPoint(true);
}

/* ── start ─────────────────────────────────────────────────── */

restartMatch();
recalcScale();
draw();

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.loadComplete();

app.ticker.add((ticker) => {
  const dt = Math.min(0.05, ticker.deltaMS / 1000);
  step(dt);
  draw();
  playerScoreEl.textContent = String(playerScore);
  aiScoreEl.textContent = String(aiScore);
});

window.addEventListener("resize", () => { recalcScale(); draw(); });
