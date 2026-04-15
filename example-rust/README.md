Install [Rust](https://rust-lang.org/tools/install/)

Install [Wavedash CLI](https://github.com/wvdsh/cli/releases)

Replace w/ your Wavedash game_id in [./wavedash.toml](https://github.com/wvdsh/examples/blob/main/example-rust/wavedash.toml)

Run
```
rustup target install wasm32-unknown-unknown
./build.sh
wavedash dev
```
