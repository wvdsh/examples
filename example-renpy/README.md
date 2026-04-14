# example-renpy

`example-renpy` is a minimal Ren'Py web-export example that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- a Wavedash-only runtime path with no local fallback shim
- a thin `web/game.js` wrapper that mounts the exported Ren'Py build inside `wavedash-target`
- a Ren'Py-owned startup flow in `game/00_wavedash.rpy`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before the story becomes playable
- releasing deferred events with `WavedashJS.readyForEvents()` only after the first interactive Ren'Py screen is visible
- calling `WavedashJS.loadComplete()` only after that first playable state is exposed
- a short visual novel about the invention of Pong and why it mattered

## Layout

- `game/00_wavedash.rpy`: Ren'Py-side bridge helpers, SDK startup sequencing, and the first-playable handoff
- `game/options.rpy`: minimal project and build metadata
- `game/script.rpy`: short Ren'Py story content, the choice/menu interaction, and the in-game SDK status overlay
- `web/game.js`: stable Wavedash entrypoint source, loading shell, iframe mount, and thin JS bridge
- `build-web.sh`: builds the Ren'Py web export into `build/web/renpy`, then installs `build/web/game.js`
- `wavedash.toml`: Wavedash CLI config for the custom-engine entrypoint

## Lifecycle Ownership

This example follows the same ownership philosophy as `example-zig`.

- `web/game.js` handles only the browser work Ren'Py cannot avoid: requiring `window.WavedashJS`, creating the top-level shell, mounting the exported web build, and exposing a tiny bridge.
- `game/00_wavedash.rpy` owns the meaningful startup decisions once Ren'Py is running: advancing load phases, starting the SDK, waiting for readiness, and deciding when the first playable screen is truly visible.
- `game/script.rpy` provides that first interactive state, and only then does the Ren'Py side release deferred events and mark load complete.

## Build

1. Download and extract a Ren'Py SDK with web support installed.
2. Set `RENPY_SDK` to the SDK root that contains `renpy.sh`.
3. Run `./build-web.sh`.

Example:

```sh
RENPY_SDK=/path/to/renpy-8.5.2 ./build-web.sh
```

This example was authored against Ren'Py `8.5.2`. If the SDK is missing web support, install the `web` platform package into the same SDK before building.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `RENPY_SDK=/path/to/renpy-8.5.2 ./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint. That wrapper then embeds the generated Ren'Py web export from `build/web/renpy/`.

This example is intentionally Wavedash-only and expects the real injected `window.WavedashJS`.
