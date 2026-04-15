Try it out on wavedash.com here: https://wavedash.com/playtest/bevy-example/6b8bfb41-d6f7-43fb-9f23-cf6e4bfe8e94

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


Replace game_id in wavedash.toml
Output is in `dist/`. Serve with `wavedash dev` for local dev.
