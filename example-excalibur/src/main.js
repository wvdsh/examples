import {
  Engine,
  DisplayMode,
  Color,
  Actor,
  vec,
  Keys,
  CollisionType,
  Vector,
  Scene,
} from "excalibur";

const Wavedash = await window.Wavedash;
Wavedash.updateLoadProgressZeroToOne(0.3);

// --- Arena (screen-space) ---
const W = 1600, H = 900;
const WALL_THICKNESS = 10;

// --- Paddle ---
const PADDLE_W = 20;
const PADDLE_H = 120;
const PADDLE_SPEED = 500;
const AI_SPEED = 350;
const PADDLE_X_MARGIN = 120;

// --- Ball ---
const BALL_SIZE = 20;
const BALL_SPEED = 400;

const game = new Engine({
  canvasElementId: "game",
  displayMode: DisplayMode.FitScreen,
  width: W,
  height: H,
  backgroundColor: Color.fromHex("#0a0a0a"),
  suppressPlayButton: true,
  suppressConsoleBootMessage: true,
});

function makeRect(x, y, w, h) {
  const actor = new Actor({
    pos: vec(x, y),
    width: w,
    height: h,
    color: Color.White,
    collisionType: CollisionType.Fixed,
  });
  return actor;
}

const leftPaddle = makeRect(PADDLE_X_MARGIN, H / 2, PADDLE_W, PADDLE_H);
const rightPaddle = makeRect(W - PADDLE_X_MARGIN, H / 2, PADDLE_W, PADDLE_H);
const topWall = makeRect(W / 2, WALL_THICKNESS / 2, W, WALL_THICKNESS);
const bottomWall = makeRect(W / 2, H - WALL_THICKNESS / 2, W, WALL_THICKNESS);
const ball = new Actor({
  pos: vec(W / 2, H / 2),
  width: BALL_SIZE,
  height: BALL_SIZE,
  color: Color.White,
});

function resetBall(dirX) {
  ball.pos = vec(W / 2, H / 2);
  const norm = Math.hypot(dirX, 0.25);
  ball.vel = vec((dirX / norm) * BALL_SPEED, (0.25 / norm) * BALL_SPEED);
}

resetBall(1);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const minPaddleY = WALL_THICKNESS + PADDLE_H / 2;
const maxPaddleY = H - WALL_THICKNESS - PADDLE_H / 2;

const scene = new Scene();
scene.add(leftPaddle);
scene.add(rightPaddle);
scene.add(topWall);
scene.add(bottomWall);
scene.add(ball);

scene.onPreUpdate = (engine, delta) => {
  const dt = delta / 1000;

  // --- Left paddle: W / S ---
  let leftDir = 0;
  if (engine.input.keyboard.isHeld(Keys.W)) leftDir -= 1;
  if (engine.input.keyboard.isHeld(Keys.S)) leftDir += 1;
  leftPaddle.pos.y = clamp(
    leftPaddle.pos.y + leftDir * PADDLE_SPEED * dt,
    minPaddleY,
    maxPaddleY
  );

  // --- Right paddle: tracking AI ---
  const dy = ball.pos.y - rightPaddle.pos.y;
  const step = AI_SPEED * dt;
  const move = Math.abs(dy) < step ? dy : Math.sign(dy) * step;
  rightPaddle.pos.y = clamp(rightPaddle.pos.y + move, minPaddleY, maxPaddleY);

  // --- Ball physics ---
  // Top/bottom wall bounce
  if (ball.pos.y < WALL_THICKNESS + BALL_SIZE / 2 && ball.vel.y < 0) {
    ball.vel = new Vector(ball.vel.x, -ball.vel.y);
  } else if (
    ball.pos.y > H - WALL_THICKNESS - BALL_SIZE / 2 &&
    ball.vel.y > 0
  ) {
    ball.vel = new Vector(ball.vel.x, -ball.vel.y);
  }

  // Paddle bounce (AABB, always flips vx)
  function hit(p) {
    return (
      Math.abs(ball.pos.x - p.pos.x) < (PADDLE_W + BALL_SIZE) / 2 &&
      Math.abs(ball.pos.y - p.pos.y) < (PADDLE_H + BALL_SIZE) / 2
    );
  }
  if (hit(leftPaddle) && ball.vel.x < 0) {
    ball.vel = new Vector(-ball.vel.x, ball.vel.y);
    ball.pos.x = leftPaddle.pos.x + (PADDLE_W + BALL_SIZE) / 2;
  }
  if (hit(rightPaddle) && ball.vel.x > 0) {
    ball.vel = new Vector(-ball.vel.x, ball.vel.y);
    ball.pos.x = rightPaddle.pos.x - (PADDLE_W + BALL_SIZE) / 2;
  }

  // Scoring
  if (ball.pos.x < -BALL_SIZE) resetBall(-1);
  if (ball.pos.x > W + BALL_SIZE) resetBall(1);
};

game.addScene("main", scene);
await game.start("main");

Wavedash.init({ debug: true });
