import { Application, Graphics } from "pixi.js";

const GAME_MODE = {
  SERVE: "serve",
  PLAY: "play",
  GAME_OVER: "game_over",
};

const WIN_SCORE = 7;
const FIELD_WIDTH = 16;
const FIELD_HEIGHT = 9;
const PADDLE_WIDTH = 0.32;
const PADDLE_HEIGHT = 1.95;
const BALL_SIZE = 0.32;
const PLAYER_SPEED = 9.2;
const AI_SPEED = 5.5;
const START_BALL_SPEED_X = 6.7;
const START_BALL_SPEED_Y = 2.8;
const MAX_BALL_SPEED_X = 12.5;
const MAX_BALL_SPEED_Y = 8.5;

const PLAYER_X = -(FIELD_WIDTH * 0.5) + 0.9;
const AI_X = (FIELD_WIDTH * 0.5) - 0.9;

const BOARD_COLOR = 0xe8e4df;
const RAIL_COLOR = 0xc8c3bc;
const DASH_COLOR = 0xb0aaa2;
const PLAYER_COLOR = 0x3b82f6;
const AI_COLOR = 0xef4444;
const BALL_COLOR = 0x1e293b;
const BG_COLOR = 0xf5f1ec;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function reflectY(value, minY, maxY) {
  let reflected = value;
  let guard = 0;

  while ((reflected < minY || reflected > maxY) && guard < 8) {
    if (reflected < minY) {
      reflected = minY + (minY - reflected);
    } else {
      reflected = maxY - (reflected - maxY);
    }
    guard += 1;
  }

  return clamp(reflected, minY, maxY);
}

export class PongGame {
  constructor({ container, playerScoreEl, aiScoreEl }) {
    this.container = container;
    this.playerScoreEl = playerScoreEl;
    this.aiScoreEl = aiScoreEl;

    this.app = null;
    this.isRunning = false;
    this.externalInput = null;
    this.pixelsPerUnit = 50;

    this.board = null;
    this.topRail = null;
    this.bottomRail = null;
    this.dashes = null;
    this.playerGfx = null;
    this.aiGfx = null;
    this.ballGfx = null;

    this.mode = GAME_MODE.SERVE;
    this.winner = "";
    this.serveDirection = 1;
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerY = 0;
    this.aiY = 0;
    this.aiTargetY = 0;
    this.aiRetargetIn = 0;
    this.ballX = 0;
    this.ballY = 0;
    this.ballVx = 0;
    this.ballVy = 0;
  }

  async create() {
    this.app = new Application();
    await this.app.init({
      background: BG_COLOR,
      resizeTo: this.container,
      antialias: true,
    });
    this.container.appendChild(this.app.canvas);
  }

  buildScene() {
    if (!this.app) {
      throw new Error("create() must resolve before buildScene().");
    }

    this.board = new Graphics();
    this.topRail = new Graphics();
    this.bottomRail = new Graphics();
    this.dashes = new Graphics();
    this.playerGfx = new Graphics();
    this.aiGfx = new Graphics();
    this.ballGfx = new Graphics();

    this.app.stage.addChild(
      this.board,
      this.topRail,
      this.bottomRail,
      this.dashes,
      this.playerGfx,
      this.aiGfx,
      this.ballGfx
    );

    this.restartMatch();
    this.recalcScale();
    this.draw();

    this.app.ticker.add((ticker) => {
      if (!this.isRunning || !this.externalInput) {
        return;
      }

      const dt = Math.min(0.05, ticker.deltaMS / 1000);

      this.step(dt, {
        up: this.externalInput.up,
        down: this.externalInput.down,
      });

      this.draw();
      this.syncHud();
    });

    window.addEventListener("resize", () => {
      this.recalcScale();
      this.draw();
    });
  }

  recalcScale() {
    if (!this.app) {
      return;
    }

    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.pixelsPerUnit = Math.min(
      w / (FIELD_WIDTH + 1.4),
      h / (FIELD_HEIGHT + 1.4)
    );

    this.centerX = w * 0.5;
    this.centerY = h * 0.5;
  }

  toScreenX(gameX) {
    return this.centerX + gameX * this.pixelsPerUnit;
  }

  toScreenY(gameY) {
    return this.centerY - gameY * this.pixelsPerUnit;
  }

