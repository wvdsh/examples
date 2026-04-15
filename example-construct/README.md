# example-construct

`example-construct` is a minimal Construct 3 folder project that uses the Wavedash HTML5 export flow.

To keep the source easy to diff and review, this demo stays text-first: the Construct project metadata, layouts, event sheet, scripts, and even the Pong playfield all live in source-controlled text files.

The event sheet is intentionally empty. Construct still owns the project format, layout, and script lifecycle, while the Wavedash integration and Pong logic live in the project scripts where they are easy to inspect in git.

It demonstrates:

- a Construct-owned startup flow from `scripts/main.js`
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })` when available
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- calling `WavedashJS.loadComplete()` only after the first playable state is ready
- a small Construct-scripted Pong demo with a hard-but-beatable AI paddle
- a Wavedash-only runtime path that expects the real injected `window.WavedashJS`

## Ownership split

- `Construct`: owns the project format, layout, text rendering, scripting lifecycle, and HTML5 export
- `scripts/main.js`: owns the Wavedash startup sequence from inside Construct
- `scripts/pong.js`: owns the Pong simulation and ASCII field rendering through Construct Text instances
- `scripts/wavedash.js`: owns SDK lookup, readiness polling, and optional backend event listeners
- `Wavedash`: injects `window.WavedashJS` and serves the exported `build/web/index.html`

## Layout

- `project.c3proj`: folder-based Construct project metadata
- `layouts/Game.json`: Construct layout with the text HUD and playfield instances
- `eventSheets/Game.json`: intentionally minimal event sheet; the lifecycle lives in the scripts
- `objectTypes/*.json`: Construct object definitions for the text objects
- `scripts/main.js`: main script entrypoint that Construct auto-runs
- `scripts/pong.js`: ASCII Pong gameplay loop, input helpers, and renderer
- `scripts/wavedash.js`: Wavedash SDK helpers used by the main script
- `wavedash.toml`: Wavedash upload config pointing at the exported HTML5 entrypoint
- `build/web/`: export target for Construct's Web (HTML5) exporter

## Build

1. Open Construct 3.
2. Choose `Menu > Project > Open > Open local project folder`.
3. Select `example-construct`.
4. Confirm `scripts/main.js` is the main script if Construct prompts.
5. Export with `Menu > Project > Export > Web (HTML5)`.
6. Choose `build/web` as the export destination.

Construct should keep `pong.js` and `wavedash.js` as plain imported modules. Only `main.js` should be treated as the main script.

## Why It Is Text-First

Binary assets and generated exports would make this example harder to review than the actual Wavedash integration. This version keeps the important parts visible:

- the Construct folder-project structure is source-controlled
- the startup flow is readable in `scripts/main.js`
- the Pong logic is readable in `scripts/pong.js`
- the Wavedash handshake is readable in `scripts/wavedash.js`

This repo keeps the generated export out of source control, so re-export into `build/web` whenever you want to run the example.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Export the Construct project to `build/web`.
3. Run `wavedash dev`.

Wavedash will load `build/web/index.html` as the entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
