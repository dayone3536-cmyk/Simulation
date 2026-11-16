---
title: Simple lightweight grass ground
base: main
branch: auto/simple-ground
once: true
schedule: true
---

You are working inside a vanilla-JavaScript PixiJS idle game (top-down village).

Right now the whole map floor is drawn tile-by-tile in `buildGround()` inside
`js/06-render-home.js`: every square is a real sprite from the grass atlas,
alternating dark and light tiles across the entire map, grouped into 8x8
chunks.

Goal: strip away that heavy green floor and replace it with a simple, cheap
ground that reads as plain grass.

Requirements:

1. Replace the per-tile atlas sprites in `buildGround()` with lightweight
   drawing: a flat grass base colour plus a few subtle, cheap variations
   (for example a very faint checker of two close greens, or a handful of
   small tufts/pebbles scattered deterministically). It should look calm and
   simple, not like a busy tile mosaic.
2. Keep the world size, projection, chunking and `cullGround()` behaviour
   exactly as they are, so camera movement and performance stay good. Prefer a
   small number of `PX.Graphics` objects per chunk over one graphics object per
   tile, and do not add per-frame work.
3. No gameplay changes: trees, forests, farms, the home, buildings, selection
   tints and the placement grid must all still line up correctly on top of the
   new ground.
4. Do not delete the grass atlas assets or their loader entries; other code may
   still use them. Only stop using them for the floor.
5. Run `node --check` on every file you touch.
6. Write a short `GROUND-CHANGES.md` at the repository root: what the old floor
   did, what the new one does, how to revert, and any visual trade-offs.

Keep the diff focused on the ground rendering. Do not push and do not touch
`main`; the automation commits and pushes your branch (`auto/simple-ground`).
