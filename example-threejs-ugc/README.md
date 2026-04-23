# Three.js + UGC

A Three.js physics sandbox that persists its state as a Wavedash UGC item.
Drop primitives onto the ground, watch them stack and settle under
[cannon-es](https://github.com/pmndrs/cannon-es), then **Save** to upload the
scene. The first save creates a UGC item, every subsequent save updates the
same item, and **Load** restores the saved scene from the cloud.

## What it demonstrates

- **Full UGC round-trip**:
  - `writeLocalFile` — scene is serialized to `scene.json` in the sandbox.
  - `createUGCItem` — first save, with
    `UGC_TYPE_GAME_MANAGED` / `UGC_VISIBILITY_PRIVATE`.
  - `updateUGCItem` — every subsequent save.
  - `downloadUGCItem` + `readLocalFile` — on **Load**, to restore the scene.
- **UGC ID persistence across reloads**: the returned ID is cached in
  `localStorage` so the next page load's **Load** button targets the same item.
- A minimal cannon-es world: plane ground, gravity, sleeping bodies, and
  per-frame `body → mesh` sync.

## Interaction

- **Click** the ground or an existing object — drop the selected primitive
  from above. If the click lands on a stack, the new object spawns above the
  top of the stack (a second downward raycast finds the highest surface at
  the click point).
- **Shift+click** an object — remove it.
- **Drag** — orbit camera. **Scroll** — zoom.
- Palette at the bottom — pick which primitive to place next.
- **Save** — create or update the UGC item. Status flips from "Created …"
  (first save) to "Updated …" (subsequent saves).
- **Load** — fetches the last-saved UGC item, clears the local scene, and
  repopulates it from `scene.json`. Only works after at least one Save (or a
  cached `localStorage` ID from a previous session).
- **Clear scene** — wipes the local scene only; the next Save updates the
  (now empty) UGC item.

## Save format (`scene.json`)

```json
{
  "version": 2,
  "objects": [
    {
      "type": "box",
      "x": -1.234, "y": 0.5, "z": 0.123,
      "qx": 0, "qy": 0, "qz": 0, "qw": 1,
      "color": "#3b82f6"
    }
  ]
}
```

Positions and quaternions are written after physics has settled, so reloads
come back to rest with the exact same arrangement.

## Prerequisites

- [Wavedash CLI](https://github.com/wvdsh/cli/releases)
- Node.js (for `npm install` — three.js, OrbitControls, and cannon-es are
  served from `web/vendor/`)

## Quick start

Replace `game_id` in [`wavedash.toml`](./wavedash.toml) with your Wavedash game
ID, then:

```
npm install   # copies three + OrbitControls + cannon-es into web/vendor/
wavedash dev
```

Place a few objects, click **Save**, reload the page, then click **Load** —
your scene should come back.
