// Wavedash SDK bridge. C# calls these via IJSRuntime.
//
// To add a new SDK method, expose a window.wavedashX function here and call
// it from C# as `js.InvokeVoidAsync("wavedashX", args...)`.
// window.Wavedash is injected by the host before any page script runs.
(function () {
  const sdk = window.Wavedash;

  window.wavedashInit = function () {
    sdk.init({ debug: true });
  };

  window.wavedashUpdateLoadProgress = function (value) {
    const clamped = Math.max(0, Math.min(1, Number(value) || 0));
    sdk.updateLoadProgressZeroToOne(clamped);
  };
})();
