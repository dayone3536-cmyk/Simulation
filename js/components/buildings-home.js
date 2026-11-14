  // ---------- render ----------
  let started = false;

  // Every square is a real tile sprite from your grass pack. Dark and light tiles alternate
  // across the whole map, forest included. Sprites are pixel art, so smoothing stays off.
  function buildGround() {
    const Wd = 2 * CELL * IX, cols = WORLD_W / CELL, rows = WORLD_H / CELL, CK = 8;     // tiles are grouped 8x8 so whole groups off screen cost nothing
    for (let r0 = 0; r0 < rows; r0 += CK) for (let c0 = 0; c0 < cols; c0 += CK) {
      const box = new PX.Container(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let r = r0; r < Math.min(rows, r0 + CK); r++) for (let c = c0; c < Math.min(cols, c0 + CK); c++) {
        const b = BLK[(c * 7 + r * 13 + (c * r)) % BLK.length], bw = Wd + 2, bh = bw * b.h / b.w;
        const x = projX(c * CELL, (r + 1) * CELL) - 1, y = projY(c * CELL, r * CELL) - .5;
        const s = new PX.Sprite(b.tex); s.position.set(x, y); s.width = bw; s.height = bh; box.addChild(s);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + bw); y1 = Math.max(y1, y + bh);
      }
      groundL.addChild(box); groundChunks.push({ box, x0, y0, x1, y1 });
    }
  }
  const groundChunks = [];
  function cullGround() {
    const vl = cpx - cw / 2 / zoom, vr = cpx + cw / 2 / zoom, vt = cpy - ch / 2 / zoom, vb = cpy + ch / 2 / zoom;
    for (const g of groundChunks) g.box.visible = !(g.x1 < vl || g.x0 > vr || g.y1 < vt || g.y0 > vb);
  }
  function buildTrees() {
    for (const t of trees) {
      const tr = TRE[t.v], tex = tr.tex;
      t.px = projX(t.x, t.y); t.py = projY(t.x, t.y);
      t.sx0 = t.flip * tr.w * t.s * .9 / tex.width; t.sy0 = tr.h * t.s * .9 / tex.height;
      const s = new PX.Sprite(tex); s.anchor.set(.5, 1); s.position.set(t.px, t.py + 4 * t.s); s.scale.set(t.sx0, t.sy0); s.visible = false;
      const sh = new PX.Sprite(shadowTex), w = tr.w * t.s * .75; sh.anchor.set(.5); sh.position.set(t.px, t.py - 2); sh.scale.set(w / shadowTex.width, w * .42 / shadowTex.height); sh.visible = false;
      t.spr = s; t.shd = sh; shadowL.addChild(sh); treeL.addChild(s);
    }
  }
  let glowSpr = null, glowTree = null;
  function updateTrees(time, now) {
    const vl = cpx - cw / 2 / zoom - 120, vr = cpx + cw / 2 / zoom + 120, vt = cpy - ch / 2 / zoom - 40, vb = cpy + ch / 2 / zoom + 160;
    const swayNow = (fc & 1) === 0;           // gentle wind sway only needs 30 updates a second
    let selTree = null;
    for (const t of trees) {
      const spr = t.spr; if (!spr) continue;
      if (t.px < vl || t.px > vr || t.py < vt || t.py > vb) { if (t.vis) { spr.visible = false; t.shd.visible = false; t.vis = false; } continue; }
      if (!t.vis) { spr.visible = true; t.shd.visible = true; t.vis = true; t.fresh = true; }
      if (t.dying) {                          // a cleared tree shrinks and fades away
        const k = 1 - Math.min(1, (now - t.dying) / 400), w = TRE[t.v].w * t.s * .75 * k;
        spr.alpha = k; spr.scale.set(t.sx0 * k, t.sy0 * k); t.shd.scale.set(w / shadowTex.width, w * .42 / shadowTex.height); t.mod = true;
        spr.skew.x = Math.sin(time * 1.1 + t.ph) * .02;
      } else if (sel && t.c === sel.c && t.r === sel.r) {   // the tree on the selected slot bounces and glows
        selTree = t; const q = (now - selT) / 1000, sq = 1 + .07 * Math.exp(-q * 4) * Math.sin(q * 22);
        spr.scale.set(t.sx0, t.sy0 * sq); spr.skew.x = Math.sin(time * 1.1 + t.ph) * .02; t.mod = true;
      } else {
        if (t.mod) { spr.scale.set(t.sx0, t.sy0); spr.alpha = 1; t.mod = false; }
        if (swayNow || t.fresh) { spr.skew.x = Math.sin(time * 1.1 + t.ph) * .02; t.fresh = false; }
      }
    }
    if (selTree) {
      if (!glowSpr) { glowSpr = new PX.Sprite(glowTex); glowSpr.anchor.set(.5); }
      if (glowTree !== selTree) { glowTree = selTree; treeL.addChildAt(glowSpr, Math.max(0, treeL.getChildIndex(selTree.spr))); }
      const tr = TRE[selTree.v], w = tr.w * selTree.s * .9, h = tr.h * selTree.s * .9;
      glowSpr.visible = true; glowSpr.position.set(selTree.px, selTree.py + 4 * selTree.s - h * .5); glowSpr.width = w * 1.5; glowSpr.height = h * 1.25; glowSpr.alpha = .5 + .2 * Math.sin(time * 5);
    } else if (glowSpr) { glowSpr.visible = false; glowTree = null; }
  }
  const selColor = () => (sel && occ.get(slot(sel.c, sel.r))) ? 0xffc846 : 0x78ff8c;   // amber = occupied, green = free to build
  let selOn = false;
  function updateSelection(time, now) {          // hover preview + the flat glow and ripple under the trees
    if (!sel && !hov) { if (selOn) { selG.clear(); selOn = false; } return; }
    selOn = true; selG.clear();
    if (hov && !(sel && hov.c === sel.c && hov.r === sel.r)) {
      selG.lineStyle({ width: 1.6 / zoom, color: 0xffffff, alpha: .6, join: 'round' }); selG.beginFill(0xffffff, .16); selG.drawPolygon(ringPts(hov.c, hov.r, 1)); selG.endFill();
    }
    if (sel) {
      const col = selColor();
      selG.lineStyle(0); selG.beginFill(col, .30 + .12 * Math.sin(time * 5)); selG.drawPolygon(ringPts(sel.c, sel.r, 1)); selG.endFill();
      const rp = (now - selT) / 650;                      // ripple: two rings that spread out and fade
      for (let i = 0; i < 2; i++) { const q = rp - i * .22; if (q > 0 && q < 1) { selG.lineStyle({ width: (3 - q * 2) / zoom, color: col, alpha: .9 * (1 - q), join: 'round' }); selG.drawPolygon(ringPts(sel.c, sel.r, 1 + q * 1.4)); } }
    }
  }



  // valid spot = the whole 3x3 block is inside the clearing and not on a tree (the cabin's own slots don't count)
  function homeOK(c, r, ignoreOcc) {
    const x0 = c * CELL, y0 = r * CELL, x1 = (c + HOME_N) * CELL, y1 = (r + HOME_N) * CELL;
    if (x0 < clearing.x0 || y0 < clearing.y0 || x1 > clearing.x1 || y1 > clearing.y1) return false;
    if (!ignoreOcc) for (let j = 0; j < HOME_N; j++) for (let i = 0; i < HOME_N; i++) { const o = occ.get(slot(c + i, r + j)); if (o && o.type !== 'home') return false; }
    return true;
  }
  function homeRect(c, r) {
    const bx = (c + HOME_N) * CELL, by = (r + HOME_N) * CELL;
    const hx = (projX(bx, by) - cpx) * zoom + cw / 2, hy = (projY(bx, by) - cpy) * zoom + ch / 2;
    const w = HOME_N * 2 * CELL * IX * 1.12 * zoom, h = w * HOME.naturalHeight / HOME.naturalWidth;
    return { x: hx - w * .51, y: hy - h * .985, w, h };
  }
  let homeCtx = null;
  function hitHome(sx, sy) {                       // did the finger land on the cabin (painted pixels or its base)?
    if (!HOME.naturalWidth) return false;
    const s = slotAt(sx, sy), pos = drag || home;
    if (s && s.c >= pos.c - 1 && s.c < pos.c + HOME_N + 1 && s.r >= pos.r - 1 && s.r < pos.r + HOME_N + 1) return true;   // a generous 1-tile margin around the footprint
    const R = homeRect(pos.c, pos.r); if (drag) R.y -= 10 * zoom;
    if (sx < R.x || sx > R.x + R.w || sy < R.y || sy > R.y + R.h) return false;
    if (!homeCtx) { const cv = document.createElement('canvas'); cv.width = HOME.naturalWidth; cv.height = HOME.naturalHeight; homeCtx = cv.getContext('2d', { willReadFrequently: true }); homeCtx.drawImage(HOME, 0, 0); }
    const u = Math.floor((sx - R.x) / R.w * HOME.naturalWidth), v = Math.floor((sy - R.y) / R.h * HOME.naturalHeight);
    return homeCtx.getImageData(u, v, 1, 1).data[3] > 40;
  }
  // ---------- moving the cabin ----------
  const clampI = (v, a, b) => Math.max(a, Math.min(b, v));
  const mvBar = document.getElementById('movebar'), mvMsg = document.getElementById('mvMsg'), mvRot = document.getElementById('mvRot');
  function setDragPos(c, r) {
    drag.c = clampI(c, 0, WORLD_W / CELL - HOME_N); drag.r = clampI(r, 0, WORLD_H / CELL - HOME_N);
    drag.ok = homeOK(drag.c, drag.r);
  }
  function dragTo(q) { drag.q = q; const s = slotAt(q.x, q.y); if (s) setDragPos(s.c - drag.oc, s.r - drag.or); }
  function moveHere(sx, sy) { const s = slotAt(sx, sy); if (s) setDragPos(s.c - 1, s.r - 1); }   // centre the cabin on the tapped tile
  // one tile of the map: inside the clearing and nothing but the cabin itself standing on it
  function tileFree(c, r) {
    const x0 = c * CELL, y0 = r * CELL;
    if (x0 < clearing.x0 || y0 < clearing.y0 || x0 + CELL > clearing.x1 || y0 + CELL > clearing.y1) return false;
    const o = occ.get(slot(c, r)); return !o || o.type === 'home';
  }
  function blockReason(pos) {
    let edge = false;
    for (let j = 0; j < HOME_N; j++) for (let i = 0; i < HOME_N; i++) {
      const o = occ.get(slot(pos.c + i, pos.r + j)); if (o && o.type !== 'home') return 'tree';
      if (!tileFree(pos.c + i, pos.r + j)) edge = true;
    }
    return edge ? 'edge' : '';
  }
  // the big grid: every tile near the moving building is tinted green (free) or red (blocked), drawn on the ground UNDER the trees
  let gridKey = '';
  function updateMoveGrid(time) {
    const src = drag || placing || movingFarm;
    if (!src) { if (gridKey) { gridG.clear(); footG.clear(); gridKey = ''; } return; }
    const isFarm = !!placing || !!movingFarm, rot = isFarm ? src.rot : 0, cols = isFarm ? fCols(rot) : HOME_N, rows = isFarm ? fRows(rot) : HOME_N;
    const freeAt = isFarm ? farmTileOK : tileFree;
    const worldCols = WORLD_W / CELL, worldRows = WORLD_H / CELL, pad = 5, pulse = .5 + .5 * Math.sin(time * 4);
    const c0 = Math.max(0, src.c - pad), c1 = Math.min(worldCols - 1, src.c + cols - 1 + pad);
    const r0 = Math.max(0, src.r - pad), r1 = Math.min(worldRows - 1, src.r + rows - 1 + pad);
    const inFoot = (c, r) => c >= src.c && c < src.c + cols && r >= src.r && r < src.r + rows;
    const key = src.c + ',' + src.r + ',' + cols + ',' + rows + ',' + zoom.toFixed(2);
    if (key !== gridKey) {
      gridKey = key; gridG.clear();
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        if (inFoot(c, r)) continue;
        const free = freeAt(c, r);
        gridG.lineStyle({ width: 1.3 / zoom, color: 0xffffff, alpha: free ? .55 : .25, join: 'round' });
        gridG.beginFill(free ? 0x50e664 : 0xf0463c, free ? .20 : .13); gridG.drawPolygon(ringPts(c, r, 1)); gridG.endFill();
      }
    }
    footG.clear();
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const c = src.c + i, r = src.r + j, col = freeAt(c, r) ? 0x50e664 : 0xf0463c;
      footG.lineStyle({ width: 2.2 / zoom, color: col, alpha: .95, join: 'round' });
      footG.beginFill(col, .42 + .12 * pulse); footG.drawPolygon(ringPts(c, r, 1)); footG.endFill();
    }
  }
  // on top of the cabin and the trees: red X + red tint on every footprint tile that is blocked, so a tree can never hide it
  function drawFootMarks(pos, cols = HOME_N, rows = HOME_N, freeAt = tileFree) {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const c = pos.c + i, r = pos.r + j; if (freeAt(c, r)) continue;
      overG.lineStyle(0); overG.beginFill(0xf0463c, .38); overG.drawPolygon(ringPts(c, r, 1)); overG.endFill();
      const px = projX((c + .5) * CELL, (r + .5) * CELL), py = projY((c + .5) * CELL, (r + .5) * CELL), d = CELL * IX * .32;
      for (const w of [[5.5, 0x000000, .45], [3.2, 0xff5a4d, 1]]) {
        overG.lineStyle({ width: w[0] / zoom, color: w[1], alpha: w[2], cap: 'round', join: 'round' });
        overG.moveTo(px - d, py - d * .6); overG.lineTo(px + d, py + d * .6); overG.moveTo(px + d, py - d * .6); overG.lineTo(px - d, py + d * .6);
      }
    }
  }
  // on top of the cabin and the trees: red X + red tint on every footprint tile that is blocked, so a tree can never hide it
  
  let barKey = '';
  function moveTick() {                              // runs every frame: edge-scroll while carrying + keep the tick/cross bar up to date
    if (drag && drag.held && drag.q) {
      const m = 70, q = drag.q; let dx = 0, dy = 0;
      if (q.x < m) dx = -(m - q.x) / m; else if (q.x > cw - m) dx = (q.x - (cw - m)) / m;
      if (q.y < m) dy = -(m - q.y) / m; else if (q.y > ch - m) dy = (q.y - (ch - m)) / m;
      if (dx || dy) { cpx += dx * 9 / zoom; cpy += dy * 9 / zoom; clampCam(); dragTo(q); }
    }
    if (placing && placing.held && placing.q) {
      const m = 70, q = placing.q; let dx = 0, dy = 0;
      if (q.x < m) dx = -(m - q.x) / m; else if (q.x > cw - m) dx = (q.x - (cw - m)) / m;
      if (q.y < m) dy = -(m - q.y) / m; else if (q.y > ch - m) dy = (q.y - (ch - m)) / m;
      if (dx || dy) { cpx += dx * 9 / zoom; cpy += dy * 9 / zoom; clampCam(); const s = slotAt(q.x, q.y); if (s) { const cols = fCols(placing.rot), rows = fRows(placing.rot); placing.c = clampI(s.c - (placing.offC || 0), 0, WORLD_W / CELL - cols); placing.r = clampI(s.r - (placing.offR || 0), 0, WORLD_H / CELL - rows); barKey = '#'; rebuildFarm(placing); } }
    }
    if (movingFarm && movingFarm.held && movingFarm.q) {
      const m = 70, q = movingFarm.q; let dx = 0, dy = 0;
      if (q.x < m) dx = -(m - q.x) / m; else if (q.x > cw - m) dx = (q.x - (cw - m)) / m;
      if (q.y < m) dy = -(m - q.y) / m; else if (q.y > ch - m) dy = (q.y - (ch - m)) / m;
      if (dx || dy) { cpx += dx * 9 / zoom; cpy += dy * 9 / zoom; clampCam(); const s = slotAt(q.x, q.y); if (s) { setMovingFarmPos(s.c - movingFarm.offC, s.r - movingFarm.offR); barKey = '#'; rebuildFarm(movingFarm.farm); } }
    }
    const fm = placing || movingFarm, pos = drag || fm;
    const valid = fm ? farmSpotOK(fm.c, fm.r, fm.rot) : drag ? drag.ok : true;
    const key = !pos ? '' : fm ? (valid ? 'pok' : 'pbad') : (drag.ok ? 'ok' : blockReason(drag) || 'edge');
    if (key === barKey) return;
    barKey = key;
    mvBar.style.display = pos ? 'flex' : 'none'; mvBar.classList.toggle('bad', !!pos && !valid);
    mvBar.classList.toggle('placing', !!fm);
    mvMsg.innerHTML = !pos ? ''
      : fm ? (valid ? (placing ? 'Looks good!<small>Drag or tap the map to move \u00B7 \u27F3 rotates \u00B7 \u2713 confirms</small>' : 'Looks good!<small>Drag or tap the map to move \u00B7 \u27F3 rotates \u00B7 \u2713 places</small>')
        : 'Can\u2019t build here<small>Move to a free spot \u00B7 \u27F3 rotates</small>')
      : key === 'ok' ? 'Looks good!<small>Tap \u2713 to place it here</small>'
      : key === 'tree' ? 'A tree is in the way<small>Red tiles are blocked. Drag or tap a green spot</small>'
      : key === 'edge' ? 'Too close to the forest edge<small>Drag or tap a green spot</small>' : '';
  }
  function endDrag(commit) {
    if (!drag) return;
    if (commit) {
      if (!drag.ok) { mvBar.classList.remove('shake'); void mvBar.offsetWidth; mvBar.classList.add('shake'); return; }   // red spot: refuse, stay selected
      if (drag.c !== home.c || drag.r !== home.r) {
        for (let j = 0; j < HOME_N; j++) for (let i = 0; i < HOME_N; i++) occ.delete(slot(home.c + i, home.r + j));
        home = { c: drag.c, r: drag.r };
        for (let j = 0; j < HOME_N; j++) for (let i = 0; i < HOME_N; i++) occ.set(slot(home.c + i, home.r + j), { type: 'home', c: home.c + i, r: home.r + j });
        try { localStorage.setItem('homePos', JSON.stringify(home)); } catch (e) {}
      }
    }
    drag = null; barKey = '#';                      // cross = cabin goes back to where it was
  }
  document.getElementById('mvOk').addEventListener('click', () => { if (placing) endPlacing(true); else if (movingFarm) endMovingFarm(true); else endDrag(true); });
  document.getElementById('mvNo').addEventListener('click', () => { if (placing) endPlacing(false); else if (movingFarm) endMovingFarm(false); else endDrag(false); });
  mvRot.addEventListener('click', () => rotateFarm());
  window.addEventListener('keydown', e => {
    if (placing || movingFarm) {
      if (e.key === 'Enter') { if (placing) endPlacing(true); else endMovingFarm(true); }
      else if (e.key === 'Escape') { if (placing) endPlacing(false); else endMovingFarm(false); }
      else if (e.key === 'r' || e.key === 'R') rotateFarm();
      return;
    }
    if (!drag) return;
    if (e.key === 'Enter') endDrag(true); else if (e.key === 'Escape') endDrag(false);
  });
  function homeRectP(c, r) {                       // where the cabin picture goes, in projected space (no camera)
    const bx = (c + HOME_N) * CELL, by = (r + HOME_N) * CELL;
    const w = HOME_N * 2 * CELL * IX * 1.12, h = w * HOME.naturalHeight / HOME.naturalWidth;
    return { x: projX(bx, by) - w * .51, y: projY(bx, by) - h * .985, w, h };
  }
  let homeSpr = null, homeShadowG = null, homeShadowOn = false, overOn = false;
  function updateHome(time) {
    if (!(HOME.complete && HOME.naturalWidth)) return;
    if (!homeSpr) { homeShadowG = homeL.addChild(new PX.Graphics()); homeSpr = homeL.addChild(new PX.Sprite(PX.Texture.from(HOME))); }
    updateVillagers(time);
    moveTick();
    updateVillagerSprites(time);
    const pos = drag || home, R = homeRectP(pos.c, pos.r), lift = drag ? 10 : 0;
    homeSpr.position.set(R.x, R.y - lift); homeSpr.width = R.w; homeSpr.height = R.h; homeSpr.alpha = drag ? .94 : 1;
    if (drag || homeShadowOn) {
      homeShadowG.clear(); homeShadowOn = !!drag;
      if (drag) { homeShadowG.beginFill(0x000000, .18); homeShadowG.drawEllipse(R.x + R.w * .5, R.y + R.h * .8, R.w * .38, R.h * .16); homeShadowG.endFill(); }
    }
  }
  // everything drawn on top of the trees and the cabin: footprints and selection outline
  function updateOverlay(time) {
    const fm = placing || movingFarm;
    if (!sel && !drag && !fm) { if (overOn) { overG.clear(); overOn = false; } return; }
    overOn = true; overG.clear();
    if (drag || fm) {
      const isFarm = !!fm, pos = drag || fm, ok = isFarm ? farmSpotOK(pos.c, pos.r, pos.rot) : pos.ok;
      const cols = isFarm ? fCols(pos.rot) : HOME_N, rows = isFarm ? fRows(pos.rot) : HOME_N;
      const rgb = ok ? 0x50e664 : 0xf0463c, x0 = pos.c * CELL, y0 = pos.r * CELL, x1 = (pos.c + cols) * CELL, y1 = (pos.r + rows) * CELL;
      const P = [projX(x0, y0), projY(x0, y0), projX(x1, y0), projY(x1, y0), projX(x1, y1), projY(x1, y1), projX(x0, y1), projY(x0, y1)];
      overG.lineStyle(0); overG.beginFill(rgb, .10); overG.drawPolygon(P); overG.endFill();
      overG.lineStyle({ width: 5 / zoom, color: 0x000000, alpha: .35, join: 'round' }); overG.drawPolygon(P);
      overG.lineStyle({ width: 3 / zoom, color: rgb, alpha: 1, join: 'round' }); overG.drawPolygon(P);
      drawFootMarks(pos, cols, rows, isFarm ? farmTileOK : tileFree);
    }
    if (sel) {
      const P = ringPts(sel.c, sel.r, 1);
      overG.lineStyle({ width: 9 / zoom, color: selColor(), alpha: .22, join: 'round' }); overG.drawPolygon(P);    // soft glow
      overG.lineStyle({ width: 5 / zoom, color: 0x000000, alpha: .4, join: 'round' }); overG.drawPolygon(P);
      overG.lineStyle({ width: 2.6 / zoom, color: 0xffffff, alpha: 1, cap: 'butt', join: 'round' }); dashedPoly(overG, P, 9 / zoom, 5 / zoom, -time * 14 / zoom);
      const bob = (Math.sin(time * 4) * .5 + .5) * .16 + .06;          // arrows pulse outward from each corner
      const cx = (sel.c + .5) * CELL, cy = (sel.r + .5) * CELL, h = CELL / 2;
      overG.lineStyle({ width: 1.5 / zoom, color: 0x000000, alpha: .55, join: 'round' });
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const ox = cx + dx * h * (1 + bob), oy = cy + dy * h * (1 + bob);
        const px = projX(ox, oy), py = projY(ox, oy), ax = projX(dx, dy), ay = projY(dx, dy), L = Math.hypot(ax, ay), nx = ax / L, ny = ay / L, s = 9 / zoom * Math.max(.8, zoom * 1.2);
        overG.beginFill(0xffffff, 1);
        overG.drawPolygon([px, py, px - nx * s * 1.4 - ny * s * .8, py - ny * s * 1.4 + nx * s * .8, px - nx * s * 1.4 + ny * s * .8, py - ny * s * 1.4 - nx * s * .8]);
        overG.endFill();
      }
    }
  }
