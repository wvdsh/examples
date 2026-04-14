import { PongGame } from "./pong.js";
import { attachSdkListeners, ensureWavedash, waitForSdkReady } from "./wavedash.js";

function style(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function log(message, detail) {
  if (detail === undefined) {
    console.info(`[example-babylonjs] ${message}`);
    return;
  }

  console.info(`[example-babylonjs] ${message}`, detail);
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
    background: "#030712",
  });

  style(document.body, {
    width: "100%",
    height: "100%",
    margin: "0",
    overflow: "hidden",
    background: "#030712",
    color: "#e2e8f0",
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  style(target, {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "radial-gradient(circle at top, #0f172a 0%, #030712 72%)",
  });

  return target;
}

function createPill(text) {
  const pill = document.createElement("div");
  style(pill, {
    padding: "9px 13px",
    borderRadius: "999px",
    border: "1px solid rgba(148, 163, 184, 0.42)",
    background: "rgba(2, 6, 23, 0.88)",
    color: "#e2e8f0",
    fontSize: "13px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    backdropFilter: "blur(10px)",
    whiteSpace: "nowrap",
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
  });
  pill.textContent = text;
  return pill;
}

function createShell(target) {
  target.replaceChildren();

  const canvas = document.createElement("canvas");
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

  const topRow = document.createElement("div");
  style(topRow, {
    position: "absolute",
    top: "14px",
    left: "14px",
    right: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    flexWrap: "wrap",
    zIndex: "1",
  });

  const leftCluster = document.createElement("div");
  style(leftCluster, {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  });

  const rightCluster = document.createElement("div");
  style(rightCluster, {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  });

  const statusPill = createPill("SDK pending");
  const runtimePill = createPill("Runtime pending");
  const userPill = createPill("User pending");
  const controlPill = createPill("W/S or arrows move, space serves");

  leftCluster.append(statusPill, runtimePill, userPill);
  rightCluster.append(controlPill);
  topRow.append(leftCluster, rightCluster);

  const scoreBoard = document.createElement("div");
  style(scoreBoard, {
    position: "absolute",
    top: "74px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "26px",
    padding: "14px 24px",
    borderRadius: "24px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(2, 6, 23, 0.55)",
    backdropFilter: "blur(14px)",
  });

  const playerColumn = document.createElement("div");
  style(playerColumn, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    minWidth: "88px",
  });

  const aiColumn = document.createElement("div");
  style(aiColumn, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    minWidth: "88px",
  });

  const divider = document.createElement("div");
  style(divider, {
    fontSize: "34px",
    fontWeight: "700",
    color: "#64748b",
  });
  divider.textContent = ":";

  const playerLabel = document.createElement("div");
  style(playerLabel, {
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#67e8f9",
  });
  playerLabel.textContent = "Player";

  const aiLabel = document.createElement("div");
  style(aiLabel, {
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#fdba74",
  });
  aiLabel.textContent = "CPU";

  const playerScore = document.createElement("div");
  style(playerScore, {
    fontSize: "54px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#f8fafc",
  });
  playerScore.textContent = "0";

  const aiScore = document.createElement("div");
  style(aiScore, {
    fontSize: "54px",
    fontWeight: "800",
    lineHeight: "1",
    color: "#f8fafc",
  });
  aiScore.textContent = "0";

  playerColumn.append(playerLabel, playerScore);
  aiColumn.append(aiLabel, aiScore);
  scoreBoard.append(playerColumn, divider, aiColumn);

  const banner = document.createElement("div");
  style(banner, {
    position: "absolute",
    left: "50%",
    bottom: "24px",
    transform: "translateX(-50%)",
    width: "min(92vw, 720px)",
    padding: "16px 18px",
    borderRadius: "18px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(2, 6, 23, 0.55)",
    boxShadow: "0 12px 44px rgba(0, 0, 0, 0.24)",
    backdropFilter: "blur(14px)",
  });

  const bannerTitle = document.createElement("div");
  style(bannerTitle, {
    fontSize: "22px",
    fontWeight: "700",
    color: "#f8fafc",
    marginBottom: "6px",
  });
  bannerTitle.textContent = "Preparing Babylon.js scene";

  const bannerDetail = document.createElement("div");
  style(bannerDetail, {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.45",
  });
  bannerDetail.textContent = "Staged Wavedash loading will complete before gameplay begins.";

  banner.append(bannerTitle, bannerDetail);

  const overlay = document.createElement("div");
  style(overlay, {
    position: "absolute",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2, 6, 23, 0.72)",
    zIndex: "3",
    transition: "opacity 220ms ease",
  });

  const card = document.createElement("div");
  style(card, {
    width: "min(92vw, 540px)",
    padding: "24px",
    borderRadius: "20px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(15, 23, 42, 0.94)",
    boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
  });

  const overlayTitle = document.createElement("div");
  style(overlayTitle, {
    fontSize: "14px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#38bdf8",
    marginBottom: "8px",
  });
  overlayTitle.textContent = "Booting example-babylonjs";

  const overlayStep = document.createElement("div");
  style(overlayStep, {
    fontSize: "28px",
    lineHeight: "1.2",
    color: "#f8fafc",
    fontWeight: "700",
    marginBottom: "18px",
  });
  overlayStep.textContent = "Preparing game shell";

  const progressTrack = document.createElement("div");
  style(progressTrack, {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "rgba(51, 65, 85, 0.8)",
    overflow: "hidden",
    marginBottom: "12px",
  });

  const overlayProgressFill = document.createElement("div");
  style(overlayProgressFill, {
    width: "6%",
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%)",
  });

  const infoRow = document.createElement("div");
  style(infoRow, {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    color: "#94a3b8",
    fontSize: "13px",
  });

  const overlayDetail = document.createElement("span");
  overlayDetail.textContent = "Creating the canvas, HUD, and load overlay.";

  const overlayPercent = document.createElement("span");
  overlayPercent.textContent = "6%";

  progressTrack.append(overlayProgressFill);
  infoRow.append(overlayDetail, overlayPercent);
  card.append(overlayTitle, overlayStep, progressTrack, infoRow);
  overlay.append(card);

  hud.append(topRow, scoreBoard, banner);
  target.append(canvas, hud, overlay);

  return {
    canvas,
    statusPill,
    runtimePill,
    userPill,
    playerScore,
    aiScore,
    bannerTitle,
    bannerDetail,
    overlay,
    overlayTitle,
    overlayStep,
    overlayDetail,
    overlayPercent,
    overlayProgressFill,
  };
}

