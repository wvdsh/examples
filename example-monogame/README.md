# MonoGame

A minimal MonoGame-style C# Pong game on Wavedash, compiled to WebAssembly via .NET NativeAOT. C# owns the game lifecycle (`Initialize` / `Update` / `Draw`) while JavaScript provides the browser shell and Canvas 2D rendering.

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

The first time you build, install the experimental WASM workload:

```
dotnet workload install wasm-experimental
```

Then replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID and run:

```
./build.sh
wavedash dev
```
