# example-rpgmaker

`example-rpgmaker` is a minimal RPG Maker MZ web-export example that turns a plain deployed MZ project into `Pong Quest`, a tiny self-contained RPG demo that uses the Wavedash HTML5 export flow.

Because RPG Maker's engine runtime and generated deployment are not kept in git here, this example source-controls only the Wavedash-specific overlay files. You bring a local RPG Maker MZ web deployment, and `build-web.sh` stages it into `build/web` with the demo plugin enabled.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })` during `Scene_Boot`
- waiting for SDK readiness before the boot scene yields to the first interactive scene
- releasing deferred events with `WavedashJS.readyForEvents()` when the title screen or first map scene is visible
- calling `WavedashJS.loadComplete()` at that first playable point
- repurposing the title screen's `New Game` command into `Pong Quest`
- a self-contained RPG scene with a boon choice and a simple turn-based paddle duel against Baron Backspin
- a Wavedash-only runtime path with no local fallback shim
- a small DOM HUD that shows SDK state, runtime, and the active user on top of the RPG Maker canvas

## Why A Blank Project Is Enough

- `overlay/js/plugins/PongQuestExample.js` owns the title-screen override, custom scene, story text, and combat rules.
- The demo does not depend on custom maps, events, database edits, or source-project assets.

## Ownership Split

- `RPG Maker MZ`: owns the deployed web build, engine runtime, database, title screen, and scene lifecycle
- `overlay/js/plugins/PongQuestExample.js`: owns the Wavedash startup handshake, HUD, title-screen override, and the `Pong Quest` scene
- `build-web.sh`: owns staging a local RPG Maker deployment into `build/web` and enabling the plugin in `js/plugins.js`
- `Wavedash`: injects `window.WavedashJS` and serves the deployed `index.html`

## Layout

- `overlay/js/plugins/PongQuestExample.js`: the source-controlled plugin that gets copied into the deployed build
- `build-web.sh`: copies a local RPG Maker MZ web deployment into `build/web`, installs the plugin, and patches `js/plugins.js`
- `wavedash.toml`: Wavedash CLI config for the deployed HTML5 entrypoint
- `build/web/`: staged output used by `wavedash dev`

## Build

1. Create or open a minimal RPG Maker MZ project. A default blank project is enough.
2. Deploy it for Web from the editor into a temporary folder.
3. Run `RPGMAKER_WEB_BUILD=/path/to/deployment ./build-web.sh`.

`build-web.sh` copies that deployment into `build/web`, installs `PongQuestExample.js` into `build/web/js/plugins/`, and updates `build/web/js/plugins.js` so the plugin is enabled.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `RPGMAKER_WEB_BUILD=/path/to/deployment ./build-web.sh`.
3. Run `wavedash dev`.
4. On the title screen, choose `Pong Quest`.

Wavedash will load `build/web/index.html` as the entrypoint, and the injected plugin will keep `Scene_Boot` active until the SDK is ready.

## Demo Flow

1. `New Game` is renamed to `Pong Quest`.
2. Choosing it opens a custom scene with story text, status panels, and menu choices.
3. You pick a boon, then face Baron Backspin in a short turn-based paddle duel.
4. Win or lose, the demo ends with a replay-or-title choice.

## Controls

- `Arrow Keys`: move through menus
- `Enter` / `Space`: confirm

This example is intentionally Wavedash-only and expects the real injected `window.WavedashJS`.
