# GDevelop

A minimal GDevelop 5 Pong game on Wavedash, exported to HTML5.

## Prerequisites

- [GDevelop 5](https://gdevelop.io/download)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

1. Open `game.json` in GDevelop 5 (File -> Open).
2. File -> Export -> Browser -> HTML5 -> export to `./Build/` (relative to this directory).
3. Run:

   ```
   wavedash dev
   ```

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.

## Notes

- The entire Pong game (input, physics, scoring, Wavedash SDK init) lives in a single JavaScript event on the `Game Scene` layout. See the `inlineCode` block inside `game.json`.
