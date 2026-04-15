# example-go

`example-go` is a minimal Go + WebAssembly browser game that uses the Wavedash custom-engine flow.

Go owns everything via `syscall/js`: DOM setup, Canvas 2D rendering, input handling, game logic, and the Wavedash lifecycle. JavaScript only bootstraps Go's WebAssembly runtime.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init()`
- a basic 2D pong game rendered with Canvas 2D from Go via `syscall/js`
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `src/main.go`: pong game, Canvas 2D rendering, DOM setup, input wiring, and Wavedash lifecycle — all via `syscall/js`
- `web/game.js`: thin browser host that loads Go's `wasm_exec.js` runtime and starts the Go WebAssembly module
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: compiles the Go source to WebAssembly and copies the JS entrypoint into `build/web`

## Build

1. Install [Go](https://go.dev/dl/).
2. Run `./build-web.sh`.

## Run on Wavedash

1. Set your real game ID in `wavedash.toml`.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
