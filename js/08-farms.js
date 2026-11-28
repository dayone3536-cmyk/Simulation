  // ---------- wheat farm: a 5x2 field the player chooses where to place and can rotate ----------
  const FARM_BASE_W = 5, FARM_BASE_H = 2;          // field size in slots before rotation
  const FW = FARM_BASE_W * CELL, FH = FARM_BASE_H * CELL;   // local field size in world units
  const fCols = rot => rot ? FARM_BASE_H : FARM_BASE_W;      // footprint width in slots
  const fRows = rot => rot ? FARM_BASE_W : FARM_BASE_H;      // footprint height in slots
  let farms = [], placing = null, movingFarm = null, wheatCount = 0;   // farms = [{ t0, c, r, rot }]; placing = preview for a new farm; movingFarm = dragging an existing farm
  function farmBounds(f) {
    if (!f) return null;
    const cols = fCols(f.rot), rows = fRows(f.rot);
    return { x0: f.c * CELL, y0: f.r * CELL, x1: (f.c + cols) * CELL, y1: (f.r + rows) * CELL };
  }
  function farmCenter(f) {
    if (!f) return [0, 0];
    const b = farmBounds(f), x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
    return [projX(x, y), projY(x, y)];
  }
  function farmVisible(f) {
    if (!f) return false;
    const ctr = farmCenter(f);
    return Math.abs(ctr[0] - cpx) < cw / 2 / zoom + 340 && Math.abs(ctr[1] - cpy) < ch / 2 / zoom + 340;
  }
  function farmTileOK(c, r) {
    return !occ.get(slot(c, r));
  }
  function farmSpotOK(c, r, rot, ignore) {       // ignore = farm being moved (its own current tiles don't block)
    const cols = fCols(rot), rows = fRows(rot);
    if (c < 0 || r < 0 || c + cols > WORLD_W / CELL || r + rows > WORLD_H / CELL) return false;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const o = occ.get(slot(c + i, r + j)); if (o && o !== ignore) return false;
    }
    return true;
  }
  function farmAt(sx, sy) {
    const s = slotAt(sx, sy);
    for (const f of farms) {
      const b = farmBounds(f), c0 = Math.floor(b.x0 / CELL), r0 = Math.floor(b.y0 / CELL), c1 = Math.ceil(b.x1 / CELL), r1 = Math.ceil(b.y1 / CELL);
      if (s && s.c >= c0 && s.c < c1 && s.r >= r0 && s.r < r1) return f;
    }
    return null;
  }
  function eachFarmSlot(src, fn) {
    if (!src) return;
    const cols = fCols(src.rot), rows = fRows(src.rot);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) fn(src.c + i, src.r + j);
  }
  function claimFarmSlots(src) {
    eachFarmSlot(src, (c, r) => {
      const old = occ.get(slot(c, r));
      if (old && old.type === 'tree') { dropTree(old); const k = trees.indexOf(old); if (k >= 0) trees.splice(k, 1); }
      occ.set(slot(c, r), { type: 'farm', c, r });
    });
  }
  function findFarmSpot(rot) {
    const cols = fCols(rot), rows = fRows(rot);
    const maxC = WORLD_W / CELL - cols, maxR = WORLD_H / CELL - rows;
    const c0 = Math.max(0, Math.ceil(clearing.x0 / CELL)), r0 = Math.max(0, Math.ceil(clearing.y0 / CELL));
    const c1 = Math.min(maxC, Math.floor(clearing.x1 / CELL) - cols), r1 = Math.min(maxR, Math.floor(clearing.y1 / CELL) - rows);
    const prefC = Math.max(c0, Math.min(c1, home.c)), prefR = Math.max(r0, Math.min(r1, home.r + HOME_N + 1));
    let best = null, bestD = Infinity;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (!farmSpotOK(c, r, rot)) continue;
      const d = Math.abs(c - prefC) + Math.abs(r - prefR);
      if (d < bestD) { bestD = d; best = { c, r, rot }; }
    }
    return best || { c: prefC, r: prefR, rot };
  }

  // The field is just the Blender bed: one baked sprite per rotation, no drawn soil, fence,
  // tufts, stones or wheat. 16-farm-model.js keeps only the wheat bed and drops everything else.
  function buildFarmModel(f) {
    const fm = window.FARM_MODEL, rot = f.rot ? 1 : 0;
    const lay = fm.layouts[rot], X0 = f.c * CELL, Y0 = f.r * CELL;
    const spr = new PX.Sprite(fm.textures[rot]);
    spr.anchor.set(0, 0);
    spr.position.set(projX(X0, Y0) + lay.posX, projY(X0, Y0) + lay.posY);
    spr.width = lay.w; spr.height = lay.h;
    f.stand.addChild(spr);
  }
  function rebuildFarm(f) {
    if (!f) return;
    if (!f.flat) f.flat = farmFlatL.addChild(new PX.Container());
    if (!f.stand) f.stand = farmL.addChild(new PX.Container());
    for (const c of [f.flat, f.stand]) { const kids = c.removeChildren(); for (const ch of kids) ch.destroy({ children: true }); }
    if (f.groundTex) { f.groundTex.destroy(true); f.groundTex = null; }
    f.stalkC = null; f.stalkSprites = null;
    const fm = window.FARM_MODEL, rot = f.rot ? 1 : 0;
    if (fm && fm.ready && fm.textures[rot] && fm.layouts[rot]) buildFarmModel(f);   // the bed is the whole field
  }
  function destroyFarmVisual(f) {
    if (!f) return;
    for (const k of ['flat', 'stand']) { const c = f[k]; if (c) { c.removeFromParent(); c.destroy({ children: true }); f[k] = null; } }
    if (f.groundTex) { f.groundTex.destroy(true); f.groundTex = null; }
    f.stalkC = null; f.stalkSprites = null;
    if (typeof destroyFarmUI === 'function') destroyFarmUI(f);
  }
  function updateFarm() {
    const list = placing ? [...farms, placing] : farms;
    const movingF = movingFarm ? movingFarm.farm : null;
    for (const f of list) {
      if (!f.flat || !f.stand) continue;
      const vis = farmVisible(f);
      f.stand.visible = f.flat.visible = vis;
      f.stand.alpha = f.flat.alpha = (f === placing || f === movingF) ? .82 : 1;
    }
  }

  // the 3D model loader (16-farm-model.js) asks for the field size and a repaint once it is baked
  window.__farmArt = {
    get FW() { return FW; },
    get FH() { return FH; },
    rebuildAll() {
      for (const f of farms) rebuildFarm(f);
      if (placing) rebuildFarm(placing);
      if (movingFarm) rebuildFarm(movingFarm.farm);
    }
  };

  // bring in the Blender field model in the background; it is the only farm art
  if (!window.FARM_MODEL) {
    const src = (document.currentScript && document.currentScript.src) || location.href;
    import(new URL('16-farm-model.js?v=3', src).href)
      .catch(err => console.warn('Farm model could not be loaded.', err));
  }


