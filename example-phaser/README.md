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

The Wavedash host injects `window.Wavedash` as a `Promise`. `src/main.js` awaits it, starts the game, then calls `init()`:

```js
const Wavedash = await window.Wavedash;
Wavedash.updateLoadProgressZeroToOne(0.5); // Phaser booting
StartGame('game-container', Wavedash);
// init() is called from postBoot in game/main.js once Phaser is fully up:
//   callbacks: { postBoot: () => { Wavedash.updateLoadProgressZeroToOne(1); Wavedash.init(...); } }
```

`@wvdsh/sdk-js` is listed as a **dev** dependency so its types are available at build time without getting bundled into the runtime output (the host provides the SDK at runtime).
