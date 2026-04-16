# Godot

A minimal Godot 4 Pong game on Wavedash, exported to HTML5.

## Prerequisites

- [Godot 4](https://godotengine.org/) (with the **Web Export Templates** installed via *Editor → Manage Export Templates*)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

1. Open the project in Godot and let it import.
2. Pick **Project → Export**, select the **Web** preset, and export to `build/index.html`.
3. Replace `game_id` in [`build/wavedash.toml`](./build/wavedash.toml) with your Wavedash game ID.
4. From the `build/` directory, run:

    ```
    wavedash dev
    ```
