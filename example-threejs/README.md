# Three.js

A Three.js Pong game on Wavedash with local and online multiplayer.

## What it demonstrates

- SDK initialization from JavaScript (`WavedashJS.init({ debug: true })`).
- Lobby browser: `createLobby`, `joinLobby`, `listAvailableLobbies`,
  `leaveLobby`, and reading a host-provided title via `getLobbyData` /
  `setLobbyData`.
- Lobby lifecycle events: `LobbyJoined`, `LobbyUsersUpdated`,
  `P2PConnectionEstablished`, `P2PPeerDisconnected`, `LobbyKicked` — wired up
  with `WavedashJS.addEventListener(WavedashJS.Events.*, ...)`.
- P2P messaging with `broadcastP2PMessage` + `readP2PMessageFromChannel`:
    - Channel 0, unreliable: paddle position broadcasts on change.
    - Channel 1, reliable: `StartGame` and `GoalScored` events.
- The HUD (menus, lobby list, scoreboard) is built with plain DOM — `index.html`
  is just a canvas and an import map for Three.js.

Ball physics is host-authoritative for goals but deterministic on paddle
bounces (x flipped, y preserved), so no per-bounce packet is needed — both
sides compute the same bounce locally and only drift is corrected on the next
goal.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)
- Node.js (for `npm install` — Three.js is served from `web/vendor/`)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game
ID, then:

```
npm install   # copies three.module.js + three.core.js into web/vendor/
wavedash dev
```

Open two browser sessions signed in as different Wavedash users. Create a
lobby in one and join it from the other to test online play.

## Controls

- **Local:** `W` / `S` — left paddle, `↑` / `↓` — right paddle.
- **Online:** `W` / `S` or `↑` / `↓` — your paddle. Host plays left, guest plays right.
- `Esc` — leave the current lobby / return to the menu.
