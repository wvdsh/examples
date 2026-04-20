# GB Studio

A minimal GB Studio 4 Pong-style game on Wavedash, exported to HTML5 via the built-in Game Boy emulator (binjgb).

## Prerequisites

- [GB Studio 4](https://www.gbstudio.dev/)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

1. Open `Untitled.gbsproj` in GB Studio.
2. **Game → Export As → Export Web** — outputs to `./build/web/`.
3. Run:

    ```
    wavedash dev
    ```

The Wavedash SDK init is wired in via GB Studio's **Project Settings → Custom HTML Head** (persisted in `project/settings.gbsres`), so it survives every re-export — no manual patching.

## Controls

- **A button**: `Z` / `Alt` / `J`
- **B button**: `X` / `Control` / `K`
- **Start**: `Enter`
- **Select**: `Shift`
- **D-pad**: Arrow keys or `WASD`