  draw() {
    const s = this.pixelsPerUnit;

    this.board.clear();
    this.board.rect(
      this.toScreenX(-(FIELD_WIDTH + 1.2) * 0.5),
      this.toScreenY((FIELD_HEIGHT + 0.8) * 0.5),
      (FIELD_WIDTH + 1.2) * s,
      (FIELD_HEIGHT + 0.8) * s
    ).fill(BOARD_COLOR);

    this.topRail.clear();
    this.topRail.rect(
      this.toScreenX(-(FIELD_WIDTH + 1.4) * 0.5),
      this.toScreenY((FIELD_HEIGHT * 0.5) + 0.24 + 0.08),
      (FIELD_WIDTH + 1.4) * s,
      0.16 * s
    ).fill(RAIL_COLOR);

    this.bottomRail.clear();
    this.bottomRail.rect(
      this.toScreenX(-(FIELD_WIDTH + 1.4) * 0.5),
      this.toScreenY(-(FIELD_HEIGHT * 0.5) - 0.24 + 0.08),
      (FIELD_WIDTH + 1.4) * s,
      0.16 * s
    ).fill(RAIL_COLOR);

    this.dashes.clear();
    for (let y = -(FIELD_HEIGHT * 0.5) + 0.7; y <= (FIELD_HEIGHT * 0.5) - 0.7; y += 0.9) {
      this.dashes.rect(
        this.toScreenX(-0.04),
        this.toScreenY(y + 0.21),
        0.08 * s,
        0.42 * s
      ).fill({ color: DASH_COLOR, alpha: 0.65 });
    }

    this.playerGfx.clear();
    this.playerGfx.rect(
      this.toScreenX(PLAYER_X - PADDLE_WIDTH * 0.5),
      this.toScreenY(this.playerY + PADDLE_HEIGHT * 0.5),
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s
    ).fill(PLAYER_COLOR);

    this.aiGfx.clear();
    this.aiGfx.rect(
      this.toScreenX(AI_X - PADDLE_WIDTH * 0.5),
      this.toScreenY(this.aiY + PADDLE_HEIGHT * 0.5),
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s
    ).fill(AI_COLOR);

    this.ballGfx.clear();
    this.ballGfx.rect(
      this.toScreenX(this.ballX - BALL_SIZE * 0.5),
      this.toScreenY(this.ballY + BALL_SIZE * 0.5),
      BALL_SIZE * s,
      BALL_SIZE * s
    ).fill(BALL_COLOR);
  }

  start(input) {
    this.externalInput = input;
    this.isRunning = true;
  }

  step(dt, input) {
    if (this.mode === GAME_MODE.SERVE) {
      this.startServe();
    } else if (this.mode === GAME_MODE.GAME_OVER) {
      this.restartMatch();
    }

    this.updatePlayer(dt, input);
    this.updateAi(dt);
    this.updateBall(dt);
  }

  restartMatch() {
    this.playerScore = 0;
    this.aiScore = 0;
    this.winner = "";
    this.prepareServe(Math.random() < 0.5 ? -1 : 1);
  }

  prepareServe(direction) {
    this.mode = GAME_MODE.SERVE;
    this.serveDirection = direction;
    this.aiRetargetIn = 0;
    this.aiTargetY = 0;
    this.centerPaddles();
    this.resetBall();
  }

  startServe() {
    this.mode = GAME_MODE.PLAY;
    this.ballX = 0;
    this.ballY = 0;
    this.ballVx = this.serveDirection * START_BALL_SPEED_X;
    this.ballVy = randomRange(-START_BALL_SPEED_Y, START_BALL_SPEED_Y);

    if (Math.abs(this.ballVy) < 1.2) {
      this.ballVy = this.ballVy < 0 ? -1.5 : 1.5;
    }
  }

  awardPoint(playerScored) {
    if (playerScored) {
      this.playerScore += 1;

      if (this.playerScore >= WIN_SCORE) {
        this.winner = "Player";
        this.mode = GAME_MODE.GAME_OVER;
        this.resetBall();
        return;
      }

      this.prepareServe(1);
      return;
    }

    this.aiScore += 1;

    if (this.aiScore >= WIN_SCORE) {
      this.winner = "CPU";
      this.mode = GAME_MODE.GAME_OVER;
      this.resetBall();
      return;
    }

    this.prepareServe(-1);
  }

  centerPaddles() {
    this.playerY = 0;
    this.aiY = 0;
    this.aiTargetY = 0;
  }

  resetBall() {
    this.ballX = 0;
    this.ballY = 0;
    this.ballVx = 0;
    this.ballVy = 0;
  }

  updatePlayer(dt, input) {
    const minY = -(FIELD_HEIGHT * 0.5) + (PADDLE_HEIGHT * 0.5);
    const maxY = (FIELD_HEIGHT * 0.5) - (PADDLE_HEIGHT * 0.5);
    const direction = (input.up ? -1 : 0) + (input.down ? 1 : 0);

    this.playerY = clamp(this.playerY + direction * PLAYER_SPEED * dt, minY, maxY);
  }

