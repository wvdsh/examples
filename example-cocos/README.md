# Cocos

A minimal Cocos Creator Pong game on Wavedash, exported to Web Mobile.

## Prerequisites

- [Cocos Creator 3.8+](https://www.cocos.com/en/creator-download)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

1. Open this folder in Cocos Creator (via the Dashboard, "Add Project"). Cocos will generate `.meta` files and the `library/`, `temp/`, and `profiles/` directories on first open.
2. Build for **Web Mobile** with the default output directory (`build/web-mobile`).
3. Run:

    ```
    wavedash dev
    ```

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.

## Notes

- The `build/` directory is not committed; you must build from Cocos Creator before running `wavedash dev`.
