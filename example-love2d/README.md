# example-love2d

`example-love2d` is a minimal LOVE2D browser game that uses the Wavedash HTML5-export flow.

It demonstrates:

- packaging a LOVE2D project as `game.love` for the standalone `love.js` browser player
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- releasing deferred events with `WavedashJS.readyForEvents()` after the first playable frame is rendered
- calling `WavedashJS.loadComplete()` when the game is visibly ready
- a basic 2D pong game (LOVE2D owns rendering, input, and the game loop)
- a Wavedash-only web startup path that expects the real injected `window.WavedashJS`

## Layout

- `main.lua`: pong game loop, collision, AI, score handling, and first-playable handoff
- `conf.lua`: LOVE2D window and module configuration
- `wavedash.lua`: small Lua bridge that calls `window.WavedashBridge` via `love.system.openURL("javascript:...")`
- `web/index.html`: browser shell that loads `player.js` with the packaged `game.love`
- `web/.htaccess`: Apache-style headers for `love.js` cross-origin isolation and the `.wasm` MIME type
- `web/wavedash-bridge.js`: queued browser bridge that waits for `window.WavedashJS` and exposes simple calls to Lua
- `build-web.sh`: packages the LOVE2D sources into `build/web/game.love` and installs the required `love.js` runtime files
- `wavedash.toml`: Wavedash CLI config pointing at the built HTML5 export

## Lifecycle Ownership

- `main.lua` owns the meaningful startup timing: it advances load progress during setup, starts gameplay, and decides when the first rendered frame is genuinely playable.
- `wavedash.lua` is intentionally thin. It only forwards Lua-side lifecycle calls into the browser bridge and does not decide timing on its own.
- `web/wavedash-bridge.js` owns browser-only concerns: waiting for injected `window.WavedashJS`, serializing async lifecycle calls, and forwarding them to the SDK in order.

## Build

1. Install [LOVE2D 11.5](https://love2d.org/) if you want to run the project locally with `love .` while iterating on gameplay.
2. Download or clone the standalone [`love.js` player](https://github.com/2dengine/love.js).
3. Set `LOVEJS_DIST` to that extracted directory.
4. Run `LOVEJS_DIST=/path/to/love.js ./build-web.sh`.

Example:

```sh
LOVEJS_DIST=/path/to/love.js ./build-web.sh
```

`LOVEJS_DIST` must contain `player.js`, `style.css`, `11.5/love.js`, `11.5/love.wasm`, `lua/normalize1.lua`, and `lua/normalize2.lua`.

`build-web.sh` always installs this example's `web/.htaccess` into `build/web/.htaccess` for Apache-style hosts. The serving environment still needs to honor equivalent COOP/COEP/CSP headers for the `love.js` runtime to boot correctly.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `LOVEJS_DIST=/path/to/love.js ./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/index.html` as the entrypoint. That shell then boots `game.love` through the standalone `love.js` player.

This example is intentionally Wavedash-only for the browser path and expects the real injected `window.WavedashJS`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Escape`: quit the desktop build
