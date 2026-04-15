Install [Defold](https://defold.com/) or [Java](https://adoptium.net/) + [bob.jar](https://github.com/defold/defold/releases)

Install [Wavedash CLI](https://github.com/wvdsh/cli/releases)

Replace w/ your Wavedash game_id in [./wavedash.toml](https://github.com/wvdsh/examples/blob/main/example-defold/wavedash.toml)

Run
```
./build.sh
wavedash dev
```

Or export via Defold's editor: Project → Bundle → HTML5 Application, output dir `build/web`.
