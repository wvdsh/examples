import { PongGame } from "./pong.js";

function style(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function log(message) {
  console.info(`[example-playcanvas] ${message}`);
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
    background: "#0d0221",
  });

  style(document.body, {
    width: "100%",
    height: "100%",
    margin: "0",
    overflow: "hidden",
    background: "#0d0221",
    color: "#e2e8f0",
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

  const canvas = document.createElement("canvas");
  canvas.id = "playcanvas-canvas";
  style(canvas, {
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
    border: "1px solid rgba(168, 85, 247, 0.3)",
    background: "rgba(13, 2, 33, 0.7)",
    backdropFilter: "blur(14px)",
  });

  const playerScore = document.createElement("div");
  style(playerScore, {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#a855f7",
    minWidth: "28px",
    textAlign: "center",
  });
  playerScore.textContent = "0";

  const divider = document.createElement("div");
  style(divider, {
    fontSize: "18px",
    fontWeight: "700",
    color: "#4a2080",
  });
  divider.textContent = ":";

  const aiScore = document.createElement("div");
  style(aiScore, {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#22d3ee",
    minWidth: "28px",
    textAlign: "center",
  });
  aiScore.textContent = "0";

  scoreBoard.append(playerScore, divider, aiScore);
  hud.append(scoreBoard);
  target.append(canvas, hud);

  return { canvas, playerScore, aiScore };
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

  log("Creating PlayCanvas app");
  const game = new PongGame({
    canvas: shell.canvas,
    playerScoreEl: shell.playerScore,
    aiScoreEl: shell.aiScore,
  });
  game.create();
  sdk.updateLoadProgressZeroToOne(0.66);

  log("Building Pong scene");
  game.buildScene();
  sdk.updateLoadProgressZeroToOne(1);
  sdk.loadComplete();

  log("Starting game");
  game.start(input);
}

main().catch((error) => {
  console.error("[example-playcanvas]", error);
});
