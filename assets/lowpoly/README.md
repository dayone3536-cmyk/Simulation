# Low-poly structure placeholders

Flat-shaded stand-ins for the structures that are currently being designed in
Blender. They are deliberately additive: no existing art or gameplay file is
replaced on this branch, so the layout can be evaluated before the final models
land.

Open [`lowpoly.html`](../../lowpoly.html) for the full style sheet.

## Pieces

| File | Footprint | Used for |
| --- | --- | --- |
| `cabin.svg` | 3 × 3 | Cozy Cabin (home level 1) |
| `manor.svg` | 3 × 3 | Timber Manor (home level 2) |
| `farm.svg` | 5 × 2 | Wheat Farm |
| `hut.svg` | 2 × 2 | Woodcutter Hut |

All four use the same 2:1 dimetric projection as the game (`CELL = 80`,
screen step ≈ 56.6 × 28.3) so they can sit on the existing slots without a
layout pass.

## Style contract

1. Flat faces only — one plane, one value. No gradients.
2. One sun from the lower-left: lit, base and shade per material.
3. No outlines. Dark timber is structure, not a stroke.
4. Grid first: the silhouette may change, the footprint may not.

Palette anchors: thatch `#D3A348`, plaster `#E4D4B3`, timber `#6B4424`,
grass `#73994A`, stone `#9C9380`.

## Using the kit

`js/lowpoly-kit.js` exposes `window.LOWPOLY`:

```js
LOWPOLY.art('cabin');   // inline SVG markup
LOWPOLY.data('cabin');  // data:image/svg+xml URI for <img> / Pixi
LOWPOLY.META;           // names, footprints and notes
```

The static SVGs in this folder are generated from the same source. Regenerate
them after editing the kit:

```sh
node tools/export-lowpoly.js
```

## Integration notes

When the placeholders should appear in the game, the least invasive route is a
style flag (`?style=lowpoly` or a settings value) that:

- returns the low-poly SVG as the home image (`homeArtNow()` / upgrade preview),
- swaps the woodcutter hut `Graphics` drawing for a sprite of `hut.svg`,
- rebuilds the farm ground/standing layers from `farm.svg`.

Keep the flag off by default until the Blender models are in, so `main` keeps
its current look while the art direction is still moving.
