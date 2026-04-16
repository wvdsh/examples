# Unity

A minimal Unity Pong game on Wavedash, using Netcode for GameObjects with the Wavedash P2P transport, exported to WebGL.

## Prerequisites

- [Unity 6](https://unity.com/releases/editor/archive) (6000.0.73f1)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

1. Open the project in Unity.
2. Add the Wavedash SDK package (`com.wavedash.sdk`) via **Window → Package Manager → Add package from git URL**: `https://github.com/wvdsh/sdk-unity.git`
3. Build for **WebGL** with the output directory set to `Build/index/`.
4. Replace `game_id` in [`Build/wavedash.toml`](./Build/wavedash.toml) with your Wavedash game ID.
5. Run:

    ```
    cd Build
    wavedash dev
    ```
