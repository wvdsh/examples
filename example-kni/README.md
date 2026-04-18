# KNI (MonoGame on the web)

A minimal Pong game built with [KNI](https://github.com/kniEngine/kni), the MonoGame-compatible fork that supports Blazor WebAssembly (`BlazorGL`) web builds. C# owns the game lifecycle (`Initialize` / `Update` / `Draw`) and calls the Wavedash SDK from C# via `IJSRuntime`.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) (.NET 9 works too)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID and run:

```
./build.sh
wavedash dev
```
