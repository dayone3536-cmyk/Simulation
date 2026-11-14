  // ---------- camera (cpx, cpy = view centre in projected space) ----------
  let dpr = 1, cw = 0, ch = 0, zoom = 1, cpx = 0, cpy = 0, resCap = 2;
  const MIN_ZOOM = .2, MAX_ZOOM = 1.6;
  function clampCam() {
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    let wx = unprojX(cpx, cpy), wy = unprojY(cpx, cpy);
    wx = Math.max(CELL * 2, Math.min(WORLD_W - CELL * 2, wx));      // the camera may roam the whole map
    wy = Math.max(CELL * 2, Math.min(WORLD_H - CELL * 2, wy));
    cpx = projX(wx, wy); cpy = projY(wx, wy);
  }
  const flipBtn = document.getElementById('flip');
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? MAX_RES : 2, resCap);   // phones render at a lower pixel density: far fewer pixels for the GPU to fill
    forced = coarse && window.innerHeight > window.innerWidth;      // upright phone: turn the game sideways
    canvas.classList.toggle('rot', forced); canvas.classList.toggle('flip', forced && flipped);
    flipBtn.style.display = forced ? 'block' : 'none';
    hud.classList.toggle('rot', forced); hud.classList.toggle('flip', forced && flipped);
    hud.style.width = forced ? window.innerHeight + 'px' : ''; hud.style.height = forced ? window.innerWidth + 'px' : '';
    if (forced) { cw = window.innerHeight; ch = window.innerWidth; canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; }
    else { cw = window.innerWidth; ch = window.innerHeight; canvas.style.width = ''; canvas.style.height = ''; }
    try { if (app.renderer.resolution !== dpr) app.renderer.resolution = dpr; } catch (e) {}
    app.renderer.resize(cw, ch);
    clampCam();
  }
  flipBtn.addEventListener('click', () => { flipped = !flipped; resize(); });
  // screen touch point -> point on the (possibly rotated) canvas
  function pt(e) {
    if (!forced) return { x: e.clientX, y: e.clientY };
    return flipped ? { x: cw - e.clientY, y: e.clientX } : { x: e.clientY, y: ch - e.clientX };
  }
  window.addEventListener('resize', resize);

  // pointer: drag + pinch (screen movement is already in projected space)
  const ptrs = new Map(); let pinchD = 0, tap = null;
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, pt(e));
    canvas.classList.add('drag'); hint.style.opacity = 0;
    const p0 = ptrs.get(e.pointerId);
    tap = ptrs.size === 1 ? { x: p0.x, y: p0.y, t: performance.now(), ok: true } : null;   // a tap = short press, barely moved
    if (drag && drag.id !== e.pointerId) { drag.id = null; drag.held = false; }                // a second finger lets go of the cabin (it stays selected)
    if (movingFarm && movingFarm.id !== e.pointerId) { movingFarm.id = null; movingFarm.held = false; }
    if (placing && placing.id && placing.id !== e.pointerId) { placing.id = null; placing.held = false; }
    if (placing && ptrs.size === 1) {
      const s = slotAt(p0.x, p0.y) || { c: placing.c, r: placing.r };
      placing.id = e.pointerId; placing.held = true; placing.q = p0; placing.offC = s.c - placing.c; placing.offR = s.r - placing.r;
    } else if (!placing && !movingFarm && ptrs.size === 1 && hitHome(p0.x, p0.y)) { const pos = drag || home, s = slotAt(p0.x, p0.y) || { c: pos.c + 1, r: pos.r + 1 }; drag = { id: e.pointerId, c: pos.c, r: pos.r, oc: s.c - pos.c, or: s.r - pos.r, ok: drag ? drag.ok : true, held: true, q: p0 }; tap = null; sel = null; card(); }
    else if (!placing && !movingFarm && !drag && ptrs.size === 1) { const f = farmAt(p0.x, p0.y); if (f) { startMovingFarm(f, p0.x, p0.y); movingFarm.id = e.pointerId; tap = null; card(); } }
    else if (movingFarm && ptrs.size === 1) { movingFarm.id = e.pointerId; movingFarm.held = true; movingFarm.q = p0; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); }
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && !ptrs.size) hov = slotAt(pt(e).x, pt(e).y);
    const p = ptrs.get(e.pointerId); if (!p) return;
    const q = pt(e);
    if (drag && drag.id === e.pointerId) { dragTo(q); p.x = q.x; p.y = q.y; return; }
    if (placing && placing.id === e.pointerId) { placing.q = q; const s = slotAt(q.x, q.y); if (s) { const cols = fCols(placing.rot), rows = fRows(placing.rot); placing.c = clampI(s.c - (placing.offC || 0), 0, WORLD_W / CELL - cols); placing.r = clampI(s.r - (placing.offR || 0), 0, WORLD_H / CELL - rows); barKey = '#'; rebuildFarm(placing); } p.x = q.x; p.y = q.y; return; }
    if (movingFarm && movingFarm.id === e.pointerId) { movingFarm.q = q; const s = slotAt(q.x, q.y); if (s) { setMovingFarmPos(s.c - movingFarm.offC, s.r - movingFarm.offR); barKey = '#'; rebuildFarm(movingFarm.farm); } p.x = q.x; p.y = q.y; return; }
    if (tap && (ptrs.size > 1 || Math.hypot(q.x - tap.x, q.y - tap.y) > 9)) tap.ok = false;
    if (ptrs.size === 1) { cpx -= (q.x - p.x) / zoom; cpy -= (q.y - p.y) / zoom; }
    p.x = q.x; p.y = q.y;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, zoom * dist / pinchD); pinchD = dist;
    }
    clampCam();
  });
  const up = e => {
    if (drag && drag.id === e.pointerId) { drag.id = null; drag.held = false; }   // letting go does NOT drop it: the cabin stays selected until you press the tick
    if (placing && placing.id === e.pointerId) { placing.id = null; placing.held = false; }
    if (movingFarm && movingFarm.id === e.pointerId) { movingFarm.id = null; movingFarm.held = false; }
    const wasTap = e.type === 'pointerup' && tap && tap.ok && ptrs.size === 1 && performance.now() - tap.t < 500;
    const at = wasTap ? pt(e) : null;
    ptrs.delete(e.pointerId); if (!ptrs.size) { canvas.classList.remove('drag'); tap = null; }
    if (at) { if (drag) moveHere(at.x, at.y); else select(at.x, at.y); }   // while moving/placing, tapping any tile sends it there
  };

  
  canvas.addEventListener('pointerleave', () => { hov = null; }); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  function zoomAt(sx, sy, z) {
    const u = cpx + (sx - cw / 2) / zoom, v = cpy + (sy - ch / 2) / zoom;   // projected point under the cursor
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    cpx = u - (sx - cw / 2) / zoom; cpy = v - (sy - ch / 2) / zoom;
  }
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); hint.style.opacity = 0;
    const q = pt(e); zoomAt(q.x, q.y, zoom * Math.exp(-e.deltaY * .0012)); clampCam();
  }, { passive: false });

