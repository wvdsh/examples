(function () {
  // JS owns browser plumbing only. Rust owns startup sequencing and gameplay.
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

  function getRequiredWavedash() {
    if (window.WavedashJS) {
      return window.WavedashJS;
    }

    throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
  }

  // DOM shell and loading HUD.
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
      alignItems: "flex-start",
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

    const statusPill = document.createElement("div");
    const userPill = document.createElement("div");
    const controlPill = document.createElement("div");

    [statusPill, userPill, controlPill].forEach((pill) => {
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
    title.textContent = "Booting example-rust";

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
    detail.textContent = "Load stepping, SDK init, then a Rust Pong demo.";

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

  // Canvas and input helpers.
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

  function setUser(shell, username) {
    shell.userPill.textContent = username ? `User ${username}` : "User unavailable";
  }

  function attachSdkListeners(shell, sdk) {
    const events = sdk.Events || SDK_EVENTS;

    sdk.addEventListener(events.BACKEND_CONNECTED, () => {
      setStatus(shell, "SDK connected", "rgba(34, 197, 94, 0.7)");
    });

    sdk.addEventListener(events.BACKEND_DISCONNECTED, () => {
      setStatus(shell, "SDK disconnected", "rgba(248, 113, 113, 0.7)");
    });

    sdk.addEventListener(events.BACKEND_RECONNECTING, () => {
      setStatus(shell, "SDK reconnecting", "rgba(250, 204, 21, 0.7)");
    });
  }

  function updateLoading(shell, label, progress, detail) {
    shell.overlayStep.textContent = label;
    shell.overlayDetail.textContent = detail;
    shell.overlayPercent.textContent = `${Math.round(progress * 100)}%`;
    shell.overlayProgressFill.style.width = `${Math.max(6, Math.round(progress * 100))}%`;
  }

  function syncLoadProgress(sdk, progress) {
    try {
      if (typeof sdk.updateLoadProgressZeroToOne === "function") {
        sdk.updateLoadProgressZeroToOne(progress);
      }
    } catch (error) {
      console.warn("Unable to update Wavedash load progress", error);
    }
  }

  async function runStep(shell, sdk, label, progress, detail, task) {
    updateLoading(shell, label, progress, detail);
    syncLoadProgress(sdk, progress);
    await sleep(70);
    return task();
  }

  function showFatal(shell, message, error) {
    shell.overlay.style.opacity = "1";
    shell.overlay.style.pointerEvents = "auto";
    shell.overlayTitle.textContent = "Failed to boot example-rust";
    shell.overlayStep.textContent = message;
    shell.overlayProgressFill.style.width = "100%";
    shell.overlayProgressFill.style.background = "linear-gradient(90deg, #f97316 0%, #ef4444 100%)";
    shell.overlayPercent.textContent = "error";

    const extra = (error && error.message) || String(error);
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

  function decodeWasmString(wasmInstance, textDecoder, ptr, len) {
    if (!wasmInstance || !wasmInstance.exports.memory || len === 0) {
      return "";
    }

    const bytes = new Uint8Array(wasmInstance.exports.memory.buffer, ptr, len);
    return textDecoder.decode(bytes);
  }

  function writeWasmString(wasmInstance, textEncoder, ptr, maxLen, value) {
    if (!wasmInstance || !wasmInstance.exports.memory || maxLen === 0) {
      return 0;
    }

    const source = textEncoder.encode(value);
    const bytes = new Uint8Array(wasmInstance.exports.memory.buffer, ptr, maxLen);
    const writeLen = Math.min(source.length, maxLen);

    bytes.fill(0);
    bytes.set(source.subarray(0, writeLen), 0);
    return writeLen;
  }

  // Boot the host, instantiate the raw wasm module, then hand control to Rust.
  async function main() {
    const sdk = getRequiredWavedash();
    const target = ensureTarget();
    const shell = createShell(target);
    const renderer = createRenderer(shell.canvas, target);
    const input = createInput();
    wireInput(input);

    attachSdkListeners(shell, sdk);
    setStatus(shell, "SDK pending", "rgba(148, 163, 184, 0.42)");
    setUser(shell, "");

    let wasmInstance = null;
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    let hostError = "";

    function captureHostError(label, error) {
      const detail = `${label}: ${(error && error.message) || String(error)}`;
      if (!hostError) {
        hostError = detail;
      }
      console.error(detail, error);
    }

    await runStep(
      shell,
      sdk,
      "Preparing game shell",
      0.08,
      "Creating the canvas target, startup HUD, and JS host bridge.",
      async () => {
        renderer.resize();
      }
    );

    await runStep(
      shell,
      sdk,
      "Fetching Rust WASM module",
      0.18,
      "Downloading the Rust game binary before handing startup control to WebAssembly.",
      async () => {
        /* Progress step only. The actual fetch happens in the next step. */
      }
    );

    const imports = {
      // Keep the import surface narrow: Rust asks JS to draw, update host UI,
      // and talk to WavedashJS, but JS does not own any gameplay rules.
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
          const text = decodeWasmString(wasmInstance, textDecoder, ptr, len);
          const ctx = renderer.ctx;
          ctx.fillStyle = rgba(r, g, b, a);
          ctx.font = `700 ${Math.max(12, size)}px Inter, system-ui, sans-serif`;
          ctx.fillText(text, x, y);
        },
        js_host_set_loading(stepPtr, stepLen, detailPtr, detailLen, progress) {
          updateLoading(
            shell,
            decodeWasmString(wasmInstance, textDecoder, stepPtr, stepLen),
            progress,
            decodeWasmString(wasmInstance, textDecoder, detailPtr, detailLen)
          );
        },
        js_host_set_status(ptr, len, r, g, b, a) {
          setStatus(shell, decodeWasmString(wasmInstance, textDecoder, ptr, len), rgba(r, g, b, a));
        },
        js_host_set_user(ptr, len) {
          setUser(shell, decodeWasmString(wasmInstance, textDecoder, ptr, len));
        },
        js_host_hide_overlay() {
          shell.overlay.style.opacity = "0";
          shell.overlay.style.pointerEvents = "none";
        },
        js_host_show_fatal(messagePtr, messageLen, detailPtr, detailLen) {
          showFatal(
            shell,
            decodeWasmString(wasmInstance, textDecoder, messagePtr, messageLen),
            decodeWasmString(wasmInstance, textDecoder, detailPtr, detailLen)
          );
        },
        js_host_has_error() {
          return hostError ? 1 : 0;
        },
        js_host_write_error(ptr, maxLen) {
          return writeWasmString(wasmInstance, textEncoder, ptr, maxLen, hostError);
        },
        js_wd_init(debug, deferEvents) {
          try {
            Promise.resolve(
              sdk.init({
                debug: Boolean(debug),
                deferEvents: Boolean(deferEvents),
              })
            ).catch((error) => {
              captureHostError("WavedashJS.init failed", error);
            });
          } catch (error) {
            captureHostError("WavedashJS.init failed", error);
          }
        },
        js_wd_is_ready() {
          try {
            return typeof sdk.isReady !== "function" || sdk.isReady() ? 1 : 0;
          } catch (error) {
            captureHostError("WavedashJS.isReady failed", error);
            return 0;
          }
        },
        js_wd_update_load_progress(progress) {
          try {
            if (typeof sdk.updateLoadProgressZeroToOne === "function") {
              sdk.updateLoadProgressZeroToOne(progress);
            }
          } catch (error) {
            captureHostError("WavedashJS.updateLoadProgressZeroToOne failed", error);
          }
        },
        js_wd_ready_for_events() {
          try {
            Promise.resolve(
              typeof sdk.readyForEvents === "function" ? sdk.readyForEvents() : undefined
            ).catch((error) => {
              captureHostError("WavedashJS.readyForEvents failed", error);
            });
          } catch (error) {
            captureHostError("WavedashJS.readyForEvents failed", error);
          }
        },
        js_wd_load_complete() {
          try {
            Promise.resolve(typeof sdk.loadComplete === "function" ? sdk.loadComplete() : undefined).catch(
              (error) => {
                captureHostError("WavedashJS.loadComplete failed", error);
              }
            );
          } catch (error) {
            captureHostError("WavedashJS.loadComplete failed", error);
          }
        },
        js_wd_write_user_name(ptr, maxLen) {
          try {
            const user = typeof sdk.getUser === "function" ? sdk.getUser() : null;
            const username = user && typeof user.username === "string" ? user.username : "";
            return writeWasmString(wasmInstance, textEncoder, ptr, maxLen, username);
          } catch (error) {
            captureHostError("WavedashJS.getUser failed", error);
            return 0;
          }
        },
      },
    };

    await runStep(
      shell,
      sdk,
      "Instantiating WebAssembly",
      0.30,
      "Creating the Rust runtime and binding browser host functions.",
      async () => {
        wasmInstance = await instantiateWasm("./game.wasm", imports);
      }
    );

    let lastFrame = performance.now();
    const exports = wasmInstance.exports;

    exports.wd_init(renderer.width, renderer.height);

    window.addEventListener("resize", () => {
      renderer.resize();
      exports.wd_resize(renderer.width, renderer.height);
    });

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
