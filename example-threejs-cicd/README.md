# example-threejs-cicd

Three.js Pong deployed to Wavedash via GitHub Actions. Based on [example-threejs](../example-threejs), with a CI/CD workflow added.

## Setup

1. Fork or copy this repo
2. Run `wavedash init` locally to generate a `wavedash.toml` with your `game_id`
3. Go to the [Developer Portal](https://wavedash.com/dev-portal) → **API Keys** → **"Create API key"**
4. Add the key as a repository secret named `WAVEDASH_TOKEN` (Settings → Secrets and variables → Actions)

Every push to `main` will build the game and push a new build to Wavedash. Open the Developer Portal to publish the build when you're ready.

## Commands

| Command | Description |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server on `localhost:8080` |
| `npm run build` | Build to `./dist` |
| `wavedash dev` | Run the built `./dist` in the Wavedash sandbox |
