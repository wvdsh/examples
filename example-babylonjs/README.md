# example-babylonjs

`example-babylonjs` is a minimal Babylon.js browser game that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- calling `WavedashJS.loadComplete()` only after Pong is ready to play
- a standalone fallback shim so the same build still runs outside `wavedash dev`
- a basic Pong game with a hard-but-beatable AI paddle

## Layout

- `src/main.js`: Wavedash lifecycle, loading UI, DOM HUD, and boot sequence
- `src/pong.js`: Babylon.js engine setup, scene meshes, game loop, AI, and physics
- `src/wavedash.js`: local fallback shim plus SDK readiness helpers
- `public/index.html`: simple local test harness for `build/web/game.js`
- `vite.config.js`: deterministic build output into `build/web/game.js`
- `wavedash.toml`: Wavedash CLI config for the custom-engine entrypoint

## Build

1. Run `npm install`.
2. Run `npm run build`.
3. Serve `build/web` over HTTP, for example:

```bash
cd build/web
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
