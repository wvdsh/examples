export const SDK_EVENTS = {
  BACKEND_CONNECTED: "BackendConnected",
  BACKEND_DISCONNECTED: "BackendDisconnected",
  BACKEND_RECONNECTING: "BackendReconnecting",
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function getRequiredWavedash() {
  if (window.WavedashJS) {
    return window.WavedashJS;
  }

  throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
}

export function attachSdkListeners(sdk, callbacks) {
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

export async function waitForSdkReady(sdk, timeoutMs = 5000) {
  const startedAt = performance.now();

  while (performance.now() - startedAt < timeoutMs) {
    try {
      if (typeof sdk.isReady !== "function" || sdk.isReady()) {
        return true;
      }
    } catch (error) {
      console.warn("[example-babylonjs] Wavedash readiness check failed", error);
    }

    await sleep(50);
  }

  try {
    return typeof sdk.isReady !== "function" || sdk.isReady();
  } catch (error) {
    console.warn("[example-babylonjs] Final readiness check failed", error);
    return false;
  }
}
