# C++

A minimal C++ Pong game on Wavedash, compiled to WebAssembly via Emscripten.

## Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) — activate with `source ./emsdk_env.sh` before building
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
./build.sh
wavedash dev
```
