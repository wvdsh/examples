const WavedashJS = await window.WavedashJS;


/* ── PlayCanvas application ─────────────────────────────────── */

const canvas = document.getElementById("renderCanvas");
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { alpha: false, preserveDrawingBuffer: false },
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener("resize", () => app.resizeCanvas());


/* ── Scene: camera + light ──────────────────────────────────── */

const FIELD_W = 16, FIELD_H = 9;
const PADDLE_W = 0.4, PADDLE_H = 2, BALL_SIZE = 0.4;
const PADDLE_SPEED = 9.2, AI_SPEED = 5.5;
const START_BALL_VX = 6.7, START_BALL_VY = 2.8;
const MAX_BALL_VX = 12.5, MAX_BALL_VY = 8.5;
const PLAYER_X = -(FIELD_W / 2) + 0.9;
const AI_X = (FIELD_W / 2) - 0.9;

const camera = new pc.Entity("camera");
camera.addComponent("camera", {
  projection: pc.PROJECTION_ORTHOGRAPHIC,
  orthoHeight: FIELD_H / 2 + 0.7,
  clearColor: new pc.Color(0.067, 0.067, 0.067),
  nearClip: 0.1,
  farClip: 100,
});
camera.setPosition(0, 0, 15);
camera.lookAt(0, 0, 0);
app.root.addChild(camera);

const light = new pc.Entity("light");
light.addComponent("light", { type: "directional", color: new pc.Color(1, 1, 1), intensity: 1.2 });
light.setEulerAngles(35, -25, 0);
app.root.addChild(light);

/* ── Helpers ─────────────────────────────────────────────────── */

function makeMat(r, g, b) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(r, g, b);
  m.emissive = new pc.Color(r * 0.3, g * 0.3, b * 0.3);
  m.useLighting = true;
  m.update();
  return m;
}

