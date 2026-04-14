(function () {
  const SDK_EVENTS = {
    BACKEND_CONNECTED: "BackendConnected",
    BACKEND_DISCONNECTED: "BackendDisconnected",
    BACKEND_RECONNECTING: "BackendReconnecting",
  };

  function style(element, styles) {
    Object.assign(element.style, styles);
    return element;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function rgba(r, g, b, a) {
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(255, a)) / 255})`;
  }

  function ensureWavedash() {
    if (window.WavedashJS) {
      return window.WavedashJS;
    }

    class LocalWavedash extends EventTarget {
      constructor() {
        super();
        this.Events = SDK_EVENTS;
        this.__localShim = true;
        this._ready = false;
        this._deferEvents = false;
        this._queuedEvents = [];
        this._user = {
          id: "local-player",
          username: "Local Player",
        };
      }

      init(config = {}) {
        this._ready = true;
        this._deferEvents = Boolean(config.deferEvents);
        queueMicrotask(() => {
          this._emit(this.Events.BACKEND_CONNECTED, {
            isConnected: true,
            hasEverConnected: true,
            connectionCount: 1,
            connectionRetries: 0,
          });
        });
      }

      isReady() {
        return this._ready;
      }

      readyForEvents() {
        this._deferEvents = false;
        while (this._queuedEvents.length > 0) {
          super.dispatchEvent(this._queuedEvents.shift());
        }
      }

      updateLoadProgressZeroToOne(progress) {
        this._progress = progress;
      }

      loadComplete() {
        this._loadComplete = true;
      }

      getUser() {
        return this._user;
      }

      getUserId() {
        return this._user.id;
      }

      _emit(type, detail) {
        const event = new CustomEvent(type, { detail });
        if (this._deferEvents) {
          this._queuedEvents.push(event);
        } else {
          super.dispatchEvent(event);
        }
      }
    }

    window.WavedashJS = new LocalWavedash();
    return window.WavedashJS;
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
      color: "#e5e7eb",
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    });

    style(target, {
      position: "relative",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      background: "radial-gradient(circle at top, #0f172a 0%, #030712 75%)",
    });

    return target;
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
      top: "14px",
      left: "14px",
      right: "14px",
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      pointerEvents: "none",
      zIndex: "2",
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

    const statusPill = document.createElement("div");
    const userPill = document.createElement("div");
    const controlPill = document.createElement("div");

    [statusPill, userPill, controlPill].forEach((pill) => {
      style(pill, {
        padding: "8px 12px",
        borderRadius: "999px",
        border: "1px solid rgba(148, 163, 184, 0.25)",
        background: "rgba(2, 6, 23, 0.72)",
        color: "#cbd5e1",
        fontSize: "12px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        backdropFilter: "blur(10px)",
      });
    });

    statusPill.textContent = "SDK pending";
    userPill.textContent = "User pending";
    controlPill.textContent = "W/S or arrows to move, space to serve";

    leftCluster.append(statusPill, userPill);
    rightCluster.append(controlPill);
    hud.append(leftCluster, rightCluster);

    const overlay = document.createElement("div");
    style(overlay, {
      position: "absolute",
      inset: "0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(2, 6, 23, 0.70)",
      zIndex: "3",
      transition: "opacity 220ms ease",
    });

    const card = document.createElement("div");
    style(card, {
      width: "min(92vw, 520px)",
      padding: "24px",
      borderRadius: "20px",
      border: "1px solid rgba(148, 163, 184, 0.18)",
      background: "rgba(15, 23, 42, 0.94)",
      boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
    });

    const title = document.createElement("div");
    style(title, {
      fontSize: "14px",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#38bdf8",
      marginBottom: "8px",
    });
    title.textContent = "Booting example-zig";

    const step = document.createElement("div");
    style(step, {
      fontSize: "28px",
      lineHeight: "1.2",
      color: "#f8fafc",
      fontWeight: "700",
      marginBottom: "18px",
    });
    step.textContent = "Preparing game shell";

    const progressTrack = document.createElement("div");
    style(progressTrack, {
      width: "100%",
      height: "10px",
      borderRadius: "999px",
      background: "rgba(51, 65, 85, 0.8)",
      overflow: "hidden",
      marginBottom: "12px",
    });

    const progressFill = document.createElement("div");
    style(progressFill, {
      width: "8%",
      height: "100%",
      borderRadius: "999px",
      background: "linear-gradient(90deg, #22d3ee 0%, #38bdf8 100%)",
    });

    const note = document.createElement("div");
    style(note, {
      display: "flex",
      justifyContent: "space-between",
      gap: "16px",
      color: "#94a3b8",
      fontSize: "13px",
    });

    const detail = document.createElement("span");
    detail.textContent = "Load stepping, SDK init, then a Zig Pong demo.";

    const percent = document.createElement("span");
    percent.textContent = "8%";

    progressTrack.append(progressFill);
    note.append(detail, percent);
    card.append(title, step, progressTrack, note);
    overlay.append(card);

    target.append(canvas, hud, overlay);

    return {
      canvas,
      statusPill,
      userPill,
      overlay,
      overlayTitle: title,
      overlayStep: step,
      overlayDetail: detail,
      overlayPercent: percent,
      overlayProgressFill: progressFill,
    };
  }

  function createRenderer(canvas, target) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to create a 2D canvas context.");
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    function resize() {
      const rect = target.getBoundingClientRect();
      width = Math.max(320, Math.floor(rect.width || window.innerWidth || 960));
      height = Math.max(240, Math.floor(rect.height || window.innerHeight || 540));
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.textBaseline = "middle";
      ctx.imageSmoothingEnabled = true;
    }

    return {
      ctx,
      resize,
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get pixelRatio() {
        return pixelRatio;
      },
    };
  }

  function createInput() {
    return {
      up: false,
      down: false,
      startPressed: false,
    };
  }

  function wireInput(input) {
    const upCodes = new Set(["KeyW", "ArrowUp"]);
    const downCodes = new Set(["KeyS", "ArrowDown"]);
    const actionCodes = new Set(["Space", "Enter"]);

    window.addEventListener("keydown", (event) => {
      if (upCodes.has(event.code)) {
        input.up = true;
        event.preventDefault();
      }
      if (downCodes.has(event.code)) {
        input.down = true;
        event.preventDefault();
      }
      if (actionCodes.has(event.code)) {
        input.startPressed = true;
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      if (upCodes.has(event.code)) {
        input.up = false;
        event.preventDefault();
      }
      if (downCodes.has(event.code)) {
        input.down = false;
        event.preventDefault();
      }
    });

    window.addEventListener("blur", () => {
      input.up = false;
      input.down = false;
      input.startPressed = false;
    });
  }

  function setStatus(shell, text, borderColor) {
    shell.statusPill.textContent = text;
    shell.statusPill.style.borderColor = borderColor;
  }

  function refreshUser(shell, sdk) {
    try {
      const user = typeof sdk.getUser === "function" ? sdk.getUser() : null;
      if (user && user.username) {
        shell.userPill.textContent = `User ${user.username}${sdk.__localShim ? " (shim)" : ""}`;
        return;
      }
    } catch (error) {
      console.warn("Unable to read Wavedash user", error);
    }

    shell.userPill.textContent = sdk.__localShim ? "User Local Player (shim)" : "User unavailable";
  }

  function attachSdkListeners(shell, sdk) {
    const events = sdk.Events || SDK_EVENTS;

    sdk.addEventListener(events.BACKEND_CONNECTED, () => {
      setStatus(shell, "SDK connected", "rgba(34, 197, 94, 0.7)");
      refreshUser(shell, sdk);
    });

    sdk.addEventListener(events.BACKEND_DISCONNECTED, () => {
      setStatus(shell, "SDK disconnected", "rgba(248, 113, 113, 0.7)");
    });

    sdk.addEventListener(events.BACKEND_RECONNECTING, () => {
      setStatus(shell, "SDK reconnecting", "rgba(250, 204, 21, 0.7)");
    });
  }

  async function waitForSdkReady(sdk, timeoutMs) {
    const start = performance.now();

    while (performance.now() - start < timeoutMs) {
      try {
        if (typeof sdk.isReady !== "function" || sdk.isReady()) {
          return true;
        }
      } catch (error) {
        console.warn("Wavedash readiness check failed", error);
      }
      await sleep(50);
    }

    try {
      return typeof sdk.isReady !== "function" || sdk.isReady();
    } catch (error) {
      return false;
    }
  }

  function updateLoading(shell, sdk, label, progress, detail) {
    shell.overlayStep.textContent = label;
    shell.overlayDetail.textContent = detail;
    shell.overlayPercent.textContent = `${Math.round(progress * 100)}%`;
    shell.overlayProgressFill.style.width = `${Math.max(6, Math.round(progress * 100))}%`;

    try {
      if (typeof sdk.updateLoadProgressZeroToOne === "function") {
        sdk.updateLoadProgressZeroToOne(progress);
      }
    } catch (error) {
      console.warn("Unable to update Wavedash load progress", error);
    }
  }

  async function runStep(shell, sdk, label, progress, detail, task) {
    updateLoading(shell, sdk, label, progress, detail);
    await sleep(70);
    return task();
  }

  function showFatal(shell, message, error) {
    shell.overlay.style.opacity = "1";
    shell.overlay.style.pointerEvents = "auto";
    shell.overlayTitle.textContent = "Failed to boot example-zig";
    shell.overlayStep.textContent = message;
    shell.overlayProgressFill.style.width = "100%";
    shell.overlayProgressFill.style.background = "linear-gradient(90deg, #f97316 0%, #ef4444 100%)";
    shell.overlayPercent.textContent = "error";

    const extra = window.location.protocol === "file:"
      ? "Serve build/web over HTTP instead of opening index.html with file://."
      : (error && error.message) || String(error);
    shell.overlayDetail.textContent = extra;
  }

  async function instantiateWasm(url, imports) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        const streamed = await WebAssembly.instantiateStreaming(response.clone(), imports);
        return streamed.instance;
      } catch (error) {
        console.warn("instantiateStreaming failed, falling back to arrayBuffer", error);
      }
    }

    const bytes = await response.arrayBuffer();
    const instantiated = await WebAssembly.instantiate(bytes, imports);
    return instantiated.instance;
  }

  async function main() {
    const sdk = ensureWavedash();
    const target = ensureTarget();
    const shell = createShell(target);
    const renderer = createRenderer(shell.canvas, target);
    const input = createInput();
    wireInput(input);

    refreshUser(shell, sdk);
    attachSdkListeners(shell, sdk);

    let wasmInstance = null;
    const textDecoder = new TextDecoder();

    await runStep(
      shell,
      sdk,
      "Preparing game shell",
      0.08,
      "Creating the canvas target and local HUD.",
      async () => {
        renderer.resize();
      }
    );

    await runStep(
      shell,
      sdk,
      "Initializing Wavedash SDK",
      0.24,
      "Calling WavedashJS.init with deferred events enabled.",
      async () => {
        if (typeof sdk.init === "function") {
          sdk.init({
            debug: true,
            deferEvents: true,
          });
        }

        const ready = await waitForSdkReady(sdk, 1800);
        setStatus(
          shell,
          ready ? "SDK ready" : "SDK waiting",
          ready ? "rgba(34, 197, 94, 0.7)" : "rgba(250, 204, 21, 0.7)"
        );
        refreshUser(shell, sdk);
      }
    );

    const imports = {
      env: {
        js_clear(r, g, b, a) {
          const ctx = renderer.ctx;
          ctx.setTransform(renderer.pixelRatio, 0, 0, renderer.pixelRatio, 0, 0);
          ctx.fillStyle = rgba(r, g, b, a);
          ctx.fillRect(0, 0, renderer.width, renderer.height);
        },
        js_fill_rect(x, y, width, height, r, g, b, a) {
          const ctx = renderer.ctx;
          ctx.fillStyle = rgba(r, g, b, a);
          ctx.fillRect(x, y, width, height);
        },
        js_draw_text(ptr, len, x, y, size, r, g, b, a) {
          if (!wasmInstance || !wasmInstance.exports.memory) {
            return;
          }

          const bytes = new Uint8Array(wasmInstance.exports.memory.buffer, ptr, len);
          const text = textDecoder.decode(bytes);
          const ctx = renderer.ctx;
          ctx.fillStyle = rgba(r, g, b, a);
          ctx.font = `700 ${Math.max(12, size)}px Inter, system-ui, sans-serif`;
          ctx.fillText(text, x, y);
        },
      },
    };

    await runStep(
      shell,
      sdk,
      "Fetching Zig WASM module",
      0.52,
      "Downloading the Pong game logic compiled from Zig.",
      async () => {
        /* Progress step only. The actual fetch happens in the next step. */
      }
    );

    await runStep(
      shell,
      sdk,
      "Instantiating WebAssembly",
      0.76,
      "Binding JS drawing calls and preparing the game loop.",
      async () => {
        wasmInstance = await instantiateWasm("./game.wasm", imports);
      }
    );

    await runStep(
      shell,
      sdk,
      "Finalizing game startup",
      0.92,
      "Sizing the canvas, wiring resize handling, and starting Pong.",
      async () => {
        const exports = wasmInstance.exports;
        exports.wd_init(renderer.width, renderer.height);

        window.addEventListener("resize", () => {
          renderer.resize();
          exports.wd_resize(renderer.width, renderer.height);
        });
      }
    );

    await runStep(
      shell,
      sdk,
      "Loading complete",
      1.0,
      "Releasing deferred SDK events and handing over to gameplay.",
      async () => {
        if (typeof sdk.readyForEvents === "function") {
          sdk.readyForEvents();
        }
        if (typeof sdk.loadComplete === "function") {
          sdk.loadComplete();
        }
      }
    );

    shell.overlay.style.opacity = "0";
    shell.overlay.style.pointerEvents = "none";

    let lastFrame = performance.now();
    const exports = wasmInstance.exports;

    function frame(now) {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;

      exports.wd_tick(
        dt,
        input.up ? 1 : 0,
        input.down ? 1 : 0,
        input.startPressed ? 1 : 0
      );

      input.startPressed = false;
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  main().catch((error) => {
    console.error(error);

    const target = ensureTarget();
    const shell = createShell(target);
    showFatal(shell, "The browser entrypoint hit an error.", error);
  });
})();
