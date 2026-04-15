# example-zig

`example-zig` is a minimal Zig + WebAssembly game that uses the Wavedash custom-engine flow.

It demonstrates:

- a Zig-owned Wavedash startup flow via imported browser host bindings
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- marking the game as ready with `WavedashJS.loadComplete()`
- a basic pong game with a hard-but-beatable AI paddle
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `src/main.zig`: pong game state, AI, physics, drawing calls, and the Zig-owned Wavedash startup state machine
- `web/game.js`: thin browser host that loads wasm, renders the canvas, and forwards browser/Wavedash bindings into Zig
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: compiles the Zig source and copies the JS entrypoint into `build/web`

## Build

1. Install Zig.
2. Run `./build-web.sh`.

## Run on Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match

