# Three.js + userfs + UGC

A Three.js physics sandbox that exercises the Wavedash **userfs** and **UGC**
APIs end-to-end. Drop primitives onto the ground, watch them stack under
[cannon-es](https://github.com/pmndrs/cannon-es), save your scene to your
own cloud save slot (userfs), then publish it as a public UGC item other
players can import by ID.

## What it demonstrates

### Save file — userfs
Private per-user cloud storage. No metadata, no visibility rules — the
user's JWT + URL pair is the whole auth story.

- `writeLocalFile` — stages the serialized scene in the SDK's sandbox.
- `uploadRemoteFile` — pushes to `userfs://scenes/main.json`.
- `downloadRemoteFile` + `readLocalFile` — restores from cloud.
- `deleteRemoteFile` — removes the save.
- `listRemoteDirectory` — on boot, reports size + last-modified so the user
  sees whether a save exists before clicking Load.

### Publish — UGC
Shareable content with title/description/visibility. Creates a UGC item
of type `COMMUNITY` + visibility `PUBLIC` anyone can fetch.

- `createUGCItem` — first publish.
- `updateUGCItem` — retitle, rewrite description, or replace the scene content.
- `deleteUGCItem` — take it down.

### Import — UGC (read side)
- `downloadUGCItem` — pulls another user's shared scene into the local sandbox
  at a scratch path, then `readLocalFile` + apply.

## Under the hood

Two parallel paths hit the same underlying R2 bucket (`game-ugc-<env>`)
through different SDK surfaces:

- **userfs** writes go to `{gameCloudId}/userfs/{userId}/scenes/main.json`
  — one-step put via a Convex-issued presigned URL. The delete hits play
  directly (`DELETE ugc.host/{key}`) and skips Convex, since URL + JWT is
  all the auth you need.
- **UGC** writes go to `{gameCloudId}/ugcid/{ugcId}` — Convex creates/
  updates/deletes the DB row first, the SDK uploads via presigned URL, and
  R2 emits an object-create/delete event back to Convex for bytes accounting
  + CF cache purge.

## Scene format

```json
{
  "version": 2,
  "objects": [
    { "type": "box", "x": -1, "y": 0.5, "z": 0,
      "qx": 0, "qy": 0, "qz": 0, "qw": 1, "color": "#3b82f6" }
  ]
}
```

Positions + quaternions are captured post-physics, so reloaded scenes come
back to rest in the exact arrangement you saved.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)
- Node.js (`npm install` copies three + OrbitControls + cannon-es into
  `web/vendor/`)

## Quick start

```sh
npm install
wavedash dev
```

Replace `game_id` in `wavedash.toml` with your Wavedash game ID first.

## Try the full flow

1. **Save / Load / Delete** — place some objects, click Save. Modify the
   scene, click Save again (same userfs path gets overwritten — the R2
   webhook rebalances `remoteStorageStats.bytesUsed` by the delta). Click
   Load to restore, Delete to remove.
2. **Publish** — give your scene a title, click Publish. The UGC ID is
   stored in `localStorage` and shown under the status so you can share it.
3. **Update published** — tweak the scene, click Update published to push
   the new content onto the same UGC item. (Same URL, so the CF cache is
   purged on the server's side.)
4. **Unpublish** — click Unpublish to delete the UGC item. The deleted URL
   404s within a few seconds once the cache purge lands.
5. **Import** — paste someone else's UGC ID into the Import field and
   press Enter. Their scene replaces your current one; your userfs save is
   untouched.

## Controls

- **Click** ground — drop selected primitive (auto-stacks via downward
  raycast, rests flush on the top surface).
- **Shift+click** object — remove it.
- **Drag** — orbit camera. **Scroll** — zoom.
- Bottom palette — pick which primitive to place next.
