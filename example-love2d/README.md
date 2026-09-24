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

2dengine's `love.js` ships a JS-interop trick rather than a true FFI: Lua can synchronously evaluate JavaScript by calling `os.execute("javascript:<code>")`. Internally that hops `love.system.openURL` → `window.open` (intercepted in `player.js`) → `eval`, and the result lands on `window._output` for `io.read()` to pick up via the `window.prompt` override. `normalize1.lua` glues those pieces together so `os.execute` returns the evaluated string. The SDK calls only need fire-and-forget, so we stay in Lua:

```lua
-- wavedash.lua
local M = {}

function M.init()
  os.execute([[javascript:
    window.Wavedash && window.Wavedash.init({ debug: true })
  ]])
end

function M.update_load_progress(fraction)
  local clamped = math.max(0, math.min(1, fraction or 0))
  os.execute(string.format([[javascript:
    window.Wavedash && window.Wavedash.updateLoadProgressZeroToOne(%f)
  ]], clamped))
end

return M
```

The game calls the SDK at the end of `love.load` (see `main.lua`):

```lua
wavedash.update_load_progress(1)
wavedash.init()
```

No JS shim is needed — `window.Wavedash` is injected by the Wavedash CLI before the game starts, and `os.execute` reaches it directly.

### Adding another SDK method

Pick any SDK method — say `setAchievement(id)`. Add a Lua wrapper that embeds the arguments straight into the JS literal:

```lua
function M.set_achievement(id)
  os.execute(string.format([[javascript:
    window.Wavedash && window.Wavedash.setAchievement(%q, true)
  ]], id))
end
```

For methods that return data back to Lua, use the return value of `os.execute` — `normalize1.lua` already drains `io.read()` and returns the evaluated result:

```lua
function M.get_username()
  return os.execute([[javascript:
    window.Wavedash ? window.Wavedash.getUsername() : ''
  ]]) or ""
end
```

For async (Promise-returning) SDK methods you need a small JS-side dispatcher that resolves into `window._output` — that's where this approach hits its ceiling.
