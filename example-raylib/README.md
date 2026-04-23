# raylib

A minimal raylib Pong game on Wavedash, compiled to WebAssembly via Emscripten.

## Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) — activate with `source ./emsdk_env.sh`
- `cmake` and `make` (for the one-time raylib Web build)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
./build.sh
wavedash dev
```

The first run clones raylib 5.5 and builds `libraylib.a` for the Web platform (takes ~1 minute). Subsequent builds are fast.

Set `RAYLIB_PATH=/path/to/your/raylib` to skip the clone step if you already have a Web-platform raylib build.
