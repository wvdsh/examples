# Python

A minimal Python Pong game on Wavedash, running in the browser via [Pyodide](https://pyodide.org/) (CPython compiled to WebAssembly). No build step — Pyodide is loaded from jsDelivr.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
wavedash dev
```

## Controls

- `W` / `S` — left paddle. The right paddle is controlled by a simple tracking AI.
