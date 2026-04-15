import { PongGame } from "./pong.js";

function style(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function log(message) {
  console.info(`[example-pixi] ${message}`);
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
    background: "#f5f1ec",
  });

  style(document.body, {
    width: "100%",
    height: "100%",
    margin: "0",
    overflow: "hidden",
    background: "#f5f1ec",
    color: "#1e293b",
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  style(target, {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  });

  return target;
}

function createShell(target) {
  target.replaceChildren();

  const gameContainer = document.createElement("div");
  gameContainer.id = "pixi-container";
  style(gameContainer, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
  });

  const hud = document.createElement("div");
  style(hud, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
  });

  const scoreBoard = document.createElement("div");
  style(scoreBoard, {
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
    backdropFilter: "blur(14px)",
  });

  const playerScore = document.createElement("div");
  style(playerScore, {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#3b82f6",
    minWidth: "28px",
    textAlign: "center",
  });
  playerScore.textContent = "0";

  const divider = document.createElement("div");
  style(divider, {
    fontSize: "18px",
    fontWeight: "700",
    color: "#94a3b8",
  });
  divider.textContent = ":";

  const aiScore = document.createElement("div");
  style(aiScore, {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#ef4444",
    minWidth: "28px",
    textAlign: "center",
  });
  aiScore.textContent = "0";

  scoreBoard.append(playerScore, divider, aiScore);
  hud.append(scoreBoard);
  target.append(gameContainer, hud);

  return { gameContainer, playerScore, aiScore };
}

function createInput() {
  return {
    up: false,
    down: false,
  };
}

function wireInput(input) {
  const upCodes = new Set(["KeyW", "ArrowUp"]);
  const downCodes = new Set(["KeyS", "ArrowDown"]);

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
    throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
  }

  const target = ensureTarget();
  const shell = createShell(target);
  const input = createInput();
  wireInput(input);

  log("Initializing Wavedash SDK");
  await Promise.resolve(sdk.init());
  sdk.updateLoadProgressZeroToOne(0.33);

  log("Creating PixiJS app");
  const game = new PongGame({
    container: shell.gameContainer,
    playerScoreEl: shell.playerScore,
    aiScoreEl: shell.aiScore,
  });
  await game.create();
  sdk.updateLoadProgressZeroToOne(0.66);

  log("Building Pong scene");
  game.buildScene();
  sdk.updateLoadProgressZeroToOne(1);
  sdk.loadComplete();

  log("Starting game");
  game.start(input);
}

main().catch((error) => {
  console.error("[example-pixi]", error);
});
