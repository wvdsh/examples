const FIELD_COLS = 37;
const FIELD_ROWS = 15;
const WIN_SCORE = 7;

const PLAYER_X = 1;
const CPU_X = FIELD_COLS - 2;
const PADDLE_SIZE = 4;

const PLAYER_SPEED = 18;
const CPU_SPEED = 13;
const START_BALL_SPEED_X = 20;
const START_BALL_SPEED_Y = 7;
const MAX_BALL_SPEED_X = 30;
const MAX_BALL_SPEED_Y = 16;

// Render the whole game inside Construct Text objects so the folder project stays easy to
// inspect and diff in git without introducing binary art assets.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function buildCenteredLine(text, width) {
  const value = String(text).slice(0, width);
  const left = Math.floor((width - value.length) * 0.5);
  const right = width - value.length - left;
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}

function buildPairedLine(leftText, rightText, width) {
  const left = String(leftText);
  const right = String(rightText);
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`.slice(0, width).padEnd(width, " ");
}

function createGrid() {
  return Array.from({ length: FIELD_ROWS }, () => Array(FIELD_COLS).fill(" "));
}

function setCell(grid, x, y, value) {
  if (x < 0 || x >= FIELD_COLS || y < 0 || y >= FIELD_ROWS) {
    return;
  }

  grid[y][x] = value;
}

function fillPaddle(grid, x, centerY) {
  const startY = Math.round(centerY - (PADDLE_SIZE - 1) * 0.5);

  for (let i = 0; i < PADDLE_SIZE; i += 1) {
    setCell(grid, x, startY + i, "|");
  }
}

export function createInput() {
  return {
    up: false,
    down: false,
    actionQueued: false,
  };
}

export function attachInput(input) {
  const upCodes = new Set(["KeyW", "ArrowUp"]);
  const downCodes = new Set(["KeyS", "ArrowDown"]);
  const actionCodes = new Set(["Space", "Enter"]);

  const onKeyDown = (event) => {
    if (upCodes.has(event.code)) {
      input.up = true;
      event.preventDefault();
    }

    if (downCodes.has(event.code)) {
      input.down = true;
      event.preventDefault();
    }

    if (actionCodes.has(event.code)) {
      if (!event.repeat) {
        input.actionQueued = true;
      }
      event.preventDefault();
    }
  };

  const onKeyUp = (event) => {
    if (upCodes.has(event.code)) {
      input.up = false;
      event.preventDefault();
    }

    if (downCodes.has(event.code)) {
      input.down = false;
      event.preventDefault();
    }
  };

  const onBlur = () => {
    input.up = false;
    input.down = false;
    input.actionQueued = false;
  };

  globalThis.addEventListener("keydown", onKeyDown);
  globalThis.addEventListener("keyup", onKeyUp);
  globalThis.addEventListener("blur", onBlur);

  return () => {
    globalThis.removeEventListener("keydown", onKeyDown);
    globalThis.removeEventListener("keyup", onKeyUp);
    globalThis.removeEventListener("blur", onBlur);
  };
}

export class AsciiPongGame {
  constructor({ fieldText, footerText }) {
    this.fieldText = fieldText;
    this.footerText = footerText;

    this.mode = "boot";
    this.isRunning = false;
    this.input = null;

    this.bootTitle = "Booting Construct";
    this.bootDetail = "";
    this.bootProgress = 0;
    this.footerMessage = "";

    this.playerScore = 0;
    this.cpuScore = 0;
    this.playerY = FIELD_ROWS * 0.5;
    this.cpuY = FIELD_ROWS * 0.5;
    this.cpuTargetY = FIELD_ROWS * 0.5;
    this.cpuRetargetIn = 0;
    this.ballX = FIELD_COLS * 0.5;
    this.ballY = FIELD_ROWS * 0.5;
    this.ballVx = 0;
    this.ballVy = 0;
    this.serveDirection = 1;
    this.winner = "";
  }

  showBoot(title, detail, progress) {
    this.mode = "boot";
    this.bootTitle = title;
    this.bootDetail = detail;
    this.bootProgress = clamp(progress, 0, 1);
    this.footerMessage = "Waiting until the first playable Construct frame is ready.";
    this.render();
  }

  showFatal(message, error) {
    this.mode = "fatal";
    this.bootTitle = message;
    this.bootDetail = (error && error.message) || String(error);
    this.bootProgress = 1;
    this.footerMessage = "Startup failed. Check the browser console for details.";
    this.render();
  }

  prepare() {
    this.isRunning = false;
    this.playerScore = 0;
    this.cpuScore = 0;
    this.winner = "";
    this.prepareServe(Math.random() < 0.5 ? -1 : 1);
    this.footerMessage =
      "Controls: W/S or ArrowUp/ArrowDown move | Space or Enter serves and restarts";
    this.render();
  }

  start(input) {
    this.input = input;
    this.input.actionQueued = false;
    this.isRunning = true;
    this.render();
  }

  tick(dt) {
    if (!this.isRunning || !this.input) {
      return;
    }

    this.updatePlayer(dt);
    this.updateCpu(dt);

    if (this.mode === "serve") {
      if (this.consumeAction()) {
        this.startServe();
      }
      this.render();
      return;
    }

    if (this.mode === "game_over") {
      if (this.consumeAction()) {
        this.restartMatch();
      }
      this.render();
      return;
    }

    this.updateBall(dt);
    this.render();
  }

  consumeAction() {
    if (!this.input.actionQueued) {
      return false;
    }

    this.input.actionQueued = false;
    return true;
  }

  restartMatch() {
    this.playerScore = 0;
    this.cpuScore = 0;
    this.winner = "";
    this.prepareServe(Math.random() < 0.5 ? -1 : 1);
  }

  prepareServe(direction) {
    this.mode = "serve";
    this.serveDirection = direction;
    this.playerY = FIELD_ROWS * 0.5;
    this.cpuY = FIELD_ROWS * 0.5;
    this.cpuTargetY = FIELD_ROWS * 0.5;
    this.cpuRetargetIn = 0;
    this.ballX = FIELD_COLS * 0.5;
    this.ballY = FIELD_ROWS * 0.5;
    this.ballVx = 0;
    this.ballVy = 0;
  }

  startServe() {
    this.mode = "play";
    this.ballVx = this.serveDirection * START_BALL_SPEED_X;
    this.ballVy = randomRange(-START_BALL_SPEED_Y, START_BALL_SPEED_Y);

    if (Math.abs(this.ballVy) < 2) {
      this.ballVy = this.ballVy < 0 ? -2.5 : 2.5;
    }
  }

  updatePlayer(dt) {
    const halfSize = (PADDLE_SIZE - 1) * 0.5;
    const minY = halfSize;
    const maxY = (FIELD_ROWS - 1) - halfSize;
    const direction = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);

    this.playerY = clamp(this.playerY + direction * PLAYER_SPEED * dt, minY, maxY);
  }

  updateCpu(dt) {
    const halfSize = (PADDLE_SIZE - 1) * 0.5;
    const minY = halfSize;
    const maxY = (FIELD_ROWS - 1) - halfSize;

    if (this.mode === "play" && this.ballVx > 0) {
      this.cpuRetargetIn -= dt;

      if (this.cpuRetargetIn <= 0) {
        this.cpuRetargetIn = randomRange(0.16, 0.34);
        this.cpuTargetY = this.ballY + randomRange(-1.5, 1.5);
      }
    } else {
      this.cpuRetargetIn = 0;
      this.cpuTargetY = FIELD_ROWS * 0.5;
    }

    const maxMove = CPU_SPEED * dt;
    const move = clamp(this.cpuTargetY - this.cpuY, -maxMove, maxMove);
    this.cpuY = clamp(this.cpuY + move, minY, maxY);
  }

  updateBall(dt) {
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    if (this.ballY <= 0) {
      this.ballY = 0;
      this.ballVy = Math.abs(this.ballVy);
    } else if (this.ballY >= FIELD_ROWS - 1) {
      this.ballY = FIELD_ROWS - 1;
      this.ballVy = -Math.abs(this.ballVy);
    }

    const paddleHalf = PADDLE_SIZE * 0.5;

    if (
      this.ballVx < 0 &&
      this.ballX <= PLAYER_X + 0.8 &&
      this.ballX >= PLAYER_X - 0.5 &&
      Math.abs(this.ballY - this.playerY) <= paddleHalf
    ) {
      this.bounceFromPaddle(true);
    }

    if (
      this.ballVx > 0 &&
      this.ballX >= CPU_X - 0.8 &&
      this.ballX <= CPU_X + 0.5 &&
      Math.abs(this.ballY - this.cpuY) <= paddleHalf
    ) {
      this.bounceFromPaddle(false);
    }

    if (this.ballX < -1) {
      this.awardPoint(false);
    } else if (this.ballX > FIELD_COLS) {
      this.awardPoint(true);
    }
  }

  bounceFromPaddle(isPlayer) {
    const paddleY = isPlayer ? this.playerY : this.cpuY;
    const impact = clamp(
      (this.ballY - paddleY) / ((PADDLE_SIZE - 1) * 0.5 || 1),
      -1,
      1
    );
    const nextSpeedX = Math.min(Math.abs(this.ballVx) * 1.08 + 1.1, MAX_BALL_SPEED_X);
    let nextSpeedY = clamp(this.ballVy + impact * 6, -MAX_BALL_SPEED_Y, MAX_BALL_SPEED_Y);

    if (Math.abs(nextSpeedY) < 1.5) {
      nextSpeedY = impact < 0 ? -2 : 2;
    }

    nextSpeedY += randomRange(-0.35, 0.35);

    if (isPlayer) {
      this.ballX = PLAYER_X + 1;
      this.ballVx = nextSpeedX;
    } else {
      this.ballX = CPU_X - 1;
      this.ballVx = -nextSpeedX;
    }

    this.ballVy = nextSpeedY;
  }

  awardPoint(playerScored) {
    if (playerScored) {
      this.playerScore += 1;

      if (this.playerScore >= WIN_SCORE) {
        this.mode = "game_over";
        this.winner = "Player";
        this.ballVx = 0;
        this.ballVy = 0;
        return;
      }

      this.prepareServe(1);
      return;
    }

    this.cpuScore += 1;

    if (this.cpuScore >= WIN_SCORE) {
      this.mode = "game_over";
      this.winner = "CPU";
      this.ballVx = 0;
      this.ballVy = 0;
      return;
    }

    this.prepareServe(-1);
  }

  render() {
    if (this.mode === "boot") {
      this.fieldText.text = this.buildBootScreen();
      this.footerText.text = this.footerMessage;
      return;
    }

    if (this.mode === "fatal") {
      this.fieldText.text = this.buildFatalScreen();
      this.footerText.text = this.footerMessage;
      return;
    }

    this.fieldText.text = this.buildGameScreen();
    this.footerText.text = this.footerMessage;
  }

  buildBootScreen() {
    const innerWidth = FIELD_COLS;
    const filled = Math.round(this.bootProgress * 20);
    const bar = `[${"#".repeat(filled)}${"-".repeat(20 - filled)}] ${Math.round(
      this.bootProgress * 100
    )}%`;

    return [
      `+${"-".repeat(innerWidth)}+`,
      `|${buildCenteredLine(this.bootTitle, innerWidth)}|`,
      `|${buildCenteredLine(bar, innerWidth)}|`,
      `|${buildCenteredLine(this.bootDetail, innerWidth)}|`,
      `|${" ".repeat(innerWidth)}|`,
      `|${buildCenteredLine("Construct is preparing the first layout.", innerWidth)}|`,
      `|${buildCenteredLine("Wavedash events stay deferred until ready.", innerWidth)}|`,
      `+${"-".repeat(innerWidth)}+`,
    ].join("\n");
  }

  buildFatalScreen() {
    const innerWidth = FIELD_COLS;

    return [
      `+${"-".repeat(innerWidth)}+`,
      `|${buildCenteredLine("BOOT ERROR", innerWidth)}|`,
      `|${" ".repeat(innerWidth)}|`,
      `|${buildCenteredLine(this.bootTitle, innerWidth)}|`,
      `|${buildCenteredLine(this.bootDetail, innerWidth)}|`,
      `|${" ".repeat(innerWidth)}|`,
      `|${buildCenteredLine("Open the browser console for details.", innerWidth)}|`,
      `+${"-".repeat(innerWidth)}+`,
    ].join("\n");
  }

  buildGameScreen() {
    const innerWidth = FIELD_COLS;
    const grid = createGrid();
    const ballX = Math.round(this.ballX);
    const ballY = Math.round(this.ballY);

    for (let y = 0; y < FIELD_ROWS; y += 2) {
      setCell(grid, Math.floor(FIELD_COLS * 0.5), y, ":");
    }

    fillPaddle(grid, PLAYER_X, this.playerY);
    fillPaddle(grid, CPU_X, this.cpuY);
    setCell(grid, ballX, ballY, "O");

    const rows = grid.map((row) => `|${row.join("")}|`);
    let prompt = "";
    let detail = "";

    if (this.mode === "serve") {
      prompt = "Press Space or Enter to serve";
      detail =
        this.serveDirection > 0 ? "Player serves to the right." : "CPU serves to the left.";
    } else if (this.mode === "game_over") {
      prompt = `${this.winner} wins. Press Space or Enter to restart.`;
      detail = "First to seven points wins the match.";
    } else {
      prompt = "Keep the ball in play and outscore the CPU.";
      detail = "Paddle rebounds get faster over time.";
    }

    return [
      buildPairedLine(`PLAYER ${this.playerScore}`, `CPU ${this.cpuScore}`, innerWidth + 2),
      `+${"-".repeat(innerWidth)}+`,
      ...rows,
      `+${"-".repeat(innerWidth)}+`,
      buildCenteredLine(prompt, innerWidth + 2),
      buildCenteredLine(detail, innerWidth + 2),
    ].join("\n");
  }
}
