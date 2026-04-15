# example-phaser

`example-phaser` is a minimal Phaser 3 browser game that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- calling `WavedashJS.loadComplete()` only after Pong is ready to play
- a basic 2D Pong game with a hard-but-beatable AI paddle
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `src/main.js`: Wavedash lifecycle, loading UI, DOM HUD, and boot sequence
- `src/pong.js`: Phaser 3 game setup, scene objects, game loop, AI, and physics
- `src/wavedash.js`: required SDK lookup, event helpers, and readiness polling
- `vite.config.js`: deterministic build output into `build/web/game.js`
- `wavedash.toml`: Wavedash CLI config for the custom-engine entrypoint

## Build

1. Run `npm install`.
2. Run `npm run build`.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
