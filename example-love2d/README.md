# LÖVE 2D

A minimal LÖVE 2D Pong game on Wavedash, packaged as `game.love` and run in the browser via the standalone `love.js` player.

## Prerequisites

- [LÖVE 2D 11.5](https://love2d.org/) (optional, for running locally)
- [love.js player](https://github.com/2dengine/love.js) extracted somewhere on disk
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Set `LOVEJS_DIST` to the extracted love.js player directory, replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
LOVEJS_DIST=/path/to/love.js ./build.sh
wavedash dev
```

`LOVEJS_DIST` must contain `player.js`, `style.css`, `11.5/love.js`, `11.5/love.wasm`, and the `lua/` normalization scripts.
