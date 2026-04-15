# example-pixi

`example-pixi` is a minimal PixiJS browser game that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init()`
- a basic 2D Pong game with a beatable AI paddle
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `src/main.js`: Wavedash lifecycle, loading UI, DOM HUD, and boot sequence
- `src/pong.js`: PixiJS app setup, graphics drawing, game loop, AI, and physics
- `vite.config.js`: deterministic build output into `build/game.js`
- `wavedash.example.toml`: Wavedash CLI config template for the custom-engine entrypoint

## Build

1. Run `npm install`.
2. Run `npm run build`.

## Run On Wavedash

1. Copy `wavedash.example.toml` to `wavedash.toml` and set your real game ID.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `wavedash dev`.

Wavedash will load `build/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
