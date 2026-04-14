(function () {
  const SDK_EVENTS = {
    BACKEND_CONNECTED: "BackendConnected",
    BACKEND_DISCONNECTED: "BackendDisconnected",
    BACKEND_RECONNECTING: "BackendReconnecting",
  };
  const RENPY_WEB_ENTRYPOINT = "./renpy/index.html?embedded=1";

  function style(element, styles) {
    Object.assign(element.style, styles);
    return element;
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function log(message, detail) {
    if (detail === undefined) {
      console.info(`[example-renpy] ${message}`);
      return;
    }

    console.info(`[example-renpy] ${message}`, detail);
  }

  function getRequiredWavedash() {
    if (window.WavedashJS) {
      return window.WavedashJS;
    }

    throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
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

    const stage = document.createElement("div");
    style(stage, {
      position: "absolute",
      inset: "0",
      background: "#030712",
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
      pointerEvents: "none",
      zIndex: "3",
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
    const enginePill = createPill("Ren'Py web export");

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
      background: "rgba(2, 6, 23, 0.72)",
      zIndex: "4",
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
    overlayTitle.textContent = "Booting example-renpy";

    const overlayStep = document.createElement("div");
    style(overlayStep, {
      fontSize: "28px",
      lineHeight: "1.2",
      color: "#f8fafc",
      fontWeight: "700",
      marginBottom: "18px",
    });
    overlayStep.textContent = "Preparing custom-engine shell";

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
    overlayDetail.textContent = "Creating the top-level Wavedash shell and bridge.";

    const overlayPercent = document.createElement("span");
    overlayPercent.textContent = "6%";

    progressTrack.append(overlayProgressFill);
    infoRow.append(overlayDetail, overlayPercent);
    card.append(overlayTitle, overlayStep, progressTrack, infoRow);
    overlay.append(card);

    target.append(stage, hud, overlay);

    return {
      stage,
      overlay,
      statusPill,
      runtimePill,
      userPill,
      overlayTitle,
      overlayStep,
      overlayDetail,
      overlayPercent,
      overlayProgressFill,
    };
  }

  function setPill(pill, text, borderColor) {
    pill.textContent = text;
    if (borderColor) {
      pill.style.borderColor = borderColor;
    }
  }

  function readUserName(sdk) {
    try {
      const user = typeof sdk.getUser === "function" ? sdk.getUser() : null;
      return user?.username || user?.name || user?.id || "";
    } catch (error) {
      console.warn("[example-renpy] Unable to read Wavedash user", error);
      return "";
    }
  }

  function refreshUser(shell, sdk) {
    const displayName = readUserName(sdk);
    shell.userPill.textContent = displayName ? `User ${displayName}` : "User unavailable";
  }

  function normalizeProgress(progress) {
    const numeric = Number(progress);
    if (!Number.isFinite(numeric)) {
      return 0;
    }

    return Math.max(0, Math.min(1, numeric));
  }

  function updateLoading(shell, sdk, label, progress, detail) {
    const clampedProgress = normalizeProgress(progress);

    shell.overlayStep.textContent = label;
    shell.overlayDetail.textContent = detail;
    shell.overlayPercent.textContent = `${Math.round(clampedProgress * 100)}%`;
    shell.overlayProgressFill.style.width = `${Math.max(6, Math.round(clampedProgress * 100))}%`;

    try {
      if (typeof sdk.updateLoadProgressZeroToOne === "function") {
        sdk.updateLoadProgressZeroToOne(clampedProgress);
      }
    } catch (error) {
      console.warn("[example-renpy] Unable to update Wavedash load progress", error);
    }
  }

  function hideOverlay(shell) {
    shell.overlay.style.opacity = "0";
    shell.overlay.style.pointerEvents = "none";
  }

  function showFatal(shell, message, error) {
    shell.overlay.style.opacity = "1";
    shell.overlay.style.pointerEvents = "auto";
    shell.overlayTitle.textContent = "Failed to boot example-renpy";
    shell.overlayStep.textContent = message;
    shell.overlayProgressFill.style.width = "100%";
    shell.overlayProgressFill.style.background = "linear-gradient(90deg, #f97316 0%, #ef4444 100%)";
    shell.overlayPercent.textContent = "error";
    shell.overlayDetail.textContent = (error && error.message) || String(error);
  }

  function attachSdkListeners(sdk, callbacks) {
    if (!sdk || typeof sdk.addEventListener !== "function") {
      return () => {};
    }

    const events = sdk.Events || SDK_EVENTS;
    const listeners = [
      [events.BACKEND_CONNECTED, callbacks.onConnected],
      [events.BACKEND_DISCONNECTED, callbacks.onDisconnected],
      [events.BACKEND_RECONNECTING, callbacks.onReconnecting],
    ].filter(([, handler]) => typeof handler === "function");

    listeners.forEach(([eventName, handler]) => {
      sdk.addEventListener(eventName, handler);
    });

    return () => {
      listeners.forEach(([eventName, handler]) => {
        sdk.removeEventListener(eventName, handler);
      });
    };
  }

  // This bridge is intentionally small: it only exposes the browser-only
  // pieces Ren'Py cannot call directly. Ren'Py decides when these are used.
  function createBridge(sdk, shell) {
    const state = {
      iframe: null,
      sdkInitStarted: false,
      sdkInitResolved: false,
      readyForEventsSent: false,
      loadCompleteSent: false,
      lifecycleQueue: Promise.resolve(),
      lastError: "",
    };

    function captureError(message, error) {
      const detail = (error && error.message) || String(error);
      const combined = `${message}: ${detail}`;

      if (!state.lastError) {
        state.lastError = combined;
      }

      console.error(`[example-renpy] ${combined}`, error);
      showFatal(shell, message, detail);
    }

    function queueLifecycle(methodName, task) {
      state.lifecycleQueue = state.lifecycleQueue
        .then(task)
        .catch((error) => {
          captureError(`WavedashJS.${methodName} failed`, error);
        });
    }

    return {
      setIframe(iframe) {
        state.iframe = iframe;
      },

      setLoading(step, progress, detail) {
        log(step);
        updateLoading(shell, sdk, String(step), progress, String(detail));
      },

      initSdk() {
        if (state.sdkInitStarted) {
          return;
        }

        state.sdkInitStarted = true;
        setPill(shell.statusPill, "SDK starting", "rgba(250, 204, 21, 0.65)");

        try {
          Promise.resolve(
            typeof sdk.init === "function"
              ? sdk.init({
                  debug: true,
                  deferEvents: true,
                })
              : undefined
          )
            .then(() => {
              state.sdkInitResolved = true;
              setPill(shell.statusPill, "SDK started", "rgba(250, 204, 21, 0.65)");
              refreshUser(shell, sdk);
            })
            .catch((error) => {
              captureError("WavedashJS.init failed", error);
            });
        } catch (error) {
          captureError("WavedashJS.init failed", error);
        }
      },

      isSdkReady() {
        if (!state.sdkInitStarted || !state.sdkInitResolved || state.lastError) {
          return 0;
        }

        try {
          if (typeof sdk.isReady !== "function" || sdk.isReady()) {
            setPill(shell.statusPill, "SDK ready", "rgba(34, 197, 94, 0.65)");
            refreshUser(shell, sdk);
            return 1;
          }
        } catch (error) {
          captureError("WavedashJS.isReady failed", error);
        }

        return 0;
      },

      getLastError() {
        return state.lastError;
      },

      getUserName() {
        return readUserName(sdk);
      },

      exposePlayable() {
        hideOverlay(shell);

        if (state.iframe && typeof state.iframe.focus === "function") {
          window.setTimeout(() => {
            state.iframe.focus();
          }, 0);
        }
      },

      readyForEvents() {
        if (state.readyForEventsSent) {
          return;
        }

        queueLifecycle("readyForEvents", async () => {
          if (state.readyForEventsSent) {
            return;
          }

          if (typeof sdk.readyForEvents === "function") {
            await Promise.resolve(sdk.readyForEvents());
          }

          state.readyForEventsSent = true;
          setPill(shell.statusPill, "SDK connected", "rgba(34, 197, 94, 0.65)");
        });
      },

      loadComplete() {
        if (state.loadCompleteSent) {
          return;
        }

        queueLifecycle("loadComplete", async () => {
          if (state.loadCompleteSent) {
            return;
          }

          updateLoading(
            shell,
            sdk,
            "Loading complete",
            1,
            "The first interactive Ren'Py screen is visible and can accept input."
          );

          if (typeof sdk.loadComplete === "function") {
            await Promise.resolve(sdk.loadComplete());
          }

          state.loadCompleteSent = true;
        });
      },

      showFatal(message, detail) {
        captureError(String(message), new Error(String(detail)));
      },
    };
  }

  async function main() {
    const sdk = getRequiredWavedash();
    const target = ensureTarget();
    const shell = createShell(target);

    setPill(shell.runtimePill, "Runtime Ren'Py Web", "rgba(56, 189, 248, 0.55)");
    setPill(shell.statusPill, "SDK pending", "rgba(148, 163, 184, 0.42)");
    refreshUser(shell, sdk);

    const detachSdkListeners = attachSdkListeners(sdk, {
      onConnected: () => {
        log("Backend connected event received");
        setPill(shell.statusPill, "SDK connected", "rgba(34, 197, 94, 0.65)");
        refreshUser(shell, sdk);
      },
      onDisconnected: () => {
        log("Backend disconnected event received");
        setPill(shell.statusPill, "SDK disconnected", "rgba(248, 113, 113, 0.65)");
      },
      onReconnecting: () => {
        log("Backend reconnecting event received");
        setPill(shell.statusPill, "SDK reconnecting", "rgba(250, 204, 21, 0.65)");
      },
    });

    const bridge = createBridge(sdk, shell);
    window.__ExampleRenpyBridge = bridge;

    try {
      updateLoading(
        shell,
        sdk,
        "Preparing custom-engine shell",
        0.06,
        "Creating the Wavedash target, status HUD, and the Ren'Py bridge."
      );
      await sleep(70);

      updateLoading(
        shell,
        sdk,
        "Mounting Ren'Py export",
        0.18,
        "Embedding the generated Ren'Py web build inside the custom-engine shell."
      );
      await sleep(70);

      const iframe = document.createElement("iframe");
      style(iframe, {
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        border: "0",
        display: "block",
        background: "#030712",
      });
      iframe.tabIndex = 0;
      iframe.title = "example-renpy";
      iframe.setAttribute("allow", "autoplay; fullscreen");
      iframe.addEventListener("load", () => {
        bridge.setIframe(iframe);
        updateLoading(
          shell,
          sdk,
          "Waiting for Ren'Py runtime",
          0.32,
          "The exported Ren'Py page is live. Ren'Py now owns the rest of startup."
        );
      });

      bridge.setIframe(iframe);
      shell.stage.appendChild(iframe);
      iframe.src = RENPY_WEB_ENTRYPOINT;
    } catch (error) {
      detachSdkListeners();
      showFatal(shell, "The browser entrypoint hit an error.", error);
    }
  }

  main().catch((error) => {
    console.error(error);

    const target = ensureTarget();
    const shell = createShell(target);
    showFatal(shell, "The browser entrypoint hit an error.", error);
  });
})();
