# example-pico8

Wavedash + PICO-8 example using **Pico8Platformer** (MIT, © 2019 Emma Maassen) —
https://github.com/Enichan/Pico8Platformer

## Contents

- `cart/platformer.p8` + `platformer.p8.png` — the cart source and binary.
- `cart/LICENSE` — upstream MIT license.
- `wavedash.toml` — pointed at the `pico-8-example` project.

## Build for web

PICO-8 itself produces the web-playable bundle. You need the PICO-8 binary
(https://www.lexaloffle.com/pico-8.php) — this repo does not ship a runnable
build.

```
> LOAD cart/platformer.p8
> EXPORT -p game build/index.html
```

PICO-8 writes a self-contained `build/index.html` (+ a few asset files).

## Wire Wavedash into the cart

Add to the cart's `_init()`:

```lua
-- print() is intercepted by build/wavedash-bridge.js (see example-love2d
-- for the same trick) and forwarded to WavedashJS.
print("[wavedash]progress:1.0")
print("[wavedash]init")
```

…and add a small bridge script to `build/index.html` that turns those
prefixed `print` lines into SDK calls. (See `example-love2d/build/wavedash-bridge.js`
for the pattern.)

## Push

```sh
# uncomment the real game_id in wavedash.toml first
wavedash build push
```
