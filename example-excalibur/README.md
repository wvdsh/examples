# example-excalibur

Excalibur.js Pong + Vite, deployed to Wavedash.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server on `localhost:8080` |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |

## Wavedash integration

The Wavedash host injects `window.Wavedash` as a `Promise`. `src/main.js` awaits it, starts the engine, then calls `init()`:

```js
import { Engine, ... } from "excalibur";
const Wavedash = await window.Wavedash;
Wavedash.updateLoadProgressZeroToOne(0.3);
// ... actors, scenes ...
await game.start("main");
Wavedash.init({ debug: true });
```

`@wvdsh/sdk-js` is listed as a **dev** dependency so its types are available at build time without getting bundled into the runtime output (the host provides the SDK at runtime).
