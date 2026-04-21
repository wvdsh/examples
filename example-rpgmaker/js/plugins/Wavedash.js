//=============================================================================
// Wavedash SDK
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Initializes the Wavedash SDK and enables canvas stretch-to-fit in web browsers.
 * @author Wavedash
 */

(() => {
    // Force Graphics._stretchEnabled = true in web browsers. RPG Maker MZ only
    // stretches the canvas for native (nwjs) or mobile by default, which leaves
    // desktop-web builds locked at the native 816x624 resolution regardless of
    // viewport size. Overriding _defaultStretchMode makes the canvas scale to
    // the window, preserving aspect ratio.
    const _Graphics_defaultStretchMode = Graphics._defaultStretchMode;
    Graphics._defaultStretchMode = function() {
        return true;
    };

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);
        (async () => {
            try {
                const WavedashJS = await window.WavedashJS;
                WavedashJS.updateLoadProgressZeroToOne(1);
                WavedashJS.init({
                    debug: true
                });
            } catch (e) {
                console.warn("[wavedash] init failed:", e);
            }
        })();
    };
})();
