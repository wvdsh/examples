Install [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)

Install the WASM workload: `dotnet workload install wasm-tools-net9`

Install [Wavedash CLI](https://github.com/wvdsh/cli/releases)

Replace w/ your Wavedash game_id in [./wavedash.toml](https://github.com/wvdsh/examples/blob/main/example-csharp/wavedash.toml)

Run
```
./build.sh
wavedash dev
```
