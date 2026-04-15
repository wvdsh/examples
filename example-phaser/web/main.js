const WavedashJS = await window.WavedashJS;

WavedashJS.init({ debug: true });
WavedashJS.updateLoadProgressZeroToOne(0.2);

/* ── constants ── */
const W = 800, H = 450;
const PADDLE_W = 10, PADDLE_H = 80, BALL_R = 8;
const PLAYER_SPEED = 420, AI_SPEED = 260;
const START_SPEED_X = 340, START_SPEED_Y = 140;
const MAX_SPEED_X = 620, MAX_SPEED_Y = 420;
const WIN_SCORE = 7;
const BG = 0x111111, PLAYER_CLR = 0x5ce1ff, AI_CLR = 0xffb347, BALL_CLR = 0xf8fafc, LINE_CLR = 0x64748b;

const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl     = document.getElementById("aiScore");

/* ── state ── */
let playerY = 0, aiY = 0, aiTargetY = 0, aiRetimer = 0;
let ballX = 0, ballY = 0, ballVx = 0, ballVy = 0;
let pScore = 0, aScore = 0, serving = true, serveDir = 1;

/* ── input ── */
const keys = { up: false, down: false };
const UP = new Set(["KeyW", "ArrowUp"]);
const DN = new Set(["KeyS", "ArrowDown"]);
window.addEventListener("keydown", e => { if (UP.has(e.code)) { keys.up = true; e.preventDefault(); } if (DN.has(e.code)) { keys.down = true; e.preventDefault(); } });
window.addEventListener("keyup",   e => { if (UP.has(e.code)) { keys.up = false; e.preventDefault(); } if (DN.has(e.code)) { keys.down = false; e.preventDefault(); } });
window.addEventListener("blur", () => { keys.up = false; keys.down = false; });

WavedashJS.updateLoadProgressZeroToOne(0.5);

/* ── Phaser scene ── */
class PongScene extends Phaser.Scene {
  create() {
    /* centre line dashes */
    for (let y = 20; y < H; y += 24) {
      this.add.rectangle(W / 2, y, 2, 14, LINE_CLR).setAlpha(0.5);
    }

    this.playerPaddle = this.add.rectangle(30,             H / 2, PADDLE_W, PADDLE_H, PLAYER_CLR);
    this.aiPaddle     = this.add.rectangle(W - 30,         H / 2, PADDLE_W, PADDLE_H, AI_CLR);
    this.ball         = this.add.rectangle(W / 2, H / 2,   BALL_R * 2, BALL_R * 2, BALL_CLR);

    resetRound();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);

    /* serve */
    if (serving) {
      serving = false;
      ballX = W / 2; ballY = H / 2;
      ballVx = serveDir * START_SPEED_X;
      ballVy = (Math.random() - 0.5) * START_SPEED_Y * 2;
      if (Math.abs(ballVy) < 60) ballVy = ballVy < 0 ? -80 : 80;
    }

    /* player */
    const dir = (keys.up ? -1 : 0) + (keys.down ? 1 : 0);
    playerY = clamp(playerY + dir * PLAYER_SPEED * dt, PADDLE_H / 2, H - PADDLE_H / 2);

    /* AI */
    if (ballVx > 0) {
      aiRetimer -= dt;
      if (aiRetimer <= 0) {
        aiRetimer = 0.18 + Math.random() * 0.17;
        const ttx = (W - 30 - ballX) / ballVx;
        const proj = ballY + ballVy * Math.max(ttx, 0);
        aiTargetY = clamp(proj + (Math.random() - 0.5) * PADDLE_H * 0.8, PADDLE_H / 2, H - PADDLE_H / 2);
      }
    } else {
      aiTargetY = H / 2;
    }
    const aiMove = clamp(aiTargetY - aiY, -AI_SPEED * dt, AI_SPEED * dt);
    aiY = clamp(aiY + aiMove, PADDLE_H / 2, H - PADDLE_H / 2);

    /* ball */
    ballX += ballVx * dt;
    ballY += ballVy * dt;

    /* top/bottom bounce */
    if (ballY - BALL_R < 0)   { ballY = BALL_R;     ballVy = Math.abs(ballVy); }
    if (ballY + BALL_R > H)   { ballY = H - BALL_R; ballVy = -Math.abs(ballVy); }

    /* paddle collisions */
    if (ballVx < 0 && ballX - BALL_R <= 30 + PADDLE_W / 2 && ballX - BALL_R >= 30 - PADDLE_W / 2
        && ballY >= playerY - PADDLE_H / 2 && ballY <= playerY + PADDLE_H / 2) {
      bounce(true);
    }
    if (ballVx > 0 && ballX + BALL_R >= W - 30 - PADDLE_W / 2 && ballX + BALL_R <= W - 30 + PADDLE_W / 2
        && ballY >= aiY - PADDLE_H / 2 && ballY <= aiY + PADDLE_H / 2) {
      bounce(false);
    }

    /* scoring */
    if (ballX < -BALL_R) { aScore++; afterScore(); }
    if (ballX > W + BALL_R) { pScore++; afterScore(); }

    /* sync graphics */
    this.playerPaddle.setPosition(30, playerY);
    this.aiPaddle.setPosition(W - 30, aiY);
    this.ball.setPosition(ballX, ballY);
  }
}

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function bounce(leftSide) {
  const paddleY = leftSide ? playerY : aiY;
  const impact = clamp((ballY - paddleY) / (PADDLE_H / 2), -1, 1);
  let sx = Math.min(Math.abs(ballVx) * 1.05 + 20, MAX_SPEED_X);
  let sy = clamp(ballVy + impact * 180, -MAX_SPEED_Y, MAX_SPEED_Y);
  if (Math.abs(sy) < 60) sy = impact < 0 ? -80 : 80;
  ballVx = leftSide ? sx : -sx;
  ballVy = sy;
  ballX = leftSide ? 30 + PADDLE_W / 2 + BALL_R : W - 30 - PADDLE_W / 2 - BALL_R;
}

function resetRound() {
  playerY = H / 2; aiY = H / 2; aiTargetY = H / 2; aiRetimer = 0;
  ballX = W / 2; ballY = H / 2; ballVx = 0; ballVy = 0;
  serving = true;
}

function afterScore() {
  playerScoreEl.textContent = pScore;
  aiScoreEl.textContent = aScore;
  if (pScore >= WIN_SCORE || aScore >= WIN_SCORE) { pScore = 0; aScore = 0; playerScoreEl.textContent = 0; aiScoreEl.textContent = 0; }
  serveDir = (ballX < 0) ? -1 : 1;
  resetRound();
}

WavedashJS.updateLoadProgressZeroToOne(0.8);

/* ── launch ── */
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: W,
  height: H,
  backgroundColor: BG,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: PongScene,
  banner: false,
  audio: { noAudio: true },
});

WavedashJS.updateLoadProgressZeroToOne(1);
WavedashJS.loadComplete();
