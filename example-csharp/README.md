# example-csharp

`example-csharp` is a minimal C# + WebAssembly pong demo that uses the Wavedash custom-engine flow.

C# owns the startup state machine, gameplay, AI, collision, and draw calls. JavaScript only owns the browser shell, input collection, and the thin bridge to `window.WavedashJS`.

It demonstrates:

- a C#-owned Wavedash startup flow via imported browser host bindings
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
- `C#`: calls imported host functions for canvas drawing and SDK access.
- `JavaScript`: creates the DOM shell, canvas, loading UI, and input listeners.
- `JavaScript`: instantiates the raw wasm module and implements the imported host functions.
- `JavaScript`: forwards Wavedash SDK calls into C# without owning gameplay rules.

## Layout

- `src/Game.cs`: pong game state, AI, physics, drawing calls, and the C#-owned Wavedash startup state machine
- `src/Pong.csproj`: NativeAOT WASM project targeting `browser-wasm`
- `web/game.js`: thin browser host that loads wasm, renders the canvas, and forwards browser/Wavedash bindings into C#
- `wavedash.toml`: Wavedash CLI config for the custom engine entrypoint
- `build-web.sh`: publishes the C# project and copies the JS entrypoint into `build/web`

## Build

1. Install the [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0).
2. Install the experimental WASM workload: `dotnet workload install wasm-experimental`.
3. Run `./build-web.sh`.

This builds a NativeAOT wasm module at `build/web/game.wasm` and copies the host entrypoint to `build/web/game.js`.

## How NativeAOT WASM Works

The project compiles C# directly to a standalone WebAssembly module using the .NET NativeAOT compiler. This is different from Blazor, which ships the full Mono runtime:

- `[UnmanagedCallersOnly(EntryPoint = "wd_init")]` exports a function to the WASM module
- `[DllImport("env")]` imports a function from the JavaScript host's `env` module
- `ReadOnlySpan<byte>` with the `u8` suffix provides zero-allocation UTF-8 string literals
- `unsafe` fixed buffers give direct WASM linear memory access for string interop

The result is a single `.wasm` file with the same import/export interface as the C, Zig, C++, and Rust examples.

## C# Features Used

The source is a single-file NativeAOT module with no standard library allocations. It uses language features that map efficiently to WebAssembly:

- `readonly struct` with primary constructors for the `Color` type
- `enum` with explicit underlying types for `GameMode` and `StartupPhase`
- `unsafe struct` with `fixed byte[]` buffers for inline WASM memory
- `[MethodImpl(MethodImplOptions.AggressiveInlining)]` for hot-path math helpers
- `ReadOnlySpan<byte>` with `u8` UTF-8 literals for zero-copy string constants
- `switch` expressions with `when` guards for pattern matching
- `fixed` statements to pin span data for pointer-based WASM interop
- `[DllImport("env")]` for WASM import bindings
- `[UnmanagedCallersOnly(EntryPoint = "...")]` for WASM export bindings

## Run on Wavedash

1. Replace `game_id` in `wavedash.toml` with your real game ID.
2. Build with `./build-web.sh`.
3. Run `wavedash dev`.

Wavedash will load `build/web/game.js` as the custom engine entrypoint.

This example is intentionally Wavedash-only and expects `window.WavedashJS` to be injected by `wavedash dev`.

## Controls

- `W` / `S` or `ArrowUp` / `ArrowDown`: move the player paddle
- `Space` or `Enter`: serve and restart after a match
