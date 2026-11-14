  // ---------- wheat farm: a 5x2 field the player chooses where to place and can rotate ----------
  const FARM_BASE_W = 5, FARM_BASE_H = 2;          // field size in slots before rotation
  const FW = FARM_BASE_W * CELL, FH = FARM_BASE_H * CELL;   // local field size in world units
  const fCols = rot => rot ? FARM_BASE_H : FARM_BASE_W;      // footprint width in slots
  const fRows = rot => rot ? FARM_BASE_W : FARM_BASE_H;      // footprint height in slots
  const WSTEM = ['#c48a22', '#d09a2c', '#b87f1e'], WHEAD = ['#f7d04f', '#ffe066', '#ecb93a'];
  const STEM_S = .25;                              // stalk pictures are baked at 4x, so draw them at a quarter size
  const stalks = [], tufts = [], rocks = [];
  let farms = [], placing = null, movingFarm = null, wheatCount = 0;   // farms = [{ t0, c, r, rot }]; placing = preview for a new farm; movingFarm = dragging an existing farm
  (function buildFarmData() {
    let sd = 20260; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };   // own random numbers: the farm looks the same every visit
    for (let y = 5; y < FH - 2; y += 12) for (let x = 6; x < FW - 2; x += 12) for (let k = 0; k < 2; k++)
      stalks.push({ x: x + (rnd() - .5) * 9 + k * 5, y: y + (rnd() - .5) * 7 + k * 4, h: 27 + rnd() * 13, lean: (rnd() - .5) * 3.5, ph: rnd() * 6.28, sh: (rnd() * 3) | 0 });
    for (let i = 0; i < 34; i++) {
      const x = -70 + rnd() * (FW + 140), y = -60 + rnd() * (FH + 200);
      if (x > -14 && x < FW + 8 && y > -22 && y < FH + 8) continue;    // not on the soil
      tufts.push({ x, y, f: rnd() < .35 ? ['#ffffff', '#ffd3e6', '#ffe27a'][(rnd() * 3) | 0] : null });
    }
    for (const [lx, ly, sz] of [[70, FH + 8, 1], [96, FH + 10, .7], [FW - 80, FH + 10, .9], [FW - 56, FH + 12, .6]]) rocks.push({ x: lx, y: ly, s: sz });
  })();
  const wave = (x, y, t) => Math.sin(t * .55 - (x + y) * .008) * .55 + Math.sin(t * .22 - x * .004 + y * .003) * .45;   // slow wind rolling across the field
  function farmWorld(f, lx, ly) {
    const X0 = f.c * CELL, Y0 = f.r * CELL;
    return f.rot ? [X0 + ly, Y0 + FW - lx] : [X0 + lx, Y0 + ly];
  }
  function farmProj(f, lx, ly) { if (!f) return [0, 0]; const [x, y] = farmWorld(f, lx, ly); return [projX(x, y), projY(x, y)]; }
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
    const x0 = c * CELL, y0 = r * CELL;
    if (x0 < clearing.x0 || y0 < clearing.y0 || x0 + CELL > clearing.x1 || y0 + CELL > clearing.y1) return false;
    return !occ.get(slot(c, r));
  }
  function farmSpotOK(c, r, rot, ignore) {       // ignore = farm being moved (its own current tiles don't block)
    const cols = fCols(rot), rows = fRows(rot);
    if (c < 0 || r < 0 || c + cols > WORLD_W / CELL || r + rows > WORLD_H / CELL) return false;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const cc = c + i, rr = r + j;
      const x0 = cc * CELL, y0 = rr * CELL;
      if (x0 < clearing.x0 || y0 < clearing.y0 || x0 + CELL > clearing.x1 || y0 + CELL > clearing.y1) return false;
      const o = occ.get(slot(cc, rr)); if (o && o !== ignore) return false;
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
  function rrectG(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // The flat ground art (soil + furrows) is baked into one picture, already tilted into the diamond view.
  // It is rebuilt whenever the farm is placed or rotated.
  let stalkTex = null, tuftTex = null;
  function makeFarmTextures() {
    if (stalkTex) return;
    stalkTex = [0, 1, 2].map(i => {
      const cv = bakeCanvas(16, 58, 4), g = cv.getContext('2d');
      g.setTransform(4, 0, 0, 4, 32, 220); g.lineCap = 'round'; g.strokeStyle = WSTEM[i]; g.lineWidth = 1.7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -40); g.stroke();
      g.fillStyle = WHEAD[i]; g.beginPath(); g.ellipse(0, -44, 2.7, 7, 0, 0, 7); g.fill();
      return PX.Texture.from(cv);
    });
    tuftTex = {};
    for (const f of [null, '#ffffff', '#ffd3e6', '#ffe27a']) {
      const tc = bakeCanvas(20, 14, 4), t = tc.getContext('2d');
      t.setTransform(4, 0, 0, 4, 32, 48); t.lineCap = 'round'; t.strokeStyle = '#3f8a22'; t.lineWidth = 1.5; t.beginPath();
      t.moveTo(-3, 0); t.lineTo(-5, -7); t.moveTo(0, 0); t.lineTo(0, -9); t.moveTo(3, 0); t.lineTo(5, -7); t.stroke();
      if (f) { t.fillStyle = f; t.beginPath(); t.arc(6, -3, 2.2, 0, 7); t.fill(); }
      tuftTex[f] = PX.Texture.from(tc);
    }
  }
  function buildFarmGround(f) {
    const S = 3, M = 20;
    const cs = [[-M, -M], [FW + M, -M], [FW + M, FH + M], [-M, FH + M]].map(([lx, ly]) => farmProj(f, lx, ly));
    const u0 = Math.min(...cs.map(p => p[0])), u1 = Math.max(...cs.map(p => p[0])), v0 = Math.min(...cs.map(p => p[1])), v1 = Math.max(...cs.map(p => p[1]));
    const cv = bakeCanvas(u1 - u0, v1 - v0, S), g = cv.getContext('2d');
    const X0 = f.c * CELL, Y0 = f.r * CELL;
    const a = IX, b = f.rot ? -IY : IY, c = f.rot ? IX : -IX, d = IY;
    const e = f.rot ? (X0 - Y0 - FW) * IX : (X0 - Y0) * IX;
    const fv = f.rot ? (X0 + Y0 + FW) * IY : (X0 + Y0) * IY;
    g.setTransform(S * a, S * b, S * c, S * d, (e - u0) * S, (fv - v0) * S);       // local farm units land on the diamond
    rrectG(g, -18, -18, FW + 36, FH + 36, 26); g.fillStyle = 'rgba(40,70,10,.28)'; g.fill();     // soft shade on the grass around the bed
    rrectG(g, -8, -8, FW + 16, FH + 16, 14); g.fillStyle = '#5f3d20'; g.fill();                   // soil bed
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#7a502e' : '#8f6238'; g.fillRect(0, i * 16, FW, 16); }   // furrows
    if (f.groundTex) f.groundTex.destroy(true);
    f.groundTex = PX.Texture.from(cv);
    const sp = new PX.Sprite(f.groundTex); sp.position.set(u0, v0); sp.scale.set(1 / S); f.flat.addChild(sp);
    // grass tufts and little flowers around the field
    for (const t of tufts) { const s = new PX.Sprite(tuftTex[t.f]); s.anchor.set(8 / 20, 12 / 14); s.scale.set(.25); const [u, v] = farmProj(f, t.x, t.y); s.position.set(u, v); f.flat.addChild(s); }
  }

  // the standing parts: back fence, every wheat stalk (swaying), front fence and stones.
  function buildFarmStanding(f) {
    const fence = (g, x0, y0, x1, y1) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40)), P = [];
      for (let i = 0; i <= n; i++) { const lx = x0 + (x1 - x0) * i / n, ly = y0 + (y1 - y0) * i / n; P.push(farmProj(f, lx, ly)); }
      g.lineStyle({ width: 2.2, color: 0xa97a44, cap: 'round', join: 'round' });
      for (const h of [5, 11]) P.forEach(([px, py], i) => i ? g.lineTo(px, py - h) : g.moveTo(px, py - h));
      g.lineStyle({ width: 3.6, color: 0x7d5128, cap: 'round', join: 'round' });
      for (const [px, py] of P) { g.moveTo(px, py); g.lineTo(px, py - 15); }
    };
    const E = [[-14, -14, FW + 2, -14], [-14, -14, -14, FH + 6], [FW + 2, -14, FW + 2, FH + 6], [-14, FH + 6, FW + 2, FH + 6]];
    const back = f.stand.addChild(new PX.Graphics());
    for (const i of (f.rot ? [0, 2] : [0, 1])) fence(back, ...E[i]);
    f.stalkC = f.stand.addChild(new PX.Container());
    f.stalkSprites = stalks.map(p => { const [u, v] = farmProj(f, p.x, p.y); return { x: p.x, y: p.y, h: p.h, lean: p.lean, ph: p.ph, sh: p.sh, u, v, spr: null }; });
    f.stalkSprites.sort((a, b) => a.v - b.v);
    for (const p of f.stalkSprites) {
      const s = new PX.Sprite(stalkTex[p.sh]); s.anchor.set(.5, 55 / 58);
      s.position.set(p.u, p.v); s.scale.set(p.h / 40 * STEM_S); p.spr = s; f.stalkC.addChild(s);
    }
    const front = f.stand.addChild(new PX.Graphics());
    for (const i of (f.rot ? [1, 3] : [2, 3])) fence(front, ...E[i]);
    const rg = f.stand.addChild(new PX.Graphics());
    for (const q of rocks) {
      const [sx, sy] = farmProj(f, q.x, q.y), k = q.s;
      rg.beginFill(0x6f7676); rg.drawEllipse(sx + 2 * k, sy + 1 * k, 10 * k, 5 * k); rg.endFill();
      rg.beginFill(0xa9afaf); rg.drawEllipse(sx, sy - 3 * k, 9 * k, 6.5 * k); rg.endFill();
      rg.beginFill(0xc7cccc); rg.drawEllipse(sx - 2 * k, sy - 5 * k, 4 * k, 2.4 * k); rg.endFill();
    }
  }
  function rebuildFarm(f) {
    if (!f) return;
    if (!f.flat) f.flat = farmFlatL.addChild(new PX.Container());
    if (!f.stand) f.stand = farmL.addChild(new PX.Container());
    for (const c of [f.flat, f.stand]) { const kids = c.removeChildren(); for (const ch of kids) ch.destroy({ children: true }); }
    if (f.groundTex) { f.groundTex.destroy(true); f.groundTex = null; }
    f.stalkC = null; f.stalkSprites = null;
    makeFarmTextures();
    buildFarmGround(f);
    buildFarmStanding(f);
  }
  function destroyFarmVisual(f) {
    if (!f) return;
    for (const k of ['flat', 'stand']) { const c = f[k]; if (c) { c.removeFromParent(); c.destroy({ children: true }); f[k] = null; } }
    if (f.groundTex) { f.groundTex.destroy(true); f.groundTex = null; }
    f.stalkC = null; f.stalkSprites = null;
    if (typeof destroyFarmUI === 'function') destroyFarmUI(f);
  }
  function updateFarm(time) {
    const list = placing ? [...farms, placing] : farms;
    const movingF = movingFarm ? movingFarm.farm : null;
    for (const f of list) {
      if (!f.flat || !f.stand) continue;
      const vis = farmVisible(f);
      f.stand.visible = f.flat.visible = vis;
      f.stand.alpha = f.flat.alpha = (f === placing || f === movingF) ? .82 : 1;
      if (!vis || (fc & 1)) continue;                // wind sways at 30 updates a second
      const hf = f.hf == null ? 1 : f.hf, tint = f.tint == null ? 0xffffff : f.tint;
      const vl = cpx - cw / 2 / zoom - 20 / zoom, vr = cpx + cw / 2 / zoom + 20 / zoom, vt = cpy - ch / 2 / zoom - 20 / zoom, vb = cpy + ch / 2 / zoom + 60;
      for (const p of f.stalkSprites || []) {
        const on = p.u > vl && p.u < vr && p.v > vt && p.v < vb; p.spr.visible = on; if (!on) continue;
        p.spr.scale.set(p.h / 40 * STEM_S * (.7 + .3 * hf), p.h / 40 * STEM_S * hf); p.spr.tint = tint; p.spr.skew.x = -(p.lean * hf + wave(p.x, p.y, time) * (2.2 + 3 * hf) + Math.sin(time * .6 + p.ph) * .35) / (p.h * hf * STEM_S);
      }
    }
  }


