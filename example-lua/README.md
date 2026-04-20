# Lua

A minimal Lua Pong game on Wavedash, running in the browser via [wasmoon](https://github.com/ceifa/wasmoon) (Lua 5.4 compiled to WebAssembly). No build step — wasmoon is loaded from jsDelivr.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
wavedash dev
```

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.
