export interface PongConfig {
  readonly canvas: HTMLCanvasElement;
  readonly playerScoreEl: HTMLElement;
  readonly aiScoreEl: HTMLElement;
}

export interface InputState {
  up: boolean;
  down: boolean;
}

type GameMode = "serve" | "play" | "game_over";

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
const AI_X = FIELD_WIDTH * 0.5 - 0.9;

const BOARD_COLOR = "#e8e4df";
const RAIL_COLOR = "#c8c3bc";
const DASH_COLOR = "rgba(176, 170, 162, 0.65)";
const PLAYER_COLOR = "#3b82f6";
const AI_COLOR = "#ef4444";
const BALL_COLOR = "#1e293b";
const BG_COLOR = "#f5f1ec";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function reflectY(value: number, minY: number, maxY: number): number {
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
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly playerScoreEl: HTMLElement;
  private readonly aiScoreEl: HTMLElement;

  private running = false;
  private input: InputState | null = null;
  private pixelsPerUnit = 50;
  private centerX = 0;
  private centerY = 0;
  private lastTime = 0;

  private mode: GameMode = "serve";
  private serveDirection = 1;
  private playerScore = 0;
  private aiScore = 0;
  private playerY = 0;
  private aiY = 0;
  private aiTargetY = 0;
  private aiRetargetIn = 0;
  private ballX = 0;
  private ballY = 0;
  private ballVx = 0;
  private ballVy = 0;

  constructor(config: PongConfig) {
    this.canvas = config.canvas;
    this.playerScoreEl = config.playerScoreEl;
    this.aiScoreEl = config.aiScoreEl;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context not available.");
    }
    this.ctx = ctx;
  }

  setup(): void {
    this.recalcScale();
    this.restartMatch();
    this.draw();

    window.addEventListener("resize", () => {
      this.recalcScale();
      this.draw();
    });
  }

  start(input: InputState): void {
    this.input = input;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(now: number): void {
    if (!this.running || !this.input) {
      return;
    }

    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.step(dt, this.input);
    this.draw();
    this.syncHud();

    requestAnimationFrame((t) => this.loop(t));
  }

  private recalcScale(): void {
    const parent = this.canvas.parentElement;
    if (!parent) {
      return;
    }

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.pixelsPerUnit = Math.min(
      w / (FIELD_WIDTH + 1.4),
      h / (FIELD_HEIGHT + 1.4),
    );
    this.centerX = w * 0.5;
    this.centerY = h * 0.5;
  }

  private toScreenX(gameX: number): number {
    return this.centerX + gameX * this.pixelsPerUnit;
  }

  private toScreenY(gameY: number): number {
    return this.centerY - gameY * this.pixelsPerUnit;
  }

  private draw(): void {
    const s = this.pixelsPerUnit;
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = BOARD_COLOR;
    ctx.fillRect(
      this.toScreenX(-(FIELD_WIDTH + 1.2) * 0.5),
      this.toScreenY((FIELD_HEIGHT + 0.8) * 0.5),
      (FIELD_WIDTH + 1.2) * s,
      (FIELD_HEIGHT + 0.8) * s,
    );

    ctx.fillStyle = RAIL_COLOR;
    ctx.fillRect(
      this.toScreenX(-(FIELD_WIDTH + 1.4) * 0.5),
      this.toScreenY(FIELD_HEIGHT * 0.5 + 0.24 + 0.08),
      (FIELD_WIDTH + 1.4) * s,
      0.16 * s,
    );
    ctx.fillRect(
      this.toScreenX(-(FIELD_WIDTH + 1.4) * 0.5),
      this.toScreenY(-(FIELD_HEIGHT * 0.5) - 0.24 + 0.08),
      (FIELD_WIDTH + 1.4) * s,
      0.16 * s,
    );

    ctx.fillStyle = DASH_COLOR;
    for (let y = -(FIELD_HEIGHT * 0.5) + 0.7; y <= FIELD_HEIGHT * 0.5 - 0.7; y += 0.9) {
      ctx.fillRect(this.toScreenX(-0.04), this.toScreenY(y + 0.21), 0.08 * s, 0.42 * s);
    }

    ctx.fillStyle = PLAYER_COLOR;
    ctx.fillRect(
      this.toScreenX(PLAYER_X - PADDLE_WIDTH * 0.5),
      this.toScreenY(this.playerY + PADDLE_HEIGHT * 0.5),
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s,
    );

    ctx.fillStyle = AI_COLOR;
    ctx.fillRect(
      this.toScreenX(AI_X - PADDLE_WIDTH * 0.5),
      this.toScreenY(this.aiY + PADDLE_HEIGHT * 0.5),
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s,
    );

    ctx.fillStyle = BALL_COLOR;
    ctx.fillRect(
      this.toScreenX(this.ballX - BALL_SIZE * 0.5),
      this.toScreenY(this.ballY + BALL_SIZE * 0.5),
      BALL_SIZE * s,
      BALL_SIZE * s,
    );
  }

  private step(dt: number, input: InputState): void {
    if (this.mode === "serve") {
      this.startServe();
    } else if (this.mode === "game_over") {
      this.restartMatch();
    }

    this.updatePlayer(dt, input);
    this.updateAi(dt);
    this.updateBall(dt);
  }

  private restartMatch(): void {
    this.playerScore = 0;
    this.aiScore = 0;
    this.prepareServe(Math.random() < 0.5 ? -1 : 1);
  }

  private prepareServe(direction: number): void {
    this.mode = "serve";
    this.serveDirection = direction;
    this.aiRetargetIn = 0;
    this.aiTargetY = 0;
    this.playerY = 0;
    this.aiY = 0;
    this.resetBall();
  }

  private startServe(): void {
    this.mode = "play";
    this.ballX = 0;
    this.ballY = 0;
    this.ballVx = this.serveDirection * START_BALL_SPEED_X;
    this.ballVy = randomRange(-START_BALL_SPEED_Y, START_BALL_SPEED_Y);

    if (Math.abs(this.ballVy) < 1.2) {
      this.ballVy = this.ballVy < 0 ? -1.5 : 1.5;
    }
  }

  private awardPoint(playerScored: boolean): void {
    if (playerScored) {
      this.playerScore += 1;

      if (this.playerScore >= WIN_SCORE) {
        this.mode = "game_over";
        this.resetBall();
        return;
      }

      this.prepareServe(1);
      return;
    }

    this.aiScore += 1;

    if (this.aiScore >= WIN_SCORE) {
      this.mode = "game_over";
      this.resetBall();
      return;
    }

    this.prepareServe(-1);
  }

  private resetBall(): void {
    this.ballX = 0;
    this.ballY = 0;
    this.ballVx = 0;
    this.ballVy = 0;
  }

  private updatePlayer(dt: number, input: InputState): void {
    const minY = -(FIELD_HEIGHT * 0.5) + PADDLE_HEIGHT * 0.5;
    const maxY = FIELD_HEIGHT * 0.5 - PADDLE_HEIGHT * 0.5;
    const direction = (input.up ? 1 : 0) + (input.down ? -1 : 0);

    this.playerY = clamp(this.playerY + direction * PLAYER_SPEED * dt, minY, maxY);
  }

  private updateAi(dt: number): void {
    const minY = -(FIELD_HEIGHT * 0.5) + PADDLE_HEIGHT * 0.5;
    const maxY = FIELD_HEIGHT * 0.5 - PADDLE_HEIGHT * 0.5;

    if (this.mode === "play" && this.ballVx > 0) {
      this.aiRetargetIn -= dt;

      if (this.aiRetargetIn <= 0) {
        this.aiRetargetIn = randomRange(0.18, 0.35);

        const distanceToPaddle = AI_X - this.ballX;
        const leadTime = this.ballVx > 0 && distanceToPaddle > 0
          ? distanceToPaddle / this.ballVx
          : 0;
        const projectedY = reflectY(
          this.ballY + this.ballVy * leadTime,
          -(FIELD_HEIGHT * 0.5) + BALL_SIZE * 0.5,
          FIELD_HEIGHT * 0.5 - BALL_SIZE * 0.5,
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

  private updateBall(dt: number): void {
    if (this.mode !== "play") {
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

  private bounceFromPaddle(leftSide: boolean, paddleY: number): void {
    const impact = clamp((this.ballY - paddleY) / (PADDLE_HEIGHT * 0.5), -1, 1);
    const nextSpeedX = Math.min(Math.abs(this.ballVx) * 1.05 + 0.45, MAX_BALL_SPEED_X);
    let nextSpeedY = clamp(this.ballVy + impact * 3.6, -MAX_BALL_SPEED_Y, MAX_BALL_SPEED_Y);

    if (Math.abs(nextSpeedY) < 1.25) {
      nextSpeedY = impact < 0 ? -1.5 : 1.5;
    }

    nextSpeedY += randomRange(-0.25, 0.25);

    if (leftSide) {
      this.ballX = PLAYER_X + PADDLE_WIDTH * 0.5 + BALL_SIZE * 0.5;
      this.ballVx = nextSpeedX;
    } else {
      this.ballX = AI_X - PADDLE_WIDTH * 0.5 - BALL_SIZE * 0.5;
      this.ballVx = -nextSpeedX;
    }

    this.ballVy = nextSpeedY;
  }

  private syncHud(): void {
    this.playerScoreEl.textContent = String(this.playerScore);
    this.aiScoreEl.textContent = String(this.aiScore);
  }
}
