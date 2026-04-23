# Solar2D

A minimal Solar2D Pong game on Wavedash, exported to HTML5.

The Wavedash SDK is wired in through Solar2D's [JavaScript Module Loader](https://docs.coronalabs.com/guide/html5/plugins/index.html): [`wavedash.js`](./wavedash.js) at the project root is imported from Lua via `require "wavedash"` (see [`main.lua`](./main.lua)).

## Prerequisites

- [Solar2D](https://solar2d.com/) (the Simulator GUI)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

1. Open the project in the Solar2D Simulator.
2. **File → Build → HTML5 (Beta)**, pick an output folder **outside** the project (e.g. `~/Desktop`). Solar2D refuses to write HTML5 output into the project folder.
3. Move the output into `./build/`:

   ```
   mv ~/Desktop/example-solar2d.html5/* build/
   ```
4. `wavedash dev`
