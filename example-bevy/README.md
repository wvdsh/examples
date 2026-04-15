See it here: https://wavedash.com/playtest/bevy-example/6b8bfb41-d6f7-43fb-9f23-cf6e4bfe8e94

Install [Rust](https://rust-lang.org/tools/install/)
Install [Wavedash CLI](https://github.com/wvdsh/cli/releases)

Replace w/ your Wavedash game_id in [./wavedash.toml](https://github.com/wvdsh/examples/blob/main/example-bevy/wavedash.toml)

Run
```
rustup target install wasm32-unknown-unknown
cargo install trunk
trunk build --release --public-url ./
wavedash dev
```
