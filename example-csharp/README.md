# C#

A minimal C# Pong game on Wavedash, compiled to WebAssembly via the .NET WASM runtime (`[JSImport]`/`[JSExport]`).

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

The first time you build, install the .NET WASM build tools workload:

```
dotnet workload install wasm-tools-net9
```

Then replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID and run:

```
./build.sh
wavedash dev
```
