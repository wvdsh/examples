(function() {
  "use strict";
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
  const PLAYER_X = -8 + 0.9;
  const AI_X = FIELD_WIDTH * 0.5 - 0.9;
  const BOARD_COLOR = "#e8e4df";
  const RAIL_COLOR = "#c8c3bc";
  const DASH_COLOR = "rgba(176, 170, 162, 0.65)";
  const PLAYER_COLOR = "#3b82f6";
  const AI_COLOR = "#ef4444";
  const BALL_COLOR = "#1e293b";
  const BG_COLOR = "#f5f1ec";
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
  class PongGame {
    constructor({ canvas, playerScoreEl, aiScoreEl }) {
      this.canvas = canvas;
      this.playerScoreEl = playerScoreEl;
      this.aiScoreEl = aiScoreEl;
      this.ctx = this.canvas.getContext("2d");
      if (!this.ctx) {
        throw new Error("Canvas 2D context not available.");
      }
      this.running = false;
      this.input = null;
      this.pixelsPerUnit = 50;
      this.centerX = 0;
      this.centerY = 0;
      this.lastTime = 0;
      this.mode = "serve";
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
    setup() {
      this.recalcScale();
      this.restartMatch();
      this.draw();
      window.addEventListener("resize", () => {
        this.recalcScale();
        this.draw();
      });
    }
    start(input) {
      this.input = input;
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
    loop(now) {
      if (!this.running || !this.input) {
        return;
      }
      const dt = Math.min(0.05, (now - this.lastTime) / 1e3);
      this.lastTime = now;
      this.step(dt, this.input);
      this.draw();
      this.syncHud();
      requestAnimationFrame((t) => this.loop(t));
    }
    recalcScale() {
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
      const ctx = this.ctx;
      const w = this.canvas.width / (window.devicePixelRatio || 1);
      const h = this.canvas.height / (window.devicePixelRatio || 1);
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = BOARD_COLOR;
      ctx.fillRect(
        this.toScreenX(-17.2 * 0.5),
        this.toScreenY((FIELD_HEIGHT + 0.8) * 0.5),
        (FIELD_WIDTH + 1.2) * s,
        (FIELD_HEIGHT + 0.8) * s
      );
      ctx.fillStyle = RAIL_COLOR;
      ctx.fillRect(
        this.toScreenX(-17.4 * 0.5),
        this.toScreenY(FIELD_HEIGHT * 0.5 + 0.24 + 0.08),
        (FIELD_WIDTH + 1.4) * s,
        0.16 * s
      );
      ctx.fillRect(
        this.toScreenX(-17.4 * 0.5),
        this.toScreenY(-4.5 - 0.24 + 0.08),
        (FIELD_WIDTH + 1.4) * s,
        0.16 * s
      );
      ctx.fillStyle = DASH_COLOR;
      for (let y = -4.5 + 0.7; y <= FIELD_HEIGHT * 0.5 - 0.7; y += 0.9) {
        ctx.fillRect(this.toScreenX(-0.04), this.toScreenY(y + 0.21), 0.08 * s, 0.42 * s);
      }
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fillRect(
        this.toScreenX(PLAYER_X - PADDLE_WIDTH * 0.5),
        this.toScreenY(this.playerY + PADDLE_HEIGHT * 0.5),
        PADDLE_WIDTH * s,
        PADDLE_HEIGHT * s
      );
      ctx.fillStyle = AI_COLOR;
      ctx.fillRect(
        this.toScreenX(AI_X - PADDLE_WIDTH * 0.5),
        this.toScreenY(this.aiY + PADDLE_HEIGHT * 0.5),
        PADDLE_WIDTH * s,
        PADDLE_HEIGHT * s
      );
      ctx.fillStyle = BALL_COLOR;
      ctx.fillRect(
        this.toScreenX(this.ballX - BALL_SIZE * 0.5),
        this.toScreenY(this.ballY + BALL_SIZE * 0.5),
        BALL_SIZE * s,
        BALL_SIZE * s
      );
    }
    step(dt, input) {
      if (this.mode === "serve") {
        this.startServe();
      } else if (this.mode === "game_over") {
        this.restartMatch();
      }
      this.updatePlayer(dt, input);
      this.updateAi(dt);
      this.updateBall(dt);
    }
    restartMatch() {
      this.playerScore = 0;
      this.aiScore = 0;
      this.prepareServe(Math.random() < 0.5 ? -1 : 1);
    }
    prepareServe(direction) {
      this.mode = "serve";
      this.serveDirection = direction;
      this.aiRetargetIn = 0;
      this.aiTargetY = 0;
      this.playerY = 0;
      this.aiY = 0;
      this.resetBall();
    }
    startServe() {
      this.mode = "play";
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
    resetBall() {
      this.ballX = 0;
      this.ballY = 0;
      this.ballVx = 0;
      this.ballVy = 0;
    }
    updatePlayer(dt, input) {
      const minY = -4.5 + PADDLE_HEIGHT * 0.5;
      const maxY = FIELD_HEIGHT * 0.5 - PADDLE_HEIGHT * 0.5;
      const direction = (input.up ? 1 : 0) + (input.down ? -1 : 0);
      this.playerY = clamp(this.playerY + direction * PLAYER_SPEED * dt, minY, maxY);
    }
    updateAi(dt) {
      const minY = -4.5 + PADDLE_HEIGHT * 0.5;
      const maxY = FIELD_HEIGHT * 0.5 - PADDLE_HEIGHT * 0.5;
      if (this.mode === "play" && this.ballVx > 0) {
        this.aiRetargetIn -= dt;
        if (this.aiRetargetIn <= 0) {
          this.aiRetargetIn = randomRange(0.18, 0.35);
          const distanceToPaddle = AI_X - this.ballX;
          const leadTime = this.ballVx > 0 && distanceToPaddle > 0 ? distanceToPaddle / this.ballVx : 0;
          const projectedY = reflectY(
            this.ballY + this.ballVy * leadTime,
            -4.5 + BALL_SIZE * 0.5,
            FIELD_HEIGHT * 0.5 - BALL_SIZE * 0.5
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
      if (this.ballVx < 0 && ballMinX <= playerMaxX && ballMaxX >= playerMinX && ballMinY <= playerMaxY && ballMaxY >= playerMinY) {
        this.bounceFromPaddle(true, this.playerY);
      }
      const aiMinX = AI_X - halfPaddleWidth;
      const aiMaxX = AI_X + halfPaddleWidth;
      const aiMinY = this.aiY - halfPaddleHeight;
      const aiMaxY = this.aiY + halfPaddleHeight;
      if (this.ballVx > 0 && ballMaxX >= aiMinX && ballMinX <= aiMaxX && ballMinY <= aiMaxY && ballMaxY >= aiMinY) {
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
        this.ballX = PLAYER_X + PADDLE_WIDTH * 0.5 + BALL_SIZE * 0.5;
        this.ballVx = nextSpeedX;
      } else {
        this.ballX = AI_X - PADDLE_WIDTH * 0.5 - BALL_SIZE * 0.5;
        this.ballVx = -nextSpeedX;
      }
      this.ballVy = nextSpeedY;
    }
    syncHud() {
      this.playerScoreEl.textContent = String(this.playerScore);
      this.aiScoreEl.textContent = String(this.aiScore);
    }
  }
  function log(message) {
    console.info(`[example-js] ${message}`);
  }
  function style(element, styles) {
    Object.assign(element.style, styles);
    return element;
  }
  function ensureTarget() {
    let target = document.getElementById("wavedash-target");
    if (!target) {
      target = document.createElement("div");
      target.id = "wavedash-target";
      document.body.appendChild(target);
    }
    style(document.documentElement, {
      width: "100%",
      height: "100%",
      margin: "0",
      background: "#f5f1ec"
    });
    style(document.body, {
      width: "100%",
      height: "100%",
      margin: "0",
      overflow: "hidden",
      background: "#f5f1ec",
      color: "#1e293b",
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    });
    style(target, {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden"
    });
    return target;
  }
  function createShell(target) {
    target.replaceChildren();
    const canvasWrap = style(document.createElement("div"), {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%"
    });
    const canvas = style(document.createElement("canvas"), {
      display: "block",
      width: "100%",
      height: "100%"
    });
    canvasWrap.appendChild(canvas);
    const hud = style(document.createElement("div"), {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2"
    });
    const scoreBoard = style(document.createElement("div"), {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "6px 14px",
      borderRadius: "14px",
      border: "1px solid rgba(30, 41, 59, 0.15)",
      background: "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(14px)"
    });
    const playerScore = style(document.createElement("div"), {
      fontSize: "24px",
      fontWeight: "800",
      lineHeight: "1",
      color: "#3b82f6",
      minWidth: "28px",
      textAlign: "center"
    });
    playerScore.textContent = "0";
    const divider = style(document.createElement("div"), {
      fontSize: "18px",
      fontWeight: "700",
      color: "#94a3b8"
    });
    divider.textContent = ":";
    const aiScore = style(document.createElement("div"), {
      fontSize: "24px",
      fontWeight: "800",
      lineHeight: "1",
      color: "#ef4444",
      minWidth: "28px",
      textAlign: "center"
    });
    aiScore.textContent = "0";
    scoreBoard.append(playerScore, divider, aiScore);
    hud.append(scoreBoard);
    target.append(canvasWrap, hud);
    return { canvas, playerScore, aiScore };
  }
  function createInput() {
    return { up: false, down: false };
  }
  function wireInput(input) {
    const upCodes = /* @__PURE__ */ new Set(["KeyW", "ArrowUp"]);
    const downCodes = /* @__PURE__ */ new Set(["KeyS", "ArrowDown"]);
    const onKeyDown = (event) => {
      if (upCodes.has(event.code)) {
        input.up = true;
        event.preventDefault();
      }
      if (downCodes.has(event.code)) {
        input.down = true;
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
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }
  async function main() {
    const sdk = window.WavedashJS;
    if (!sdk) {
      throw new Error(
        "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected."
      );
    }
    const target = ensureTarget();
    const shell = createShell(target);
    const input = createInput();
    wireInput(input);
    log("Initializing Wavedash SDK");
    await Promise.resolve(sdk.init());
    sdk.updateLoadProgressZeroToOne(0.5);
    log("Creating Canvas 2D pong game");
    const game = new PongGame({
      canvas: shell.canvas,
      playerScoreEl: shell.playerScore,
      aiScoreEl: shell.aiScore
    });
    game.setup();
    sdk.updateLoadProgressZeroToOne(1);
    sdk.loadComplete();
    log("Starting game");
    game.start(input);
  }
  main().catch((error) => {
    console.error("[example-js]", error);
  });
})();
