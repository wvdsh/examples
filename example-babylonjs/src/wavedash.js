export const SDK_EVENTS = {
  BACKEND_CONNECTED: "BackendConnected",
  BACKEND_DISCONNECTED: "BackendDisconnected",
  BACKEND_RECONNECTING: "BackendReconnecting",
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

class LocalWavedash extends EventTarget {
  constructor() {
    super();
    this.Events = SDK_EVENTS;
    this.__localShim = true;
    this._ready = false;
    this._deferEvents = false;
    this._queuedEvents = [];
    this._progress = 0;
    this._loadComplete = false;
    this._connectTimer = 0;
    this._user = {
      id: "local-player",
      username: "Local Player",
    };
  }

  init(config = {}) {
    console.info("[example-babylonjs] Local Wavedash shim init", config);
    this._ready = false;
    this._deferEvents = Boolean(config.deferEvents);
    this._queuedEvents.length = 0;
    window.clearTimeout(this._connectTimer);

    this._connectTimer = window.setTimeout(() => {
      this._ready = true;
      this._emit(this.Events.BACKEND_CONNECTED, {
        isConnected: true,
        hasEverConnected: true,
        connectionCount: 1,
        connectionRetries: 0,
      });
    }, 150);
  }

  isReady() {
    return this._ready;
  }

  readyForEvents() {
    console.info("[example-babylonjs] readyForEvents()");
    this._deferEvents = false;

    while (this._queuedEvents.length > 0) {
      super.dispatchEvent(this._queuedEvents.shift());
    }
  }

  updateLoadProgressZeroToOne(progress) {
    this._progress = Math.max(0, Math.min(1, progress));
  }

  loadComplete() {
    this._loadComplete = true;
    console.info("[example-babylonjs] loadComplete()");
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

export function ensureWavedash() {
  if (window.WavedashJS) {
    return window.WavedashJS;
  }

  window.WavedashJS = new LocalWavedash();
  return window.WavedashJS;
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
