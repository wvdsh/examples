import * as pc from "playcanvas";

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

function createColorMaterial(app, r, g, b) {
  const material = new pc.StandardMaterial();
  material.diffuse = new pc.Color(r, g, b);
  material.emissive = new pc.Color(r * 0.3, g * 0.3, b * 0.3);
  material.useLighting = true;
  material.update();
  return material;
}

function createBox(app, name, w, h, d, material) {
  const entity = new pc.Entity(name);
  entity.addComponent("render", {
    type: "box",
    material: material,
  });
  entity.setLocalScale(w, h, d);
  app.root.addChild(entity);
  return entity;
}

export class PongGame {
  constructor({ canvas, playerScoreEl, aiScoreEl }) {
    this.canvas = canvas;
    this.playerScoreEl = playerScoreEl;
    this.aiScoreEl = aiScoreEl;

    this.app = null;
    this.isRunning = false;
    this.externalInput = null;

    this.playerEntity = null;
    this.aiEntity = null;
    this.ballEntity = null;

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

  create() {
    this.app = new pc.Application(this.canvas, {
      graphicsDeviceOptions: {
        alpha: false,
        preserveDrawingBuffer: false,
      },
    });

    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);

    window.addEventListener("resize", () => {
      this.app.resizeCanvas();
    });
  }

  buildScene() {
    if (!this.app) {
      throw new Error("create() must be called before buildScene().");
    }

    const app = this.app;

    // Camera — orthographic, looking down at the playing field
    const camera = new pc.Entity("camera");
    camera.addComponent("camera", {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: FIELD_HEIGHT * 0.5 + 0.7,
      clearColor: new pc.Color(0.05, 0.01, 0.13),
      nearClip: 0.1,
      farClip: 100,
    });
    camera.setPosition(0, 0, 15);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // Lights
    const light = new pc.Entity("light");
    light.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.9, 0.8, 1.0),
      intensity: 1.2,
    });
    light.setEulerAngles(35, -25, 0);
    app.root.addChild(light);

    const ambient = new pc.Entity("ambient");
    ambient.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.4, 0.2, 0.6),
      intensity: 0.4,
    });
    ambient.setEulerAngles(-45, 45, 0);
    app.root.addChild(ambient);

    // Materials — neon purple/cyan theme
    const boardMat = createColorMaterial(app, 0.08, 0.02, 0.18);
    const railMat = createColorMaterial(app, 0.15, 0.05, 0.3);
    const dashMat = createColorMaterial(app, 0.35, 0.2, 0.55);
    const playerMat = createColorMaterial(app, 0.66, 0.33, 0.97);
    const aiMat = createColorMaterial(app, 0.13, 0.83, 0.93);
    const ballMat = createColorMaterial(app, 1.0, 1.0, 1.0);

    // Board
    createBox(app, "board", FIELD_WIDTH + 1.2, FIELD_HEIGHT + 0.8, 0.1, boardMat)
      .setPosition(0, 0, -0.5);

    // Rails
    createBox(app, "topRail", FIELD_WIDTH + 1.4, 0.16, 0.2, railMat)
      .setPosition(0, (FIELD_HEIGHT * 0.5) + 0.24, 0);

    createBox(app, "bottomRail", FIELD_WIDTH + 1.4, 0.16, 0.2, railMat)
      .setPosition(0, -((FIELD_HEIGHT * 0.5) + 0.24), 0);

    // Center dashes
    for (let y = -(FIELD_HEIGHT * 0.5) + 0.7; y <= (FIELD_HEIGHT * 0.5) - 0.7; y += 0.9) {
      createBox(app, "dash", 0.08, 0.42, 0.12, dashMat)
        .setPosition(0, y, -0.2);
    }

    // Paddles and ball
    this.playerEntity = createBox(app, "player", PADDLE_WIDTH, PADDLE_HEIGHT, 0.34, playerMat);
    this.aiEntity = createBox(app, "ai", PADDLE_WIDTH, PADDLE_HEIGHT, 0.34, aiMat);
    this.ballEntity = createBox(app, "ball", BALL_SIZE, BALL_SIZE, BALL_SIZE, ballMat);

    this.restartMatch();
    this.syncScene();

    app.start();

    app.on("update", (dt) => {
      if (!this.isRunning || !this.externalInput) {
        return;
      }

      dt = Math.min(0.05, dt);

      this.step(dt, {
        up: this.externalInput.up,
        down: this.externalInput.down,
      });

      this.syncScene();
      this.syncHud();
    });
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
    const direction = (input.up ? 1 : 0) + (input.down ? -1 : 0);

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

  syncScene() {
    if (!this.playerEntity || !this.aiEntity || !this.ballEntity) {
      return;
    }

    this.playerEntity.setPosition(PLAYER_X, this.playerY, 0);
    this.aiEntity.setPosition(AI_X, this.aiY, 0);
    this.ballEntity.setPosition(this.ballX, this.ballY, 0);
  }

  syncHud() {
    this.playerScoreEl.textContent = String(this.playerScore);
    this.aiScoreEl.textContent = String(this.aiScore);
  }
}
