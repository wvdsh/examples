# example-littlejs

LittleJS Pong + Vite, deployed to Wavedash.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server on `localhost:8080` (the SDK isn't injected here — use `npm run build` + `wavedash dev` to test SDK calls) |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |

## Wavedash integration

The Wavedash host injects `window.Wavedash` (the live SDK instance) before your code runs. `src/main.js` imports it from `@wvdsh/sdk-js`, then calls `init()` inside `gameInit`:

```js
import { engineInit, ... } from 'littlejsengine';
import Wavedash from "@wvdsh/sdk-js";
Wavedash.updateLoadProgressZeroToOne(0.3);

function gameInit() {
  Wavedash.init({ debug: true });
}
engineInit(gameInit, gameUpdate, gameUpdatePost, gameRender, gameRenderPost, []);
```

`@wvdsh/sdk-js` (v1.3+) is a thin wrapper: its default export is the host-injected `window.Wavedash`, typed. Importing it outside Wavedash (e.g. the Vite dev server) throws a clear error.
