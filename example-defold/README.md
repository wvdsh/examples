# Defold

A minimal Defold Pong game on Wavedash, exported to HTML5.

## Prerequisites

- [Defold editor](https://defold.com/) (GUI build), **or** [Java](https://adoptium.net/) + [bob.jar](https://github.com/defold/defold/releases) (CLI build)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then either:

- **Editor**: Open the project in Defold and pick **Project → Bundle → HTML5 Application**, set output directory to `dist/`.
- **CLI**: Run `./build.sh` (requires `bob.jar` in the project root).

Then:

```
wavedash dev
```