function createInput() {
  return {
    up: false,
    down: false,
    actionQueued: false,
  };
}

function wireInput(input) {
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

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}

function setPillAccent(pill, text, borderColor) {
  pill.textContent = text;
  pill.style.borderColor = borderColor;
}

function refreshRuntime(shell, sdk) {
  if (sdk.__localShim) {
    setPillAccent(shell.runtimePill, "Runtime local shim", "rgba(56, 189, 248, 0.55)");
  } else {
    setPillAccent(shell.runtimePill, "Runtime Wavedash SDK", "rgba(34, 197, 94, 0.55)");
  }
}

function refreshUser(shell, sdk) {
  try {
    const user = typeof sdk.getUser === "function" ? sdk.getUser() : null;
    const displayName = user?.username || user?.name || user?.id;

    if (displayName) {
      shell.userPill.textContent = `User ${displayName}${sdk.__localShim ? " (shim)" : ""}`;
      return;
    }
  } catch (error) {
    console.warn("[example-babylonjs] Unable to read Wavedash user", error);
  }

  shell.userPill.textContent = sdk.__localShim ? "User Local Player (shim)" : "User unavailable";
}

function updateLoading(shell, sdk, label, progress, detail) {
  shell.overlayStep.textContent = label;
  shell.overlayDetail.textContent = detail;
  shell.overlayPercent.textContent = `${Math.round(progress * 100)}%`;
  shell.overlayProgressFill.style.width = `${Math.max(6, Math.round(progress * 100))}%`;

  if (typeof sdk.updateLoadProgressZeroToOne === "function") {
    sdk.updateLoadProgressZeroToOne(progress);
  }
}

async function runStep(shell, sdk, label, progress, detail, task) {
  log(label);
  updateLoading(shell, sdk, label, progress, detail);
  await sleep(80);
  return task();
}

function hideOverlay(shell) {
  shell.overlay.style.opacity = "0";
  shell.overlay.style.pointerEvents = "none";
}

