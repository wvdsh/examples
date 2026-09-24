# Bevy

A minimal Bevy Pong game on Wavedash, compiled to WebAssembly via Trunk.

[See it live](https://wavedash.com/playtest/bevy-example/b1b9c1bc-601d-40ab-9f25-3567eb6ddbab)

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
