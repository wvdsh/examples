# example-pico8

Wavedash + PICO-8 example using **Pico8Platformer** (MIT, © 2019 Emma Maassen) —
https://github.com/Enichan/Pico8Platformer

## Contents

- `cart/platformer.p8` + `platformer.p8.png` — the cart source and binary.
- `cart/LICENSE` — upstream MIT license.
- `wavedash.toml` — pointed at the `pico-8-example` project.

## Build for web

PICO-8 itself produces the web-playable bundle. The exported `build/` is
committed so the example runs as-is; to re-export you need the PICO-8 binary
(https://www.lexaloffle.com/pico-8.php):

```
> LOAD cart/platformer.p8
> EXPORT -p game build/index.html
```

## Wavedash integration

The SDK is driven entirely from the HTML shell — the cart needs no changes.
`build/index.html` streams `index.js` into `Wavedash.updateLoadProgressZeroToOne`
and calls `Wavedash.init()` once it's fetched (see the PICO-8 guide in the docs).
Re-apply that snippet after re-exporting, since PICO-8 overwrites `index.html`.

## Push

```sh
# uncomment the real game_id in wavedash.toml first
wavedash build push
```
