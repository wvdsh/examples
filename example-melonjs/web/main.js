import {
  Application,
  Stage,
  state as melonState,
  input,
  CANVAS,
} from "https://unpkg.com/melonjs@19/build/index.js";

const WavedashJS = await window.WavedashJS;
WavedashJS.updateLoadProgressZeroToOne(0.3);

// --- Arena ---
const W = 1600, H = 900;
const WALL_T = 10;
const PADDLE_W = 20;
const PADDLE_H = 120;
const PADDLE_SPEED = 500;
const AI_SPEED = 350;
const PADDLE_X_MARGIN = 120;
const BALL = 20;
const BALL_SPEED = 400;

const g = {
  leftY: H / 2,
  rightY: H / 2,
  ballX: W / 2,
  ballY: H / 2,
  ballVx: 0,
  ballVy: 0,
  leftScore: 0,
  rightScore: 0,
};

function resetBall(dir) {
  g.ballX = W / 2;
  g.ballY = H / 2;
  const norm = Math.hypot(dir, 0.25);
  g.ballVx = (dir / norm) * BALL_SPEED;
  g.ballVy = (0.25 / norm) * BALL_SPEED;
}

resetBall(1);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

class PlayScene extends Stage {
  onResetEvent() {
    input.bindKey(input.KEY.W, "up");
    input.bindKey(input.KEY.S, "down");
  }

  update(dt) {
    const dtSec = dt / 1000;

    // Left paddle: W / S (keyStatus polls held state continuously)
    let leftDir = 0;
    if (input.keyStatus("up"))   leftDir -= 1;
    if (input.keyStatus("down")) leftDir += 1;
    const minY = WALL_T + PADDLE_H / 2;
    const maxY = H - WALL_T - PADDLE_H / 2;
    g.leftY = clamp(g.leftY + leftDir * PADDLE_SPEED * dtSec, minY, maxY);

    // Right paddle: tracking AI
    const dy = g.ballY - g.rightY;
    const step = AI_SPEED * dtSec;
    const move = Math.abs(dy) < step ? dy : Math.sign(dy) * step;
    g.rightY = clamp(g.rightY + move, minY, maxY);

    // Ball physics
    g.ballX += g.ballVx * dtSec;
    g.ballY += g.ballVy * dtSec;

    if (g.ballY < WALL_T + BALL / 2 && g.ballVy < 0) g.ballVy = -g.ballVy;
    if (g.ballY > H - WALL_T - BALL / 2 && g.ballVy > 0) g.ballVy = -g.ballVy;

    const hit = (px, py) =>
      Math.abs(g.ballX - px) < (PADDLE_W + BALL) / 2 &&
      Math.abs(g.ballY - py) < (PADDLE_H + BALL) / 2;
    if (hit(PADDLE_X_MARGIN, g.leftY) && g.ballVx < 0) {
      g.ballVx = -g.ballVx;
      g.ballX = PADDLE_X_MARGIN + (PADDLE_W + BALL) / 2;
    }
    if (hit(W - PADDLE_X_MARGIN, g.rightY) && g.ballVx > 0) {
      g.ballVx = -g.ballVx;
      g.ballX = (W - PADDLE_X_MARGIN) - (PADDLE_W + BALL) / 2;
    }

    if (g.ballX < -BALL) {
      g.rightScore += 1;
      resetBall(-1);
    } else if (g.ballX > W + BALL) {
      g.leftScore += 1;
      resetBall(1);
    }

    return true; // dirty — always redraw
  }

  draw(renderer) {
    // Clear
    renderer.setColor("#0a0a0a");
    renderer.fillRect(0, 0, W, H);

    // Walls
    renderer.setColor("#fff");
    renderer.fillRect(0, 0, W, WALL_T);
    renderer.fillRect(0, H - WALL_T, W, WALL_T);

    // Paddles
    renderer.fillRect(
      PADDLE_X_MARGIN - PADDLE_W / 2,
      g.leftY - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H
    );
    renderer.fillRect(
      (W - PADDLE_X_MARGIN) - PADDLE_W / 2,
      g.rightY - PADDLE_H / 2,
      PADDLE_W,
      PADDLE_H
    );

    // Ball
    renderer.fillRect(
      g.ballX - BALL / 2,
      g.ballY - BALL / 2,
      BALL,
      BALL
    );

    // Scoreboard — translucent grey text above each half
    const ctx = renderer.getContext();
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "bold 120px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(g.leftScore), W / 2 - 120, 40);
    ctx.fillText(String(g.rightScore), W / 2 + 120, 40);
    ctx.restore();
  }
}

// Force the Canvas 2D renderer so `renderer.getContext()` inside PlayScene.draw
// returns a real CanvasRenderingContext2D (WebGL default doesn't expose save/fillText).
new Application(W, H, { parent: "screen", scale: "auto", renderer: CANVAS });
melonState.set(melonState.PLAY, new PlayScene());
melonState.change(melonState.PLAY);

WavedashJS.init({ debug: true });
