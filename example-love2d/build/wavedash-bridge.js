// Lua -> JS bridge for LÖVE.js.
//
// LÖVE's `print()` is piped through Emscripten's Module.print, which ultimately
// calls console.log. We install a console.log wrapper *before* love.js loads,
// so when love.js captures console.log into Module.print, our wrapper is what
// gets captured. Any line starting with PREFIX is treated as an SDK command;
// everything else passes through to the real console.log untouched.
//
// To expose more SDK methods to Lua, add a handler below and have wavedash.lua
// print(`${PREFIX}yourCommand:arg1:arg2`) from game code.
(function () {
  const PREFIX = "[WAVEDASH_BRIDGE]";
  let sdkPromise = null;
  let queue = Promise.resolve();

  // Wrap window.fetch so the .love package download streams bytes through the
  // SDK loading bar before the game starts (player.js loads game.love via fetch).
  const realFetch = window.fetch.bind(window);
  let _wdSdkSync = null;
  Promise.resolve(window.WavedashJS).then((sdk) => { _wdSdkSync = sdk; });
  window.fetch = async (input, init) => {
    const response = await realFetch(input, init);
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!url.endsWith(".love") || !response.body) return response;
    const total = +response.headers.get("Content-Length") || 0;
    if (!total) return response;
    const reader = response.body.getReader();
    let received = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          if (_wdSdkSync) _wdSdkSync.updateLoadProgressZeroToOne(0.95);
          controller.close();
          return;
        }
        received += value.length;
        if (_wdSdkSync) _wdSdkSync.updateLoadProgressZeroToOne((received / total) * 0.95);
        controller.enqueue(value);
      },
      cancel(reason) { return reader.cancel(reason); },
    });
    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };

  function waitForSdk() {
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      (function poll() {
        if (window.WavedashJS) return resolve(window.WavedashJS);
        if (Date.now() > deadline) {
          return reject(new Error("window.WavedashJS was never injected. Run inside `wavedash dev`."));
        }
        setTimeout(poll, 50);
      })();
    });

    return sdkPromise;
  }

  function dispatch(run) {
    queue = queue.then(() => waitForSdk()).then(run).catch((error) => {
      console.error("[example-love2d] SDK call failed", error);
    });
  }

  const handlers = {
    init() {
      dispatch((sdk) => sdk.init({ debug: true }));
    },
    progress(raw) {
      const value = Math.max(0, Math.min(1, Number(raw) || 0));
      dispatch((sdk) => sdk.updateLoadProgressZeroToOne(value));
    },
  };

  function handleCommand(line) {
    const [name, ...rest] = line.split(":");
    const handler = handlers[name];
    if (handler) handler(rest.join(":"));
  }

  const realLog = console.log.bind(console);
  console.log = function (...args) {
    if (args.length === 1 && typeof args[0] === "string" && args[0].startsWith(PREFIX)) {
      handleCommand(args[0].slice(PREFIX.length));
      return;
    }
    realLog(...args);
  };
})();
