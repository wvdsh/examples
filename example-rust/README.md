# Rust

A minimal Rust Pong game on Wavedash, compiled to WebAssembly.

## Prerequisites

- [Rust](https://rust-lang.org/tools/install/)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
rustup target install wasm32-unknown-unknown
./build.sh
wavedash dev
```
