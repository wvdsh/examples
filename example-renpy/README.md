# Ren'Py

A minimal Ren'Py visual novel on Wavedash, wrapped in a JS shell that integrates with the Wavedash SDK.

## Prerequisites

- [Ren'Py 8.5+](https://www.renpy.org/latest.html) (with web platform support)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
RENPY_SDK=/path/to/renpy-8.5.2 ./build.sh
wavedash dev
```
