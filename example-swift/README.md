# Swift

A minimal Swift Pong game on Wavedash, compiled to WebAssembly via the official Swift SDK for WebAssembly and bundled with the [JavaScriptKit](https://github.com/swiftwasm/JavaScriptKit) SwiftPM plugin.

## Prerequisites

- A Swift 6.3 toolchain from [swift.org](https://www.swift.org/install/macos/) (Apple's bundled toolchain does not include a wasm-capable clang). [swiftly](https://swiftlang.github.io/swiftly/) is the easiest way to install it: `swiftly install 6.3.0`.
- The Swift WebAssembly SDK, installed once:

    ```
    swift sdk install https://download.swift.org/swift-6.3-release/wasm-sdk/swift-6.3-RELEASE/swift-6.3-RELEASE_wasm.artifactbundle.tar.gz \
      --checksum 9fa4016ee632c7e9e906608ec3b55cf13dfc4dff44e47574c5af58064dc33fd9
    ```
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
swift package --swift-sdk swift-6.3-RELEASE_wasm js -c release
cp -R .build/plugins/PackageToJS/outputs/Package/. dist/
cp Public/index.html dist/
wavedash dev
```

A pre-built `dist/` is committed so the example can be served without running the Swift toolchain.

Controls: `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.
