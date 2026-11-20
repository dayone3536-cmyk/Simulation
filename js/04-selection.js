  // ---------- selection: tap a slot to highlight it ----------
  let sel = null, hov = null, selT = 0;            // sel/hov = { c, r } or null
  const infoEl = document.getElementById('info');
  function slotAt(sx, sy) {
    const u = cpx + (sx - cw / 2) / zoom, v = cpy + (sy - ch / 2) / zoom;
    const c = Math.floor(unprojX(u, v) / CELL), r = Math.floor(unprojY(u, v) / CELL);
    return (c < 0 || r < 0 || c >= WORLD_W / CELL || r >= WORLD_H / CELL) ? null : { c, r };
  }
  function card() { infoEl.style.display = 'none'; }   // no slot pop-up: building lives behind the Build button
  function select(sx, sy) {
    if (placing) { placeTo(sx, sy); return; }          // while choosing a farm spot, a tap moves the ghost
    if (movingFarm) { moveFarmTo(sx, sy); return; }    // while moving a farm, a tap sends it there
    if (tapFarm(sx, sy)) return;
    sel = slotAt(sx, sy); selT = performance.now(); card();
  }
  infoEl.addEventListener('click', e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'close') sel = null;
    if (a === 'clear') { const t = occ.get(slot(sel.c, sel.r)); if (t && t.type === 'tree') { t.dying = performance.now(); occ.delete(slot(sel.c, sel.r)); setTimeout(() => { const i = trees.indexOf(t); if (i >= 0) trees.splice(i, 1); dropTree(t); }, 400); selT = performance.now(); } }
    card();
  });
  // a diamond around slot centre as a flat [x, y, x, y ...] list, k = 1 is the exact tile, k > 1 grows outward (used for the tap ripple)
  function ringPts(c, r, k) {
    const cx = (c + .5) * CELL, cy = (r + .5) * CELL, h = CELL / 2 * k, o = [];
    for (const [dx, dy] of [[-h, -h], [h, -h], [h, h], [-h, h]]) o.push(projX(cx + dx, cy + dy), projY(cx + dx, cy + dy));
    return o;
  }
  // Pixi has no dashed lines, so walk the outline and draw the dashes ourselves
  function dashedPoly(g, pts, dash, gap, off) {
    const per = dash + gap, n = pts.length / 2; let D = 0;
    for (let i = 0; i < n; i++) {
      const x0 = pts[i * 2], y0 = pts[i * 2 + 1], x1 = pts[((i + 1) % n) * 2], y1 = pts[((i + 1) % n) * 2 + 1], L = Math.hypot(x1 - x0, y1 - y0);
      if (L < 1e-6) continue;
      const ux = (x1 - x0) / L, uy = (y1 - y0) / L; let t = 0;
      while (t < L - 1e-6) {
        const p = (((D + t + off) % per) + per) % per;
        if (p < dash - 1e-6) { const e = Math.min(L, t + (dash - p)); g.moveTo(x0 + ux * t, y0 + uy * t); g.lineTo(x0 + ux * e, y0 + uy * e); t = e + 1e-6; }
        else t += per - p + 1e-6;
      }
      D += L;
    }
  }
  function dropTree(t) { if (t.spr) { t.spr.destroy(); t.spr = null; } if (t.shd) { t.shd.destroy(); t.shd = null; } }

