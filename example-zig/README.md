# example-zig

`example-zig` is a minimal Zig + WebAssembly game that uses the Wavedash custom-engine flow.

It demonstrates:

- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- marking the game as ready with `WavedashJS.loadComplete()`
- a standalone fallback shim so the same build still runs outside `wavedash dev`
- a basic Pong game with a hard-but-beatable AI paddle

## Layout

- `src/main.zig`: Pong game state, AI, physics, and drawing calls
- `web/game.js`: Wavedash entrypoint, load steps, SDK init, WASM boot, and browser input
- `web/index.html`: simple local test harness
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: copies web assets and compiles the Zig source into `build/web/game.wasm`

## Build

1. Install Zig.
2. Run `./build-web.sh`.
3. Serve `build/web` over HTTP, for example:

```bash
cd build/web
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Run on Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match

