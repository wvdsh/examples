# example-c

`example-c` is a minimal pure C + WebAssembly pong demo that uses the Wavedash custom-engine flow.

C owns the startup state machine, gameplay, AI, collision, and draw calls. JavaScript only owns the browser shell, input collection, and the thin bridge to `window.WavedashJS`.

It demonstrates:

- a C-owned Wavedash startup flow via imported browser host bindings
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- marking the game as ready with `WavedashJS.loadComplete()`
- a basic pong game with a hard-but-beatable AI paddle
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Ownership split

- `C`: exports the raw wasm entrypoints `wd_init`, `wd_resize`, and `wd_tick`.
- `C`: owns the Wavedash startup phases, game state, AI, scoring, collision, and rendering commands.
- `C`: calls imported host functions for canvas drawing and SDK access.
- `JavaScript`: creates the DOM shell, canvas, loading UI, and input listeners.
- `JavaScript`: instantiates the raw wasm module and implements the imported host functions.
- `JavaScript`: forwards Wavedash SDK calls into C without owning gameplay rules.

## Layout

- `src/main.c`: pong game state, AI, physics, drawing calls, and the C-owned Wavedash startup state machine
- `web/game.js`: thin browser host that loads wasm, renders the canvas, and forwards browser/Wavedash bindings into C
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: compiles the C source and copies the JS entrypoint into `build/web`

## Build

1. Install Zig.
2. Run `./build-web.sh`.

This builds a raw wasm module at `build/web/game.wasm` and copies the host entrypoint to `build/web/game.js`.

## Why Zig Is Involved

This example is still a pure C example in terms of source ownership:

- `src/main.c` is plain C
- `web/game.js` is plain JavaScript
- there is no Zig runtime or Zig gameplay code in the example

Zig is only used as a convenient wasm toolchain because it bundles the compiler and linker pieces needed to produce a raw `wasm32-freestanding` module, and it matches the repo's existing native wasm examples.

## Run on Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
