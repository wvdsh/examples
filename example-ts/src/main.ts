import { PongGame, type InputState } from "./pong";

interface WavedashSDK {
  init(): void | Promise<void>;
  updateLoadProgressZeroToOne(progress: number): void;
  loadComplete(): void;
}

declare global {
  interface Window {
    WavedashJS?: WavedashSDK;
  }
}

function log(message: string): void {
  console.info(`[example-ts] ${message}`);
}

function style<T extends HTMLElement>(el: T, styles: Partial<CSSStyleDeclaration>): T {
  Object.assign(el.style, styles);
  return el;
}

function ensureTarget(): HTMLElement {
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

interface Shell {
  readonly canvas: HTMLCanvasElement;
  readonly playerScore: HTMLElement;
  readonly aiScore: HTMLElement;
}

function createShell(target: HTMLElement): Shell {
  target.replaceChildren();

  const canvasWrap = style(document.createElement("div"), {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
  });

  const canvas = style(document.createElement("canvas"), {
    display: "block",
    width: "100%",
    height: "100%",
  });
  canvasWrap.appendChild(canvas);

  const hud = style(document.createElement("div"), {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2",
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
    backdropFilter: "blur(14px)",
  });

  const playerScore = style(document.createElement("div"), {
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#3b82f6",
    minWidth: "28px",
    textAlign: "center",
  });
  playerScore.textContent = "0";

  const divider = style(document.createElement("div"), {
    fontSize: "18px",
    fontWeight: "700",
    color: "#94a3b8",
  });
  divider.textContent = ":";

  const aiScore = style(document.createElement("div"), {
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
  target.append(canvasWrap, hud);

  return { canvas, playerScore, aiScore };
}

function createInput(): InputState {
  return { up: false, down: false };
}

function wireInput(input: InputState): () => void {
  const upCodes = new Set(["KeyW", "ArrowUp"]);
  const downCodes = new Set(["KeyS", "ArrowDown"]);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (upCodes.has(event.code)) {
      input.up = true;
      event.preventDefault();
    }

    if (downCodes.has(event.code)) {
      input.down = true;
      event.preventDefault();
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    if (upCodes.has(event.code)) {
      input.up = false;
      event.preventDefault();
    }

    if (downCodes.has(event.code)) {
      input.down = false;
      event.preventDefault();
    }
  };

  const onBlur = (): void => {
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

async function main(): Promise<void> {
  const sdk = window.WavedashJS;
  if (!sdk) {
    throw new Error(
      "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.",
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
    aiScoreEl: shell.aiScore,
  });
  game.setup();
  sdk.updateLoadProgressZeroToOne(1);
  sdk.loadComplete();

  log("Starting game");
  game.start(input);
}

main().catch((err: unknown) => {
  console.error("[example-ts]", err);
});