function makeBox(name, w, h, d, mat) {
  const e = new pc.Entity(name);
  e.addComponent("render", { type: "box", material: mat });
  e.setLocalScale(w, h, d);
  app.root.addChild(e);
  return e;
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

/* ── Entities ────────────────────────────────────────────────── */

const playerMat = makeMat(0.66, 0.33, 0.97);
const aiMat     = makeMat(0.13, 0.83, 0.93);
const ballMat   = makeMat(1, 1, 1);

const player = makeBox("player", PADDLE_W, PADDLE_H, 0.34, playerMat);
const ai     = makeBox("ai",     PADDLE_W, PADDLE_H, 0.34, aiMat);
const ball   = makeBox("ball",   BALL_SIZE, BALL_SIZE, BALL_SIZE, ballMat);

player.setPosition(PLAYER_X, 0, 0);
ai.setPosition(AI_X, 0, 0);


/* ── Score ───────────────────────────────────────────────────── */

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl     = document.getElementById("aiScore");
let playerScore = 0, aiScore = 0;

/* ── Input (arrow keys + WASD, preventDefault) ──────────────── */

const input = { up: false, down: false };
const MOVE_KEYS = new Set(["KeyW", "ArrowUp", "KeyS", "ArrowDown"]);

window.addEventListener("keydown", (e) => {
  if (!MOVE_KEYS.has(e.code)) return;
  e.preventDefault();
  if (e.code === "KeyW" || e.code === "ArrowUp")   input.up   = true;
  if (e.code === "KeyS" || e.code === "ArrowDown") input.down = true;
});
window.addEventListener("keyup", (e) => {
  if (!MOVE_KEYS.has(e.code)) return;
  e.preventDefault();
  if (e.code === "KeyW" || e.code === "ArrowUp")   input.up   = false;
  if (e.code === "KeyS" || e.code === "ArrowDown") input.down = false;
});

/* ── Game state ──────────────────────────────────────────────── */

let ballVx = 0, ballVy = 0;
let ballX = 0, ballY = 0;
let playerY = 0, aiY = 0;
let aiTargetY = 0, aiRetargetIn = 0;

function resetBall(direction) {
  ballX = 0; ballY = 0;
  ballVx = direction * START_BALL_VX;
  ballVy = (Math.random() - 0.5) * START_BALL_VY * 2;
  if (Math.abs(ballVy) < 1.2) ballVy = ballVy < 0 ? -1.5 : 1.5;
}

function resetMatch() {
  playerScore = 0; aiScore = 0;
  playerScoreEl.textContent = "0";
  aiScoreEl.textContent = "0";
  playerY = 0; aiY = 0;
  resetBall(Math.random() < 0.5 ? -1 : 1);
}

resetBall(1);

/* ── Update loop ─────────────────────────────────────────────── */

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.init({ debug: true });

app.on("update", (rawDt) => {
  const dt = Math.min(rawDt, 0.05);
  const halfPH = PADDLE_H / 2;
  const maxPY = FIELD_H / 2 - halfPH;

  /* player */
  const dir = (input.up ? 1 : 0) + (input.down ? -1 : 0);
  playerY = clamp(playerY + dir * PADDLE_SPEED * dt, -maxPY, maxPY);

  /* ai */
  if (ballVx > 0) {
    aiRetargetIn -= dt;
    if (aiRetargetIn <= 0) {
      aiRetargetIn = 0.18 + Math.random() * 0.17;
      const travelTime = ballVx > 0 ? (AI_X - ballX) / ballVx : 0;
      const projY = ballY + ballVy * travelTime;
      aiTargetY = clamp(projY + (Math.random() - 0.5) * PADDLE_H * 0.5,
                        -maxPY, maxPY);
    }
  } else {
    aiTargetY = 0;
  }
  const maxAiMove = AI_SPEED * dt;
  aiY = clamp(aiY + clamp(aiTargetY - aiY, -maxAiMove, maxAiMove), -maxPY, maxPY);

  /* ball */
  ballX += ballVx * dt;
  ballY += ballVy * dt;

  const halfBall = BALL_SIZE / 2;
  const fieldTop = FIELD_H / 2;

  if (ballY + halfBall > fieldTop)  { ballY = fieldTop - halfBall;  ballVy = -Math.abs(ballVy); }
  if (ballY - halfBall < -fieldTop) { ballY = -fieldTop + halfBall; ballVy =  Math.abs(ballVy); }

  /* paddle collisions */
  const halfPW = PADDLE_W / 2;

  if (ballVx < 0 &&
      ballX - halfBall < PLAYER_X + halfPW &&
      ballX + halfBall > PLAYER_X - halfPW &&
      ballY + halfBall > playerY - halfPH &&
      ballY - halfBall < playerY + halfPH) {
    const impact = clamp((ballY - playerY) / halfPH, -1, 1);
    ballVx = Math.min(Math.abs(ballVx) * 1.05 + 0.45, MAX_BALL_VX);
    ballVy = clamp(ballVy + impact * 3.6, -MAX_BALL_VY, MAX_BALL_VY);
    ballX = PLAYER_X + halfPW + halfBall;
  }

  if (ballVx > 0 &&
      ballX + halfBall > AI_X - halfPW &&
      ballX - halfBall < AI_X + halfPW &&
      ballY + halfBall > aiY - halfPH &&
      ballY - halfBall < aiY + halfPH) {
    const impact = clamp((ballY - aiY) / halfPH, -1, 1);
    ballVx = -Math.min(Math.abs(ballVx) * 1.05 + 0.45, MAX_BALL_VX);
    ballVy = clamp(ballVy + impact * 3.6, -MAX_BALL_VY, MAX_BALL_VY);
    ballX = AI_X - halfPW - halfBall;
  }

  /* scoring */
  if (ballX < -FIELD_W / 2) {
    aiScore++;
    aiScoreEl.textContent = aiScore;
    if (aiScore >= 7) resetMatch(); else resetBall(-1);
  }
  if (ballX > FIELD_W / 2) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    if (playerScore >= 7) resetMatch(); else resetBall(1);
  }

  /* sync positions */
  player.setPosition(PLAYER_X, playerY, 0);
  ai.setPosition(AI_X, aiY, 0);
  ball.setPosition(ballX, ballY, 0);
});

app.start();
