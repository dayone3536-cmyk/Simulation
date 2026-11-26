  // ---------- rival village: a second plot of land that appears after the forest is pushed back ----------
  // First step of enemy bases: a rival clearing with its own hall, farms and people.
  // Nothing here fights; the two villages simply share the map for now.
  const RIVAL_TREE_GOAL = 12;             // clear this many trees and the rival plot is revealed
  const RIVAL_SAVE_KEY = 'rivalVillage';
  const RIVAL_PLOT_COLS = 16, RIVAL_PLOT_ROWS = 10;   // exactly the same 16x10-tile plot as the player's clearing
  const RIVAL_BOT_COUNT = 7;

  // Layout is relative to the top-left tile of the plot. The hall sits in the middle,
  // with two fields on either side and a gate at the front.
  const RIVAL_LAYOUT = {
    hall: { c: 6, r: 3, cols: 4, rows: 3 },
    farms: [
      { c: 2, r: 2, cols: 4, rows: 2 },
      { c: 2, r: 6, cols: 4, rows: 2 },
      { c: 10, r: 2, cols: 4, rows: 2 },
      { c: 10, r: 6, cols: 4, rows: 2 }
    ]
  };
  // Four possible places, one in each far corner of the map. The first free one is used,
  // so a rival base never lands on the player's cabin or woodcutter hut.
  const RIVAL_PLOTS = [
    { c: 2, r: 2 }, { c: 28, r: 2 }, { c: 2, r: 28 }, { c: 28, r: 28 }
  ];

  let rivalTrees = 0, rivalUnlocked = false, rivalPlot = null;
  try {
    const s = JSON.parse(localStorage.getItem(RIVAL_SAVE_KEY) || 'null');
    if (s) {
      rivalTrees = Math.max(0, s.trees | 0);
      rivalUnlocked = !!s.unlocked;
      if (s.plot && Number.isInteger(s.plot.c) && Number.isInteger(s.plot.r)) {
        rivalPlot = {
          c: Math.max(0, Math.min(WORLD_W / CELL - RIVAL_PLOT_COLS, s.plot.c)),
          r: Math.max(0, Math.min(WORLD_H / CELL - RIVAL_PLOT_ROWS, s.plot.r))
        };
      }
    }
  } catch (e) {}
  if (!rivalPlot) rivalPlot = RIVAL_PLOTS[0];

  function saveRivalState() {
    try {
      localStorage.setItem(RIVAL_SAVE_KEY, JSON.stringify({
        trees: rivalTrees,
        unlocked: rivalUnlocked ? 1 : 0,
        plot: rivalPlot ? { c: rivalPlot.c, r: rivalPlot.r } : null
      }));
    } catch (e) {}
  }

  function rivalRect(rel) {
    return { c: rivalPlot.c + rel.c, r: rivalPlot.r + rel.r, cols: rel.cols, rows: rel.rows };
  }
  function rivalPlotRect() {
    return { c: rivalPlot.c, r: rivalPlot.r, cols: RIVAL_PLOT_COLS, rows: RIVAL_PLOT_ROWS };
  }
  function rivalHallRect() { return rivalRect(RIVAL_LAYOUT.hall); }
  function rivalFarmRects() { return RIVAL_LAYOUT.farms.map(rivalRect); }
  function rivalPlotBounds() {
    return {
      x0: rivalPlot.c * CELL, y0: rivalPlot.r * CELL,
      x1: (rivalPlot.c + RIVAL_PLOT_COLS) * CELL, y1: (rivalPlot.r + RIVAL_PLOT_ROWS) * CELL
    };
  }
  function rivalCenterWorld() {
    return { x: (rivalPlot.c + RIVAL_PLOT_COLS / 2) * CELL, y: (rivalPlot.r + RIVAL_PLOT_ROWS / 2) * CELL };
  }
  const rectsOverlap = (a, b) => a.c < b.c + b.cols && a.c + a.cols > b.c && a.r < b.r + b.rows && a.r + a.rows > b.r;

  function chooseRivalPlot() {
    const homeRect = { c: home.c, r: home.r, cols: HOME_N, rows: HOME_N };
    const hutRect = (typeof woodHut !== 'undefined' && woodHut && woodHut.owned)
      ? { c: woodHut.c, r: woodHut.r, cols: typeof HUT_N === 'number' ? HUT_N : 2, rows: typeof HUT_N === 'number' ? HUT_N : 2 }
      : null;
    for (const p of RIVAL_PLOTS) {
      const r = { c: p.c, r: p.r, cols: RIVAL_PLOT_COLS, rows: RIVAL_PLOT_ROWS };
      if (rectsOverlap(r, homeRect)) continue;
      if (hutRect && rectsOverlap(r, hutRect)) continue;
      return { c: p.c, r: p.r };
    }
    return { c: RIVAL_PLOTS[0].c, r: RIVAL_PLOTS[0].r };
  }

  // ---- clearing the rival plot ----
  function removeRivalTree(t, animate) {
    if (!t) return;
    if (occ.get(slot(t.c, t.r)) === t) occ.delete(slot(t.c, t.r));
    if (t.claim) { if (t.claim.cut === t) t.claim.cut = null; t.claim = null; }
    if (animate) {
      t.dying = performance.now();
      setTimeout(() => {
        const k = trees.indexOf(t); if (k >= 0) trees.splice(k, 1);
        if (typeof dropTree === 'function') dropTree(t);
      }, 460);
    } else {
      const k = trees.indexOf(t); if (k >= 0) trees.splice(k, 1);
      if (typeof dropTree === 'function') dropTree(t);
    }
  }

  function clearRivalPlot(animate) {
    for (let i = trees.length - 1; i >= 0; i--) {
      const t = trees[i];
      if (t.c >= rivalPlot.c && t.c < rivalPlot.c + RIVAL_PLOT_COLS &&
          t.r >= rivalPlot.r && t.r < rivalPlot.r + RIVAL_PLOT_ROWS) removeRivalTree(t, animate);
    }
    // The plot belongs to the rival village: the player cannot build on it.
    for (let r = rivalPlot.r; r < rivalPlot.r + RIVAL_PLOT_ROWS; r++) {
      for (let c = rivalPlot.c; c < rivalPlot.c + RIVAL_PLOT_COLS; c++) {
        const old = occ.get(slot(c, r));
        if (!old || old.type === 'tree') occ.set(slot(c, r), { type: 'rival', c, r });
      }
    }
  }

  // ---- map art ----
  const rp = (x, y) => [projX(x, y), projY(x, y)];
  const rpoly = (...pts) => pts.reduce((a, p) => a.concat(p), []);

  function drawRivalFence(g) {
    const b = rivalPlotBounds(), inset = 9;
    const x0 = b.x0 + inset, y0 = b.y0 + inset, x1 = b.x1 - inset, y1 = b.y1 - inset;
    const gateX = (rivalPlot.c + RIVAL_PLOT_COLS / 2) * CELL, gateW = CELL * 1.7;
    const runs = [
      { x0, y0, x1, y1: y0 },
      { x0: x1, y0, x1, y1 },
      { x0, y0: y1, x1: gateX - gateW / 2, y1 },
      { x0: gateX + gateW / 2, y0: y1, x1, y1 },
      { x0, y0: y1, x1: x0, y1: y0 }
    ];
    for (const run of runs) {
      const len = Math.hypot(run.x1 - run.x0, run.y1 - run.y0);
      const n = Math.max(2, Math.round(len / 56));
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const x = run.x0 + (run.x1 - run.x0) * i / n;
        const y = run.y0 + (run.y1 - run.y0) * i / n;
        const [u, v] = rp(x, y);
        if (prev) {
          g.lineStyle({ width: 1.8, color: 0x5a3417, alpha: .9, cap: 'round' });
          g.moveTo(prev[0], prev[1] - 8); g.lineTo(u, v - 8);
          g.lineStyle({ width: 1.4, color: 0x7a4a22, alpha: .8, cap: 'round' });
          g.moveTo(prev[0], prev[1] - 14); g.lineTo(u, v - 14);
        }
        g.lineStyle({ width: 3.4, color: 0x4a2c12, cap: 'round' });
        g.moveTo(u, v); g.lineTo(u, v - 20);
        g.lineStyle({ width: 2, color: 0x8b5a2b, cap: 'round' });
        g.moveTo(u - 1, v); g.lineTo(u - 1, v - 18);
        g.beginFill(0x9a6a34);
        g.drawPolygon([u - 2.4, v - 18, u, v - 25, u + 2.4, v - 18]);
        g.endFill();
        prev = [u, v];
      }
    }
  }

  function drawRivalPath(g) {
    const gx = (rivalPlot.c + RIVAL_PLOT_COLS / 2) * CELL;
    const gy = (rivalPlot.r + RIVAL_PLOT_ROWS) * CELL - 10;
    const h = rivalHallRect();
    const hx = (h.c + h.cols / 2) * CELL, hy = (h.r + h.rows) * CELL - 6;
    const p0 = rp(gx, gy), p1 = rp(hx, hy);
    g.lineStyle({ width: CELL * 1.3, color: 0x3a2a14, alpha: .22, cap: 'round' });
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    g.lineStyle({ width: CELL * 1.0, color: 0x7a6238, alpha: .55, cap: 'round' });
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
    g.lineStyle({ width: CELL * .55, color: 0x8e7547, alpha: .35, cap: 'round' });
    g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
  }

  function drawRivalFarm(g, f) {
    const pad = 10;
    const b = { x0: f.c * CELL + pad, y0: f.r * CELL + pad, x1: (f.c + f.cols) * CELL - pad, y1: (f.r + f.rows) * CELL - pad };
    const P = rpoly(rp(b.x0, b.y0), rp(b.x1, b.y0), rp(b.x1, b.y1), rp(b.x0, b.y1));
    g.beginFill(0x3a2a14, .22); g.drawPolygon(P); g.endFill();
    g.lineStyle({ width: 2.2, color: 0x3a220c, alpha: .9, join: 'round' }); g.drawPolygon(P); g.lineStyle(0);
    // furrows
    for (let i = 0; i < 6; i++) {
      const y = b.y0 + (b.y1 - b.y0) * (i + .5) / 6;
      const a = rp(b.x0 + 5, y), z = rp(b.x1 - 5, y);
      g.lineStyle({ width: 4.5, color: i % 2 ? 0x7a502e : 0x8a5a33, alpha: 1, cap: 'round' });
      g.moveTo(a[0], a[1]); g.lineTo(z[0], z[1]);
    }
    // wheat stalks, baked once so the fields stay cheap to draw
    const heads = [];
    g.lineStyle({ width: 1.2, color: 0x9a7a2c, alpha: .9, cap: 'round' });
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 11; i++) {
        const x = b.x0 + (b.x1 - b.x0) * ((i + .35 + (row % 2) * .3) / 11);
        const y = b.y0 + (b.y1 - b.y0) * ((row + .5) / 4);
        const [u, v] = rp(x, y);
        const hh = 7 + ((i * 7 + row * 3) % 4);
        g.moveTo(u, v); g.lineTo(u + 1.5, v - hh);
        heads.push([u + 1.5, v - hh - 2]);
      }
    }
    g.beginFill(0xe8c24e, .95);
    for (const h of heads) g.drawCircle(h[0], h[1], 1.6);
    g.endFill();
  }

  function drawRivalHall(g) {
    const r = rivalHallRect(), pad = 16;
    const b = { x0: r.c * CELL + pad, y0: r.r * CELL + pad, x1: (r.c + r.cols) * CELL - pad, y1: (r.r + r.rows) * CELL - pad };
    const N = rp(b.x0, b.y0), E = rp(b.x1, b.y0), S = rp(b.x1, b.y1), W = rp(b.x0, b.y1);
    const cx = (N[0] + S[0]) / 2, cy = (N[1] + S[1]) / 2;
    const WH = 80, roofH = 92;
    const up = (p, h) => [p[0], p[1] - h];
    const Et = up(E, WH), St = up(S, WH), Wt = up(W, WH), Nt = up(N, WH);
    const apex = [cx, cy - WH - roofH];

    g.beginFill(0x000000, .18); g.drawEllipse(cx, S[1] + 8, (E[0] - W[0]) * .55, (S[1] - N[1]) * .30); g.endFill();
    // plaster walls with timber beams
    g.beginFill(0xb08a5a); g.drawPolygon(rpoly(E, S, St, Et)); g.endFill();
    g.beginFill(0x7d5d3c); g.drawPolygon(rpoly(S, W, Wt, St)); g.endFill();
    g.lineStyle({ width: 2.2, color: 0x3a220c, alpha: .9, join: 'round' });
    g.drawPolygon(rpoly(E, S, St, Et)); g.drawPolygon(rpoly(S, W, Wt, St)); g.lineStyle(0);
    g.lineStyle({ width: 4, color: 0x4a2c12, alpha: .85, cap: 'round' });
    g.moveTo(E[0], E[1]); g.lineTo(Et[0], Et[1]);
    g.moveTo(S[0], S[1]); g.lineTo(St[0], St[1]);
    g.moveTo(W[0], W[1]); g.lineTo(Wt[0], Wt[1]);
    // door on the near-left wall
    const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d0 = lerp2(S, W, .30), d1 = lerp2(S, W, .50), dh = 46;
    const d0t = up(d0, dh), d1t = up(d1, dh);
    g.beginFill(0x2a1608); g.drawPolygon(rpoly(d0, d1, d1t, d0t)); g.endFill();
    g.lineStyle({ width: 1.6, color: 0xc08a4a, alpha: .65 });
    g.drawPolygon(rpoly(d0, d1, d1t, d0t)); g.lineStyle(0);
    // lit window on the right-hand wall
    const w0 = lerp2(E, S, .36), w1 = lerp2(E, S, .54);
    const w0b = up(w0, 30), w0t = up(w0, 54), w1b = up(w1, 30), w1t = up(w1, 54);
    g.beginFill(0xffd36b, .9); g.drawPolygon(rpoly(w0b, w1b, w1t, w0t)); g.endFill();
    g.lineStyle({ width: 1.4, color: 0x4a2c12 }); g.drawPolygon(rpoly(w0b, w1b, w1t, w0t)); g.lineStyle(0);
    // roof faces, back first
    g.beginFill(0x6c2f24); g.drawPolygon(rpoly(Nt, Et, apex)); g.endFill();
    g.beginFill(0x6c2f24); g.drawPolygon(rpoly(Nt, Wt, apex)); g.endFill();
    g.beginFill(0x9a4632); g.drawPolygon(rpoly(Et, St, apex)); g.endFill();
    g.beginFill(0x7e3728); g.drawPolygon(rpoly(St, Wt, apex)); g.endFill();
    g.lineStyle({ width: 2.4, color: 0x3a160c, join: 'round' });
    g.drawPolygon(rpoly(Et, St, apex)); g.drawPolygon(rpoly(St, Wt, apex)); g.lineStyle(0);
    // a red banner above the ridge
    g.lineStyle({ width: 4, color: 0x3a220c, cap: 'round' });
    g.moveTo(apex[0], apex[1] + 2); g.lineTo(apex[0] + 1, apex[1] - 56);
    g.beginFill(0xb23a2e);
    g.drawPolygon([apex[0] + 1, apex[1] - 52, apex[0] + 43, apex[1] - 44, apex[0] + 31, apex[1] - 29, apex[0] + 2, apex[1] - 28]);
    g.endFill();
    g.lineStyle({ width: 1.2, color: 0x6e1f18 });
    g.moveTo(apex[0] + 2, apex[1] - 50); g.lineTo(apex[0] + 2, apex[1] - 28); g.lineStyle(0);
  }

  // ---- rival people ----
  const RIVAL_TUNICS = ['#a1372a', '#7b2f24', '#b85331', '#5e2b20', '#8d3e2b', '#6d3426', '#9a452f'];

  function rivalFarmSpot(f) {
    return {
      x: rr((f.c + .35) * CELL, (f.c + f.cols - .35) * CELL),
      y: rr((f.r + .35) * CELL, (f.r + f.rows - .35) * CELL)
    };
  }

  function rivalSpot() {
    const h = rivalHallRect();
    const hx0 = (h.c - 1) * CELL, hx1 = (h.c + h.cols + 1) * CELL;
    const hy0 = (h.r - 1) * CELL, hy1 = (h.r + h.rows + 1) * CELL;
    for (let k = 0; k < 40; k++) {
      const x = rr((rivalPlot.c + 1) * CELL, (rivalPlot.c + RIVAL_PLOT_COLS - 1) * CELL);
      const y = rr((rivalPlot.r + 1) * CELL, (rivalPlot.r + RIVAL_PLOT_ROWS - 1) * CELL);
      if (x > hx0 && x < hx1 && y > hy0 && y < hy1) continue;
      return { x, y };
    }
    return { x: (rivalPlot.c + 2) * CELL, y: (rivalPlot.r + 8) * CELL };
  }

  function makeRivalBot(i) {
    const p = rivalSpot();
    return {
      x: p.x, y: p.y, st: 'idle', wait: rr(.2, 2.5), tx: p.x, ty: p.y, a: 1,
      ph: rr(0, 6.28), cyc: rr(0, 1), dir: 0, vr: i % 5, sp: rr(38, 52), wave: 0, face: 1,
      ti: rr(1, 4), walking: false, yaw: rr(0, 6.28), spd: 0, gp: rr(0, 6.28), mv: 0,
      lk: 0, look: 0, lookT: rr(.5, 3), fem: rng() < .45, carry: false, beard: rng() < .3,
      hs: (rng() * 3) | 0, bld: rr(.92, 1.06),
      pants: ['#3a2a20', '#4a3628', '#2c2622', '#503a28'][(rng() * 4) | 0],
      tun: RIVAL_TUNICS[i % RIVAL_TUNICS.length],
      skin: SKIN[(rng() * SKIN.length) | 0], hair: HAIR[(rng() * HAIR.length) | 0],
      hat: rng() < .22, sz: rr(.74, .84),
      work: i % 2 === 0, fi: i % RIVAL_LAYOUT.farms.length,
      pt: -1, cv: null, cx: null, spr: null
    };
  }

  let rival = null;
  function spawnRivalBots() {
    rival.bots.length = 0;
    for (let i = 0; i < RIVAL_BOT_COUNT; i++) {
      const b = makeRivalBot(i);
      if (b.work) {
        const s = rivalFarmSpot(rival.farms[b.fi]);
        b.tx = s.x; b.ty = s.y; b.st = 'toFarm';
      } else {
        const s = rivalSpot();
        b.tx = s.x; b.ty = s.y; b.st = 'walk';
      }
      rival.bots.push(b);
    }
  }

  function buildRivalBase() {
    if (rival) return;
    rival = { bots: [], farms: rivalFarmRects(), lastT: 0, layer: null };
    const layer = new PX.Container();
    layer.sortableChildren = true;
    const at = Math.max(0, world.getChildIndex(overG));
    world.addChildAt(layer, at);
    rival.layer = layer;

    const ground = layer.addChild(new PX.Graphics());
    ground.zIndex = -1000000;
    drawRivalPath(ground);
    drawRivalFence(ground);
    for (const f of rival.farms) drawRivalFarm(ground, f);

    const hallG = layer.addChild(new PX.Graphics());
    const hr = rivalHallRect();
    hallG.zIndex = (hr.c + hr.cols / 2) * CELL + (hr.r + hr.rows / 2) * CELL;
    drawRivalHall(hallG);

    const c = rivalCenterWorld();
    const label = new PX.Text('Rival Village', {
      fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '800', fontSize: 30,
      fill: 0xffe6c2, stroke: 0x3a1b0e, strokeThickness: 6, align: 'center'
    });
    label.anchor.set(.5); label.scale.set(.55); label.resolution = 2;
    label.position.set(projX(c.x, c.y), projY(c.x, c.y) - RIVAL_PLOT_ROWS * CELL * .34);
    label.zIndex = 10000000;
    layer.addChild(label);
    spawnRivalBots();
  }

  // ---- rival people simulation ----
  function updateRivalBots(time) {
    if (!rival) return;
    const dt = rival.lastT ? Math.min(.05, Math.max(0, time - rival.lastT)) : 0;
    rival.lastT = time;
    for (const b of rival.bots) {
      b.walking = false;
      if (b.st === 'idle') {
        b.wait -= dt;
        if (b.wait <= 0) {
          if (b.work) {
            const s = rivalFarmSpot(rival.farms[b.fi]);
            b.tx = s.x; b.ty = s.y; b.st = 'toFarm';
          } else {
            const s = rivalSpot();
            b.tx = s.x; b.ty = s.y; b.st = 'walk';
          }
        }
      } else if (b.st === 'walk') {
        if (go(b, b.tx, b.ty, dt)) { b.st = 'idle'; b.wait = rr(.8, 3); }
      } else if (b.st === 'toFarm') {
        if (go(b, b.tx, b.ty, dt)) {
          b.st = 'work'; b.ti = rr(2.5, 5.5);
          b.tyaw = Math.atan2(b.tx - b.x + (b.ty - b.y), (b.tx - b.x) - (b.ty - b.y));
        }
      } else if (b.st === 'work') {
        b.ti -= dt;
        b.yaw += wrapA((b.tyaw === undefined ? b.yaw : b.tyaw) - b.yaw) * Math.min(1, dt * 4);
        if (b.ti <= 0) {
          const s = rivalFarmSpot(rival.farms[b.fi]);
          b.tx = s.x; b.ty = s.y; b.st = 'toFarm';
        }
      }
      b.wk = (b.wk || 0) + ((b.st === 'work' ? 1 : 0) - (b.wk || 0)) * Math.min(1, dt * 6);
      b.mv += ((b.walking ? 1 : 0) - b.mv) * Math.min(1, dt * 9);
      if (!b.walking) b.spd = 0;
      b.lk += (b.look - b.lk) * Math.min(1, dt * 5);
      if ((b.lookT -= dt) <= 0) { b.look = b.walking ? rr(-.3, .3) : rr(-1.1, 1.1); b.lookT = rr(1.2, 4); }
      if (!b.walking && b.st === 'idle') {
        if (b.tyaw === undefined || rng() < dt * .1) b.tyaw = b.yaw + rr(-1.4, 1.4);
        b.yaw += wrapA(b.tyaw - b.yaw) * Math.min(1, dt * 3);
      }
      b.x = Math.max((rivalPlot.c + .5) * CELL, Math.min((rivalPlot.c + RIVAL_PLOT_COLS - .5) * CELL, b.x));
      b.y = Math.max((rivalPlot.r + .5) * CELL, Math.min((rivalPlot.r + RIVAL_PLOT_ROWS - .5) * CELL, b.y));
    }
  }

  function updateRivalSprites(time) {
    if (!rival) return;
    const vl = cpx - cw / 2 / zoom - 80, vr = cpx + cw / 2 / zoom + 80;
    const vt = cpy - ch / 2 / zoom - 120, vb = cpy + ch / 2 / zoom + 60;
    let budget = 4;
    for (const b of rival.bots) {
      const u = projX(b.x, b.y), w = projY(b.x, b.y);
      if (u < vl || u > vr || w < vt || w > vb) { if (b.spr) b.spr.visible = false; continue; }
      if (!b.spr) {
        b.cv = document.createElement('canvas');
        b.cv.width = Math.round(VW * VS); b.cv.height = Math.round(VH * VS);
        b.cx = b.cv.getContext('2d');
        b.spr = new PX.Sprite(PX.Texture.from(b.cv));
        b.spr.anchor.set(.5, VBASE / VH);
        b.spr.scale.set(1 / VS);
        rival.layer.addChild(b.spr);
      }
      b.spr.visible = true;
      b.spr.position.set(u, w);
      b.spr.zIndex = b.x + b.y;
      const moving = b.walking || b.wk > .05;
      const gap = moving ? 1 / 18 : 1 / 7;
      if (b.pt >= 0 && time - b.pt < gap) continue;
      if (b.pt >= 0 && budget <= 0) continue;
      budget--; b.pt = time;
      paintVillager(b, time);
      b.spr.texture.baseTexture.update();
    }
  }

  // ---- reveal: a short camera visit so the player sees where the rival village is ----
  let rivalReveal = null;
  const rlerp = (a, b, t) => a + (b - a) * t;
  const rsmooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function applyRivalCam(u, v, z) {
    cpx = u; cpy = v; zoom = z;
    world.scale.set(zoom);
    world.position.set(cw / 2 - cpx * zoom, ch / 2 - cpy * zoom);
  }
  function revealRivalVillage() {
    if (!rival) return;
    const c = rivalCenterWorld();
    const u = projX(c.x, c.y), v = projY(c.x, c.y);
    const plotW = (RIVAL_PLOT_COLS + RIVAL_PLOT_ROWS) * CELL * IX;
    const plotH = (RIVAL_PLOT_COLS + RIVAL_PLOT_ROWS) * CELL * IY;
    const fit = Math.min(cw / (plotW + 280), ch / (plotH + 250));
    rivalReveal = {
      t0: performance.now(),
      from: { cpx, cpy, zoom },
      to: { cpx: u, cpy: v, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit)) }
    };
  }
  function tickRivalReveal(now) {
    if (!rivalReveal) return;
    const t = (now - rivalReveal.t0) / 1000;
    let k;
    if (t < 1.9) k = rsmooth(t / 1.9);
    else if (t < 3.7) k = 1;
    else if (t < 4.9) k = 1 - rsmooth((t - 3.7) / 1.2);
    else {
      applyRivalCam(rivalReveal.from.cpx, rivalReveal.from.cpy, rivalReveal.from.zoom);
      rivalReveal = null;
      return;
    }
    applyRivalCam(
      rlerp(rivalReveal.from.cpx, rivalReveal.to.cpx, k),
      rlerp(rivalReveal.from.cpy, rivalReveal.to.cpy, k),
      rlerp(rivalReveal.from.zoom, rivalReveal.to.zoom, k)
    );
  }
  // any touch or wheel input hands control straight back to the player
  window.addEventListener('pointerdown', () => { rivalReveal = null; }, true);
  window.addEventListener('wheel', () => { rivalReveal = null; }, { passive: true, capture: true });

  // ---- unlock ----
  function unlockRivalVillage() {
    if (rivalUnlocked) return;
    rivalUnlocked = true;
    rivalPlot = chooseRivalPlot();
    saveRivalState();
    clearRivalPlot(true);
    buildRivalBase();
    if (typeof toast === 'function') toast('A rival village has appeared in the north');
    revealRivalVillage();
  }

  function onVillageTreeCleared() {
    if (rivalUnlocked) return;
    rivalTrees++;
    if (rivalTrees === Math.floor(RIVAL_TREE_GOAL / 2)) {
      if (typeof toast === 'function') toast('The forest thins \u2014 ' + (RIVAL_TREE_GOAL - rivalTrees) + ' more trees to another clearing');
    }
    if (rivalTrees >= RIVAL_TREE_GOAL) unlockRivalVillage();
    else saveRivalState();
  }

  function initRivalVillage() {
    if (!rivalUnlocked || rival) return;
    if (!rivalPlot) rivalPlot = chooseRivalPlot();
    clearRivalPlot(false);
    buildRivalBase();
  }

  // Wrap the per-frame hub so the rival people live even though their code is separate.
  const rivalBaseUpdateHome = updateHome;
  updateHome = function (time) {
    rivalBaseUpdateHome(time);
    if (rival) { updateRivalBots(time); updateRivalSprites(time); }
    tickRivalReveal(performance.now());
  };

  // The map may already be running by the time this file loads (cached images start it early),
  // so handle both orders: 09 calls initRivalVillage() and this fallback catches the rest.
  if (typeof started !== 'undefined' && started) initRivalVillage();
  window.addEventListener('load', () => {
    setTimeout(() => { if (typeof started !== 'undefined' && started) initRivalVillage(); }, 0);
  });

  window.rivalVillage = {
    treesCleared: () => rivalTrees,
    goal: RIVAL_TREE_GOAL,
    unlocked: () => rivalUnlocked,
    plot: () => rivalPlot,
    bots: () => rival ? rival.bots : [],
    farms: () => rival ? rival.farms : [],
    show: () => { if (rival) revealRivalVillage(); },
    debugUnlock: () => { if (!rivalUnlocked) { rivalTrees = RIVAL_TREE_GOAL; unlockRivalVillage(); } }
  };
