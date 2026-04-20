# Haxe

A minimal Haxe Pong game on Wavedash, compiled to JavaScript.

## Prerequisites

- [Haxe 4.3+](https://haxe.org/download/)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
haxe build.hxml
wavedash dev
```

`haxe build.hxml` compiles `src/Main.hx` to `build/main.js`. Both `build/index.html` and a pre-built `build/main.js` are committed so the example can be served without running the compiler.

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.
