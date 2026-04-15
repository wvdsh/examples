const WavedashJS = await window.WavedashJS;

WavedashJS.init({ debug: true });
WavedashJS.updateLoadProgressZeroToOne(0.2);

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
WavedashJS.updateLoadProgressZeroToOne(0.5);

const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.067, 0.067, 0.067, 1);

const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -16), scene);
camera.setTarget(BABYLON.Vector3.Zero());
new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

const FIELD_W = 16, FIELD_H = 9, PADDLE_W = 0.4, PADDLE_H = 2, BALL_SIZE = 0.4;
const PADDLE_SPEED = 0.18, AI_SPEED = 0.13, BALL_SPEED = 0.14;

const player = BABYLON.MeshBuilder.CreateBox("player", { width: PADDLE_W, height: PADDLE_H, depth: 0.4 }, scene);
player.position.x = -FIELD_W / 2 + 0.8;
const ai = BABYLON.MeshBuilder.CreateBox("ai", { width: PADDLE_W, height: PADDLE_H, depth: 0.4 }, scene);
ai.position.x = FIELD_W / 2 - 0.8;
const ball = BABYLON.MeshBuilder.CreateBox("ball", { size: BALL_SIZE }, scene);
let ballVel = new BABYLON.Vector3(BALL_SPEED, BALL_SPEED * 0.5, 0);

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
let playerScore = 0, aiScore = 0;
WavedashJS.updateLoadProgressZeroToOne(0.8);

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

function clampY(p) {
  const max = FIELD_H / 2 - PADDLE_H / 2;
  p.position.y = Math.max(-max, Math.min(max, p.position.y));
}

function resetBall(direction) {
  ball.position.set(0, 0, 0);
  ballVel = new BABYLON.Vector3(direction * BALL_SPEED, (Math.random() - 0.5) * BALL_SPEED, 0);
}

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.loadComplete();

engine.runRenderLoop(() => {
  if (input.up) player.position.y += PADDLE_SPEED;
  if (input.down) player.position.y -= PADDLE_SPEED;
  clampY(player);

  const aiDelta = ball.position.y - ai.position.y;
  ai.position.y += Math.sign(aiDelta) * Math.min(Math.abs(aiDelta), AI_SPEED);
  clampY(ai);

  ball.position.addInPlace(ballVel);
  if (Math.abs(ball.position.y) > FIELD_H / 2) ballVel.y *= -1;

  const hitsPlayer =
    ball.position.x - BALL_SIZE / 2 < player.position.x + PADDLE_W / 2 &&
    ball.position.x > player.position.x &&
    Math.abs(ball.position.y - player.position.y) < PADDLE_H / 2;
  if (hitsPlayer) ballVel.x = Math.abs(ballVel.x);

  const hitsAi =
    ball.position.x + BALL_SIZE / 2 > ai.position.x - PADDLE_W / 2 &&
    ball.position.x < ai.position.x &&
    Math.abs(ball.position.y - ai.position.y) < PADDLE_H / 2;
  if (hitsAi) ballVel.x = -Math.abs(ballVel.x);

  if (ball.position.x < -FIELD_W / 2) {
    aiScore++;
    aiScoreEl.textContent = aiScore;
    resetBall(1);
  }
  if (ball.position.x > FIELD_W / 2) {
    playerScore++;
    playerScoreEl.textContent = playerScore;
    resetBall(-1);
  }

  scene.render();
});

window.addEventListener("resize", () => engine.resize());
