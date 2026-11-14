# Assets

Game visuals/components (trees, houses, farms, villagers) are currently defined in code and sprite atlases loaded by the game.

- `js/components/trees-and-world.js` – tree atlas and forest placement
- `js/components/buildings-home.js` – home/cabin building rendering and movement
- `js/components/farms.js` – wheat farm field component
- `js/components/villagers.js` – villager characters

If you add image assets (e.g. a `components.png` spritesheet for trees/houses/farms), place them in this folder and update the component loaders to reference them.

## Home upgrade art

- `home-manor.png` – "Western-European Medieval Houses (Isometric 2.5D)" by **feu** on OpenGameArt, released under **CC0** (public domain).
  - Source: https://opengameart.org/content/western-european-medieval-houses-isometric-25d
  - The game embeds a base64 copy in `js/10-home-upgrade.js` so it also renders when `index.html` is opened straight from disk (WebGL blocks external `file://` images).
