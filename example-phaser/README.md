# example-phaser

Pong in Phaser 4 + Vite, deployed to Wavedash.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start the Vite dev server on `localhost:8080` |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |

## Wavedash integration

The Wavedash host injects `window.Wavedash` (the live SDK instance) before your code runs. `src/main.js` imports it from `@wvdsh/sdk-js`, starts the game, then calls `init()`:

```js
import Wavedash from "@wvdsh/sdk-js";
Wavedash.updateLoadProgressZeroToOne(0.5); // Phaser booting
StartGame('game-container', Wavedash);
// init() is called from postBoot in game/main.js once Phaser is fully up:
//   callbacks: { postBoot: () => { Wavedash.updateLoadProgressZeroToOne(1); Wavedash.init(...); } }
```

`@wvdsh/sdk-js` (v1.3+) is a thin wrapper: its default export is the host-injected `window.Wavedash`, typed. Importing it outside Wavedash (e.g. the Vite dev server) throws a clear error.
