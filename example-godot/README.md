# Godot

A Godot 4 Pong game on Wavedash with local and online multiplayer, exported to HTML5.

## What it demonstrates

- SDK initialization from GDScript (`WavedashSDK.init(...)` in `main.gd`).
- Lobby browser: `list_available_lobbies`, `create_lobby`, `join_lobby`, `leave_lobby`, and reading a host-provided title via `get_lobby_data_string` / `set_lobby_data_string`.
- Lobby lifecycle signals: `lobby_joined`, `lobby_users_updated`, `p2p_connection_established`, `p2p_peer_disconnected`.
- P2P messaging with `send_p2p_message` + `drain_p2p_channel`:
    - Channel 0, unreliable: paddle position broadcasts on change.
    - Channel 1, reliable: `StartGame` and `GoalScored` events.
- A tiny binary message codec (`p2p_message.gd`) built on `StreamPeerBuffer`.

Ball physics is host-authoritative for goals but deterministic on paddle bounces (x flipped, y preserved), so no per-bounce packet is needed — both sides compute the same bounce locally and only drift is corrected on the next goal.

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

5. Open two browser sessions signed in as different Wavedash users. Create a lobby in one and join it from the other to test online play.

## Controls

- **Local:** `W` / `S` — left paddle, `↑` / `↓` — right paddle.
- **Online:** `W` / `S` or `↑` / `↓` — your paddle. Host plays left, guest plays right.
- `ESC` — leave the current lobby / return to the menu.
