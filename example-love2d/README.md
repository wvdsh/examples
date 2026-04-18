# LÖVE 2D

A minimal LÖVE 2D Pong game on Wavedash, packaged as `game.love` and run in the browser via [2dengine's standalone `love.js` player](https://github.com/2dengine/love.js).

## Prerequisites

- [LÖVE 2D 11.5](https://love2d.org/) (optional, for running locally)
- [love.js player](https://github.com/2dengine/love.js) — download the repo zip and extract
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Set `LOVEJS_DIST` to the extracted love.js player directory, replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
LOVEJS_DIST=/path/to/love.js ./build.sh
wavedash dev
```

`LOVEJS_DIST` must contain `player.js`, `style.css`, `11.5/love.js`, `11.5/love.wasm`, and `lua/normalize1.lua` + `lua/normalize2.lua`.

## How the Wavedash SDK is called from Lua

love.js (2dengine's 11.5 build) exposes no Lua↔JS FFI — `love.system.openURL` isn't wired, and `love.js.eval` referenced in the 2dengine docs isn't in the distributed wasm. The one channel that works reliably is **stdout**: LÖVE's `print()` is piped through Emscripten's `Module.print` → `console.log`.

This example uses that channel. Lua emits prefixed lines from `wavedash.lua`:

```lua
-- wavedash.lua
local PREFIX = "[WAVEDASH_BRIDGE]"

function M.init()
  print(PREFIX .. "init")
end

function M.update_load_progress(fraction)
  local clamped = math.max(0, math.min(1, fraction or 0))
  print(string.format("%sprogress:%.6f", PREFIX, clamped))
end
```

And `web/wavedash-bridge.js` wraps `console.log` *before* love.js loads so its later `Module.print = console.log.bind(console)` capture grabs the wrapped version. Lines starting with `[WAVEDASH_BRIDGE]` are parsed and dispatched to the SDK; everything else passes through untouched:

```js
// web/wavedash-bridge.js
const handlers = {
  init() {
    dispatch((sdk) => sdk.init({ debug: true }));
  },
  progress(raw) {
    const value = Math.max(0, Math.min(1, Number(raw) || 0));
    dispatch((sdk) => sdk.updateLoadProgressZeroToOne(value));
  },
};

const realLog = console.log.bind(console);
console.log = function (...args) {
  if (args.length === 1 && typeof args[0] === "string" && args[0].startsWith(PREFIX)) {
    const [name, ...rest] = args[0].slice(PREFIX.length).split(":");
    handlers[name]?.(rest.join(":"));
    return;
  }
  realLog(...args);
};
```

The game calls the SDK at the end of `love.load` (see `main.lua`):

```lua
wavedash.update_load_progress(1)
wavedash.init()
```

### Adding another SDK method

Pick any `WavedashJS` method — say `setMetadata(key, value)`. Add a Lua wrapper:

```lua
function M.set_metadata(key, value)
  print(string.format("%ssetMetadata:%s:%s", PREFIX, key, value))
end
```

And a handler in the JS bridge:

```js
setMetadata(rest) {
  const [key, value] = rest.split(":");
  dispatch((sdk) => sdk.setMetadata(key, value));
},
```

The bridge splits on `:` so multi-arg commands just chain them. Call it from Lua:

```lua
wavedash.set_metadata("level", "3")
```
