# Defold

A minimal Defold Pong game on Wavedash, exported to HTML5.

## Prerequisites

- [Defold editor](https://defold.com/)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then either:

- In Defold, choose **Project → Fetch Libraries** to install the Wavedash Defold SDK dependency from `game.project`.
- Open the project in Defold and pick **Project → Bundle → HTML5 Application**, set output directory to `dist/`.

Defold writes the runnable HTML5 app to a nested folder such as `dist/wasm-web/example-defold/`
or `dist/js-web/example-defold/`. The `[defold]` config lets Wavedash discover and launch that
nested app while keeping `upload_dir = "./dist"`. If both architectures exist, Wavedash uses the
newest nested export and prefers `wasm-web` only when timestamps are unavailable or tied.

The Wavedash Defold SDK is added as a Defold library dependency:

```
https://github.com/wvdsh/sdk-defold/archive/main.zip
```

That gives game code the global `wavedash` Lua API for Wavedash services. The first-class Wavedash entrypoint still handles launching Defold, resolving nested asset paths, and reporting loader progress.

Then:

```
wavedash dev
```
