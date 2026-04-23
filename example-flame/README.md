# Flame

A minimal Flame Pong game on Wavedash, compiled to JavaScript via Flutter's CanvasKit web build.

## Prerequisites

- [Flutter](https://docs.flutter.dev/get-started/install) (stable channel, 3.22+)
- [Wavedash CLI](https://github.com/wvdsh/cli/releases)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game ID, then:

```
flutter pub get
flutter build web --release --no-web-resources-cdn
wavedash dev
```

The compiled output lands in `build/web/`, which `wavedash.toml` points to as `upload_dir`.
