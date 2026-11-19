# Forest Village

A small vanilla-JavaScript idle village built with PixiJS. Open `index.html` in
a browser to play.

## Woodcutter Hut

The **Woodcutter Hut** is bought from the existing **Build** menu for **70
gold**. Once built it appears on the map beside the home. Tap it (or hover with
a mouse) to see its status panel and the outline of the grove it owns.

Each hut has a small cutting area, a radius of five tiles around the hut.
Woodcutters only fell trees inside that area, one tree at a time, and drop the
logs at the hut. Felled trees leave a stump and grow back after six minutes.
Tap a stump to clear it for good and free the tile for building.

The hut is **movable**: drag it, or open its panel and choose **Move hut**, then
pick a green spot and confirm with the tick. Its old grove returns to ordinary
forest and the new surroundings become its grove.

The hut and its grove are saved in `localStorage` under `woodcutterHut`,
including the hut position, its tree list and the last timestamp.

## Market

Sell wheat for gold at the market. The rate is generous and easy to read: **10
wheat is always worth 10–20 gold**, starting at 14 and shifting every 45
seconds.

## Offline progress

The hut keeps working while the tab is closed. On the next load the game
compares `Date.now()` with the saved timestamp and credits roughly **10 trees
per hour** (each worth the normal 3 wood), capped at **12 hours** away. A short
"while you were away" toast and the hut panel show the result. Old saves without
a hut still load normally.

## Building

Any free tile is buildable. Felling a tree frees its tile immediately, so a
cleared forest can be used for farms or a new hut position.
