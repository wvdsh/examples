// Wavedash SDK bridge. C# calls these via IJSRuntime.
//
// To add a new SDK method, expose a window.wavedashX function here and call
// it from C# as `js.InvokeVoidAsync("wavedashX", args...)`.
(function () {
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

  window.wavedashInit = async function () {
    const sdk = await waitForSdk();
    sdk.init({ debug: true });
  };

  window.wavedashUpdateLoadProgress = async function (value) {
    const sdk = await waitForSdk();
    const clamped = Math.max(0, Math.min(1, Number(value) || 0));
    sdk.updateLoadProgressZeroToOne(clamped);
  };
})();
