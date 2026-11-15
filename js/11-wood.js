  // ---------- wood: the second resource. Assigned woodcutters fell trees and carry the logs home ----------
  const WOOD_PER_TREE = 3;          // logs you get for one felled tree
  const CHOP_SEC = 3.0;             // seconds of chopping after the walk
  const CUTTER_MOVE = 2.35;         // cutters stride out to the forest edge, so trips don't eat the whole loop
  const WOOD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="47" rx="24" ry="7" fill="#2a1608" opacity=".35"/><rect x="9" y="30" width="44" height="16" rx="8" fill="#8b5a2b" stroke="#3a220c" stroke-width="2.5"/><ellipse cx="12" cy="38" rx="6" ry="8" fill="#d9a861" stroke="#3a220c" stroke-width="2.5"/><ellipse cx="12" cy="38" rx="2.4" ry="3.6" fill="none" stroke="#a8742f" stroke-width="1.6"/><rect x="26" y="24" width="18" height="9" rx="4" fill="#a8742f" opacity=".9"/><path d="M37 8l11 19-7 4-11-19z" fill="#c9d2da" stroke="#3f4852" stroke-width="2"/><path d="M34 12l7 12" stroke="#eef4fb" stroke-width="1.2" opacity=".7"/></svg>';

  let woodCount = 0;
  try { const w = parseInt(localStorage.getItem('wood'), 10); if (w > 0) woodCount = w; } catch (e) {}
  const saveWood = () => { try { localStorage.setItem('wood', woodCount); } catch (e) {} };
  let woodTipShown = false;
  try { woodTipShown = localStorage.getItem('woodTip') === '1'; } catch (e) {}

  // ---- HUD: a wood pill next to the wheat pill. The icon is injected here because the [data-ic] pass
  // in 02 has already run by the time this file loads. ----
  const woodPill = document.createElement('div');
  woodPill.id = 'woodpill'; woodPill.className = 'pill';
  woodPill.innerHTML = '<span class="ico" id="woodico"></span><span id="woodnum">0</span>';
  const woodTopRight = document.getElementById('topright');
  if (woodTopRight) woodTopRight.insertBefore(woodPill, document.getElementById('goldbar'));
  const woodIco = document.getElementById('woodico'); if (woodIco) woodIco.innerHTML = WOOD_SVG;
  const woodNum = document.getElementById('woodnum');
  let woodKey = '';
  function refreshWoodHud() {
    const show = woodCount > 0 || (typeof lumberCamp !== 'undefined' && lumberCamp) || (typeof woodHut !== 'undefined' && woodHut.owned);
    const key = woodCount + '|' + (show ? 1 : 0);
    if (key === woodKey) return; woodKey = key;
    if (woodPill) woodPill.style.display = show ? 'flex' : 'none';
    if (woodNum) woodNum.textContent = woodCount;
    if (typeof setStat === 'function') setStat('wood', WOOD_SVG, 'Wood', woodCount);
  }
  function addWood(n) {
    woodCount = Math.max(0, woodCount + (n | 0)); saveWood(); refreshWoodHud();
    if (n > 0 && !woodTipShown) {
      woodTipShown = true;
      try { localStorage.setItem('woodTip', '1'); } catch (e) {}
      toast('Wood! Open the villagers button to put more hands on the axes');
    }
  }
  function spendWood(n) { if (woodCount < n) return false; woodCount -= n; saveWood(); refreshWoodHud(); return true; }

  // ---- floating "+3 wood" over the stump ----
  const woodFxL = world.addChild(new PX.Container());
  const woodFx = [];
  function woodFloat(txt, x, y) {
    const t = new PX.Text(txt, { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: 34, fill: 0xf0c88a, stroke: 0x2a1608, strokeThickness: 8, lineJoin: 'round' });
    t.anchor.set(.5); t.scale.set(.5); t.resolution = 2;
    t.position.set(projX(x, y), projY(x, y) - 46);
    woodFxL.addChild(t); woodFx.push({ t0: performance.now(), txt: t, y: t.position.y });
  }
  function tickWoodFx() {
    const now = performance.now();
    for (let i = woodFx.length - 1; i >= 0; i--) {
      const f = woodFx[i], a = (now - f.t0) / 1300;
      if (a >= 1) { f.txt.destroy(); woodFx.splice(i, 1); continue; }
      f.txt.alpha = 1 - a; f.txt.position.y = f.y - a * 52;
    }
  }

  // ---- a log pile by the cabin that grows with your stock. Small reward for a number. ----
  const woodPileG = homeL.addChildAt(new PX.Graphics(), 0);
  let woodPileKey = '';
  function drawWoodPile() {
    if (typeof home === 'undefined' || typeof homeRectP !== 'function') return;
    const tier = Math.min(5, Math.floor(woodCount / 12));
    const key = home.c + ',' + home.r + ',' + tier;
    if (key === woodPileKey) return; woodPileKey = key;
    woodPileG.clear();
    if (!tier) return;
    const R = homeRectP(home.c, home.r), bx = R.x + R.w * .62, by = R.y + R.h * .9;
    for (let i = 0; i < tier; i++) {
      const yy = by - i * 6.5, w = 30 - (i % 2) * 4;
      woodPileG.beginFill(0x3a220c); woodPileG.drawRoundedRect(bx, yy + 2, w, 8, 4); woodPileG.endFill();
      woodPileG.beginFill(i % 2 ? 0x7a4a22 : 0x8b5a2b); woodPileG.drawRoundedRect(bx, yy, w, 9, 4.5); woodPileG.endFill();
      woodPileG.beginFill(0xc79a5e); woodPileG.drawEllipse(bx + w - 4, yy + 4.5, 5, 4); woodPileG.endFill();
      woodPileG.beginFill(0x5a3a1c); woodPileG.drawEllipse(bx + w - 4, yy + 4.5, 2, 1.6); woodPileG.endFill();
    }
  }

  // ---- woodcutter AI: nearest tree (weighted toward home), chop, carry the log back ----
  function woodRate() {
    let r = 1;
    if (typeof workerRateMul === 'function') r *= workerRateMul();
    if (typeof lumberCamp !== 'undefined' && lumberCamp) r *= 1.2;   // sharp camp axes
    if (typeof wheatCount === 'number' && wheatCount <= 0) r *= .6;   // hungry hands are slow, never idle forever
    return Math.max(.2, r);
  }
  function findTreeFor(v) {
    const hx = (home.c + HOME_N / 2) * CELL, hy = (home.r + HOME_N / 2) * CELL;
    let best = null, bs = Infinity;
    for (const t of trees) {
      if (t.claim || t.dying) continue;
      if (typeof hutTreeAllowed === 'function' && !hutTreeAllowed(t)) continue;   // 14: a built hut owns a small grove
      const d = (t.x - v.x) ** 2 + (t.y - v.y) ** 2;
      const h = (t.x - hx) ** 2 + (t.y - hy) ** 2;
      const s = d * .55 + h * .45;
      if (s < bs) { bs = s; best = t; }
    }
    return best;
  }
  function fellTree(t, v) {
    t.claim = null; t.dying = performance.now();
    occ.delete(slot(t.c, t.r));
    setTimeout(() => { const k = trees.indexOf(t); if (k >= 0) trees.splice(k, 1); dropTree(t); }, 430);
    addWood(WOOD_PER_TREE);
    if (typeof onHutTreeFelled === 'function') onHutTreeFelled(t);   // 14: remember the stump and regrow time
    woodFloat('+' + WOOD_PER_TREE + ' wood', t.x, t.y);
    v.cut = null;
  }
  // cutters move themselves: the base villager loop owns walking, so we advance after it and
  // restore the gait signals it just cleared.
  function cutterStep(v, tx, ty, dt) {
    const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
    if (d < .5) { v.walking = false; return true; }
    const th = Math.atan2(dx + dy, dx - dy), df = wrapA(th - v.yaw);
    v.yaw += Math.max(-7 * dt, Math.min(7 * dt, df));
    const step = Math.min(d, v.sp * CUTTER_MOVE * dt);
    v.x += dx / d * step; v.y += dy / d * step;
    v.walking = true; v.mv = 1;
    v.gp += step * Math.PI / (.39 * v.sz * 100 * v.bld);
    return d <= step;
  }
  let woodLastT = 0, woodEmptyWarned = 0;
  function tickWoodCutters(time) {
    const dt = woodLastT ? Math.min(.06, Math.max(0, time - woodLastT)) : 0; woodLastT = time;
    if (typeof villagers === 'undefined') return;
    tickWoodFx(); drawWoodPile();
    const doorX = (home.c + 1.4) * CELL, stepY = (home.r + HOME_N + .55) * CELL;
    // a built camp is a forward depot: logs are dropped at the forest edge, not hauled all the way home
    const campDrop = typeof lumberCamp !== 'undefined' && lumberCamp;
    let dropX = campDrop ? clearing.x1 - 190 : doorX;
    let dropY = campDrop ? clearing.y0 + 178 : stepY;
    if (typeof hutDropPoint === 'function') { const hp = hutDropPoint(); if (hp) { dropX = hp.x; dropY = hp.y; } }   // 14: the hut is the drop-off
    for (const v of villagers) {
      if (v.role !== 'woodcutter') {
        if (v.cut) { v.cut.claim = null; v.cut = null; }
        if (v.st === 'toTree' || v.st === 'chop' || v.st === 'carryWood' || v.st === 'cutterRest') v.st = 'idle';
        continue;
      }
      // let the cabin door animation finish before taking over
      if (v.st === 'inside' || v.st === 'enter' || v.st === 'exit') continue;
      if (v.st === 'toDoor') { v.st = 'idle'; }
      if (v.st === 'idle' || v.st === 'walk' || v.st === 'toFarm' || v.st === 'work') {
        v.st = 'cutterRest'; v.ti = rr(.1, .8); v.walking = false;
      }
      if (v.st === 'cutterRest') {
        v.ti -= dt;
        if (v.ti <= 0) {
          const t = findTreeFor(v);
          if (!t) {
            v.ti = 3;
            if (!woodEmptyWarned) { woodEmptyWarned = 1; toast(typeof hutEmptyMessage === 'function' ? hutEmptyMessage() : 'The woods around your village are clear'); }
          } else {
            v.cut = t; t.claim = v; v.st = 'toTree';
            if (v.carry0 === undefined) v.carry0 = v.carry;
          }
        }
      } else if (v.st === 'toTree') {
        const t = v.cut;
        if (!t || t.dying || t.claim !== v) { v.st = 'cutterRest'; v.ti = .15; v.cut = null; }
        else if (cutterStep(v, t.x, t.y - 6, dt)) {
          v.st = 'chop'; v.ti = CHOP_SEC / woodRate(); v.carry = true;
          const th = Math.atan2(t.x - v.x + (t.y - v.y), (t.x - v.x) - (t.y - v.y));
          v.tyaw = th;
        }
      } else if (v.st === 'chop') {
        const t = v.cut;
        v.walking = false; v.mv = 0;
        v.wk = .55 + .45 * Math.abs(Math.sin(time * 6));
        if (!t || t.dying) { v.st = 'cutterRest'; v.ti = .2; v.cut = null; v.carry = v.carry0; }
        else {
          v.ti -= dt;
          if (v.ti <= 0) { fellTree(t, v); v.st = 'carryWood'; }
        }
      } else if (v.st === 'carryWood') {
        if (cutterStep(v, dropX, dropY, dt)) {
          v.st = 'cutterRest'; v.ti = rr(.4, 1.1);
          v.carry = v.carry0 === undefined ? v.carry : v.carry0;
          v.walking = false;
        }
      }
    }
  }

  // wrap the per-frame hub so wood work runs without touching 06/09 during parallel work
  const woodBaseUpdateHome = updateHome;
  updateHome = function (time) {
    if (typeof applyJobs === 'function') applyJobs();
    woodBaseUpdateHome(time);
    tickWoodCutters(time);
  };

  refreshWoodHud();
  window.wood = { count: () => woodCount, add: addWood, spend: spendWood, save: saveWood, refresh: refreshWoodHud, perTree: WOOD_PER_TREE };
