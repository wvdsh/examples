# Ruffle

A Flash (SWF) game on Wavedash, played in the browser via the [Ruffle](https://ruffle.rs/) emulator. The platform automatically wraps your SWF in Ruffle and handles SDK initialization — no SDK code needed in your Flash game.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)
- A compiled `.swf` file

## Quick start

1. Copy your compiled `.swf` into `build/` and name it `game.swf` (or update `executable` in [`wavedash.toml`](./wavedash.toml) to match your filename).
2. Update `[ruffle] version` in `wavedash.toml` to the Ruffle nightly version you want the platform to use. Check [ruffle.rs/builds](https://ruffle.rs/builds) for available nightlies.
3. Replace `game_id` with your Wavedash game ID, then:

```
wavedash dev
```

## Optional: custom loader

If you need to run a JavaScript snippet before or alongside your SWF (for example, to configure save-data bridges), set `loader_url` in `wavedash.toml`:

```toml
[ruffle]
version = "0.2.0-nightly.2026.2.24"
executable = "game.swf"
loader_url = "loader.js"
```

Place `loader.js` in `build/` alongside your SWF. It runs before the SWF loads and has access to `window.WavedashJS`.
