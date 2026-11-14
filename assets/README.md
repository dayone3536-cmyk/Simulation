# Assets

Game visuals/components (trees, houses, farms, villagers) are currently defined in code and sprite atlases loaded by the game.

- `js/components/trees-and-world.js` – tree atlas and forest placement
- `js/components/buildings-home.js` – home/cabin building rendering and movement
- `js/components/farms.js` – wheat farm field component
- `js/components/villagers.js` – villager characters

If you add image assets (e.g. a `components.png` spritesheet for trees/houses/farms), place them in this folder and update the component loaders to reference them.
