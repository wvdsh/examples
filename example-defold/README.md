# example-defold

`example-defold` is a minimal Defold browser game that uses the Wavedash HTML5-export flow.

It demonstrates:

- SDK initialization with `WavedashJS.init()` called from Lua via `html5.run`
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- calling `WavedashJS.loadComplete()` when the game is playable
- a basic 2D pong game (Defold owns rendering, input, and game loop)
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Layout

- `main/pong.gui_script`: game loop, physics, AI, input handling, and score tracking
- `main/pong.gui`: GUI scene with all visual nodes (court, paddles, ball, score HUD)
- `main/wavedash.lua`: thin Lua module that bridges `window.WavedashJS` via `html5.run`
- `main/main.collection`: bootstrap collection that loads the pong GUI
- `main/score.font`: font resource for the score display
- `input/game.input_binding`: keyboard bindings for paddle movement
- `game.project`: Defold project configuration (960 × 540, HTML5 settings)
- `wavedash.toml`: Wavedash CLI config pointing at the Defold HTML5 export

## Build

### Option A — Defold editor

1. Open the project in Defold (`File > Open Project`).
2. Choose `Project > Bundle > HTML5 Application`.
3. Set the output directory to `build/web`.

### Option B — Command-line via bob.jar

1. Install Java (JDK 17+) if you don't already have it.
2. Download `bob.jar` from [Defold releases](https://github.com/defold/defold/releases).
3. Place it in this directory (or set the `BOB_JAR` environment variable).
4. Run `bash build-web.sh`.

## Run On Wavedash

1. Set your real game ID in `wavedash.toml`.
2. Build the HTML5 export into `build/web` (see above).
3. Run `wavedash dev`.

Wavedash will load `build/web/index.html` as the entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
