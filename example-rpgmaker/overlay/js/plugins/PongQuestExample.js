/*:
 * @target MZ
 * @plugindesc Pong Quest demo with Wavedash integration for RPG Maker MZ web exports.
 * @author Wavedash
 * @help
 * This example is intentionally Wavedash-only and expects window.WavedashJS
 * to be injected by wavedash dev.
 */

(() => {
  const LOG_PREFIX = "[example-rpgmaker]";
  const HUD_ROOT_ID = "example-rpgmaker-shell";
  const GAME_TITLE = "Pong Quest";
  const TITLE_COMMAND_LABEL = GAME_TITLE;
  const MAX_LOG_LINES = 6;
  const BOOT_TIMEOUT_MS = 6000;
  const POLL_INTERVAL_MS = 50;

  const SDK_EVENTS = Object.freeze({
    BACKEND_CONNECTED: "BackendConnected",
    BACKEND_DISCONNECTED: "BackendDisconnected",
    BACKEND_RECONNECTING: "BackendReconnecting",
  });

  const COLORS = Object.freeze({
    neutral: "rgba(148, 163, 184, 0.42)",
    info: "rgba(56, 189, 248, 0.55)",
    warning: "rgba(250, 204, 21, 0.65)",
    success: "rgba(34, 197, 94, 0.65)",
    danger: "rgba(248, 113, 113, 0.65)",
    court: "#08111f",
    line: "#334155",
    player: "#67e8f9",
    rival: "#fdba74",
    ball: "#f8fafc",
  });

  const QUEST_MODES = Object.freeze({
    INTRO: "intro",
    BOON: "boon",
    BATTLE: "battle",
    END: "end",
  });

  const COMMANDS_BY_MODE = Object.freeze({
    [QUEST_MODES.INTRO]: [
      { name: "Begin Quest", symbol: "begin" },
      { name: "Return to Title", symbol: "title" },
    ],
    [QUEST_MODES.BOON]: [
      { name: "Power Paddle", symbol: "power" },
      { name: "Guard Cloak", symbol: "guard" },
      { name: "Lucky Spin", symbol: "spin" },
    ],
    [QUEST_MODES.BATTLE]: [
      { name: "Serve", symbol: "serve" },
      { name: "Topspin", symbol: "topspin" },
      { name: "Brace", symbol: "brace" },
    ],
    [QUEST_MODES.END]: [
      { name: "Play Again", symbol: "again" },
      { name: "Return to Title", symbol: "title" },
    ],
  });

  const BOONS = Object.freeze({
    power: {
      label: "Power Paddle",
      apply(hero) {
        hero.attack += 1;
        hero.serveBonus += 1;
        hero.boonName = this.label;
      },
    },
    guard: {
      label: "Guard Cloak",
      apply(hero) {
        hero.maxHp += 4;
        hero.hp += 4;
        hero.braceBonus += 1;
        hero.boonName = this.label;
      },
    },
    spin: {
      label: "Lucky Spin",
      apply(hero) {
        hero.spinBonus += 1;
        hero.spinCritChance = 0.55;
        hero.boonName = this.label;
      },
    },
  });

  const ENDING_LINES = Object.freeze({
    victory: [
      "Baron Backspin drops the Silver Ball in defeat.",
      "Courtkeep's lights flare back to life across the valley.",
      "Nia becomes the Keeper of the Final Serve.",
      "Play again, or return to the title screen.",
    ],
    defeat: [
      "The rally breaks and the Silver Ball rolls away.",
      "Coach Pixel promises another training round at sunrise.",
      "Even heroes lose a point before winning the match.",
      "Play again, or return to the title screen.",
    ],
  });

  const state = {
    sdk: null,
    shell: null,
    bootPromise: null,
    bootComplete: false,
    bootFailed: false,
    firstPlayableReported: false,
    readyForEventsSent: false,
    loadCompleteSent: false,
    detachSdkListeners: () => {},
  };

  function log(message, detail) {
    if (detail === undefined) {
      console.info(`${LOG_PREFIX} ${message}`);
      return;
    }

    console.info(`${LOG_PREFIX} ${message}`, detail);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function style(element, styles) {
    Object.assign(element.style, styles);
    return element;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function lastLines(lines, count = MAX_LOG_LINES) {
    return lines.slice(-count);
  }

  function createHeroState() {
    return {
      name: "Nia Paddle",
      hp: 16,
      maxHp: 16,
      attack: 3,
      shield: 0,
      serveBonus: 0,
      spinBonus: 0,
      braceBonus: 0,
      spinCritChance: 0.3,
      boonName: "Unchosen",
    };
  }

  function createRivalState() {
    return {
      name: "Baron Backspin",
      hp: 18,
      maxHp: 18,
      attack: 3,
    };
  }

  function createSnapshot(phase, hero, rival) {
    return { phase, hero, rival };
  }

  function defaultSnapshot() {
    return createSnapshot("Gathering courage", createHeroState(), createRivalState());
  }

  function createPill(text) {
    const pill = document.createElement("div");
    style(pill, {
      padding: "9px 13px",
      borderRadius: "999px",
      border: `1px solid ${COLORS.neutral}`,
      background: "rgba(2, 6, 23, 0.88)",
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

  function setPill(pill, text, borderColor) {
    pill.textContent = text;
    pill.style.borderColor = borderColor || COLORS.neutral;
  }

  // The HUD is plain DOM on top of the RPG Maker canvas so the boot state stays
  // visible even while the engine is still inside Scene_Boot.
  function ensureShell() {
    if (state.shell) {
      return state.shell;
    }

    const root = document.createElement("div");
    root.id = HUD_ROOT_ID;
    style(root, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "9999",
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#e2e8f0",
    });

    const hud = document.createElement("div");
    style(hud, {
      position: "absolute",
      top: "14px",
      left: "14px",
      right: "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      flexWrap: "wrap",
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
    const enginePill = createPill("RPG Maker MZ");

    leftCluster.append(statusPill, runtimePill, userPill);
    rightCluster.append(enginePill);
    hud.append(leftCluster, rightCluster);

    const overlay = document.createElement("div");
    style(overlay, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(2, 6, 23, 0.76)",
      transition: "opacity 220ms ease",
    });

    const card = document.createElement("div");
    style(card, {
      width: "min(92vw, 560px)",
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
    overlayTitle.textContent = "Booting example-rpgmaker";

    const overlayStep = document.createElement("div");
    style(overlayStep, {
      fontSize: "28px",
      lineHeight: "1.2",
      color: "#f8fafc",
      fontWeight: "700",
      marginBottom: "18px",
    });
    overlayStep.textContent = `Preparing ${GAME_TITLE}`;

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
    overlayDetail.textContent = "Waiting for the deployed web build to finish booting.";

    const overlayPercent = document.createElement("span");
    overlayPercent.textContent = "6%";

    progressTrack.append(overlayProgressFill);
    infoRow.append(overlayDetail, overlayPercent);
    card.append(overlayTitle, overlayStep, progressTrack, infoRow);
    overlay.append(card);
    root.append(hud, overlay);
    document.body.appendChild(root);

    state.shell = {
      root,
      overlay,
      statusPill,
      runtimePill,
      userPill,
      enginePill,
      overlayTitle,
      overlayStep,
      overlayDetail,
      overlayPercent,
      overlayProgressFill,
    };

    return state.shell;
  }

  function hideOverlay() {
    const shell = ensureShell();
    shell.overlay.style.opacity = "0";
    window.setTimeout(() => {
      shell.overlay.style.display = "none";
    }, 220);
  }

  function showFatal(message, error) {
    const shell = ensureShell();
    const detail = (error && error.message) || String(error);

    setPill(shell.statusPill, "SDK error", COLORS.danger);
    shell.overlay.style.display = "flex";
    shell.overlay.style.opacity = "1";
    shell.overlayTitle.textContent = "Failed to boot example-rpgmaker";
    shell.overlayStep.textContent = message;
    shell.overlayDetail.textContent = detail;
    shell.overlayPercent.textContent = "error";
    shell.overlayProgressFill.style.width = "100%";
    shell.overlayProgressFill.style.background = "linear-gradient(90deg, #f97316 0%, #ef4444 100%)";
  }

  function normalizeProgress(progress) {
    const numeric = Number(progress);
    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return clamp(numeric, 0, 1);
  }

  function updateLoading(step, progress, detail) {
    const shell = ensureShell();
    const clampedProgress = normalizeProgress(progress);

    shell.overlayStep.textContent = step;
    shell.overlayDetail.textContent = detail;
    shell.overlayPercent.textContent = `${Math.round(clampedProgress * 100)}%`;
    shell.overlayProgressFill.style.width = `${Math.max(6, Math.round(clampedProgress * 100))}%`;

    if (state.sdk && typeof state.sdk.updateLoadProgressZeroToOne === "function") {
      try {
        state.sdk.updateLoadProgressZeroToOne(clampedProgress);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Unable to update Wavedash load progress`, error);
      }
    }
  }

  function getRequiredWavedash() {
    if (window.WavedashJS) {
      return window.WavedashJS;
    }

    throw new Error(
      "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected."
    );
  }

  function readUserName() {
    if (!state.sdk || typeof state.sdk.getUser !== "function") {
      return "";
    }

    try {
      const user = state.sdk.getUser();
      return user?.username || user?.name || user?.id || "";
    } catch (error) {
      console.warn(`${LOG_PREFIX} Unable to read Wavedash user`, error);
      return "";
    }
  }

  function refreshUser() {
    const shell = ensureShell();
    const displayName = readUserName();
    shell.userPill.textContent = displayName ? `User ${displayName}` : "User unavailable";
  }

  function attachSdkListeners(sdk) {
    if (!sdk || typeof sdk.addEventListener !== "function") {
      return () => {};
    }

    const shell = ensureShell();
    const events = sdk.Events || SDK_EVENTS;
    const listeners = [
      [
        events.BACKEND_CONNECTED,
        () => {
          log("Backend connected event received");
          setPill(shell.statusPill, "SDK connected", COLORS.success);
          refreshUser();
        },
      ],
      [
        events.BACKEND_DISCONNECTED,
        () => {
          log("Backend disconnected event received");
          setPill(shell.statusPill, "SDK disconnected", COLORS.danger);
        },
      ],
      [
        events.BACKEND_RECONNECTING,
        () => {
          log("Backend reconnecting event received");
          setPill(shell.statusPill, "SDK reconnecting", COLORS.warning);
        },
      ],
    ];

    listeners.forEach(([eventName, handler]) => {
      sdk.addEventListener(eventName, handler);
    });

    return () => {
      listeners.forEach(([eventName, handler]) => {
        if (typeof sdk.removeEventListener === "function") {
          sdk.removeEventListener(eventName, handler);
        }
      });
    };
  }

  async function waitForSdkReady(sdk, timeoutMs) {
    if (!sdk || typeof sdk.isReady !== "function") {
      return true;
    }

    const startedAt = performance.now();

    while (performance.now() - startedAt < timeoutMs) {
      try {
        if (sdk.isReady()) {
          return true;
        }
      } catch (error) {
        console.warn(`${LOG_PREFIX} Wavedash readiness check failed`, error);
      }

      await sleep(POLL_INTERVAL_MS);
    }

    try {
      return sdk.isReady();
    } catch (error) {
      console.warn(`${LOG_PREFIX} Final Wavedash readiness check failed`, error);
      return false;
    }
  }

  function startBootFlow() {
    if (state.bootPromise) {
      return state.bootPromise;
    }

    state.bootPromise = (async () => {
      const shell = ensureShell();

      setPill(shell.runtimePill, "Runtime RPG Maker MZ", COLORS.info);
      setPill(shell.enginePill, "Pong Quest Demo", COLORS.info);
      updateLoading(
        "RPG Maker runtime available",
        0.12,
        "The deployed web build is running and the Pong Quest plugin loaded during Scene_Boot."
      );

      try {
        state.sdk = getRequiredWavedash();
        refreshUser();
        state.detachSdkListeners = attachSdkListeners(state.sdk);

        setPill(shell.statusPill, "SDK starting", COLORS.warning);
        updateLoading(
          "Initializing Wavedash SDK",
          0.38,
          "Calling WavedashJS.init({ debug: true, deferEvents: true }) from Scene_Boot."
        );

        if (typeof state.sdk.init === "function") {
          await Promise.resolve(
            state.sdk.init({
              debug: true,
              deferEvents: true,
            })
          );
        }

        updateLoading(
          "Waiting for SDK readiness",
          0.62,
          "Scene_Boot stays active until the SDK reports ready."
        );

        const ready = await waitForSdkReady(state.sdk, BOOT_TIMEOUT_MS);
        if (!ready) {
          throw new Error("WavedashJS did not report ready before the startup timeout.");
        }

        setPill(shell.statusPill, "SDK ready", COLORS.success);
        refreshUser();
        updateLoading(
          "Preparing first playable scene",
          0.88,
          "The first interactive title or map scene will release deferred events."
        );
        state.bootComplete = true;
      } catch (error) {
        state.bootFailed = true;
        log("Boot failed", error);
        showFatal("Failed to boot example-rpgmaker.", error);
      }
    })();

    return state.bootPromise;
  }

  async function reportFirstPlayable(detail) {
    if (state.firstPlayableReported || state.bootFailed || !state.bootComplete || !state.sdk) {
      return;
    }

    state.firstPlayableReported = true;
    updateLoading("Loading complete", 1, detail);

    try {
      if (!state.readyForEventsSent && typeof state.sdk.readyForEvents === "function") {
        await Promise.resolve(state.sdk.readyForEvents());
        state.readyForEventsSent = true;
      }

      if (!state.loadCompleteSent && typeof state.sdk.loadComplete === "function") {
        await Promise.resolve(state.sdk.loadComplete());
        state.loadCompleteSent = true;
      }

      setPill(ensureShell().statusPill, "SDK connected", COLORS.success);
      refreshUser();
      hideOverlay();
    } catch (error) {
      state.bootFailed = true;
      log("Failed to finalize startup", error);
      showFatal("Failed to finalize example-rpgmaker.", error);
    }
  }

  function Window_PongQuestHeader() {
    this.initialize(...arguments);
  }

  Window_PongQuestHeader.prototype = Object.create(Window_Base.prototype);
  Window_PongQuestHeader.prototype.constructor = Window_PongQuestHeader;

  Window_PongQuestHeader.prototype.initialize = function (rect) {
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
  };

  Window_PongQuestHeader.prototype.refresh = function () {
    const width = this.contentsWidth();

    this.contents.clear();
    this.contents.fontSize = 34;
    this.changeTextColor(COLORS.player);
    this.drawText(GAME_TITLE, 0, 0, width, "center");

    this.contents.fontSize = 18;
    this.resetTextColor();
    this.drawText("A tiny RPG about winning back the Silver Ball.", 0, 44, width, "center");

    this.contents.fontSize = 15;
    this.changeTextColor("#cbd5e1");
    this.drawText(
      "Use Arrow Keys and Enter. The Wavedash HUD stays active above the court.",
      0,
      78,
      width,
      "center"
    );
    this.resetFontSettings();
  };

  function Window_PongQuestStatus() {
    this.initialize(...arguments);
  }

  Window_PongQuestStatus.prototype = Object.create(Window_Base.prototype);
  Window_PongQuestStatus.prototype.constructor = Window_PongQuestStatus;

  Window_PongQuestStatus.prototype.initialize = function (rect) {
    this._snapshot = defaultSnapshot();
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
  };

  Window_PongQuestStatus.prototype.setSnapshot = function (snapshot) {
    this._snapshot = snapshot;
    this.refresh();
  };

  Window_PongQuestStatus.prototype.drawGaugeLine = function (x, y, width, label, current, max, color) {
    const safeMax = Math.max(1, max || 1);
    const rate = clamp((current || 0) / safeMax, 0, 1);
    const fillWidth = Math.floor(width * rate);

    this.contents.fontSize = 18;
    this.changeTextColor("#cbd5e1");
    this.drawText(label, x, y, width - 74, "left");
    this.resetTextColor();
    this.drawText(`${current}/${safeMax}`, x, y, width, "right");
    this.contents.fillRect(x, y + 28, width, 10, "#1f2937");
    this.contents.fillRect(x, y + 28, fillWidth, 10, color);
    return y + 48;
  };

  Window_PongQuestStatus.prototype.drawFact = function (x, y, width, label, value, color = "#f8fafc") {
    this.contents.fontSize = 16;
    this.changeTextColor("#94a3b8");
    this.drawText(label, x, y, width, "left");
    this.changeTextColor(color);
    this.drawText(String(value), x, y, width, "right");
    this.resetTextColor();
    return y + 28;
  };

  Window_PongQuestStatus.prototype.refresh = function () {
    const snapshot = this._snapshot || defaultSnapshot();
    const width = this.contentsWidth();
    let y = 0;

    this.contents.clear();
    this.contents.fontSize = 20;
    this.changeTextColor(COLORS.player);
    this.drawText("Hero", 0, y, width, "left");
    y += 32;

    this.contents.fontSize = 18;
    this.resetTextColor();
    this.drawText(snapshot.hero.name, 0, y, width, "left");
    y += 36;

    y = this.drawGaugeLine(0, y, width, "HP", snapshot.hero.hp, snapshot.hero.maxHp, COLORS.player);
    y = this.drawFact(0, y, width, "Attack", snapshot.hero.attack, COLORS.player);
    y = this.drawFact(0, y, width, "Shield", snapshot.hero.shield, "#e2e8f0");
    y = this.drawFact(0, y, width, "Boon", snapshot.hero.boonName || "Unchosen", "#e2e8f0");
    y += 12;

    this.contents.fontSize = 20;
    this.changeTextColor(COLORS.rival);
    this.drawText("Rival", 0, y, width, "left");
    y += 32;

    this.contents.fontSize = 18;
    this.resetTextColor();
    this.drawText(snapshot.rival.name, 0, y, width, "left");
    y += 36;

    y = this.drawGaugeLine(0, y, width, "HP", snapshot.rival.hp, snapshot.rival.maxHp, COLORS.rival);
    y = this.drawFact(0, y, width, "Attack", snapshot.rival.attack, COLORS.rival);
    y += 12;

    this.contents.fontSize = 18;
    this.changeTextColor("#94a3b8");
    this.drawText("Quest Phase", 0, y, width, "left");
    y += 26;
    this.changeTextColor("#f8fafc");
    this.drawText(snapshot.phase, 0, y, width, "left");
    this.resetFontSettings();
  };

  function Window_PongQuestLog() {
    this.initialize(...arguments);
  }

  Window_PongQuestLog.prototype = Object.create(Window_Base.prototype);
  Window_PongQuestLog.prototype.constructor = Window_PongQuestLog;

  Window_PongQuestLog.prototype.initialize = function (rect) {
    this._lines = [];
    Window_Base.prototype.initialize.call(this, rect);
    this.refresh();
  };

  Window_PongQuestLog.prototype.setLines = function (lines) {
    this._lines = lastLines((lines || []).map(String));
    this.refresh();
  };

  Window_PongQuestLog.prototype.refresh = function () {
    const width = this.contentsWidth();
    let y = 0;

    this.contents.clear();
    this.contents.fontSize = 20;
    this.changeTextColor("#c084fc");
    this.drawText("Story", 0, y, width, "left");
    y += 38;

    this.contents.fontSize = 18;
    this.resetTextColor();

    for (const line of this._lines) {
      this.drawText(line, 0, y, width, "left");
      y += 32;
    }

    this.resetFontSettings();
  };

  function Window_PongQuestCommand() {
    this.initialize(...arguments);
  }

  Window_PongQuestCommand.prototype = Object.create(Window_Command.prototype);
  Window_PongQuestCommand.prototype.constructor = Window_PongQuestCommand;

  Window_PongQuestCommand.prototype.initialize = function (rect) {
    this._mode = QUEST_MODES.INTRO;
    Window_Command.prototype.initialize.call(this, rect);
  };

  Window_PongQuestCommand.prototype.setMode = function (mode) {
    if (this._mode !== mode) {
      this._mode = mode;
      this.refresh();
    }

    this.select(0);
  };

  Window_PongQuestCommand.prototype.maxCols = function () {
    return 1;
  };

  Window_PongQuestCommand.prototype.numVisibleRows = function () {
    return Math.max(1, Math.min(4, this.maxItems()));
  };

  Window_PongQuestCommand.prototype.makeCommandList = function () {
    const commands = COMMANDS_BY_MODE[this._mode] || COMMANDS_BY_MODE[QUEST_MODES.END];

    commands.forEach((command) => {
      this.addCommand(command.name, command.symbol);
    });
  };

  function Scene_PongQuest() {
    this.initialize(...arguments);
  }

  Scene_PongQuest.prototype = Object.create(Scene_MenuBase.prototype);
  Scene_PongQuest.prototype.constructor = Scene_PongQuest;

  Scene_PongQuest.prototype.initialize = function () {
    Scene_MenuBase.prototype.initialize.call(this);
  };

  Scene_PongQuest.prototype.createBackground = function () {
    const width = Graphics.boxWidth;
    const height = Graphics.boxHeight;
    const bitmap = new Bitmap(width, height);
    const centerX = Math.floor(width / 2);

    bitmap.fillAll(COLORS.court);
    for (let y = 18; y < height - 18; y += 42) {
      bitmap.fillRect(centerX - 3, y, 6, 24, COLORS.line);
    }

    bitmap.fillRect(86, 152, 14, height - 304, COLORS.player);
    bitmap.fillRect(width - 100, 184, 14, height - 304, COLORS.rival);
    bitmap.fillRect(centerX - 10, Math.floor(height / 2) - 10, 20, 20, COLORS.ball);

    this._backgroundSprite = new Sprite(bitmap);
    this.addChild(this._backgroundSprite);
  };

  Scene_PongQuest.prototype.create = function () {
    Scene_MenuBase.prototype.create.call(this);
    this.createHeaderWindow();
    this.createStatusWindow();
    this.createLogWindow();
    this.createCommandWindow();
    this.resetQuest();
    this.showIntro();
  };

  Scene_PongQuest.prototype.headerWindowRect = function () {
    return new Rectangle(24, 24, Graphics.boxWidth - 48, 116);
  };

  Scene_PongQuest.prototype.statusWindowRect = function () {
    return new Rectangle(24, 156, 280, Graphics.boxHeight - 180);
  };

  Scene_PongQuest.prototype.logWindowRect = function () {
    return new Rectangle(320, 156, Graphics.boxWidth - 344, 252);
  };

  Scene_PongQuest.prototype.commandWindowRect = function () {
    return new Rectangle(320, 424, Graphics.boxWidth - 344, Graphics.boxHeight - 448);
  };

  Scene_PongQuest.prototype.createHeaderWindow = function () {
    this._headerWindow = new Window_PongQuestHeader(this.headerWindowRect());
    this.addWindow(this._headerWindow);
  };

  Scene_PongQuest.prototype.createStatusWindow = function () {
    this._statusWindow = new Window_PongQuestStatus(this.statusWindowRect());
    this.addWindow(this._statusWindow);
  };

  Scene_PongQuest.prototype.createLogWindow = function () {
    this._logWindow = new Window_PongQuestLog(this.logWindowRect());
    this.addWindow(this._logWindow);
  };

  Scene_PongQuest.prototype.createCommandWindow = function () {
    this._commandWindow = new Window_PongQuestCommand(this.commandWindowRect());
    this._commandWindow.setHandler("begin", this.commandBeginQuest.bind(this));
    this._commandWindow.setHandler("power", this.commandChoosePower.bind(this));
    this._commandWindow.setHandler("guard", this.commandChooseGuard.bind(this));
    this._commandWindow.setHandler("spin", this.commandChooseSpin.bind(this));
    this._commandWindow.setHandler("serve", this.commandServe.bind(this));
    this._commandWindow.setHandler("topspin", this.commandTopspin.bind(this));
    this._commandWindow.setHandler("brace", this.commandBrace.bind(this));
    this._commandWindow.setHandler("again", this.commandPlayAgain.bind(this));
    this._commandWindow.setHandler("title", this.commandReturnToTitle.bind(this));
    this.addWindow(this._commandWindow);
  };

  Scene_PongQuest.prototype.resetQuest = function () {
    this._phase = "Gathering courage";
    this._hero = createHeroState();
    this._rival = createRivalState();
  };

  Scene_PongQuest.prototype.refreshQuestWindows = function () {
    this._statusWindow.setSnapshot(createSnapshot(this._phase, this._hero, this._rival));
  };

  Scene_PongQuest.prototype.setStoryLines = function (lines) {
    this._logWindow.setLines(lines);
  };

  Scene_PongQuest.prototype.showIntro = function () {
    this._phase = "Gathering courage";
    this.setStoryLines([
      "Courtkeep's Silver Ball has vanished into the dusk.",
      "A rookie paddlemancer named Nia answers the call.",
      "Coach Pixel points toward the haunted bridge court.",
      "Choose Begin Quest to rally for the kingdom.",
    ]);
    this._commandWindow.setMode(QUEST_MODES.INTRO);
    this.refreshQuestWindows();
    this._commandWindow.activate();
    this._commandWindow.open();
  };

  Scene_PongQuest.prototype.commandBeginQuest = function () {
    this._phase = "Choosing a boon";
    this.setStoryLines([
      "Coach Pixel opens the training chest before dawn.",
      "Pick one blessing for the road to Edge Court.",
      "Power Paddle boosts offense. Guard Cloak boosts endurance.",
      "Lucky Spin makes topspin hits far deadlier.",
    ]);
    this._commandWindow.setMode(QUEST_MODES.BOON);
    this.refreshQuestWindows();
    this._commandWindow.activate();
  };

  Scene_PongQuest.prototype.applyBoon = function (boonKey) {
    const boon = BOONS[boonKey];

    if (!boon) {
      throw new Error(`Unknown Pong Quest boon: ${boonKey}`);
    }

    boon.apply(this._hero);
    this.startBattle();
  };

  Scene_PongQuest.prototype.commandChoosePower = function () {
    this.applyBoon("power");
  };

  Scene_PongQuest.prototype.commandChooseGuard = function () {
    this.applyBoon("guard");
  };

  Scene_PongQuest.prototype.commandChooseSpin = function () {
    this.applyBoon("spin");
  };

  Scene_PongQuest.prototype.startBattle = function () {
    this._phase = "Duel at Edge Court";
    this._hero.shield = 0;
    this.setStoryLines([
      "Baron Backspin blocks the bridge with a sneer.",
      "\"No rally survives my wall,\" the baron growls.",
      `${this._hero.boonName} glows in Nia's hands.`,
      "Choose a command to begin the duel.",
    ]);
    this._commandWindow.setMode(QUEST_MODES.BATTLE);
    this.refreshQuestWindows();
    this._commandWindow.activate();
  };

  Scene_PongQuest.prototype.resolveEnemyTurn = function (lines) {
    let damage = randomInt(2, 4) + (this._rival.hp <= 9 ? 1 : 0);
    const blocked = Math.min(this._hero.shield, damage);

    lines.push("Baron Backspin whips a cruel return down the line.");

    if (blocked > 0) {
      this._hero.shield -= blocked;
      damage -= blocked;
      lines.push(`Nia's shield absorbs ${blocked} damage.`);
    }

    if (damage > 0) {
      this._hero.hp = Math.max(0, this._hero.hp - damage);
      lines.push(`Nia loses ${damage} HP but keeps the rally alive.`);
      return;
    }

    lines.push("The brace holds. No damage gets through.");
  };

  Scene_PongQuest.prototype.showEnding = function (victory, lines) {
    this._phase = victory ? "Victory" : "Try again";
    this.setStoryLines(lastLines(lines.concat(victory ? ENDING_LINES.victory : ENDING_LINES.defeat)));
    this._commandWindow.setMode(QUEST_MODES.END);
    this.refreshQuestWindows();
    this._commandWindow.activate();
  };

  Scene_PongQuest.prototype.resolveBattleAction = function (action) {
    const lines = [];

    this._commandWindow.deactivate();

    if (action === "serve") {
      const damage = randomInt(this._hero.attack, this._hero.attack + 2) + this._hero.serveBonus;
      this._rival.hp = Math.max(0, this._rival.hp - damage);
      lines.push("Nia launches a fierce opening serve.");
      lines.push(`The hit lands for ${damage} damage.`);
    } else if (action === "topspin") {
      let damage = randomInt(2, 4) + this._hero.spinBonus;
      lines.push("Nia whips the paddle through a sharp topspin arc.");

      if (Math.random() < this._hero.spinCritChance) {
        damage += 3;
        lines.push("Lucky spin! The ball curves right past the baron.");
      }

      this._rival.hp = Math.max(0, this._rival.hp - damage);
      lines.push(`Topspin deals ${damage} damage.`);
    } else {
      const shieldGain = randomInt(2, 4) + this._hero.braceBonus;
      const heal = 1 + this._hero.braceBonus;

      this._hero.shield += shieldGain;
      this._hero.hp = Math.min(this._hero.maxHp, this._hero.hp + heal);
      lines.push("Nia plants her feet and braces for impact.");
      lines.push(`Shield rises by ${shieldGain}, and ${heal} HP returns.`);
    }

    this.refreshQuestWindows();

    if (this._rival.hp <= 0) {
      this.showEnding(true, lines);
      return;
    }

    this.resolveEnemyTurn(lines);
    this.refreshQuestWindows();

    if (this._hero.hp <= 0) {
      this.showEnding(false, lines);
      return;
    }

    this.setStoryLines(lastLines(lines.concat(["Choose the next rally."])));
    this._commandWindow.activate();
  };

  Scene_PongQuest.prototype.commandServe = function () {
    this.resolveBattleAction("serve");
  };

  Scene_PongQuest.prototype.commandTopspin = function () {
    this.resolveBattleAction("topspin");
  };

  Scene_PongQuest.prototype.commandBrace = function () {
    this.resolveBattleAction("brace");
  };

  Scene_PongQuest.prototype.commandPlayAgain = function () {
    this.resetQuest();
    this.showIntro();
  };

  Scene_PongQuest.prototype.commandReturnToTitle = function () {
    SceneManager.goto(Scene_Title);
  };

  const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
  Window_TitleCommand.prototype.makeCommandList = function () {
    _Window_TitleCommand_makeCommandList.call(this);

    const newGameCommand = this._list.find((command) => command.symbol === "newGame");
    if (newGameCommand) {
      newGameCommand.name = TITLE_COMMAND_LABEL;
    }
  };

  const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
  Scene_Title.prototype.createCommandWindow = function () {
    _Scene_Title_createCommandWindow.call(this);
    this._commandWindow.setHandler("newGame", this.commandPongQuest.bind(this));
  };

  // The demo is fully plugin-owned, so we intentionally send the player straight
  // into the custom scene instead of building a map/database-backed new game.
  Scene_Title.prototype.commandPongQuest = function () {
    this._commandWindow.close();
    SceneManager.goto(Scene_PongQuest);
  };

  window.addEventListener("beforeunload", () => {
    state.detachSdkListeners();
  });

  const _Scene_Boot_create = Scene_Boot.prototype.create;
  Scene_Boot.prototype.create = function () {
    _Scene_Boot_create.call(this);
    startBootFlow();
  };

  // Keep Scene_Boot active until the SDK is ready so the title screen is the
  // first interactive state shown to the player.
  const _Scene_Boot_isReady = Scene_Boot.prototype.isReady;
  Scene_Boot.prototype.isReady = function () {
    const ready = _Scene_Boot_isReady.call(this);
    if (!ready) {
      return false;
    }

    startBootFlow();

    if (state.bootFailed) {
      return false;
    }

    return state.bootComplete;
  };

  const _Scene_Title_start = Scene_Title.prototype.start;
  Scene_Title.prototype.start = function () {
    _Scene_Title_start.call(this);
    void reportFirstPlayable("The title screen is visible and can accept input.");
  };

  const _Scene_Map_start = Scene_Map.prototype.start;
  Scene_Map.prototype.start = function () {
    _Scene_Map_start.call(this);
    void reportFirstPlayable("The first map scene is visible and can accept input.");
  };
})();
