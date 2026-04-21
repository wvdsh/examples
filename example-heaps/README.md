# Heaps.io

A minimal [Heaps.io](https://heaps.io/) Pong game on Wavedash, compiled to JavaScript via Haxe.

## Prerequisites

- [Haxe](https://haxe.org/download/) 4.3+
- `haxelib install heaps`
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
haxe build.hxml
wavedash dev
```

`haxe build.hxml` produces `bin/main.js`. Both `bin/index.html` and a pre-built `bin/main.js` are committed so the example can be served without running the compiler.

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI. Scores are drawn in grey above each half.
