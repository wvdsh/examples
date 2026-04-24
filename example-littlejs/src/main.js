// LittleJS Pong — two-player-style with a tracking AI on the right.
import { engineInit, vec2, drawRect, Color, WHITE, setCameraPos, setCameraScale, setCanvasFixedSize, timeDelta, keyIsDown } from 'littlejsengine';

const Wavedash = await window.Wavedash;
Wavedash.updateLoadProgressZeroToOne(0.3);

// --- Arena (world units, LittleJS uses tile coords by default) ---
const FIELD_W = 40;
const FIELD_H = 22;
const WALL_THICKNESS = 0.5;
const PADDLE_W = 0.6;
const PADDLE_H = 4;
const BALL_SIZE = 0.6;
const PADDLE_SPEED = 20;
const AI_SPEED = 14;
const BALL_SPEED = 16;
const PADDLE_X = FIELD_W / 2 - 2;

let leftY = 0;
let rightY = 0;
let ballX = 0;
let ballY = 0;
let ballVX = 0;
let ballVY = 0;

function resetBall(dir) {
  ballX = 0;
  ballY = 0;
  const norm = Math.hypot(dir, 0.25);
  ballVX = (dir / norm) * BALL_SPEED;
  ballVY = (0.25 / norm) * BALL_SPEED;
}

function gameInit() {
  setCameraPos(vec2(0, 0));
  setCameraScale(Math.min(innerWidth / FIELD_W, innerHeight / FIELD_H));
  setCanvasFixedSize(vec2(0)); // fill window
  resetBall(1);
  Wavedash.init({ debug: true });
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

const maxPaddleY = FIELD_H / 2 - WALL_THICKNESS - PADDLE_H / 2;
const minPaddleY = -maxPaddleY;

function gameUpdate() {
  const dt = timeDelta; // already in seconds

  // Left paddle: W/S
  let leftDir = 0;
  if (keyIsDown("KeyW")) leftDir += 1;
  if (keyIsDown("KeyS")) leftDir -= 1;
  leftY = clamp(leftY + leftDir * PADDLE_SPEED * dt, minPaddleY, maxPaddleY);

  // Right paddle AI
  const dy = ballY - rightY;
  const step = AI_SPEED * dt;
  const move = Math.abs(dy) < step ? dy : Math.sign(dy) * step;
  rightY = clamp(rightY + move, minPaddleY, maxPaddleY);

  // Ball physics
  ballX += ballVX * dt;
  ballY += ballVY * dt;

  // Top / bottom walls
  const topY = FIELD_H / 2 - WALL_THICKNESS;
  const botY = -topY;
  if (ballY + BALL_SIZE / 2 > topY && ballVY > 0) ballVY = -ballVY;
  if (ballY - BALL_SIZE / 2 < botY && ballVY < 0) ballVY = -ballVY;

  // Paddle collision (AABB, always flips vx)
  function hitPaddle(px, py) {
    return (
      Math.abs(ballX - px) < (PADDLE_W + BALL_SIZE) / 2 &&
      Math.abs(ballY - py) < (PADDLE_H + BALL_SIZE) / 2
    );
  }
  if (hitPaddle(-PADDLE_X, leftY) && ballVX < 0) ballVX = -ballVX;
  if (hitPaddle(PADDLE_X, rightY) && ballVX > 0) ballVX = -ballVX;

  // Scoring
  if (ballX < -FIELD_W / 2 - 1) resetBall(-1);
  if (ballX > FIELD_W / 2 + 1) resetBall(1);
}

function gameUpdatePost() {}

function gameRender() {
  // Walls
  drawRect(vec2(0, FIELD_H / 2 - WALL_THICKNESS / 2), vec2(FIELD_W, WALL_THICKNESS), WHITE);
  drawRect(vec2(0, -FIELD_H / 2 + WALL_THICKNESS / 2), vec2(FIELD_W, WALL_THICKNESS), WHITE);
  // Center line
  drawRect(vec2(0, 0), vec2(0.1, FIELD_H - 2 * WALL_THICKNESS), new Color(1, 1, 1, 0.15));
  // Paddles
  drawRect(vec2(-PADDLE_X, leftY), vec2(PADDLE_W, PADDLE_H), WHITE);
  drawRect(vec2(PADDLE_X, rightY), vec2(PADDLE_W, PADDLE_H), WHITE);
  // Ball
  drawRect(vec2(ballX, ballY), vec2(BALL_SIZE, BALL_SIZE), WHITE);
}

function gameRenderPost() {}

engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
