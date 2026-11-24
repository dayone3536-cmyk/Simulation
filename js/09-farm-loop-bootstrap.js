  // ---------- the farm loop: buy it in the Build menu, villagers plant it, wait for the green bar, tap the bubble to collect the wheat ----------
  const FARM_COST = 50;            // gold to build it — food is bought with coin, not logs
  const FARM_UPGRADE_COST = 150;   // one-time auto-harvest upgrade: every farm harvests itself from then on
  const FIRST_FARM_GROW_SEC = 5;   // the very first crop the player ever plants ripens in 5 seconds
  const FARM_GROW_SEC = 15;        // every crop after that takes 15 seconds to ripen
  const WHEAT_PER_HARVEST = 10;    // wheat you get each time you collect
  const WORKERS = 4;               // villagers who walk out and work the fields
  let farmsBuilt = 0;              // how many farms the player has ever built (only the first crop is quick)
  let farmAuto = false;            // auto-harvest upgrade: ripe wheat is collected without a tap
  try { farmsBuilt = parseInt(localStorage.getItem('farmsBuilt'), 10) || 0; } catch (e) {}
  try { farmAuto = localStorage.getItem('farmAuto') === '1'; } catch (e) {}
  try {
    const saved = JSON.parse(localStorage.getItem('farms') || 'null');
    const old = saved ? null : JSON.parse(localStorage.getItem('farm') || 'null');   // older saves had a single farm
    const list = Array.isArray(saved) ? saved : (old && typeof old.t0 === 'number' ? [old] : []);
    for (const s of list) {
      if (!s || typeof s.t0 !== 'number') continue;
      const f = { t0: s.t0, fast: !!s.fast, c: Number.isInteger(s.c) ? s.c : 16, r: Number.isInteger(s.r) ? s.r : 21, rot: s.rot ? 1 : 0 };   // fast = the one quick first crop, cleared as soon as it is collected
      const cols = fCols(f.rot), rows = fRows(f.rot);
      f.c = Math.max(0, Math.min(WORLD_W / CELL - cols, f.c));
      f.r = Math.max(0, Math.min(WORLD_H / CELL - rows, f.r));
      farms.push(f);
    }
    if (farmsBuilt < farms.length) farmsBuilt = farms.length;
    const w = parseInt(localStorage.getItem('wheat'), 10); if (w > 0) wheatCount = w;
  } catch (e) {}
  const farmCrewMul = f => (typeof farmCrewSpeed === 'function' ? farmCrewSpeed(f) : 1);   // 12-jobs: 1 farmer per farm = full speed
  const farmGrowSec = f => (f && f.fast) ? FIRST_FARM_GROW_SEC : FARM_GROW_SEC;   // only the very first crop ever is quick
  const farmState = f => !f ? 'none' : (Date.now() - f.t0 >= farmGrowSec(f) * 1000 / farmCrewMul(f) ? 'ready' : 'growing');
  const farmProgress = f => f ? Math.min(1, (Date.now() - f.t0) / (farmGrowSec(f) * 1000 / farmCrewMul(f))) : 0;
  const saveFarms = () => { try { localStorage.setItem('farms', JSON.stringify(farms.map(f => ({ t0: f.t0, fast: f.fast ? 1 : 0, c: f.c, r: f.r, rot: f.rot })))); localStorage.setItem('wheat', wheatCount); localStorage.setItem('farmsBuilt', farmsBuilt); localStorage.setItem('farmAuto', farmAuto ? '1' : '0'); } catch (e) {} };
  // a brand-new village starts with a small granary, so there is something to sell while the first crop grows
  try {
    if (!farms.length && wheatCount === 0 && localStorage.getItem('wheat') === null) { wheatCount = 20; saveFarms(); }
  } catch (e) {}

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

  // ---- market: sell food for gold. Generous, readable rates: 10 wheat is always worth 10-20 gold ----
  const MKT_BASE = 14, MKT_MIN = 10, MKT_MAX = 20;   // gold you get for 10 food
  const MKT_EVERY_MS = 45000;                        // the rate changes every 45 seconds
  const market = { p: MKT_BASE, next: Date.now() + MKT_EVERY_MS, note: 'Sell wheat for gold.' };
  try {
    const m = JSON.parse(localStorage.getItem('market') || 'null');
    if (m && Number.isFinite(m.p)) {
      let p = Math.round(m.p);
      if (p < MKT_MIN) p = MKT_BASE;                 // old saves used a 2-9 scale: lift them to the new one
      market.p = Math.max(MKT_MIN, Math.min(MKT_MAX, p));
      if (typeof m.note === 'string') market.note = m.note.slice(0, 80);
    }
  } catch (e) {}
  const saveMarket = () => { try { localStorage.setItem('market', JSON.stringify({ p: market.p, note: market.note })); } catch (e) {} };
  const goldFor = food => Math.floor(food * market.p / 10);
  function tickMarket() {
    if (Date.now() < market.next) return false;
    market.next = Date.now() + MKT_EVERY_MS;
    const r = Math.random();
    let d;
    if (r < .08) { d = 2; market.note = 'A royal caravan wants bread \u2014 prices jump!'; }
    else if (r < .16) { d = -2; market.note = 'Granaries are full this week. Prices ease.'; }
    else {
      const pull = market.p > MKT_BASE + 2 ? -1 : market.p < MKT_BASE - 2 ? 1 : 0;   // drift back toward the good base rate
      d = [-1, 0, 1, 1][Math.floor(Math.random() * 4)] + pull;
      d = Math.max(-1, Math.min(1, d));
      market.note = d > 0 ? 'Demand is climbing \u2014 a good time to sell.' : d < 0 ? 'The crowd thins and prices ease.' : 'A steady day at the market.';
    }
    market.p = Math.max(MKT_MIN, Math.min(MKT_MAX, market.p + d));
    saveMarket();
    if (tradeBtn) { tradeBtn.classList.remove('pulse'); void tradeBtn.offsetWidth; tradeBtn.classList.add('pulse'); }
    return true;
  }
  const tradeBtn = document.getElementById('tradebtn'), tradePanel = document.getElementById('tradepanel');
  const elGold = document.getElementById('priceGold');
  const elTag = document.getElementById('priceTag');
  const elHave = document.getElementById('tradeGet'), elNote = document.getElementById('tradeNote'), elFx = document.getElementById('coinfx');
  const sell10Btn = document.getElementById('sell10'), sell50Btn = document.getElementById('sell50'), sellXBtn = document.getElementById('sellX');
  const sell10Gain = document.getElementById('sell10g'), sell50Gain = document.getElementById('sell50g');
  const sellXGain = document.getElementById('sellXg'), sellXNum = document.getElementById('sellXn');
  const harvestReadyBtn = document.getElementById('harvestReady'), harvestReadyTxt = document.getElementById('harvestReadyTxt');
  let tradeOpen = false;
  function renderTrade() {
    if (tradeBtn) tradeBtn.classList.toggle('hot', market.p >= 17);
    if (!tradePanel || !tradeOpen) return;
    const have = Math.max(0, wheatCount | 0), p = market.p;
    const need = Math.max(1, Math.ceil(population / 2));
    const readyCount = farms.filter(f => farmState(f) === 'ready').length;
    if (elGold) elGold.textContent = p;
    if (elTag) {
      elTag.textContent = p >= 18 ? 'Excellent' : p >= 15 ? 'Great' : p >= 12 ? 'Good' : 'Fair';
      elTag.className = p >= 15 ? 'great' : p <= 10 ? 'poor' : '';
    }
    if (elHave) elHave.textContent = have ? 'You have ' + have + ' wheat \u00B7 sell it for ' + goldFor(have) + ' gold' : (farmAuto ? 'Your farms harvest automatically \u2014 just sell the wheat' : 'Your granary is empty \u2014 harvest a farm');
    if (sell10Btn) { sell10Btn.disabled = have < 10; if (sell10Gain) sell10Gain.textContent = '+' + goldFor(10) + 'g'; }
    if (sell50Btn) { sell50Btn.disabled = have < 50; if (sell50Gain) sell50Gain.textContent = '+' + goldFor(50) + 'g'; }
    if (sellXBtn) {
      sellXBtn.disabled = have <= 0;
      if (sellXNum) sellXNum.textContent = have;
      if (sellXGain) sellXGain.textContent = '+' + goldFor(have) + 'g';
    }
    if (harvestReadyBtn) {
      harvestReadyBtn.style.display = readyCount > 0 && !farmAuto ? 'flex' : 'none';
      if (harvestReadyTxt) harvestReadyTxt.textContent = 'Harvest ' + readyCount + ' ready farm' + (readyCount === 1 ? '' : 's') + ' (+' + (readyCount * WHEAT_PER_HARVEST) + ' wheat)';
    }
    if (elNote) elNote.textContent = 'Villagers eat ' + need + ' wheat every 20s.' + (farmAuto ? ' Your farms harvest for you.' : '');
  }
  function coinBurst(n) {
    if (!elFx || !ICON.coin) return;
    const count = Math.max(6, Math.min(18, n + 5));
    for (let i = 0; i < count; i++) {
      const d = document.createElement('div'); d.className = 'cf'; d.innerHTML = ICON.coin;
      d.style.setProperty('--dx', (Math.random() * 160 - 80).toFixed(0) + 'px');
      d.style.setProperty('--dy', (-80 - Math.random() * 90).toFixed(0) + 'px');
      d.style.setProperty('--rot', (Math.random() * 360 - 180).toFixed(0) + 'deg');
      d.style.animationDelay = (i * 28) + 'ms';
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
    coinBurst(gain);
    renderTrade();
    const deal = market.p >= 17 ? ' Excellent deal!' : market.p <= 10 ? ' Prices are low today.' : '';
    toast('Sold ' + food + ' wheat for ' + gain + ' gold.' + deal);
  }
  function setTradeOpen(open) {
    tradeOpen = !!open;
    if (tradePanel) { tradePanel.style.display = tradeOpen ? 'block' : 'none'; tradePanel.setAttribute('aria-hidden', tradeOpen ? 'false' : 'true'); }
    if (tradeBtn) tradeBtn.classList.toggle('open', tradeOpen);
    if (tradeOpen) { if (buildPanel) { buildPanel.style.display = 'none'; buildBtn.classList.remove('open'); } if (window.woodHut) window.woodHut.close(); renderTrade(); }
  }
  if (tradeBtn) tradeBtn.addEventListener('click', () => setTradeOpen(!tradeOpen));
  const tradeCancel = document.getElementById('tradeCancel');
  if (tradeCancel) tradeCancel.addEventListener('click', () => setTradeOpen(false));
  if (sell10Btn) sell10Btn.addEventListener('click', () => sellFood(Math.min(10, wheatCount)));
  if (sell50Btn) sell50Btn.addEventListener('click', () => sellFood(Math.min(50, wheatCount)));
  if (sellXBtn) sellXBtn.addEventListener('click', () => sellFood(wheatCount));
  if (harvestReadyBtn) harvestReadyBtn.addEventListener('click', harvestAllReady);
  setInterval(() => { tickMarket(); renderTrade(); }, 1000);
  renderTrade();
  window.addEventListener('pointerdown', e => {
    if (tradeOpen && tradePanel && !tradePanel.contains(e.target) && tradeBtn && !tradeBtn.contains(e.target)) setTradeOpen(false);
  }, true);
  function focusFarm(f) { if (!f) return; const ctr = farmCenter(f); cpx = ctr[0]; cpy = ctr[1]; clampCam(); }
  const farmUpBuy = document.getElementById('farmUpBuy');
  function renderFarmUpgrade() {
    if (!farmUpBuy) return;
    const show = farms.length > 0 && !farmAuto;            // no new structure: the upgrade sits on the farm card
    farmUpBuy.hidden = !show;
    if (!show) return;
    farmUpBuy.title = 'Workers harvest every farm for you; you only sell';
    if (gold < FARM_UPGRADE_COST) { farmUpBuy.textContent = 'Upgrade all farms \u00B7 need ' + FARM_UPGRADE_COST + 'g'; farmUpBuy.disabled = true; }
    else { farmUpBuy.textContent = 'Upgrade all farms \u00B7 ' + FARM_UPGRADE_COST + 'g'; farmUpBuy.disabled = false; }
  }
  function buyFarmUpgrade() {
    if (farmAuto) return;
    if (!farms.length) { toast('Build a farm first'); return; }
    if (gold < FARM_UPGRADE_COST) { toast('You need ' + FARM_UPGRADE_COST + ' gold to upgrade the farms'); return; }
    if (!spendGold(FARM_UPGRADE_COST)) return;
    farmAuto = true;
    try { localStorage.setItem('farmAuto', '1'); } catch (e) {}
    renderBuild(); renderTrade(); refreshWheatHud();
    toast('All farms upgraded \u2014 they harvest automatically now');
  }
  function renderBuild() {
    const btn = document.getElementById('farmBuy'), info = document.getElementById('farmInfo');
    const nextGrow = farmsBuilt === 0 ? FIRST_FARM_GROW_SEC : FARM_GROW_SEC;
    info.textContent = 'Ready in ' + nextGrow + 's \u00B7 ' + WHEAT_PER_HARVEST + ' wheat' + (farmAuto ? ' \u00B7 auto' : '');
    if (placing) { btn.textContent = 'Placing\u2026'; btn.disabled = true; btn.title = ''; }
    else if (gold < FARM_COST) { btn.textContent = 'Need ' + FARM_COST + ' gold'; btn.disabled = true; btn.title = 'Sell wheat at the market for gold'; }
    else { btn.textContent = 'Build \u00B7 ' + FARM_COST + 'g'; btn.disabled = false; btn.title = ''; }
    renderFarmUpgrade();
    if (typeof renderWoodHutBuild === 'function') renderWoodHutBuild();
  }
  function startPlacing() {
    if (placing || movingFarm || (typeof movingHut !== 'undefined' && movingHut)) return;
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
    if (!f || placing || movingFarm || drag || (typeof movingHut !== 'undefined' && movingHut)) return;
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
      if (gold < FARM_COST) { toast('You need ' + FARM_COST + ' gold'); return; }
      if (!spendGold(FARM_COST)) return;
      const f = { t0: Date.now(), fast: farmsBuilt === 0, c: p.c, r: p.r, rot: p.rot };   // only the very first farm gets one quick crop
      farmsBuilt++;
      destroyFarmVisual(p);
      placing = null; barKey = '#';
      farms.push(f); claimFarmSlots(f); saveFarms(); rebuildFarm(f);
      refreshWheatHud(); setStat('wheat', ICON.wheat, 'Wheat', wheatCount); renderBuild(); focusFarm(f);
      toast(f.fast ? 'Farm built! Your first crop is quick \u2014 ready in 5s' : 'Farm built! Your villagers are heading out to plant');
    } else {
      destroyFarmVisual(p);
      placing = null; barKey = '#'; renderBuild();
    }
  }
  buildBtn.addEventListener('click', () => { setTradeOpen(false); renderBuild(); });
  document.getElementById('farmBuy').addEventListener('click', () => { if (!placing && !movingFarm) startPlacing(); });
  if (farmUpBuy) farmUpBuy.addEventListener('click', () => { if (!farmAuto) buyFarmUpgrade(); });
  if (farms.length || wheatCount) setStat('wheat', ICON.wheat, 'Wheat', wheatCount);

  // ---- on the map: green progress bar with the time (Clash-style), then a wheat bubble to tap ----
  const farmUIL = world.addChild(new PX.Container());
  const floaters = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  const wheatTexBig = PX.Texture.from(ART.iconData('wheat', 192));
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
      ui.barBox.visible = show && st === 'growing'; ui.bubble.visible = show && st === 'ready' && !farmAuto;
      const [fx, fy] = farmCenter(f);
      if (ui.barBox.visible) {
        const bw = 118, bh = 20, bx = fx - bw / 2, bt = fy - 72, left = Math.max(0, Math.ceil(farmGrowSec(f) * (1 - p)));
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
      if (farmAuto && st === 'ready' && f !== movingF) collectFarm(f, { silent: true, quiet: !show });   // the upgrade picks it so the player only sells
    }
    const now = performance.now();
    for (let i = floaters.length - 1; i >= 0; i--) {                       // "+10 wheat" floating up
      const f = floaters[i], a = (now - f.t0) / 1500;
      if (a >= 1) { farmUIL.removeChild(f.txt); f.txt.destroy(); floaters.splice(i, 1); continue; }
      f.txt.alpha = 1 - a; f.txt.position.set(f.x, f.y - 30 - a * 60);
    }
  }
  function collectFarm(f, opts) {
    if (farmState(f) !== 'ready') return false;
    wheatCount += WHEAT_PER_HARVEST; f.fast = false; f.t0 = Date.now(); if (f.ui) f.ui.barSec = -1; saveFarms();   // collecting ends the quick first crop; every replant takes 15s
    setStat('wheat', ICON.wheat, 'Wheat', wheatCount); refreshWheatHud();
    if (!opts || !opts.quiet) {
      const [fx, fy] = farmCenter(f);
      const t = new PX.Text('+' + WHEAT_PER_HARVEST + ' wheat', { fontFamily: 'system-ui, sans-serif', fontWeight: '800', fontSize: 36, fill: 0xfff3b0, stroke: 0x3c2305, strokeThickness: 8, lineJoin: 'round' });
      t.anchor.set(.5); t.scale.set(.5); t.resolution = 2; farmUIL.addChild(t); floaters.push({ t0: performance.now(), txt: t, x: fx, y: fy });
    }
    if (!opts || !opts.silent) toast('Collected ' + WHEAT_PER_HARVEST + ' wheat');
    return true;
  }
  function harvestAllReady() {
    const ready = farms.filter(f => farmState(f) === 'ready');
    if (!ready.length) { toast('No farms are ready yet'); return; }
    for (const f of ready) collectFarm(f, { silent: true });
    const total = ready.length * WHEAT_PER_HARVEST;
    toast('Harvested ' + ready.length + ' farm' + (ready.length === 1 ? '' : 's') + ' for +' + total + ' food');
    renderTrade();
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
      if (typeof updateHomeUpgrade === 'function') updateHomeUpgrade(time);
      updateOverlay(time);
      app.renderer.render(app.stage);
    } catch (e) { if (!frame.err) { frame.err = 1; console.error('frame error', e); try { hint.textContent = 'Error: ' + (e && e.message || e); hint.style.opacity = 1; hint.style.color = '#ffb0a8'; } catch (_) {} } }
  }

  let loaded = 0;
  const bootTotal = BLK.length + TRE.length;
  const ready = () => {
    if (window.BootScreen) window.BootScreen.progress(loaded / bootTotal);
    if (++loaded < bootTotal || started) return; started = true;
    const mm = PX.MIPMAP_MODES ? { mipmap: PX.MIPMAP_MODES.ON } : undefined;      // smooth when zoomed out
    [...BLK, ...TRE].forEach(a => { a.tex = PX.Texture.from(a.im, mm); });
    shadowTex = radialTex('20,70,6', .42, 64); glowTex = radialTex('255,225,120', .9, 64);
    growForest();
    buildGround(); buildTrees(); farms.forEach(rebuildFarm);
    if (typeof initWoodHutWorld === 'function') initWoodHutWorld();   // 14: apply the saved hut grove to the fresh forest
    syncVillagers();
    resize();
    // whole clearing diamond fits on screen
    const dw = (HALF_W * 2 + HALF_H * 2) * IX + 160, dh = (HALF_W * 2 + HALF_H * 2) * IY + 200;
    zoom = Math.min(cw / dw, ch / dh);
    cpx = projX(spawn.x, spawn.y); cpy = projY(spawn.x, spawn.y); clampCam();
    requestAnimationFrame(frame);
    if (window.BootScreen) window.BootScreen.done();
    window.game = { setStat, setPopulation, villagers, occ, slot, cam: () => ({ cpx, cpy, zoom }), spawn, clearing, trees, farms, gold: () => gold, setGold, placing: () => placing, WORLD_W, WORLD_H, CELL, projX, projY, unprojX, unprojY };   // hooks for the next step
  };
  [...BLK, ...TRE].forEach(a => { a.im.onload = ready; if (a.im.complete && a.im.naturalWidth) ready(); });

