(function () {
  const state = {
    sdkPromise: null,
    queue: Promise.resolve(),
    initSent: false,
    readyForEventsSent: false,
    loadCompleteSent: false,
    lastProgress: 0,
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function toBoolean(value) {
    return value === true || value === 1 || value === "1" || value === "true";
  }

  function clamp01(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  async function waitForInjectedSdk() {
    const timeoutAt = Date.now() + 15000;

    while (!window.WavedashJS) {
      if (Date.now() >= timeoutAt) {
        throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
      }

      await sleep(50);
    }

    return Promise.resolve(window.WavedashJS);
  }

  function getSdkPromise() {
    if (!state.sdkPromise) {
      state.sdkPromise = waitForInjectedSdk();
    }

    return state.sdkPromise;
  }

  function enqueue(label, work) {
    // The Lua side emits fire-and-forget browser calls; queue them here so the
    // async SDK lifecycle still executes in a predictable order.
    state.queue = state.queue.catch(() => undefined).then(async () => {
      try {
        const sdk = await getSdkPromise();
        await work(sdk);
      } catch (error) {
        console.error(`[example-love2d] ${label} failed`, error);
      }
    });

    return state.queue;
  }

  window.WavedashBridge = {
    init(debug, deferEvents) {
      if (state.initSent) {
        return state.queue;
      }

      state.initSent = true;

      return enqueue("WavedashJS.init", async (sdk) => {
        await Promise.resolve(
          sdk.init({
            debug: toBoolean(debug),
            deferEvents: toBoolean(deferEvents),
          })
        );
      });
    },

    progress(value) {
      const next = Math.max(state.lastProgress, clamp01(value));
      state.lastProgress = next;

      return enqueue("WavedashJS.updateLoadProgressZeroToOne", async (sdk) => {
        await Promise.resolve(sdk.updateLoadProgressZeroToOne(next));
      });
    },

    readyForEvents() {
      if (state.readyForEventsSent) {
        return state.queue;
      }

      state.readyForEventsSent = true;

      return enqueue("WavedashJS.readyForEvents", async (sdk) => {
        if (typeof sdk.readyForEvents === "function") {
          await Promise.resolve(sdk.readyForEvents());
        }
      });
    },

    loadComplete() {
      if (state.loadCompleteSent) {
        return state.queue;
      }

      state.loadCompleteSent = true;

      return enqueue("WavedashJS.loadComplete", async (sdk) => {
        await Promise.resolve(sdk.loadComplete());
      });
    },
  };
})();
