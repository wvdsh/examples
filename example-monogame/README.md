# example-monogame

`example-monogame` is a minimal MonoGame-style C# + WebAssembly pong demo that uses the Wavedash custom-engine flow.

C# owns the startup state machine, gameplay, AI, collision, and draw calls using MonoGame's `Game1` lifecycle pattern and portable framework types (`Vector2`, `Color`, `Rectangle`, `MathHelper`). JavaScript only owns the browser shell, input collection, and the thin bridge to `window.WavedashJS`.

It demonstrates:

- a MonoGame-structured Wavedash startup flow using Initialize, Update, and Draw
- staged loading via `WavedashJS.updateLoadProgressZeroToOne(...)`
- SDK initialization with `WavedashJS.init({ debug: true, deferEvents: true })`
- waiting for SDK readiness before gameplay is exposed
- releasing deferred SDK events with `WavedashJS.readyForEvents()`
- marking the game as ready with `WavedashJS.loadComplete()`
- a basic pong game with a hard-but-beatable AI paddle
- a Wavedash-only startup path that expects the real injected `window.WavedashJS`

## Ownership split

- `C#`: exports the raw wasm entrypoints `wd_init`, `wd_resize`, and `wd_tick`.
- `C#`: owns the Wavedash startup phases, game state, AI, scoring, collision, and rendering commands.
- `C#`: follows MonoGame's Initialize → Update → Draw lifecycle inside the tick loop.
- `C#`: calls imported host functions for canvas drawing and SDK access.
- `JavaScript`: creates the DOM shell, canvas, loading UI, and input listeners.
- `JavaScript`: instantiates the raw wasm module and implements the imported host functions.
- `JavaScript`: forwards Wavedash SDK calls into C# without owning gameplay rules.

## MonoGame patterns used

In a desktop MonoGame project, `Game1` extends `Microsoft.Xna.Framework.Game` and overrides `Initialize`, `Update(GameTime)`, and `Draw(GameTime)`. Here those methods are static (NativeAOT WASM has no GC heap) but follow the same lifecycle and naming:

- `Initialize` sets up the game world (like `Game.Initialize` + `LoadContent`)
- `Update` advances the simulation each frame (like `Game.Update(GameTime)`)
- `Draw` renders the frame (like `Game.Draw(GameTime)`)
- `Vector2` stores ball position and velocity (matching `Microsoft.Xna.Framework.Vector2`)
- `Color` stores RGBA colors (matching `Microsoft.Xna.Framework.Color`)
- `Rectangle` with `Intersects` handles paddle/ball collision (matching `Microsoft.Xna.Framework.Rectangle`)
- `MathHelper.Clamp` constrains values (matching `Microsoft.Xna.Framework.MathHelper`)

## Layout

- `src/Game1.cs`: MonoGame-style game with portable framework types, pong state, AI, physics, drawing calls, and the Wavedash startup state machine
- `src/Pong.csproj`: NativeAOT WASM project targeting `browser-wasm`
- `web/game.js`: thin browser host that loads wasm, renders the canvas, and forwards browser/Wavedash bindings into C#
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: publishes the C# project and copies the JS entrypoint into `build/web`

## Build

1. Install the [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0).
2. Install the experimental WASM workload: `dotnet workload install wasm-experimental`.
3. Run `./build-web.sh`.

This builds a NativeAOT wasm module at `build/web/game.wasm` and copies the host entrypoint to `build/web/game.js`.

## How it relates to desktop MonoGame

This example compiles the game to a standalone WebAssembly module using .NET NativeAOT, with Canvas2D rendering provided by the JavaScript host. In a desktop MonoGame project you would instead:

1. Install the MonoGame templates: `dotnet new install MonoGame.Templates.CSharp`.
2. Create a DesktopGL project: `dotnet new mgdesktopgl -o PongGame`.
3. Use `SpriteBatch` and `GraphicsDevice` for rendering instead of the JS bridge.
4. Run with `dotnet run`.

The game logic (Update, AI, collision, scoring) is identical in both environments. Only the rendering backend changes.

## Run on Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
