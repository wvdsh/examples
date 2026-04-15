// src/main.ts
var WavedashJS = await window.WavedashJS;
WavedashJS.init({ debug: true });
var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext("2d");
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", resize);
var FIELD_W = 16;
var FIELD_H = 9;
var PADDLE_W = 0.35;
var PADDLE_H = 2;
var BALL_SIZE = 0.35;
var PLAYER_SPEED = 9;
var AI_SPEED = 5.5;
var BALL_SPEED_X = 6.5;
var BALL_SPEED_Y = 2.8;
var MAX_VX = 12;
var MAX_VY = 8;
var WIN_SCORE = 7;
var playerY = 0;
var aiY = 0;
var ballX = 0;
var ballY = 0;
var ballVx = 0;
var ballVy = 0;
var playerScore = 0;
var aiScore = 0;
var serving = true;
var serveDir = Math.random() < 0.5 ? 1 : -1;
var playerScoreEl = document.getElementById("playerScore");
var aiScoreEl = document.getElementById("aiScore");
var input = { up: false, down: false };
var MOVE_KEYS = /* @__PURE__ */ new Set(["KeyW", "ArrowUp", "KeyS", "ArrowDown"]);
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
window.addEventListener("blur", () => {
  input.up = false;
  input.down = false;
});
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function ppu() {
  return Math.min(innerWidth / (FIELD_W + 1.4), innerHeight / (FIELD_H + 1.4));
}
function toX(gx) {
  return innerWidth / 2 + gx * ppu();
}
function toY(gy) {
  return innerHeight / 2 - gy * ppu();
}
function resetBall(dir) {
  ballX = 0;
  ballY = 0;
  ballVx = dir * BALL_SPEED_X;
  ballVy = (Math.random() - 0.5) * BALL_SPEED_Y * 2;
  if (Math.abs(ballVy) < 1.2) ballVy = ballVy < 0 ? -1.5 : 1.5;
  serving = false;
}
function serve() {
  resetBall(serveDir);
}
function draw() {
  const s = ppu();
  const w = innerWidth, h = innerHeight;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let y = -FIELD_H / 2 + 0.5; y <= FIELD_H / 2 - 0.5; y += 0.9) {
    ctx.fillRect(toX(-0.04), toY(y + 0.2), 0.08 * s, 0.4 * s);
  }
  ctx.fillStyle = "#3b82f6";
  const px = -FIELD_W / 2 + 0.9;
  ctx.fillRect(toX(px - PADDLE_W / 2), toY(playerY + PADDLE_H / 2), PADDLE_W * s, PADDLE_H * s);
  ctx.fillStyle = "#ef4444";
  const ax = FIELD_W / 2 - 0.9;
  ctx.fillRect(toX(ax - PADDLE_W / 2), toY(aiY + PADDLE_H / 2), PADDLE_W * s, PADDLE_H * s);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(toX(ballX - BALL_SIZE / 2), toY(ballY + BALL_SIZE / 2), BALL_SIZE * s, BALL_SIZE * s);
}
function update(dt) {
  if (serving) serve();
  const dir = (input.up ? 1 : 0) + (input.down ? -1 : 0);
  const padMax = FIELD_H / 2 - PADDLE_H / 2;
  playerY = clamp(playerY + dir * PLAYER_SPEED * dt, -padMax, padMax);
  const aiDelta = ballY - aiY;
  const aiStep = AI_SPEED * dt;
  aiY = clamp(aiY + clamp(aiDelta, -aiStep, aiStep), -padMax, padMax);
  ballX += ballVx * dt;
  ballY += ballVy * dt;
  const halfBall = BALL_SIZE / 2;
  if (ballY + halfBall > FIELD_H / 2) {
    ballY = FIELD_H / 2 - halfBall;
    ballVy = -Math.abs(ballVy);
  }
  if (ballY - halfBall < -FIELD_H / 2) {
    ballY = -FIELD_H / 2 + halfBall;
    ballVy = Math.abs(ballVy);
  }
  const px = -FIELD_W / 2 + 0.9;
  if (ballVx < 0 && ballX - halfBall <= px + PADDLE_W / 2 && ballX + halfBall >= px - PADDLE_W / 2 && ballY + halfBall >= playerY - PADDLE_H / 2 && ballY - halfBall <= playerY + PADDLE_H / 2) {
    const impact = clamp((ballY - playerY) / (PADDLE_H / 2), -1, 1);
    ballVx = Math.min(Math.abs(ballVx) * 1.05 + 0.4, MAX_VX);
    ballVy = clamp(ballVy + impact * 3.5, -MAX_VY, MAX_VY);
    ballX = px + PADDLE_W / 2 + halfBall;
  }
  const ax = FIELD_W / 2 - 0.9;
  if (ballVx > 0 && ballX + halfBall >= ax - PADDLE_W / 2 && ballX - halfBall <= ax + PADDLE_W / 2 && ballY + halfBall >= aiY - PADDLE_H / 2 && ballY - halfBall <= aiY + PADDLE_H / 2) {
    const impact = clamp((ballY - aiY) / (PADDLE_H / 2), -1, 1);
    ballVx = -Math.min(Math.abs(ballVx) * 1.05 + 0.4, MAX_VX);
    ballVy = clamp(ballVy + impact * 3.5, -MAX_VY, MAX_VY);
    ballX = ax - PADDLE_W / 2 - halfBall;
  }
  if (ballX < -FIELD_W / 2 - 1) {
    aiScore++;
    aiScoreEl.textContent = String(aiScore);
    if (aiScore >= WIN_SCORE) {
      playerScore = 0;
      aiScore = 0;
      playerScoreEl.textContent = "0";
      aiScoreEl.textContent = "0";
    }
    playerY = 0;
    aiY = 0;
    serveDir = -1;
    serving = true;
  }
  if (ballX > FIELD_W / 2 + 1) {
    playerScore++;
    playerScoreEl.textContent = String(playerScore);
    if (playerScore >= WIN_SCORE) {
      playerScore = 0;
      aiScore = 0;
      playerScoreEl.textContent = "0";
      aiScoreEl.textContent = "0";
    }
    playerY = 0;
    aiY = 0;
    serveDir = 1;
    serving = true;
  }
}
WavedashJS.updateLoadProgressZeroToOne(1);
var last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1e3);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
loop(last);
