# RPG Maker MZ

A bare RPG Maker MZ project (the default new-project template) with the Wavedash SDK wired up via a plugin.

## Prerequisites

- [RPG Maker MZ](https://www.rpgmakerweb.com/products/rpg-maker-mz)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
wavedash dev
```

The pre-built deployment lives in `build/` so the game runs immediately — no RPG Maker MZ install needed to test.

## Editing

1. Open `game.rmmzproject` in RPG Maker MZ.
2. Make your changes.
3. **File → Deployment** → target **Web browsers / Android / iOS** → export to a temp folder, then replace `build/` with the new deployment.

## Wavedash SDK integration

See `js/plugins/Wavedash.js` — a tiny plugin that hooks into `Scene_Boot.start` to call `WavedashJS.updateLoadProgressZeroToOne(1)` and `WavedashJS.init({ debug: true })`. Enable it in **Tools → Plugin Manager** so it's included in every deployment.
