# example-playcanvas

PlayCanvas Pong + Vite, deployed to Wavedash.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server on `localhost:8080` |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |

## Wavedash integration

The Wavedash host injects `window.Wavedash` as a `Promise`. `src/main.js` awaits it, then calls `init()`:

```js
const Wavedash = await window.Wavedash;
// ... set up app, scene, entities ...
Wavedash.updateLoadProgressZeroToOne(0.5); // scene + entities ready
app.on('preload:progress', (fraction) => {
  Wavedash.updateLoadProgressZeroToOne(0.5 + fraction * 0.5);
});
app.preload(() => {
  Wavedash.updateLoadProgressZeroToOne(1);
  Wavedash.init({ debug: true });
  app.start();
});
```

`@wvdsh/sdk-js` is listed as a **dev** dependency so its types are available at build time without getting bundled into the runtime output (the host provides the SDK at runtime).
