export const SDK_EVENTS = {
  BACKEND_CONNECTED: "BackendConnected",
  BACKEND_DISCONNECTED: "BackendDisconnected",
  BACKEND_RECONNECTING: "BackendReconnecting",
};

function sleep(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export function getRequiredWavedash() {
  if (globalThis.WavedashJS) {
    return globalThis.WavedashJS;
  }

  throw new Error(
    "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected."
  );
}

export function attachSdkListeners(sdk, callbacks = {}) {
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
      if (typeof sdk.removeEventListener === "function") {
        sdk.removeEventListener(eventName, handler);
      }
    });
  };
}

export function describeUser(sdk) {
  if (!sdk || typeof sdk.getUser !== "function") {
    return "pending";
  }

  try {
    const user = sdk.getUser();
    return user?.username || user?.name || user?.id || "unavailable";
  } catch (error) {
    console.warn("[example-construct] Unable to read Wavedash user", error);
    return "unavailable";
  }
}

export async function waitForSdkReady(sdk, timeoutMs = 6000) {
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
      console.warn("[example-construct] Wavedash readiness check failed", error);
    }

    await sleep(50);
  }

  try {
    return sdk.isReady();
  } catch (error) {
    console.warn("[example-construct] Final Wavedash readiness check failed", error);
    return false;
  }
}

export async function initSdk(sdk) {
  if (typeof sdk.init === "function") {
    await Promise.resolve(
      sdk.init({
        debug: true,
        deferEvents: true,
      })
    );
  }

  return waitForSdkReady(sdk, 6000);
}

export async function reportProgress(sdk, progress) {
  if (typeof sdk.updateLoadProgressZeroToOne === "function") {
    sdk.updateLoadProgressZeroToOne(progress);
  }

  await sleep(60);
}

export async function finalizeSdk(sdk) {
  if (typeof sdk.readyForEvents === "function") {
    await Promise.resolve(sdk.readyForEvents());
  }

  if (typeof sdk.loadComplete === "function") {
    await Promise.resolve(sdk.loadComplete());
  }
}
