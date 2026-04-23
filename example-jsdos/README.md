# js-dos

A DOS game on Wavedash, played in the browser via the [js-dos v8](https://js-dos.com/) emulator. The platform automatically wraps your `.jsdos` bundle in js-dos and handles SDK initialization — no SDK code needed in your DOS game.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)
- A `.jsdos` bundle (a zip archive containing your DOS executable and any required files)

## Quick start

1. Copy your `.jsdos` bundle into `build/` and name it `game.jsdos` (or update `executable` in [`wavedash.toml`](./wavedash.toml) to match your filename).
2. Replace `game_id` with your Wavedash game ID, then:

```
wavedash dev
```

## Creating a .jsdos bundle

A `.jsdos` file is a zip archive renamed to `.jsdos`. It must contain your DOS executable at its root:

```
game.jsdos (zip)
├── GAME.EXE
└── (any supporting files your game needs)
```

You can create one with any zip utility and rename the `.zip` extension to `.jsdos`.

## Optional: custom loader

If you need to configure js-dos options (render aspect ratio, input mappings, etc.), set `loader_url` in `wavedash.toml`:

```toml
[jsdos]
version = "v8"
executable = "game.jsdos"
loader_url = "loader.js"
```

Place `loader.js` in `build/` alongside your bundle. In it, set `window.dosOptions` to a js-dos options object (or a `Promise` that resolves to one). It runs before js-dos is initialized and has access to `window.WavedashJS`.

Example `loader.js`:

```js
window.dosOptions = {
  renderAspect: '4/3',
  onEvent: function(event, ci) {
    if (event === 'ci-ready') {
      WavedashJS.loadComplete();
    }
  }
};
```
