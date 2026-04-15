# example-gamemaker

`example-gamemaker` is a minimal GameMaker HTML5 project that uses the Wavedash HTML5 export flow.

The game logic and Wavedash integration live entirely in GML scripts and a small JavaScript extension, so the important parts are easy to inspect in git without opening the GameMaker IDE.

It demonstrates:

- a GameMaker-owned startup flow from `obj_game` Create and Step events
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })` through a JavaScript extension
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- calling `WavedashJS.loadComplete()` only after the first playable state is ready
- a small pong demo rendered with GameMaker draw primitives and a hard-but-beatable AI paddle
- a Wavedash-only runtime path that expects the real injected `window.WavedashJS`

## Ownership Split

- `GameMaker`: owns the project format, room, object lifecycle, drawing, input, and HTML5 export
- `obj_game`: owns the Wavedash startup sequence and game-state machine from its Create, Step, and Draw events
- `scripts/scr_pong/scr_pong.gml`: owns the pong simulation, collision, scoring, and rendering helpers
- `scripts/scr_wavedash/scr_wavedash.gml`: owns GML-side SDK wrappers that call the JavaScript extension
- `extensions/ext_wavedash/ext_wavedash.js`: owns the JavaScript bridge between GML and `window.WavedashJS`
- `Wavedash`: injects `window.WavedashJS` and serves the exported `build/web/index.html`

## Layout

- `example_gamemaker.yyp`: GameMaker project file listing all resources and folders
- `extensions/ext_wavedash/ext_wavedash.js`: JavaScript extension that bridges `window.WavedashJS` for HTML5
- `extensions/ext_wavedash/ext_wavedash.yy`: extension resource metadata mapping JS functions to GML-callable names
- `scripts/scr_wavedash/scr_wavedash.gml`: thin GML wrappers around the extension (init, progress, readiness, load complete)
- `scripts/scr_pong/scr_pong.gml`: pong gameplay functions and draw helpers called by `obj_game`
- `objects/obj_game/Create_0.gml`: initializes game state and boot-sequence variables
- `objects/obj_game/Step_0.gml`: state machine that drives boot, SDK init, serve, play, and game-over phases
- `objects/obj_game/Draw_0.gml`: renders the boot screen, pong court, or error screen based on phase
- `rooms/rm_main/rm_main.yy`: 960 × 540 room with a single `obj_game` instance
- `wavedash.toml`: Wavedash CLI config pointing at the GameMaker HTML5 export
- `build/web/`: export target for GameMaker's HTML5 output

## Build

1. Open GameMaker and load the `example_gamemaker.yyp` project file.
2. Select `HTML5` as the target platform from the targets menu.
3. Verify `ext_wavedash` appears under Extensions in the asset browser.
4. Choose `Build > Create Executable`.
5. Extract the resulting archive into `build/web` so that `build/web/index.html` exists.

The export includes the extension JavaScript alongside the GameMaker runner. No binary sprites or additional assets are needed.

## Run On Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Export the GameMaker project to `build/web` (see above).
3. Run `wavedash dev`.

Wavedash will load `build/web/index.html` as the entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
