# example-ts

`example-ts` is a minimal pure-TypeScript browser game that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init()`
- a basic 2D pong game rendered with Canvas 2D (no external game engine)
- strict TypeScript with `tsc --noEmit` gating the build
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `src/main.ts`: Wavedash lifecycle, loading UI, DOM HUD, input wiring, and boot sequence
- `src/pong.ts`: Canvas 2D rendering, game loop, physics, AI, and score tracking
- `vite.config.ts`: deterministic build output into `build/game.js`
- `tsconfig.json`: strict TypeScript configuration targeting ES2020
- `wavedash.toml`: Wavedash CLI config for the custom-engine entrypoint

## Build

1. Run `npm install`.
2. Run `npm run build`.

## Run On Wavedash

1. Set your real game ID in `wavedash.toml`.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `wavedash dev`.

Wavedash will load `build/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
