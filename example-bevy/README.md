# Pong

Minimal Pong built with [Bevy](https://bevyengine.org/) 0.18.

## Run

```
cargo run
```

## Web build

```
rustup target install wasm32-unknown-unknown
cargo install trunk
trunk build --release --public-url ./
```

Output is in `dist/`. Serve with `trunk serve` for local dev.