  updateAi(dt) {
    const minY = -(FIELD_HEIGHT * 0.5) + (PADDLE_HEIGHT * 0.5);
    const maxY = (FIELD_HEIGHT * 0.5) - (PADDLE_HEIGHT * 0.5);

    if (this.mode === GAME_MODE.PLAY && this.ballVx > 0) {
      this.aiRetargetIn -= dt;

      if (this.aiRetargetIn <= 0) {
        this.aiRetargetIn = randomRange(0.18, 0.35);

        const distanceToPaddle = AI_X - this.ballX;
        const leadTime = this.ballVx > 0 && distanceToPaddle > 0 ? distanceToPaddle / this.ballVx : 0;
        const projectedY = reflectY(
          this.ballY + this.ballVy * leadTime,
          -(FIELD_HEIGHT * 0.5) + (BALL_SIZE * 0.5),
          (FIELD_HEIGHT * 0.5) - (BALL_SIZE * 0.5)
        );
        const missWindow = PADDLE_HEIGHT * randomRange(0.35, 0.75);
        this.aiTargetY = projectedY + randomRange(-missWindow, missWindow);
      }
    } else {
      this.aiRetargetIn = 0;
      this.aiTargetY = 0;
    }

    const maxMove = AI_SPEED * dt;
    const move = clamp(this.aiTargetY - this.aiY, -maxMove, maxMove);
    this.aiY = clamp(this.aiY + move, minY, maxY);
  }

  updateBall(dt) {
    if (this.mode !== GAME_MODE.PLAY) {
      return;
    }

    const halfBall = BALL_SIZE * 0.5;
    const halfPaddleWidth = PADDLE_WIDTH * 0.5;
    const halfPaddleHeight = PADDLE_HEIGHT * 0.5;
    const fieldTop = FIELD_HEIGHT * 0.5;
    const fieldBottom = -fieldTop;
    const fieldRight = FIELD_WIDTH * 0.5;
    const fieldLeft = -fieldRight;

    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    if (this.ballY + halfBall >= fieldTop) {
      this.ballY = fieldTop - halfBall;
      this.ballVy = -Math.abs(this.ballVy);
    } else if (this.ballY - halfBall <= fieldBottom) {
      this.ballY = fieldBottom + halfBall;
      this.ballVy = Math.abs(this.ballVy);
    }

    const ballMinX = this.ballX - halfBall;
    const ballMaxX = this.ballX + halfBall;
    const ballMinY = this.ballY - halfBall;
    const ballMaxY = this.ballY + halfBall;

    const playerMinX = PLAYER_X - halfPaddleWidth;
    const playerMaxX = PLAYER_X + halfPaddleWidth;
    const playerMinY = this.playerY - halfPaddleHeight;
    const playerMaxY = this.playerY + halfPaddleHeight;

    if (
      this.ballVx < 0 &&
      ballMinX <= playerMaxX &&
      ballMaxX >= playerMinX &&
      ballMinY <= playerMaxY &&
      ballMaxY >= playerMinY
    ) {
      this.bounceFromPaddle(true, this.playerY);
    }

    const aiMinX = AI_X - halfPaddleWidth;
    const aiMaxX = AI_X + halfPaddleWidth;
    const aiMinY = this.aiY - halfPaddleHeight;
    const aiMaxY = this.aiY + halfPaddleHeight;

    if (
      this.ballVx > 0 &&
      ballMaxX >= aiMinX &&
      ballMinX <= aiMaxX &&
      ballMinY <= aiMaxY &&
      ballMaxY >= aiMinY
    ) {
      this.bounceFromPaddle(false, this.aiY);
    }

    if (this.ballX + halfBall < fieldLeft) {
      this.awardPoint(false);
    } else if (this.ballX - halfBall > fieldRight) {
      this.awardPoint(true);
    }
  }

  bounceFromPaddle(leftSide, paddleY) {
    const impact = clamp((this.ballY - paddleY) / (PADDLE_HEIGHT * 0.5), -1, 1);
    const nextSpeedX = Math.min(Math.abs(this.ballVx) * 1.05 + 0.45, MAX_BALL_SPEED_X);
    let nextSpeedY = clamp(this.ballVy + impact * 3.6, -MAX_BALL_SPEED_Y, MAX_BALL_SPEED_Y);

    if (Math.abs(nextSpeedY) < 1.25) {
      nextSpeedY = impact < 0 ? -1.5 : 1.5;
    }

    nextSpeedY += randomRange(-0.25, 0.25);

    if (leftSide) {
      this.ballX = PLAYER_X + (PADDLE_WIDTH * 0.5) + (BALL_SIZE * 0.5);
      this.ballVx = nextSpeedX;
    } else {
      this.ballX = AI_X - (PADDLE_WIDTH * 0.5) - (BALL_SIZE * 0.5);
      this.ballVx = -nextSpeedX;
    }

    this.ballVy = nextSpeedY;
  }

  syncHud() {
    this.playerScoreEl.textContent = String(this.playerScore);
    this.aiScoreEl.textContent = String(this.aiScore);
  }
}
