# examples

Small, runnable examples showing how to integrate Wavedash across different engines and stacks.

## Included examples

- `example-babylonjs`: Babylon.js pong demo that initializes the SDK, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-bevy`: Bevy pong demo that initializes the SDK from Rust, updates loading progress, and then starts gameplay.
- `example-c`: Pure C and WebAssembly pong demo that initializes the SDK from C, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-cpp`: C++ and WebAssembly pong demo that initializes the SDK from C++, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-csharp`: C# and WebAssembly pong demo that initializes the SDK from C# via NativeAOT, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-defold`: Defold pong demo that initializes the SDK, updates loading progress, and then starts gameplay.
- `example-gamemaker`: GameMaker HTML5 pong demo that initializes the SDK through a JavaScript extension, updates loading progress during startup, releases deferred events when the first playable state is ready, and then starts gameplay.
- `example-go`: Go and WebAssembly pong demo that owns the full browser stack via `syscall/js`, initializes the SDK, updates loading progress, and then starts gameplay.
- `example-godot`: Godot 4 pong demo with local and online multiplayer modes — initializes the SDK from GDScript, browses and joins lobbies, and uses Wavedash P2P to sync paddle positions (channel 0, unreliable) and score events (channel 1, reliable), exported to HTML5.
- `example-cocos`: Cocos Creator 3 pong demo whose `Pong` component moves paddle and ball Nodes each frame, initializes the SDK from TypeScript, and then starts gameplay.
- `example-construct`: Construct 3 folder-project pong demo that initializes the SDK from Construct scripts, updates loading progress during startup, releases deferred events when the first playable state is ready, and then starts gameplay.
- `example-gdevelop`: GDevelop 5 pong demo authored in `game.json` with a single JavaScript event driving input, physics, scoring, and a ShapePainter renderer, initializes the SDK on the first frame, and then starts gameplay.
- `example-haxe`: Haxe pong demo compiled to JavaScript via `haxe build.hxml`, renders with Canvas 2D, initializes the SDK through `js.Syntax.code`, and then starts gameplay.
- `example-lua`: Lua pong demo that runs in the browser via [wasmoon](https://github.com/ceifa/wasmoon) — no build step, loaded straight from a CDN, renders with Canvas 2D, initializes the SDK, and then starts gameplay.
- `example-python`: Python pong demo that runs in the browser via [Pyodide](https://pyodide.org/) (CPython in WebAssembly) — no build step, loaded straight from a CDN, renders with Canvas 2D, initializes the SDK from Python through the `js` module, and then starts gameplay.
- `example-swift`: Swift pong demo compiled to WebAssembly via the official Swift SDK for WebAssembly, uses [JavaScriptKit](https://github.com/swiftwasm/JavaScriptKit) to drive Canvas 2D and call the SDK, and then starts gameplay.
- `example-js`: Pure JavaScript and Canvas 2D pong demo that initializes the SDK, updates loading progress, and then starts gameplay with no external game engine.
- `example-kaplay`: Kaplay pong demo with local and online multiplayer modes — loads Kaplay from a CDN (no build step), initializes the SDK from JavaScript, browses and joins lobbies, and uses Wavedash P2P to sync paddle positions (channel 0, unreliable) and score events (channel 1, reliable).
- `example-kni`: KNI BlazorGL (MonoGame-compatible) pong demo built with nkast's KNI engine, compiled to WebAssembly via Blazor, initializes the SDK and updates loading progress from C# via JS interop, then starts gameplay.
- `example-love2d`: LOVE2D pong demo that packages a `.love` file for the standalone `love.js` player, initializes the SDK, updates loading progress, releases deferred events when the first playable frame is rendered, and then starts gameplay.
- `example-phaser`: Phaser 3 pong demo that initializes the SDK, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-pixi`: PixiJS pong demo that initializes the SDK, updates loading progress, and then starts gameplay.
- `example-playcanvas`: PlayCanvas 3D pong demo that initializes the SDK, updates loading progress, and then starts gameplay.
- `example-renpy`: Ren'Py web-export visual novel that initializes the SDK, updates loading progress during startup, releases deferred events when the first playable scene is ready, and then enters the story.
- `example-rpgmaker`: RPG Maker MZ web-export Pong Quest demo that initializes the SDK during Scene_Boot, waits for readiness before the first interactive scene, then launches a tiny self-contained RPG from a blank-project-friendly plugin.
- `example-rust`: Rust and WebAssembly pong demo that initializes the SDK from Rust, updates loading progress, releases deferred events when ready, and then starts gameplay.
- `example-threejs`: Three.js pong demo with local and online multiplayer modes — initializes the SDK from JavaScript, browses and joins lobbies, and uses Wavedash P2P to sync paddle positions (channel 0, unreliable) and score events (channel 1, reliable).
- `example-ts`: Pure TypeScript and Canvas 2D pong demo that initializes the SDK, updates loading progress, and then starts gameplay with no external game engine.
- `example-unity`: Unity P2P pong demo that uses Netcode for GameObjects with the Wavedash transport, exported to WebGL.
- `example-zig`: Zig and WebAssembly pong demo that initializes the SDK from Zig, updates loading progress, releases deferred events when ready, and then starts gameplay.
