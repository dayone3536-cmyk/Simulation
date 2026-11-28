# Simple grass ground

## Old floor

`buildGround()` in `js/06-render-home.js` created one `PX.Sprite` per map tile from the
grass atlas (`BLK`). Tiles were selected with a hash, so dark and light grass sprites
alternated across the whole map, including under the forest. They were grouped into 8x8
chunks so `cullGround()` could hide whole off-screen groups.

## New floor

The floor is now painted, not tiled:

- one `PX.Graphics` per 8x8 chunk (instead of up to 64 sprites per chunk);
- a flat base green for the whole chunk, with no internal seams;
- two large, very faint tonal patches per chunk so the lawn is not flat plastic;
- no blades, flowers, pebbles or cartoon outlines: the ground stays plain and calm.

World size, projection, the 8x8 chunk grouping, `groundChunks` and `cullGround()` are
unchanged. Trees, farms, the home, selection tints and the placement grid still use the
same coordinates, so they line up exactly as before.

The grass atlas assets and their loader entries in `js/03-atlases-world.js` /
`js/09-farm-loop-bootstrap.js` were intentionally left alone. They are still loaded for
any other code that uses them; the floor simply no longer draws them.

The same ground block was mirrored in `js/components/buildings-home.js`, which is a
non-loaded navigation copy of this file.

## Revert

Restore the two changed files from the previous revision, for example:

```sh
git checkout <previous-commit> -- js/06-render-home.js js/components/buildings-home.js
```

Or revert the commit that introduced this change:

```sh
git revert <commit>
```

Because `main` was not touched, `git checkout main -- js/06-render-home.js
js/components/buildings-home.js` also restores the old atlas floor.

## Visual trade-offs

- The floor is flatter and cleaner, with far less texture than the atlas mosaic. Some
  of the old hand-painted grass detail is gone.
- The two tonal patches are drawn at 7% alpha, so they are barely visible and only
  soften the flat colour when zoomed in.
- With no blades, flowers or pebbles, the ground reads as plain green rather than a
  busy pattern.
- The base green is a little brighter and more uniform than the old atlas average,
  especially in forest gaps between trees.
