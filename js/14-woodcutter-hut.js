  // ---------- woodcutter hut: a small owned grove that keeps cutting while the tab is closed ----------
  const HUT_COST = 70;                 // gold
  const HUT_N = 2;                     // footprint in slots
  const HUT_RADIUS = 5;                // tiles around the hut that belong to its grove
  const HUT_TREE_REGROW_MS = 6 * 60 * 1000;
  const HUT_OFFLINE_TREES_PER_HOUR = 10;
  const HUT_OFFLINE_CAP_MS = 12 * 60 * 60 * 1000;
  const HUT_MS_PER_OFFLINE_TREE = 3600000 / HUT_OFFLINE_TREES_PER_HOUR;
  const HUT_SAVE_KEY = 'woodcutterHut';
  const HUT_ICON = '<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="53" rx="23" ry="6" fill="#2a1608" opacity=".28"/><rect x="11" y="26" width="42" height="26" rx="4" fill="#8b5a2b" stroke="#3a220c" stroke-width="2.5"/><path d="M7 27L32 9l25 18z" fill="#a8742f" stroke="#3a220c" stroke-width="2.5" stroke-linejoin="round"/><path d="M33 10v17M8 27h48" stroke="#5a3417" stroke-width="1.6" opacity=".65"/><rect x="27" y="35" width="10" height="17" rx="1.5" fill="#4a2c12" stroke="#2e1608" stroke-width="1.8"/><rect x="16" y="33" width="7" height="7" rx="1" fill="#ffd36b" stroke="#4a2c0e" stroke-width="1.2"/><rect x="42" y="33" width="7" height="7" rx="1" fill="#ffd36b" stroke="#4a2c0e" stroke-width="1.2"/><path d="M48 49l9-15" stroke="#6b4519" stroke-width="4.5" stroke-linecap="round"/><path d="M53 37l8-5 4 7-8 5z" fill="#c9d2da" stroke="#3f4852" stroke-width="1.6" stroke-linejoin="round"/><rect x="9" y="50" width="20" height="7" rx="3.5" fill="#7a4a22" stroke="#3a220c" stroke-width="1.6"/><ellipse cx="28" cy="53.5" rx="3.5" ry="4" fill="#c79a5e" stroke="#3a220c" stroke-width="1.2"/></svg>';

  const hutWoodPerTree = () => (typeof WOOD_PER_TREE === 'number' ? WOOD_PER_TREE : 3);
  const hutTreesPerHour = () => HUT_OFFLINE_TREES_PER_HOUR * hutWoodPerTree();

  // ---- saved state: position, grove list and the last moment the game was open ----
  let woodHut = { owned: false, c: 0, r: 0, radius: HUT_RADIUS, trees: [], lastSeen: 0, lastAway: null };
  try {
    const raw = JSON.parse(localStorage.getItem(HUT_SAVE_KEY) || 'null');
    if (raw && raw.owned) {
      const maxC = WORLD_W / CELL - HUT_N, maxR = WORLD_H / CELL - HUT_N;
      const c = Number.isInteger(raw.c) ? Math.max(0, Math.min(maxC, raw.c)) : 0;
      const r = Number.isInteger(raw.r) ? Math.max(0, Math.min(maxR, raw.r)) : 0;
      const radius = Number.isFinite(raw.radius) ? Math.max(2, Math.min(8, raw.radius)) : HUT_RADIUS;
      const list = Array.isArray(raw.trees) ? raw.trees : [];
      const seen = new Set(), treesList = [];
      for (const e of list) {
        if (!e || !Number.isInteger(e.c) || !Number.isInteger(e.r)) continue;
        if (e.c < 0 || e.r < 0 || e.c >= WORLD_W / CELL || e.r >= WORLD_H / CELL) continue;
        const key = slot(e.c, e.r); if (seen.has(key)) continue;
        seen.add(key);
        treesList.push({
          c: e.c, r: e.r,
          v: Number.isInteger(e.v) ? Math.max(0, Math.min(TRE.length - 1, e.v)) : 0,
          s: Number.isFinite(e.s) ? Math.max(.6, Math.min(1.4, e.s)) : 1,
          flip: e.flip < 0 ? -1 : 1,
          ph: Number.isFinite(e.ph) ? e.ph : 0,
          felledAt: Number.isFinite(e.felledAt) && e.felledAt > 0 ? e.felledAt : 0,
          regrowAt: Number.isFinite(e.regrowAt) && e.regrowAt > 0 ? e.regrowAt : 0
        });
      }
      const lastAway = raw.lastAway && typeof raw.lastAway === 'object'
        ? { ms: Math.max(0, raw.lastAway.ms | 0), trees: Math.max(0, raw.lastAway.trees | 0), wood: Math.max(0, raw.lastAway.wood | 0) }
        : null;
      woodHut = { owned: true, c, r, radius, trees: treesList, lastSeen: Number.isFinite(raw.lastSeen) ? raw.lastSeen : 0, lastAway };
    }
  } catch (e) {}

  function saveHut() {
    try {
      const now = Date.now();
      localStorage.setItem(HUT_SAVE_KEY, JSON.stringify({
        owned: woodHut.owned ? 1 : 0,
        c: woodHut.c, r: woodHut.r, radius: woodHut.radius,
        trees: woodHut.trees.map(e => ({ c: e.c, r: e.r, v: e.v, s: e.s, flip: e.flip, ph: e.ph, felledAt: e.felledAt || 0, regrowAt: e.regrowAt || 0 })),
        lastSeen: now,
        lastAway: woodHut.lastAway
      }));
      woodHut.lastSeen = now;
    } catch (e) {}
  }

  function hutDuration(ms) {
    const m = Math.max(0, Math.round(ms / 60000));
    return m >= 120 ? (m / 60).toFixed(1) + ' h' : m >= 1 ? m + ' min' : Math.max(0, Math.round(ms / 1000)) + ' s';
  }

  // The tab may have been shut for a while. The hut banks one tree every six minutes, capped at 12 hours.
  function applyOfflineHutProgress() {
    if (!woodHut.owned) return;
    const now = Date.now();
    if (!woodHut.lastSeen) { woodHut.lastSeen = now; saveHut(); return; }
    if (woodHut.lastSeen > now) { woodHut.lastSeen = now; saveHut(); return; }
    const elapsed = Math.min(HUT_OFFLINE_CAP_MS, now - woodHut.lastSeen);
    const trees = Math.floor(elapsed / HUT_MS_PER_OFFLINE_TREE);
    const wood = trees * hutWoodPerTree();
    if (wood > 0 && typeof addWood === 'function') addWood(wood);
    if (trees > 0) {
      woodHut.lastAway = { ms: elapsed, trees, wood, at: now };
      setTimeout(() => {
        if (typeof toast === 'function') toast('While you were away: +' + wood + ' wood (' + trees + ' trees)');
      }, 1200);
    }
    woodHut.lastSeen = now;
    saveHut();
  }

  // ---- the hut's own small grove ----
  function hutTreeAllowed(t) {
    if (!woodHut.owned) return true;                 // old saves keep their forest-wide cutters until a hut is built
    const dc = t.c - (woodHut.c + HUT_N / 2), dr = t.r - (woodHut.r + HUT_N / 2), R = woodHut.radius + .45;
    return dc * dc + dr * dr <= R * R;
  }
  function hutDropPoint() {
    if (!woodHut.owned) return null;
    return { x: (woodHut.c + HUT_N / 2) * CELL, y: (woodHut.r + HUT_N + .2) * CELL };
  }
  function hutEmptyMessage() {
    return woodHut.owned ? 'The hut\u2019s grove is resting \u2014 its trees are growing back' : 'The woods around your village are clear';
  }
  function hutTreeAt(c, r) {
    for (const e of woodHut.trees) if (e.c === c && e.r === r) return e;
    return null;
  }
  function hutTreesStanding(now) {
    let n = 0;
    now = now || Date.now();
    for (const e of woodHut.trees) if (!e.felledAt || e.regrowAt <= now) n++;
    return n;
  }

  function captureHutTrees() {
    woodHut.trees = [];
    for (const t of trees) {
      if (t.claim || t.dying || !hutTreeAllowed(t)) continue;
      woodHut.trees.push({ c: t.c, r: t.r, v: t.v, s: t.s, flip: t.flip, ph: t.ph, felledAt: 0, regrowAt: 0 });
    }
    woodHut.trees.sort((a, b) => (a.c + a.r) - (b.c + b.r) || a.c - b.c);
  }

  function removeHutWorldTree(t) {
    if (!t) return;
    const k = trees.indexOf(t); if (k >= 0) trees.splice(k, 1);
    if (occ.get(slot(t.c, t.r)) === t) occ.delete(slot(t.c, t.r));
    if (typeof dropTree === 'function') dropTree(t);
  }
  function createHutTree(e) {
    const old = occ.get(slot(e.c, e.r));
    if (old && old.type !== 'tree') return null;
    if (old && old.type === 'tree') return old;
    const t = { type: 'tree', x: (e.c + .5) * CELL, y: (e.r + .5) * CELL, c: e.c, r: e.r, v: e.v, s: e.s, flip: e.flip, ph: e.ph };
    trees.push(t); occ.set(slot(e.c, e.r), t);
    if (typeof buildTreeSprite === 'function') buildTreeSprite(t);
    return t;
  }
  function claimHutSlots() {
    if (!woodHut.owned) return;
    for (let j = 0; j < HUT_N; j++) for (let i = 0; i < HUT_N; i++) {
      const c = woodHut.c + i, r = woodHut.r + j;
      const old = occ.get(slot(c, r));
      if (old && old.type === 'tree') removeHutWorldTree(old);
      occ.set(slot(c, r), { type: 'hut', c, r });
    }
  }

  let hutWorldApplied = false;
  function initWoodHutWorld() {
    if (!woodHut.owned || hutWorldApplied || typeof trees === 'undefined') return;
    hutWorldApplied = true;
    claimHutSlots();
    if (!woodHut.trees.length) captureHutTrees();
    const now = Date.now();
    // The saved grove is the authority: rebuild it even when the random forest changed between visits.
    for (let i = trees.length - 1; i >= 0; i--) if (hutTreeAllowed(trees[i])) removeHutWorldTree(trees[i]);
    for (const e of woodHut.trees) {
      const inFoot = e.c >= woodHut.c && e.c < woodHut.c + HUT_N && e.r >= woodHut.r && e.r < woodHut.r + HUT_N;
      if (inFoot) continue;
      if (e.felledAt && e.regrowAt > now) continue;    // still a stump
      if (e.felledAt) { e.felledAt = 0; e.regrowAt = 0; }
      createHutTree(e);
    }
    drawWoodHut(); drawHutStumps();
    saveHut();
  }

  // called by 11-wood when an actual cutter fells a tree
  function onHutTreeFelled(t) {
    if (!woodHut.owned || !t) return;
    let e = hutTreeAt(t.c, t.r);
    if (!e) {
      e = { c: t.c, r: t.r, v: t.v, s: t.s, flip: t.flip, ph: t.ph, felledAt: 0, regrowAt: 0 };
      woodHut.trees.push(e);
    }
    const now = Date.now();
    e.felledAt = now; e.regrowAt = now + HUT_TREE_REGROW_MS;
    saveHut();
    setTimeout(() => { drawHutStumps(); if (hutPanelOpen) renderHutPanel(true); }, 500);
  }

  function tickHutTrees() {
    if (!woodHut.owned) return;
    const now = Date.now();
    let changed = false;
    for (let i = woodHut.trees.length - 1; i >= 0; i--) {
      const e = woodHut.trees[i];
      if (!e.felledAt || e.regrowAt > now) continue;
      const old = occ.get(slot(e.c, e.r));
      if (old && old.type !== 'tree') { woodHut.trees.splice(i, 1); changed = true; continue; }   // a farm/home took the tile
      if (!old) createHutTree(e);
      e.felledAt = 0; e.regrowAt = 0; changed = true;
    }
    if (changed) { drawHutStumps(); saveHut(); }
  }

  // ---- map art: the hut, its stumps and the outline of its grove ----
  let hutArt = null, hutStumpG = null, hutAreaG = null;
  function drawWoodHut() {
    if (!woodHut.owned || typeof farmL === 'undefined') return;
    if (!hutArt) hutArt = farmL.addChild(new PX.Container());
    const kids = hutArt.removeChildren(); for (const ch of kids) ch.destroy({ children: true });
    const x = (woodHut.c + HUT_N / 2) * CELL, y = (woodHut.r + HUT_N) * CELL;
    hutArt.position.set(projX(x, y), projY(x, y)); hutArt.scale.set(1.5);
    const g = hutArt.addChild(new PX.Graphics());
    g.beginFill(0x000000, .18); g.drawEllipse(0, 8, 70, 24); g.endFill();
    // stacked logs beside the hut
    for (let i = 0; i < 3; i++) {
      const yy = 0 - i * 6, w = 42 - i * 5;
      g.beginFill(0x3a220c); g.drawRoundedRect(-62, yy + 2, w, 8, 4); g.endFill();
      g.beginFill(i % 2 ? 0x7a4a22 : 0x8b5a2b); g.drawRoundedRect(-62, yy, w, 9, 4.5); g.endFill();
      g.beginFill(0xc79a5e); g.drawEllipse(-62 + w - 4, yy + 4.5, 5, 4); g.endFill();
    }
    // timber walls, roof and a warm window
    g.beginFill(0x5a3a1c); g.drawRoundedRect(-32, -38, 64, 46, 7); g.endFill();
    g.beginFill(0x8b5a2b); g.drawRoundedRect(-29, -34, 58, 40, 5); g.endFill();
    g.beginFill(0x2a1708); g.drawRoundedRect(-10, -24, 20, 31, 4); g.endFill();
    g.beginFill(0xffd36b); g.drawRoundedRect(16, -22, 9, 9, 2); g.endFill();
    g.beginFill(0xc08a4a); g.drawPolygon([-44, -38, 0, -72, 44, -38]); g.endFill();
    g.beginFill(0x7a4a22); g.drawPolygon([-38, -39, 0, -67, 38, -39]); g.endFill();
    g.lineStyle({ width: 2.2, color: 0x5a3417, join: 'round' }); g.moveTo(-44, -38); g.lineTo(0, -72); g.lineTo(44, -38);
    g.lineStyle(0); g.beginFill(0x6b4519); g.drawRect(18, -72, 7, 13); g.endFill();
    // stump + axe at the front
    g.beginFill(0x4a2c0e); g.drawRoundedRect(40, 4, 18, 15, 4); g.endFill();
    g.beginFill(0x8a5a2f); g.drawRoundedRect(41, 3, 16, 6, 3); g.endFill();
    g.lineStyle({ width: 3, color: 0x6b4519, cap: 'round' }); g.moveTo(49, 5); g.lineTo(58, -13);
    g.lineStyle({ width: 1.5, color: 0x2f1d0c }); g.moveTo(53, -8); g.lineTo(63, -8);
  }

  function drawHutStumps() {
    if (typeof treeL === 'undefined') return;
    if (!hutStumpG) hutStumpG = treeL.addChildAt(new PX.Graphics(), 0);
    hutStumpG.clear();
    if (!woodHut.owned) return;
    const now = Date.now();
    for (const e of woodHut.trees) {
      if (!e.felledAt || e.regrowAt <= now) continue;
      const u = projX((e.c + .5) * CELL, (e.r + .5) * CELL), v = projY((e.c + .5) * CELL, (e.r + .5) * CELL);
      hutStumpG.beginFill(0x3a220c); hutStumpG.drawEllipse(u, v + 2, 15, 8); hutStumpG.endFill();
      hutStumpG.beginFill(0x8b5a2b); hutStumpG.drawEllipse(u, v, 13, 7); hutStumpG.endFill();
      hutStumpG.beginFill(0xc79a5e); hutStumpG.drawEllipse(u, v - 1, 9, 4.5); hutStumpG.endFill();
      hutStumpG.lineStyle({ width: 1.2, color: 0x6b4519 }); hutStumpG.drawEllipse(u, v - 1, 6, 3); hutStumpG.lineStyle(0);
    }
  }

  function drawHutArea() {
    if (!hutAreaG || !woodHut.owned) return;
    hutAreaG.clear();
    const cc = woodHut.c + HUT_N / 2, cr = woodHut.r + HUT_N / 2, R = woodHut.radius + .45, P = [];
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * Math.PI * 2, x = (cc + Math.cos(a) * R) * CELL, y = (cr + Math.sin(a) * R) * CELL;
      P.push(projX(x, y), projY(x, y));
    }
    hutAreaG.lineStyle({ width: 2.2 / zoom, color: 0x8adf6a, alpha: .7, join: 'round' });
    hutAreaG.beginFill(0x5ee664, .06); hutAreaG.drawPolygon(P); hutAreaG.endFill();
  }
  function setHutAreaVisible(on) {
    if (typeof farmFlatL === 'undefined') return;
    if (!hutAreaG) hutAreaG = farmFlatL.addChild(new PX.Graphics());
    hutAreaG.visible = !!on && woodHut.owned;
    if (hutAreaG.visible) drawHutArea();
  }

  // ---- DOM: build card, hovering tooltip and the small status sheet ----
  const hutInfoEl = document.getElementById('hutInfo'), hutBuyEl = document.getElementById('hutBuy');
  function findHutSpot() {
    const minC = Math.ceil(clearing.x0 / CELL), maxC = Math.floor(clearing.x1 / CELL) - HUT_N;
    const minR = Math.ceil(clearing.y0 / CELL), maxR = Math.floor(clearing.y1 / CELL) - HUT_N;
    let best = null, bestScore = Infinity, fallback = null, fallbackD = Infinity;
    for (let dr = -9; dr <= 9; dr++) for (let dc = -12; dc <= 12; dc++) {
      const c = home.c + dc, r = home.r + dr;
      if (c < minC || r < minR || c > maxC || r > maxR) continue;
      let free = true;
      for (let j = 0; j < HUT_N && free; j++) for (let i = 0; i < HUT_N; i++) if (occ.get(slot(c + i, r + j))) { free = false; break; }
      if (!free) continue;
      const d = Math.hypot(c + HUT_N / 2 - (home.c + HOME_N / 2), r + HUT_N / 2 - (home.r + HOME_N / 2));
      if (d < 2.4 || d > 10) continue;
      if (d < fallbackD) { fallbackD = d; fallback = { c, r }; }
      let treesNear = 0;
      const tc = c + HUT_N / 2, tr = r + HUT_N / 2, R = HUT_RADIUS + .45;
      for (const t of trees) { const dx = t.c - tc, dy = t.r - tr; if (dx * dx + dy * dy <= R * R) treesNear++; }
      if (treesNear < 3) continue;
      const score = d - Math.min(3, treesNear * .1) + Math.max(0, 12 - treesNear) * .35;
      if (score < bestScore) { bestScore = score; best = { c, r }; }
    }
    if (best || fallback) return best || fallback;
    for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
      let free = true;
      for (let j = 0; j < HUT_N && free; j++) for (let i = 0; i < HUT_N; i++) if (occ.get(slot(c + i, r + j))) { free = false; break; }
      if (!free) continue;
      const d = Math.hypot(c - home.c, r - home.r);
      if (d < fallbackD) { fallbackD = d; fallback = { c, r }; }
    }
    return fallback;
  }

  function buildWoodHut() {
    if (woodHut.owned) return false;
    if (gold < HUT_COST) { if (typeof toast === 'function') toast('You need ' + HUT_COST + ' gold for the woodcutter hut'); renderWoodHutBuild(); return false; }
    const spot = findHutSpot();
    if (!spot) { if (typeof toast === 'function') toast('No room near your home for a woodcutter hut'); return false; }
    if (typeof spendGold !== 'function' || !spendGold(HUT_COST)) return false;
    woodHut.owned = true; woodHut.c = spot.c; woodHut.r = spot.r; woodHut.radius = HUT_RADIUS;
    woodHut.trees = []; woodHut.lastSeen = Date.now(); woodHut.lastAway = null;
    hutWorldApplied = false;
    if (typeof started !== 'undefined' && started) initWoodHutWorld();
    else { drawWoodHut(); saveHut(); }
    if (typeof renderBuild === 'function') renderBuild(); else renderWoodHutBuild();
    if (typeof refreshWoodHud === 'function') refreshWoodHud();
    openHutPanel();
    if (typeof toast === 'function') toast('Woodcutter Hut built! It only cuts trees in its own grove');
    return true;
  }

  function renderWoodHutBuild() {
    if (!hutInfoEl || !hutBuyEl) return;
    if (woodHut.owned) {
      hutInfoEl.textContent = hutTreesStanding() + ' / ' + woodHut.trees.length + ' trees \u00B7 ' + HUT_OFFLINE_TREES_PER_HOUR + ' trees/hour away';
      hutBuyEl.textContent = 'Built'; hutBuyEl.disabled = true; hutBuyEl.title = '';
      return;
    }
    hutInfoEl.textContent = 'Small grove \u00B7 ' + HUT_OFFLINE_TREES_PER_HOUR + ' trees/hour away';
    if (gold < HUT_COST) { hutBuyEl.textContent = 'Need ' + HUT_COST + ' gold'; hutBuyEl.disabled = true; hutBuyEl.title = 'Sell wheat at the market for gold'; }
    else { hutBuyEl.textContent = 'Build \u00B7 ' + HUT_COST + 'g'; hutBuyEl.disabled = false; hutBuyEl.title = ''; }
  }
  if (hutBuyEl) hutBuyEl.addEventListener('click', () => { if (!woodHut.owned) buildWoodHut(); });

  const hutPanel = document.createElement('div');
  hutPanel.id = 'hutpanel'; hutPanel.setAttribute('aria-hidden', 'true');
  hutPanel.innerHTML =
    '<div class="hp-head"><span class="hp-ico">' + HUT_ICON + '</span><div class="hp-tt"><div class="hp-title">Woodcutter Hut</div><div class="hp-sub" id="hutSub">A small grove by your home</div></div>' +
      '<button class="hp-x" id="hutClose" type="button" aria-label="Close">&#10005;</button></div>' +
    '<div class="hp-row"><span>Grove</span><b id="hutTreeCount">0 trees</b></div>' +
    '<div class="hp-row"><span>Away pace</span><b id="hutRate">10 trees/hr</b></div>' +
    '<div class="hp-row"><span>Woodcutters</span><b id="hutCrew">0</b></div>' +
    '<div id="hutNote"></div><div id="hutAway"></div>';
  hud.appendChild(hutPanel);
  const hutSubEl = document.getElementById('hutSub'), hutTreeCountEl = document.getElementById('hutTreeCount');
  const hutRateEl = document.getElementById('hutRate'), hutCrewEl = document.getElementById('hutCrew');
  const hutNoteEl = document.getElementById('hutNote'), hutAwayEl = document.getElementById('hutAway');
  if (hutRateEl) hutRateEl.textContent = HUT_OFFLINE_TREES_PER_HOUR + ' trees/hr \u00B7 ' + hutTreesPerHour() + ' wood/hr';

  let hutPanelOpen = false, hutPanelKey = '', hutHover = false;
  function renderHutPanel(force) {
    if (!hutPanel || !woodHut.owned) return;
    const now = Date.now(), standing = hutTreesStanding(now), total = woodHut.trees.length;
    let next = 0;
    for (const e of woodHut.trees) if (e.felledAt && e.regrowAt > now && (!next || e.regrowAt < next)) next = e.regrowAt;
    const crew = typeof roles !== 'undefined' ? roles.filter(r => r === 'woodcutter').length : 0;
    const away = woodHut.lastAway ? (woodHut.lastAway.wood + '|' + woodHut.lastAway.trees + '|' + woodHut.lastAway.ms) : '';
    const key = [standing, total, next ? Math.ceil((next - now) / 1000) : 0, crew, away].join('|');
    if (!force && key === hutPanelKey) return;
    hutPanelKey = key;
    if (hutSubEl) hutSubEl.textContent = 'A small grove ' + HUT_RADIUS + ' tiles around the hut';
    if (hutTreeCountEl) hutTreeCountEl.textContent = standing + ' / ' + total + ' standing';
    if (hutCrewEl) hutCrewEl.textContent = String(crew);
    if (hutNoteEl) {
      if (!crew) hutNoteEl.textContent = 'Assign a woodcutter in the Villagers menu to work this grove.';
      else if (!standing) hutNoteEl.textContent = 'The grove is resting \u2014 the next tree regrows in ' + hudClock(next - now) + '.';
      else hutNoteEl.textContent = 'Cutters fell one tree at a time, only inside the green outline.';
    }
    if (hutAwayEl) {
      const a = woodHut.lastAway;
      hutAwayEl.textContent = a && a.wood > 0 ? 'Last away: +' + a.wood + ' wood from ' + a.trees + ' trees (' + hutDuration(a.ms) + ').' : '';
    }
  }
  function hudClock(ms) {
    if (typeof clockText === 'function') return clockText(ms);
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function openHutPanel() {
    if (!woodHut.owned || !hutPanel) return false;
    hutPanelOpen = true;
    hutPanel.style.display = 'block'; hutPanel.setAttribute('aria-hidden', 'false');
    if (typeof setTradeOpen === 'function') setTradeOpen(false);
    if (typeof closeHomePanel === 'function') closeHomePanel();
    if (typeof setJobsOpen === 'function') setJobsOpen(false);
    if (typeof buildPanel !== 'undefined' && buildPanel) { buildPanel.style.display = 'none'; buildBtn.classList.remove('open'); }
    renderHutPanel(true); setHutAreaVisible(true);
    return true;
  }
  function closeHutPanel() {
    hutPanelOpen = false;
    if (hutPanel) { hutPanel.style.display = 'none'; hutPanel.setAttribute('aria-hidden', 'true'); }
    setHutAreaVisible(hutHover);
  }
  const hutCloseEl = document.getElementById('hutClose');
  if (hutCloseEl) hutCloseEl.addEventListener('click', closeHutPanel);
  window.addEventListener('pointerdown', e => {
    if (hutPanelOpen && hutPanel && !hutPanel.contains(e.target)) closeHutPanel();
  }, true);

  function hutAt(sx, sy) {
    if (!woodHut.owned || typeof slotAt !== 'function') return false;
    const s = slotAt(sx, sy);
    return !!s && s.c >= woodHut.c - 1 && s.c < woodHut.c + HUT_N + 1 && s.r >= woodHut.r - 1 && s.r < woodHut.r + HUT_N + 1;
  }
  function hutTap(sx, sy) {
    if (!hutAt(sx, sy)) return false;
    openHutPanel();
    return true;
  }

  const hutTip = document.createElement('div');
  hutTip.id = 'huttip'; document.body.appendChild(hutTip);
  function showHutTip(clientX, clientY) {
    const standing = hutTreesStanding();
    hutTip.innerHTML = 'Woodcutter Hut<small>' + standing + ' / ' + woodHut.trees.length + ' trees in the grove \u00B7 tap for details</small>';
    hutTip.style.display = 'block';
    hutTip.style.left = Math.max(8, Math.min(window.innerWidth - 220, clientX + 14)) + 'px';
    hutTip.style.top = Math.max(8, clientY - 54) + 'px';
  }
  function hideHutTip() { hutTip.style.display = 'none'; }
  if (canvas) canvas.addEventListener('pointermove', e => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    const q = typeof pt === 'function' ? pt(e) : { x: e.clientX, y: e.clientY };
    hutHover = hutAt(q.x, q.y);
    if (hutHover) { showHutTip(e.clientX, e.clientY); if (!hutPanelOpen) setHutAreaVisible(true); }
    else { hideHutTip(); if (!hutPanelOpen) setHutAreaVisible(false); }
  });
  canvas.addEventListener('pointerleave', () => { hutHover = false; hideHutTip(); if (!hutPanelOpen) setHutAreaVisible(false); });

  // ---- boot: award the away time, show the card, then keep timestamps fresh ----
  applyOfflineHutProgress();
  renderWoodHutBuild();
  if (typeof refreshWoodHud === 'function') refreshWoodHud();
  drawWoodHut(); drawHutStumps();
  if (typeof started !== 'undefined' && started) initWoodHutWorld();
  setInterval(() => {
    if (!woodHut.owned) return;
    tickHutTrees();
    if (hutPanelOpen) renderHutPanel();
    if (hutHover && !hutPanelOpen) drawHutArea();
  }, 1000);
  setInterval(() => { if (woodHut.owned) saveHut(); }, 30000);
  window.addEventListener('pagehide', () => { if (woodHut.owned) saveHut(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && woodHut.owned) saveHut(); });

  window.woodHut = {
    state: () => woodHut, build: buildWoodHut, open: openHutPanel, close: closeHutPanel,
    save: saveHut, offline: applyOfflineHutProgress, allowed: hutTreeAllowed, drop: hutDropPoint,
    cost: HUT_COST, radius: HUT_RADIUS, offlineTreesPerHour: HUT_OFFLINE_TREES_PER_HOUR,
    regrowMs: HUT_TREE_REGROW_MS, offlineCapMs: HUT_OFFLINE_CAP_MS
  };
