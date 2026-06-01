# example-babylonjs

Babylon.js Pong + Vite, deployed to Wavedash.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server on `localhost:8080` |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |

## Wavedash integration

The Wavedash host injects `window.Wavedash` as a `Promise`. `src/main.js` awaits it, starts the game, then calls `init()`:

```js
const Wavedash = await window.Wavedash;
// ... engine + scene created ...
Wavedash.updateLoadProgressZeroToOne(0.5); // scene + meshes ready
// ... input handlers, helper functions ...
Wavedash.updateLoadProgressZeroToOne(1);   // game fully ready
Wavedash.init({ debug: true });
```

`@wvdsh/sdk-js` is listed as a **dev** dependency so its types are available at build time without getting bundled into the runtime output (the host provides the SDK at runtime).
