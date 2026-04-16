# Bevy

A minimal Bevy Pong game on Wavedash, compiled to WebAssembly via Trunk.

[See it live](https://wavedash.com/playtest/bevy-example/6b8bfb41-d6f7-43fb-9f23-cf6e4bfe8e94)

## Prerequisites

- [Rust](https://rust-lang.org/tools/install/)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
rustup target install wasm32-unknown-unknown
cargo install trunk
trunk build --release --public-url ./
wavedash dev
```
