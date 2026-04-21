# melonJS

A minimal [melonJS](https://melonjs.org/) Pong game on Wavedash — loaded from unpkg via ESM, no build step.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
wavedash dev
```

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI. Scores draw in translucent grey above each half.
