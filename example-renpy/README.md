# Ren'Py

A minimal Ren'Py visual novel using Ren'Py's native Wavedash integration.

## Prerequisites

- [Ren'Py 8.6+](https://www.renpy.org/latest.html) (with web platform support)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
RENPY_SDK=/path/to/renpy-8.6.0 ./build.sh
wavedash dev
```

The `[renpy]` section in `wavedash.toml` enables Wavedash's Ren'Py loading path. Ren'Py initializes the Wavedash SDK automatically when its display starts, so the game does not need a custom JavaScript bridge or initialization label.
