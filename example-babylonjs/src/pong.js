import { Camera } from "@babylonjs/core/Cameras/camera";
import { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder";
import { CreatePlane } from "@babylonjs/core/Meshes/Builders/planeBuilder";
import { Scene } from "@babylonjs/core/scene";

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
const AI_SPEED = 7.4;
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

export class PongGame {
  constructor({ canvas, playerScoreEl, aiScoreEl, bannerTitleEl, bannerDetailEl }) {
    this.canvas = canvas;
    this.playerScoreEl = playerScoreEl;
    this.aiScoreEl = aiScoreEl;
    this.bannerTitleEl = bannerTitleEl;
    this.bannerDetailEl = bannerDetailEl;

    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.light = null;
    this.playerMesh = null;
    this.aiMesh = null;
    this.ballMesh = null;
    this.isRunning = false;

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

  createEngine() {
    this.engine = new Engine(
      this.canvas,
      true,
      {
        preserveDrawingBuffer: false,
        stencil: true,
      },
      true
    );

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.015, 0.04, 0.11, 1);
    this.scene.ambientColor = new Color3(0.18, 0.2, 0.24);

    this.camera = new TargetCamera("camera", new Vector3(0, 0, -12), this.scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 50;
    this.camera.setTarget(Vector3.Zero());

    this.light = new HemisphericLight("light", new Vector3(-0.25, 1, -0.35), this.scene);
    this.light.intensity = 1.05;

    this.resize();
  }

  buildScene() {
    if (!this.scene) {
      throw new Error("createEngine() must run before buildScene().");
    }

    const boardMaterial = this.createMaterial("boardMaterial", "#07111f", "#08172b");
    const railMaterial = this.createMaterial("railMaterial", "#0f172a", "#172554");
    const dashMaterial = this.createMaterial("dashMaterial", "#64748b", "#94a3b8", 0.65);
    const playerMaterial = this.createMaterial("playerMaterial", "#5ce1ff", "#5ce1ff");
    const aiMaterial = this.createMaterial("aiMaterial", "#ffb347", "#ffb347");
    const ballMaterial = this.createMaterial("ballMaterial", "#f8fafc", "#f8fafc");

    const board = CreatePlane(
      "board",
      {
        width: FIELD_WIDTH + 1.2,
        height: FIELD_HEIGHT + 0.8,
      },
      this.scene
    );
    board.position.z = 1.2;
    board.material = boardMaterial;

    const topRail = CreateBox(
      "topRail",
      {
        width: FIELD_WIDTH + 1.4,
        height: 0.16,
        depth: 0.18,
      },
      this.scene
    );
    topRail.position.y = (FIELD_HEIGHT * 0.5) + 0.24;
    topRail.position.z = 0.7;
    topRail.material = railMaterial;

    const bottomRail = topRail.clone("bottomRail");
    bottomRail.position.y = -topRail.position.y;

    for (let y = -(FIELD_HEIGHT * 0.5) + 0.7; y <= (FIELD_HEIGHT * 0.5) - 0.7; y += 0.9) {
      const dash = CreateBox(
        `dash-${Math.round((y + FIELD_HEIGHT) * 10)}`,
        {
          width: 0.08,
          height: 0.42,
          depth: 0.1,
        },
        this.scene
      );
      dash.position.set(0, y, 0.45);
      dash.material = dashMaterial;
    }

    this.playerMesh = CreateBox(
      "playerPaddle",
      {
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        depth: 0.34,
      },
      this.scene
    );
    this.playerMesh.material = playerMaterial;

    this.aiMesh = CreateBox(
      "aiPaddle",
      {
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
        depth: 0.34,
      },
      this.scene
    );
    this.aiMesh.material = aiMaterial;

    this.ballMesh = CreateBox(
      "ball",
      {
        width: BALL_SIZE,
        height: BALL_SIZE,
        depth: BALL_SIZE,
      },
      this.scene
    );
    this.ballMesh.material = ballMaterial;

    this.restartMatch();
    this.syncScene();
    this.syncHud();
  }

  createMaterial(name, diffuseHex, emissiveHex, alpha = 1) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(diffuseHex);
    material.emissiveColor = Color3.FromHexString(emissiveHex).scale(0.22);
    material.specularColor = new Color3(0.02, 0.02, 0.02);
    material.alpha = alpha;
    return material;
  }

  resize() {
    if (!this.engine || !this.camera) {
      return;
    }

    this.engine.resize();

    const renderWidth = Math.max(this.engine.getRenderWidth(), 1);
    const renderHeight = Math.max(this.engine.getRenderHeight(), 1);
    const aspectRatio = renderWidth / renderHeight;
    const visibleHeight = FIELD_HEIGHT + 1.4;
    const visibleWidth = Math.max(FIELD_WIDTH + 1.4, visibleHeight * aspectRatio);

    this.camera.orthoLeft = -visibleWidth * 0.5;
    this.camera.orthoRight = visibleWidth * 0.5;
    this.camera.orthoTop = visibleHeight * 0.5;
    this.camera.orthoBottom = -visibleHeight * 0.5;

    if (this.scene && !this.isRunning) {
      this.scene.render();
    }
  }

  start(input) {
    if (this.isRunning || !this.engine || !this.scene) {
      return;
    }

    this.isRunning = true;
    let lastFrame = performance.now();

    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      const actionPressed = input.actionQueued;
      input.actionQueued = false;

      this.step(dt, {
        up: input.up,
        down: input.down,
        actionPressed,
      });

      this.scene.render();
    });
  }

  step(dt, input) {
    if (input.actionPressed) {
      if (this.mode === GAME_MODE.SERVE) {
        this.startServe();
      } else if (this.mode === GAME_MODE.GAME_OVER) {
        this.restartMatch();
      }
    }

    this.updatePlayer(dt, input);
    this.updateAi(dt);
    this.updateBall(dt);
    this.syncScene();
    this.syncHud();
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
        this.aiRetargetIn = randomRange(0.1, 0.22);

        const distanceToPaddle = AI_X - this.ballX;
        const leadTime = this.ballVx > 0 && distanceToPaddle > 0 ? distanceToPaddle / this.ballVx : 0;
        const projectedY = reflectY(
          this.ballY + this.ballVy * leadTime,
          -(FIELD_HEIGHT * 0.5) + (BALL_SIZE * 0.5),
          (FIELD_HEIGHT * 0.5) - (BALL_SIZE * 0.5)
        );
        const missWindow = PADDLE_HEIGHT * randomRange(0.18, 0.42);
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
    if (!this.playerMesh || !this.aiMesh || !this.ballMesh) {
      return;
    }

    this.playerMesh.position.set(PLAYER_X, this.playerY, 0.1);
    this.aiMesh.position.set(AI_X, this.aiY, 0.1);
    this.ballMesh.position.set(this.ballX, this.ballY, -0.05);
  }

  syncHud() {
    this.playerScoreEl.textContent = String(this.playerScore);
    this.aiScoreEl.textContent = String(this.aiScore);

    if (this.mode === GAME_MODE.SERVE) {
      this.bannerTitleEl.textContent = "Press Space or Enter to serve";
      this.bannerDetailEl.textContent = "Use W/S or the arrow keys to move. First to 7 wins.";
      return;
    }

    if (this.mode === GAME_MODE.PLAY) {
      this.bannerTitleEl.textContent = "Hard AI, but not perfect";
      this.bannerDetailEl.textContent = "The CPU predicts returns, but delayed retargeting creates openings.";
      return;
    }

    this.bannerTitleEl.textContent = this.winner === "Player" ? "You win" : "CPU wins";
    this.bannerDetailEl.textContent = "Press Space or Enter to restart the match.";
  }
}
