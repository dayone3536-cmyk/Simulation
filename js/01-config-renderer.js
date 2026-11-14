  // ---- tune these ----
  const HALF_W = 640;           // half the width of the clearing (world units, clearing is 1280 wide)
  const HALF_H = 400;           // half the height of the clearing (800 tall)
  const BAND = 1200;            // how deep the forest is around the clearing
  const MAX_RES = 1.5;          // phone sharpness: 1 = fastest, 2 = sharpest but heavier. (Auto-drops by itself if the phone is struggling)
  const VOID = '#143310';        // what lies past the edge of the map
  // --------------------
  const CELL = 80;              // one checker square = one future build tile
  const WORLD_W = 2 * (HALF_W + BAND), WORLD_H = 2 * (HALF_H + BAND);

  // Clash-style view: the flat world is rotated 45 degrees and squashed 2:1, so every
  // square becomes a diamond. World coordinates stay plain (x, y); only drawing changes.
  const IX = Math.SQRT1_2, IY = Math.SQRT1_2 / 2;
  const projX = (x, y) => (x - y) * IX;
  const projY = (x, y) => (x + y) * IY;
  const unprojX = (u, v) => (u / IX + v / IY) / 2;
  const unprojY = (u, v) => (v / IY - u / IX) / 2;

  // Phones: a tap asks Chrome for fullscreen + landscape lock (touch only counts as a "real" tap on release).
  // If the lock is refused, or auto-rotate is off, the game rotates itself instead, see resize().
  const coarse = matchMedia('(pointer: coarse)').matches;
  let locked = false, tries = 0, forced = false, flipped = false;
  function goLandscape() {
    if (!coarse || locked || tries++ > 4) return;
    const el = document.documentElement;
    Promise.resolve(el.requestFullscreen && el.requestFullscreen({ navigationUI: 'hide' }))
      .then(() => screen.orientation.lock('landscape'))
      .then(() => { locked = true; })
      .catch(() => {});
  }
  window.addEventListener('pointerup', goLandscape);
  window.addEventListener('orientationchange', () => setTimeout(() => window.dispatchEvent(new Event('resize')), 250));

  const canvas = document.getElementById('c');
  // ---------- Pixi.js (WebGL) renderer: the phone's GPU draws the scene, so it lags far less than the old 2D canvas ----------
  const PX = window.PIXI;
  let app = null;
  try {
    app = new PX.Application({ view: canvas, width: window.innerWidth, height: window.innerHeight, resolution: 1, autoDensity: true,
      antialias: false, backgroundColor: 0x143310, powerPreference: 'high-performance', autoStart: false, sharedTicker: false, hello: false });
    try { const ev = app.renderer.events; if (ev) { ev.autoPreventDefault = false; if (ev.features) ev.features.move = ev.features.globalMove = ev.features.click = ev.features.wheel = false; } } catch (e) {}   // we do our own touch handling
    app.stage.interactiveChildren = false;
  } catch (e) { console.error('Pixi failed to start', e); app = null; }
  const hint = document.getElementById('hint');
  if (!app) { hint.textContent = 'This browser could not start the graphics engine (WebGL / Pixi.js). Check your internet and try again.'; hint.style.opacity = 1; throw new Error('Pixi failed to start'); }
  let ctx = null;   // the 2D context of whichever villager canvas is being painted right now

  // scene graph, drawn bottom to top. Everything inside `world` lives in projected (screen-shaped) space; the camera is just world.position + world.scale.
  const world = app.stage.addChild(new PX.Container());
  const layer = () => world.addChild(new PX.Container());
  const groundL = layer(), farmFlatL = layer();
  const selG = world.addChild(new PX.Graphics());
  const gridG = world.addChild(new PX.Graphics()), footG = world.addChild(new PX.Graphics());
  const shadowL = layer(), treeL = layer(), farmL = layer();
  const vBack = layer(); vBack.sortableChildren = true;
  const homeL = layer();
  const vFront = layer(); vFront.sortableChildren = true;
  const overG = world.addChild(new PX.Graphics());
  let fc = 0;   // frame counter
  const bakeCanvas = (w, h, S) => { const cv = document.createElement('canvas'); cv.width = Math.ceil(w * S); cv.height = Math.ceil(h * S); return cv; };
  function radialTex(rgb, a0, size) {   // soft round blob, used for tree shadows and the selected-tree glow
    const cv = bakeCanvas(size, size, 1), g = cv.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(' + rgb + ',' + a0 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size); return PX.Texture.from(cv);
  }
  let shadowTex = null, glowTex = null;

