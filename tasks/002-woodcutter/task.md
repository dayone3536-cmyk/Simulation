---
title: Woodcutter hut with offline tree felling
base: main
branch: auto/woodcutter-hut
once: true
schedule: true
---

You are working inside a vanilla-JavaScript browser idle game (PixiJS, files in
`js/`, loaded in order by `index.html`, state saved in `localStorage`).
`js/11-wood.js` already has wood, woodcutters and a lumber camp;

Goal: turn the woodcutter feature into a proper buildable hut that keeps
working while the player is offline.

Requirements:

1. **Building.** The player can buy a woodcutter hut for **70 gold** from the
   existing build/market UI, using the same style as the other buildings
   (`js/10-home-upgrade.js`, `js/12-jobs.js`, `js/13-hearth.js`). Show it on the
   map near the home, with a tooltip and a small panel showing its status.
2. **Small cutting area, not the whole forest.** Each hut owns a limited work
   area (for example a radius of a few tiles around the hut). Woodcutters only
   fell trees inside that area, one tree at a time, and the tree stumps/regrowth
   behave like the existing trees in `js/components/trees-and-world.js` and
   `js/03-atlases-world.js`.
3. **Offline progress.** Save a timestamp (`Date.now()`) with the save data.
   When the game loads again, compute the elapsed real time while the tab was
   closed and award the wood the hut would have produced, capped at a sensible
   maximum (for example 12 hours). Show a short "while you were away" summary
   in the HUD or a toast.
4. **Rate.** Roughly **10 trees per hour** per hut while the player is away,
   converted to wood with the existing per-tree wood amount. While the player
   is watching, use the existing chopping animation and keep a rate that feels
   equivalent.
5. **Persistence.** Save the hut (position, owned, its tree list, last
   timestamp) in `localStorage` the same defensive way the other systems do it
   (try/catch around every read and write). Old saves without a hut must keep
   working.
6. **Code quality.** Match the existing file/function style, keep the logic in
   a clearly named file or section, and make sure
   `node --check` passes for every file you touch. Do not break existing gold,
   wood, jobs or hearth features. Do not add dependencies.

Also update `README.md` (or add a short section) describing the hut and the
offline behaviour. Do not push and do not touch `main`; the automation commits
and pushes your branch.
