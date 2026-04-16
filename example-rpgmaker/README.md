# RPG Maker MZ

A minimal RPG Maker MZ demo on Wavedash — *Pong Quest*, a tiny turn-based RPG wrapped around a paddle duel.

## Prerequisites

- [RPG Maker MZ](https://www.rpgmakerweb.com/products/rpg-maker-mz)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

1. Create or open a minimal RPG Maker MZ project (a default blank project is enough) and deploy it for Web from the editor into a temporary folder.
2. Stage that deployment into `build/web/` with the demo plugin:

    ```
    RPGMAKER_WEB_BUILD=/path/to/deployment ./build.sh
    ```

3. Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID.
4. Run:

    ```
    wavedash dev
    ```

On the title screen, choose **Pong Quest**.
