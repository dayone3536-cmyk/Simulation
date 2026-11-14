# Game code structure

Loaded in order by `index.html`:
- `01-config-renderer.js` – config, constants, Pixi renderer/layers, helpers
- `02-icons-hud-rng.js` – SVG icons, HUD/gold/stats, RNG
- `03-atlases-world.js` – atlases (trees/home/fire), world state, forest generation
- `04-selection.js` – tile selection and highlight UI
- `05-camera-input.js` – camera, resize, pointer/touch input
- `06-render-home.js` – ground/tree/home rendering and building movement logic
- `07-villagers.js` – villager simulation and sprite rendering
- `08-farms.js` – wheat farm component/data/rendering
- `09-farm-loop-bootstrap.js` – farm gameplay loop/UI and game bootstrap

Component-focused copies are in `js/components/` (trees, buildings/home, farms, villagers) for easier navigation.
