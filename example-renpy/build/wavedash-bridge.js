// Wavedash SDK bridge for Ren'Py.
//
// Ren'Py's renpy.emscripten.run_script runs in a sandboxed JS context that
// can't see `window`. But Python's print() is piped through Emscripten's
// Module.print, which Ren'Py routes to both console.log AND an in-game
// status overlay. We install a setter on Module.print so renpy-pre.js's
// assignment is wrapped: [WAVEDASH_BRIDGE] lines are dispatched to
// WavedashJS and swallowed; everything else reaches Ren'Py's real printer
// untouched.
(function () {
  const PREFIX = "[WAVEDASH_BRIDGE]";

  let sdkPromise = null;
  function waitForSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      (function poll() {
        if (window.WavedashJS) return resolve(window.WavedashJS);
        if (Date.now() > deadline) return reject(new Error("window.WavedashJS not injected."));
        setTimeout(poll, 50);
      })();
    });
    return sdkPromise;
  }

  const handlers = {
    updateLoadProgress(raw) {
      const v = Math.max(0, Math.min(1, Number(raw) || 0));
      waitForSdk().then((sdk) => sdk.updateLoadProgressZeroToOne(v))
        .catch((e) => console.error("[example-renpy]", e));
    },
    initSdk() {
      waitForSdk().then((sdk) => sdk.init({ debug: true }))
        .catch((e) => console.error("[example-renpy]", e));
    },
  };

  function handleCommand(line) {
    const [name, ...rest] = line.split(":");
    const handler = handlers[name];
    if (handler) handler(rest.join(":"));
  }

  function wrap(fn) {
    return function (s) {
      if (typeof s === "string" && s.startsWith(PREFIX)) {
        handleCommand(s.slice(PREFIX.length));
        return;
      }
      if (fn) fn(s);
    };
  }

  // renpy-pre.js does `Module.print = printMessage` after we load. Intercept
  // that assignment via a setter so we sit in front of Ren'Py's printer.
  window.Module = window.Module || {};
  let _print = window.Module.print ? wrap(window.Module.print) : null;
  let _printErr = window.Module.printErr ? wrap(window.Module.printErr) : null;
  Object.defineProperty(window.Module, "print", {
    configurable: true,
    get: () => _print,
    set: (fn) => { _print = wrap(fn); },
  });
  Object.defineProperty(window.Module, "printErr", {
    configurable: true,
    get: () => _printErr,
    set: (fn) => { _printErr = wrap(fn); },
  });
})();