function showFatal(shell, message, error) {
  shell.overlay.style.opacity = "1";
  shell.overlay.style.pointerEvents = "auto";
  shell.overlayTitle.textContent = "Failed to boot example-babylonjs";
  shell.overlayStep.textContent = message;
  shell.overlayProgressFill.style.width = "100%";
  shell.overlayProgressFill.style.background = "linear-gradient(90deg, #f97316 0%, #ef4444 100%)";
  shell.overlayPercent.textContent = "error";

  const detail = window.location.protocol === "file:"
    ? "Serve build/web over HTTP instead of opening index.html with file://."
    : (error && error.message) || String(error);

  shell.overlayDetail.textContent = detail;
}

async function main() {
  const sdk = ensureWavedash();
  const target = ensureTarget();
  const shell = createShell(target);
  const input = createInput();
  const detachInput = wireInput(input);

  refreshRuntime(shell, sdk);
  refreshUser(shell, sdk);
  setPillAccent(shell.statusPill, "SDK pending", "rgba(148, 163, 184, 0.24)");

  const detachSdkListeners = attachSdkListeners(sdk, {
    onConnected: () => {
      log("Backend connected event received");
      setPillAccent(shell.statusPill, "SDK connected", "rgba(34, 197, 94, 0.55)");
      refreshUser(shell, sdk);
    },
    onDisconnected: () => {
      log("Backend disconnected event received");
      setPillAccent(shell.statusPill, "SDK disconnected", "rgba(248, 113, 113, 0.65)");
    },
    onReconnecting: () => {
      log("Backend reconnecting event received");
      setPillAccent(shell.statusPill, "SDK reconnecting", "rgba(250, 204, 21, 0.65)");
    },
  });

  let resizeHandler = null;

  try {
    await runStep(
      shell,
      sdk,
      "Preparing game shell",
      0.08,
      "Creating the canvas, HUD, and local load overlay.",
      async () => {}
    );

    await runStep(
      shell,
      sdk,
      "Initializing Wavedash SDK",
      0.28,
      "Calling WavedashJS.init with deferred events enabled, then waiting for readiness.",
      async () => {
        if (typeof sdk.init === "function") {
          await Promise.resolve(
            sdk.init({
              debug: true,
              deferEvents: true,
            })
          );
        }

        setPillAccent(shell.statusPill, "SDK starting", "rgba(250, 204, 21, 0.55)");

        const ready = await waitForSdkReady(sdk, 6000);
        if (!ready) {
          throw new Error("WavedashJS did not report ready before the startup timeout.");
        }

        setPillAccent(shell.statusPill, "SDK ready", "rgba(34, 197, 94, 0.55)");
        refreshRuntime(shell, sdk);
        refreshUser(shell, sdk);
      }
    );

    const game = new PongGame({
      canvas: shell.canvas,
      playerScoreEl: shell.playerScore,
      aiScoreEl: shell.aiScore,
      bannerTitleEl: shell.bannerTitle,
      bannerDetailEl: shell.bannerDetail,
    });

    await runStep(
      shell,
      sdk,
      "Creating Babylon engine",
      0.54,
      "Starting Babylon.js, the camera, and the basic render scene.",
      async () => {
        game.createEngine();
      }
    );

    await runStep(
      shell,
      sdk,
      "Building Pong scene",
      0.82,
      "Creating meshes, preparing the serve state, and syncing the HUD.",
      async () => {
        game.buildScene();
        resizeHandler = () => game.resize();
        window.addEventListener("resize", resizeHandler);
        game.resize();
      }
    );

    await runStep(
      shell,
      sdk,
      "Finalizing startup",
      1,
      "Releasing deferred events only now that the first playable state is ready.",
      async () => {
        if (typeof sdk.readyForEvents === "function") {
          await Promise.resolve(sdk.readyForEvents());
        }

        if (typeof sdk.loadComplete === "function") {
          await Promise.resolve(sdk.loadComplete());
        }
      }
    );

    hideOverlay(shell);
    game.start(input);
  } catch (error) {
    console.error(error);
    detachInput();
    detachSdkListeners();

    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
    }

    showFatal(shell, "The browser entrypoint hit an error.", error);
  }
}

main().catch((error) => {
  console.error(error);

  const target = ensureTarget();
  const shell = createShell(target);
  showFatal(shell, "The browser entrypoint hit an error.", error);
});
