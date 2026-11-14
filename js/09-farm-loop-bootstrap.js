  // ---------- the farm loop: buy it in the Build menu, villagers plant it, wait for the green bar, tap the bubble to collect the wheat ----------
  const FARM_COST = 50;            // gold to build it
  const GROW_SEC = 20;             // seconds until the wheat is ripe (try 10, 30 ...)
  const WHEAT_PER_HARVEST = 10;    // wheat you get each time you collect
  const WORKERS = 4;               // villagers who walk out and work the fields
  try {
    const saved = JSON.parse(localStorage.getItem('farms') || 'null');
    const old = saved ? null : JSON.parse(localStorage.getItem('farm') || 'null');   // older saves had a single farm
    const list = Array.isArray(saved) ? saved : (old && typeof old.t0 === 'number' ? [old] : []);
    for (const s of list) {
      if (!s || typeof s.t0 !== 'number') continue;
      const f = { t0: s.t0, c: Number.isInteger(s.c) ? s.c : 16, r: Number.isInteger(s.r) ? s.r : 21, rot: s.rot ? 1 : 0 };
      const cols = fCols(f.rot), rows = fRows(f.rot);
      f.c = Math.max(0, Math.min(WORLD_W / CELL - cols, f.c));
      f.r = Math.max(0, Math.min(WORLD_H / CELL - rows, f.r));
      farms.push(f);
    }
    const w = parseInt(localStorage.getItem('wheat'), 10); if (w > 0) wheatCount = w;
  } catch (e) {}
  const farmState = f => !f ? 'none' : (Date.now() - f.t0 >= GROW_SEC * 1000 ? 'ready' : 'growing');
  const farmProgress = f => f ? Math.min(1, (Date.now() - f.t0) / (GROW_SEC * 1000)) : 0;
  const saveFarms = () => { try { localStorage.setItem('farms', JSON.stringify(farms.map(f => ({ t0: f.t0, c: f.c, r: f.r, rot: f.rot })))); localStorage.setItem('wheat', wheatCount); } catch (e) {} };

  const toastEl = document.getElementById('toast'); let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200); }
  function spendGold(n) {
    if (gold < n) return false;
    setGold(gold - n); goldPending += n;
    try { localStorage.setItem('goldPending', goldPending); localStorage.setItem('goldCache', gold); } catch (e) {}
    if (sb) sb.rpc('spend_gold', { amount: n }).then(({ data, error }) => {     // needs a spend_gold function in Supabase; until it exists the spend is remembered here
      if (!error && typeof data === 'number') { goldPending = Math.max(0, goldPending - n); try { localStorage.setItem('goldPending', goldPending); } catch (e) {} }
      else console.warn('spend_gold not available yet', error && error.message);
    }).catch(() => {});
    return true;
  }

  // where a farm hand heads next: first visit = their own stretch of the field, later = a short shuffle along it
  function workSpot(v, near, f) {
    const b = f && farmBounds(f); if (!b) return;
    const cl = (a, lo, hi) => Math.max(lo, Math.min(hi, a));
    if (near) { v.tx = cl(v.x + rr(-80, 80), b.x0 + 16, b.x1 - 16); v.ty = cl(v.y + rr(-40, 40), b.y0 + 14, b.y1 - 14); }
    else { v.tx = cl(b.x0 + 40 + (v.wi % WORKERS) / (WORKERS - 1 || 1) * (b.x1 - b.x0 - 80) + rr(-25, 25), b.x0 + 16, b.x1 - 16); v.ty = b.y0 + rr(22, b.y1 - b.y0 - 22); }
  }

  // ---- HUD: wheat counter + Build menu ----
  const wheatPill = document.getElementById('wheatpill'), wheatNum = document.getElementById('wheatnum');
  let uiKey = '';
  function refreshWheatHud() {
    const key = farms.length + '|' + wheatCount; if (key === uiKey) return; uiKey = key;
    wheatPill.style.display = (farms.length || wheatCount) ? 'flex' : 'none'; wheatNum.textContent = wheatCount;
    if (typeof renderTrade === 'function') renderTrade();
  }

  // ---- food consumption: villagers eat over time ----
  const CONSUME_EVERY_MS = 20000;     // every 20 seconds
  let lastConsumeMs = 0;
  function updateFoodConsumption(now) {
    if (!lastConsumeMs) { lastConsumeMs = now; return; }
    if (now - lastConsumeMs < CONSUME_EVERY_MS) return;
    lastConsumeMs = now;
    const need = Math.max(1, Math.ceil(population / 2));   // population of 10 consumes 5 food per interval
    if (need <= 0) return;
    if (wheatCount >= need) {
      wheatCount -= need;
      saveFarms();
      setStat('wheat', ICON.wheat, 'Wheat', wheatCount);
      refreshWheatHud();
      if (typeof renderTrade === 'function') renderTrade();
    } else if (wheatCount > 0) {
      const eaten = wheatCount;
      wheatCount = 0;
      saveFarms();
      setStat('wheat', ICON.wheat, 'Wheat', wheatCount);
      refreshWheatHud();
      if (typeof renderTrade === 'function') renderTrade();
      toast('Villagers ate ' + eaten + ' food and are still hungry');
    } else {
      toast('Your villagers are hungry! Harvest more food');
    }
  }

  // ---- market: sell food to a merchant. The price moves over time, so timing your sales is the fun part ----
  const MKT_BASE = 5, MKT_MIN = 2, MKT_MAX = 9;   // gold you get for 10 food
  const MKT_EVERY_MS = 40000;                     // the price changes every 40 seconds
  const MKT_BIG_SALE = 50;                        // selling this much at once pushes the price down a notch
  const market = { p: MKT_BASE, hist: [5, 5, 5, 5, 5, 5], next: Date.now() + MKT_EVERY_MS, note: 'The merchant is setting up his stall.' };
  try {
    const m = JSON.parse(localStorage.getItem('market') || 'null');
    if (m && Number.isFinite(m.p)) {
      market.p = Math.max(MKT_MIN, Math.min(MKT_MAX, Math.round(m.p)));
      if (Array.isArray(m.hist) && m.hist.length) market.hist = m.hist.filter(Number.isFinite).slice(-8);
      if (!market.hist.length) market.hist = [market.p];
      if (typeof m.note === 'string') market.note = m.note.slice(0, 80);
    }
  } catch (e) {}
  const saveMarket = () => { try { localStorage.setItem('market', JSON.stringify({ p: market.p, hist: market.hist, note: market.note })); } catch (e) {} };
  const goldFor = food => Math.floor(food * market.p / 10);
  function tickMarket() {
    if (Date.now() < market.next) return false;
    market.next = Date.now() + MKT_EVERY_MS;
    const r = Math.random(); let d, note;
    if (r < .12) { d = 2; note = 'A caravan is in town. Everyone wants bread!'; }
    else if (r < .24) { d = -2; note = 'Every field is full. Wheat is cheap today.'; }
    else {
      const pull = market.p > MKT_BASE + 2 ? -1 : market.p < MKT_BASE - 2 ? 1 : 0;   // prices drift back toward normal
      d = [-1, 0, 0, 1][Math.floor(Math.random() * 4)] + pull; d = Math.max(-1, Math.min(1, d));
      note = d > 0 ? 'Demand is rising.' : d < 0 ? 'Prices are easing.' : 'The market is calm.';
    }
    market.p = Math.max(MKT_MIN, Math.min(MKT_MAX, market.p + d));
    market.hist.push(market.p); if (market.hist.length > 8) market.hist.shift();
    market.note = note; saveMarket();
    return true;
  }
  const tradeBtn = document.getElementById('tradebtn'), tradePanel = document.getElementById('tradepanel');
  const elMood = document.getElementById('tradeMood'), elGold = document.getElementById('priceGold'), elTrend = document.getElementById('trend');
  const elSpark = document.getElementById('spark'), elTag = document.getElementById('priceTag'), elTimer = document.getElementById('priceTimer');
  const elHave = document.getElementById('tradeGet'), elNote = document.getElementById('tradeNote'), elFx = document.getElementById('coinfx');
  const sell10 = document.getElementById('sell10'), sell50 = document.getElementById('sell50'), sellX = document.getElementById('sellX'), sellXn = document.getElementById('sellXn');
  let tradeOpen = false;
  function drawSpark() {
    if (!elSpark) return;
    const h = market.hist, n = h.length, pts = h.map((v, i) => [n > 1 ? i / (n - 1) * 96 + 2 : 50, 25 - (v - MKT_MIN) / (MKT_MAX - MKT_MIN) * 22]);
    const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), last = pts[pts.length - 1];
    elSpark.innerHTML = '<polyline points="' + line + '" fill="none" stroke="#c99a4b" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6" fill="#ffe27a" stroke="#7a4a08" stroke-width=".8"/>';
  }
  function renderTrade() {
    if (tradeBtn) tradeBtn.classList.toggle('hot', market.p >= 7);
    if (!tradePanel || !tradeOpen) return;
    const have = wheatCount | 0, p = market.p, prev = market.hist.length > 1 ? market.hist[market.hist.length - 2] : p;
    const need = Math.max(1, Math.ceil(population / 2)), reserve = need * 2;
    const extra = Math.max(0, have - reserve);
    elGold.textContent = p;
    elMood.textContent = market.note;
    elTrend.textContent = p > prev ? '\u25B2 up' : p < prev ? '\u25BC down' : '\u2022 steady';
    elTrend.className = p > prev ? 'up' : p < prev ? 'down' : '';
    elTag.textContent = p >= 7 ? 'Great price. Sell now!' : p === 6 ? 'Good price' : p === 5 ? 'Fair price' : p === 4 ? 'A bit low' : 'Low price. Maybe wait?';
    elTag.className = p >= 7 ? 'great' : p <= 3 ? 'poor' : '';
    const left = Math.max(0, Math.ceil((market.next - Date.now()) / 1000));
    elTimer.textContent = 'New price in ' + left + 's';
    drawSpark();
    elHave.textContent = 'You have ' + have + ' food';
    sell10.disabled = have < 10 || goldFor(10) < 1;
    sell50.disabled = have < 50;
    sellX.disabled = goldFor(extra) < 1;
    sellXn.textContent = extra > 0 ? extra : '0';
    elNote.textContent = 'Your villagers eat ' + need + ' food every 20 seconds. \u201CExtra\u201D keeps enough for ' + reserve + '.';
  }
  function coinBurst(n) {
    if (!elFx || !ICON.coin) return;
    const count = Math.max(5, Math.min(14, n + 4));
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div'); d.className = 'cf'; d.innerHTML = ICON.coin;
      d.style.setProperty('--dx', (Math.random() * 120 - 60).toFixed(0) + 'px');
      d.style.setProperty('--dy', (-70 - Math.random() * 70).toFixed(0) + 'px');
      d.style.setProperty('--rot', (Math.random() * 360 - 180).toFixed(0) + 'deg');
      d.style.animationDelay = (i * 35) + 'ms';
      elFx.appendChild(d); setTimeout(() => d.remove(), 1500);
    }
    const gb = document.getElementById('goldbar');
    if (gb) { gb.classList.remove('bump'); void gb.offsetWidth; gb.classList.add('bump'); }
  }
  function sellFood(food) {
    food = Math.floor(food);
    const gain = goldFor(food);
    if (food <= 0 || gain <= 0 || food > wheatCount) { renderTrade(); return; }
    wheatCount -= food;
    setGold(gold + gain);
    try { localStorage.setItem('goldCache', gold); } catch (e) {}
    saveFarms();
    setStat('wheat', ICON.wheat, 'Wheat', wheatCount);
    refreshWheatHud();
    if (food >= MKT_BIG_SALE && market.p > MKT_MIN) {          // dump a lot on the merchant and he pays less next time
      market.p--; market.hist[market.hist.length - 1] = market.p;
      market.note = 'You flooded the stall. The price dipped.'; saveMarket();
    }
    coinBurst(gain);
    renderTrade();
    toast('Sold ' + food + ' food for ' + gain + ' gold');
  }
  function setTradeOpen(open) {
    tradeOpen = !!open;
    if (tradePanel) { tradePanel.style.display = tradeOpen ? 'block' : 'none'; tradePanel.setAttribute('aria-hidden', tradeOpen ? 'false' : 'true'); }
    if (tradeBtn) tradeBtn.classList.toggle('open', tradeOpen);
    if (tradeOpen) { if (buildPanel) { buildPanel.style.display = 'none'; buildBtn.classList.remove('open'); } renderTrade(); }
  }
  if (tradeBtn) tradeBtn.addEventListener('click', () => setTradeOpen(!tradeOpen));
  const tradeCancel = document.getElementById('tradeCancel');
  if (tradeCancel) tradeCancel.addEventListener('click', () => setTradeOpen(false));
  if (sell10) sell10.addEventListener('click', () => sellFood(10));
  if (sell50) sell50.addEventListener('click', () => sellFood(50));
  if (sellX) sellX.addEventListener('click', () => sellFood(Math.max(0, (wheatCount | 0) - Math.max(1, Math.ceil(population / 2)) * 2)));
  setInterval(() => { tickMarket(); renderTrade(); }, 1000);
  renderTrade();
  window.addEventListener('pointerdown', e => {
    if (tradeOpen && tradePanel && !tradePanel.contains(e.target) && tradeBtn && !tradeBtn.contains(e.target)) setTradeOpen(false);
  }, true);
  function focusFarm(f) { if (!f) return; const ctr = farmCenter(f); cpx = ctr[0]; cpy = ctr[1]; clampCam(); }
  function renderBuild() {
    const btn = document.getElementById('farmBuy'), info = document.getElementById('farmInfo');
    info.textContent = 'Ready in ' + GROW_SEC + 's \u00B7 ' + WHEAT_PER_HARVEST + ' wheat each time';
    if (placing) { btn.textContent = 'Placing\u2026'; btn.disabled = true; }
    else if (gold < FARM_COST) { btn.textContent = 'Need ' + FARM_COST + ' gold'; btn.disabled = true; }
    else { btn.textContent = 'Build \u00B7 ' + FARM_COST + ' gold'; btn.disabled = false; }
  }
  function startPlacing() {
    if (placing || movingFarm) return;
    if (gold < FARM_COST) { toast('You need ' + FARM_COST + ' gold'); return; }
    const spot = findFarmSpot(0);
    placing = { c: spot.c, r: spot.r, rot: spot.rot };
    sel = null; hov = null; drag = null; tap = null; barKey = '#';
    buildPanel.style.display = 'none'; buildBtn.classList.remove('open');
    rebuildFarm(placing); focusFarm(placing);
    toast('Drag or tap to place your farm, then tap \u2713');
  }
  function placeTo(sx, sy) {
    if (!placing) return;
    const s = slotAt(sx, sy); if (!s) return;
    const cols = fCols(placing.rot), rows = fRows(placing.rot);
    placing.c = clampI(s.c - Math.floor(cols / 2), 0, WORLD_W / CELL - cols);
    placing.r = clampI(s.r - Math.floor(rows / 2), 0, WORLD_H / CELL - rows);
    barKey = '#'; rebuildFarm(placing);
  }
  function activeFarmMove() { return placing || movingFarm; }
  function rotateFarm() {
    const fm = activeFarmMove(); if (!fm) return;
    const oldC = fCols(fm.rot), oldR = fRows(fm.rot);
    const cx = fm.c + oldC / 2, cy = fm.r + oldR / 2;
    fm.rot ^= 1;
    const cols = fCols(fm.rot), rows = fRows(fm.rot);
    fm.c = clampI(Math.round(cx - cols / 2), 0, WORLD_W / CELL - cols);
    fm.r = clampI(Math.round(cy - rows / 2), 0, WORLD_H / CELL - rows);
    if (movingFarm) { movingFarm.farm.c = fm.c; movingFarm.farm.r = fm.r; movingFarm.farm.rot = fm.rot; movingFarm.ok = farmSpotOK(fm.c, fm.r, fm.rot); rebuildFarm(movingFarm.farm); }
    else rebuildFarm(fm);
    barKey = '#';
  }
  function setMovingFarmPos(c, r) {
    const m = movingFarm; if (!m) return;
    const cols = fCols(m.rot), rows = fRows(m.rot);
    m.c = clampI(c, 0, WORLD_W / CELL - cols); m.r = clampI(r, 0, WORLD_H / CELL - rows);
    m.farm.c = m.c; m.farm.r = m.r; m.farm.rot = m.rot;
    m.ok = farmSpotOK(m.c, m.r, m.rot);
  }
  function moveFarmTo(sx, sy) {
    if (!movingFarm) return;
    const s = slotAt(sx, sy); if (!s) return;
    setMovingFarmPos(s.c - Math.floor(fCols(movingFarm.rot) / 2), s.r - Math.floor(fRows(movingFarm.rot) / 2));
    barKey = '#'; rebuildFarm(movingFarm.farm);
  }
  function startMovingFarm(f, sx, sy) {
    if (!f || placing || movingFarm || drag) return;
    const s = slotAt(sx, sy) || { c: f.c, r: f.r };
    eachFarmSlot(f, (c, r) => { const o = occ.get(slot(c, r)); if (o && o.type === 'farm') occ.delete(slot(c, r)); });
    movingFarm = { farm: f, c: f.c, r: f.r, rot: f.rot, oc: f.c, or: f.r, orot: f.rot, offC: s.c - f.c, offR: s.r - f.r, ok: true, held: true, id: null, q: { x: sx, y: sy } };
    sel = null; hov = null; barKey = '#';
    rebuildFarm(f);
  }
  function endMovingFarm(commit) {
    if (!movingFarm) return;
    const m = movingFarm, f = m.farm;
    if (commit) {
      if (!farmSpotOK(m.c, m.r, m.rot)) { mvBar.classList.remove('shake'); void mvBar.offsetWidth; mvBar.classList.add('shake'); return; }
      f.c = m.c; f.r = m.r; f.rot = m.rot;
    } else {
      f.c = m.oc; f.r = m.or; f.rot = m.orot;
    }
    claimFarmSlots(f); rebuildFarm(f); saveFarms();
    movingFarm = null; barKey = '#';
  }
  function endPlacing(commit) {
    if (!placing) return;
    const p = placing;
    if (commit) {
      if (!farmSpotOK(p.c, p.r, p.rot)) { mvBar.classList.remove('shake'); void mvBar.offsetWidth; mvBar.classList.add('shake'); return; }
      if (!spendGold(FARM_COST)) return;
      const f = { t0: Date.now(), c: p.c, r: p.r, rot: p.rot };
      destroyFarmVisual(p);
      placing = null; barKey = '#';
      farms.push(f); claimFarmSlots(f); saveFarms(); rebuildFarm(f);
      refreshWheatHud(); setStat('wheat', ICON.wheat, 'Wheat', wheatCount); renderBuild(); focusFarm(f);
      toast('Farm built! Your villagers are heading out to plant');
    } else {
      destroyFarmVisual(p);
      placing = null; barKey = '#'; renderBuild();
    }
  }
  buildBtn.addEventListener('click', () => { setTradeOpen(false); renderBuild(); });
  document.getElementById('farmBuy').addEventListener('click', () => { if (!placing && !movingFarm) startPlacing(); });
  if (farms.length || wheatCount) setStat('wheat', ICON.wheat, 'Wheat', wheatCount);

  // ---- on the map: green progress bar with the time (Clash-style), then a wheat bubble to tap ----
  const farmUIL = world.addChild(new PX.Container());
  const floaters = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  const wheatTexBig = PX.Texture.from('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICON.wheat.replace('width="64" height="64"', 'width="192" height="192"')));
  function ensureFarmUI(f) {
    if (f.ui) return f.ui;
    const barBox = farmUIL.addChild(new PX.Container()), barG = barBox.addChild(new PX.Graphics());
    const barT = barBox.addChild(new PX.Text('', { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: 26, fill: 0xffffff, stroke: 0x1e0f05, strokeThickness: 7, lineJoin: 'round' }));
    barT.anchor.set(.5); barT.scale.set(.5); barT.resolution = 2;
    const bubble = farmUIL.addChild(new PX.Container()), bubG = bubble.addChild(new PX.Graphics());
    bubG.lineStyle({ width: 2.5, color: 0x6b4519, join: 'round' }); bubG.beginFill(0xfffae1, .97); bubG.drawCircle(0, 0, 25); bubG.endFill();
    bubG.beginFill(0xfffae1, .97); bubG.drawPolygon([-7, 23, 0, 34, 7, 23]); bubG.endFill();
    const wheatBig = bubble.addChild(new PX.Sprite(wheatTexBig));
    wheatBig.anchor.set(.5); wheatBig.scale.set(40 / 192); wheatBig.position.set(0, -1);
    barBox.visible = bubble.visible = false;
    return (f.ui = { barBox, barG, barT, bubble, barSec: -1 });
  }
  function destroyFarmUI(f) {
    if (!f || !f.ui) return;
    for (const c of [f.ui.barBox, f.ui.bubble]) if (c) { c.removeFromParent(); c.destroy({ children: true }); }
    f.ui = null;
  }
  function updateFarmUI(time) {
    refreshWheatHud();
    updateFoodConsumption(performance.now());
    const canShow = !placing;
    const movingF = movingFarm ? movingFarm.farm : null;
    for (const f of farms) {
      const ui = ensureFarmUI(f);
      const st = farmState(f), p = farmProgress(f);
      const hf = .22 + .78 * Math.min(1, p / .85), m = Math.max(0, Math.min(1, (p - .35) / .5));   // young wheat is short and green, it turns golden as it ripens
      f.hf = hf;
      f.tint = (Math.round(lerp(.6, 1, m) * 255) << 16) | (Math.round(lerp(.93, 1, m) * 255) << 8) | Math.round(lerp(.36, 1, m) * 255);
      const show = canShow && farmVisible(f) && f !== movingF;
      ui.barBox.visible = show && st === 'growing'; ui.bubble.visible = show && st === 'ready';
      const [fx, fy] = farmCenter(f);
      if (ui.barBox.visible) {
        const bw = 118, bh = 20, bx = fx - bw / 2, bt = fy - 72, left = Math.max(0, Math.ceil(GROW_SEC * (1 - p)));
        ui.barG.clear();
        ui.barG.beginFill(0x000000, .25); ui.barG.drawRoundedRect(bx - 2, bt + 1, bw + 4, bh + 6, 10); ui.barG.endFill();
        ui.barG.lineStyle({ width: 2, color: 0xc99a4b }); ui.barG.beginFill(0x2a1a0c); ui.barG.drawRoundedRect(bx - 3, bt - 3, bw + 6, bh + 6, 10); ui.barG.endFill(); ui.barG.lineStyle(0);
        ui.barG.beginFill(0x4a321a); ui.barG.drawRoundedRect(bx, bt, bw, bh, 7); ui.barG.endFill();
        if (p > 0) {
          const w = Math.max(10, bw * p), r = Math.min(7, w / 2);
          ui.barG.beginFill(0x3aaa30); ui.barG.drawRoundedRect(bx, bt, w, bh, r); ui.barG.endFill();
          ui.barG.beginFill(0x6fe052); ui.barG.drawRoundedRect(bx, bt, w, bh * .62, r); ui.barG.endFill();
          ui.barG.beginFill(0xc2fa8c, .55); ui.barG.drawRoundedRect(bx + 2, bt + 2, Math.max(4, w - 4), 4, 2); ui.barG.endFill();
        }
        if (left !== ui.barSec) { ui.barSec = left; ui.barT.text = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); }
        ui.barT.position.set(fx, bt + bh / 2 + .5);
      }
      if (ui.bubble.visible) ui.bubble.position.set(fx, fy - 80 + Math.sin(time * 3) * 4);
    }
    const now = performance.now();
    for (let i = floaters.length - 1; i >= 0; i--) {                       // "+10 wheat" floating up
      const f = floaters[i], a = (now - f.t0) / 1500;
      if (a >= 1) { farmUIL.removeChild(f.txt); f.txt.destroy(); floaters.splice(i, 1); continue; }
      f.txt.alpha = 1 - a; f.txt.position.set(f.x, f.y - 30 - a * 60);
    }
  }
  function collectFarm(f) {
    if (farmState(f) !== 'ready') return;
    wheatCount += WHEAT_PER_HARVEST; f.t0 = Date.now(); if (f.ui) f.ui.barSec = -1; saveFarms();      // harvest, then the field is replanted
    setStat('wheat', ICON.wheat, 'Wheat', wheatCount); refreshWheatHud();
    const [fx, fy] = farmCenter(f);
    const t = new PX.Text('+' + WHEAT_PER_HARVEST + ' wheat', { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: 36, fill: 0xfff3b0, stroke: 0x3c2305, strokeThickness: 8, lineJoin: 'round' });
    t.anchor.set(.5); t.scale.set(.5); t.resolution = 2; farmUIL.addChild(t); floaters.push({ t0: performance.now(), txt: t, x: fx, y: fy });
    toast('Collected ' + WHEAT_PER_HARVEST + ' wheat');
  }
  function tapFarm(sx, sy) {                                                  // tap a ripe farm (or its bubble) to collect
    if (placing || movingFarm) return false;
    for (const f of farms) {
      if (farmState(f) !== 'ready') continue;
      const [fx, fy] = farmCenter(f);
      const bx = (fx - cpx) * zoom + cw / 2, by = (fy - 80 - cpy) * zoom + ch / 2;
      if (Math.hypot(sx - bx, sy - by) < 46 * zoom) { collectFarm(f); return true; }
      const s = slotAt(sx, sy), b = farmBounds(f);
      if (s) { const c0 = Math.floor(b.x0 / CELL), r0 = Math.floor(b.y0 / CELL), c1 = Math.ceil(b.x1 / CELL), r1 = Math.ceil(b.y1 / CELL); if (s.c >= c0 && s.c < c1 && s.r >= r0 && s.r < r1) { collectFarm(f); return true; } }
    }
    return false;
  }

  let lastMs = 0, slowEma = 16, slowN = 0;
  function frame(ms) {
    requestAnimationFrame(frame);
    const time = ms / 1000, now = performance.now(); fc++;
    // auto quality: if the phone can't keep up, draw with fewer pixels (down to 1x) so it stays smooth
    if (lastMs) { const d = ms - lastMs; if (d < 250) slowEma += (d - slowEma) * .1; }
    lastMs = ms;
    if (slowEma > 24 && dpr > 1) { if (++slowN > 90) { slowN = 0; slowEma = 16; resCap = Math.max(1, dpr - .25); resize(); } } else slowN = 0;
    try {
      world.scale.set(zoom); world.position.set(cw / 2 - cpx * zoom, ch / 2 - cpy * zoom);     // the camera
      cullGround();
      updateSelection(time, now);
      updateMoveGrid(time);
      updateTrees(time, now);
      updateFarmUI(time);
      updateFarm(time);
      updateHome(time);
      updateOverlay(time);
      app.renderer.render(app.stage);
    } catch (e) { if (!frame.err) { frame.err = 1; console.error('frame error', e); try { hint.textContent = 'Error: ' + (e && e.message || e); hint.style.opacity = 1; hint.style.color = '#ffb0a8'; } catch (_) {} } }
  }

  let loaded = 0;
  const ready = () => {
    if (++loaded < BLK.length + TRE.length || started) return; started = true;
    const mm = PX.MIPMAP_MODES ? { mipmap: PX.MIPMAP_MODES.ON } : undefined;      // smooth when zoomed out
    [...BLK, ...TRE].forEach(a => { a.tex = PX.Texture.from(a.im, mm); });
    shadowTex = radialTex('20,70,6', .42, 64); glowTex = radialTex('255,225,120', .9, 64);
    growForest();
    buildGround(); buildTrees(); farms.forEach(rebuildFarm);
    syncVillagers();
    resize();
    // whole clearing diamond fits on screen
    const dw = (HALF_W * 2 + HALF_H * 2) * IX + 160, dh = (HALF_W * 2 + HALF_H * 2) * IY + 200;
    zoom = Math.min(cw / dw, ch / dh);
    cpx = projX(spawn.x, spawn.y); cpy = projY(spawn.x, spawn.y); clampCam();
    requestAnimationFrame(frame);
    window.game = { setStat, setPopulation, villagers, occ, slot, cam: () => ({ cpx, cpy, zoom }), spawn, clearing, trees, farms, gold: () => gold, setGold, placing: () => placing, WORLD_W, WORLD_H, CELL, projX, projY, unprojX, unprojY };   // hooks for the next step
  };
  [...BLK, ...TRE].forEach(a => { a.im.onload = ready; if (a.im.complete && a.im.naturalWidth) ready(); });

