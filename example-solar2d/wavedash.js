// Solar2D JavaScript module loader. `require "wavedash"` in main.lua picks
// up this file because its path matches the module name; the global
// `wavedash` object below becomes a table of callable methods from Lua.
// The Wavedash SDK is injected on window as either the resolved SDK object
// or a Promise that resolves to it, so wrap every call through Promise.resolve.

var wavedash = {
    init: function () {
        Promise.resolve(window.WavedashJS).then(function (sdk) {
            sdk.init();
        });
    },
    updateLoadProgressZeroToOne: function (p) {
        Promise.resolve(window.WavedashJS).then(function (sdk) {
            sdk.updateLoadProgressZeroToOne(p);
        });
    },
};
