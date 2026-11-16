  // ---------- jobs: the player decides who farms and who cuts wood ----------
  const ROLE_IDLE = 'idle', ROLE_FARM = 'farmer', ROLE_WOOD = 'woodcutter';
  let roles = [];
  try {
    const r = JSON.parse(localStorage.getItem('roles') || 'null');
    if (Array.isArray(r)) roles = r.filter(x => x === ROLE_FARM || x === ROLE_WOOD || x === ROLE_IDLE);
  } catch (e) {}
  let rolesSeeded = roles.length > 0;
  const saveRoles = () => { try { localStorage.setItem('roles', JSON.stringify(roles)); } catch (e) {} };
  const countRole = role => { let n = 0; for (const r of roles) if (r === role) n++; return n; };
  const cutterCap = () => 2 + (typeof lumberCamp !== 'undefined' && lumberCamp ? 2 : 0);
  const idleCount = () => countRole(ROLE_IDLE);
  const farmerCount = () => countRole(ROLE_FARM);

  function releaseCutter(v) {
    if (!v) return;
    if (v.cut) { v.cut.claim = null; v.cut = null; }
    if (v.st === 'toTree' || v.st === 'chop' || v.st === 'carryWood' || v.st === 'cutterRest') {
      v.st = 'idle'; v.walking = false; v.mv = 0;
      v.carry = v.carry0 === undefined ? v.carry : v.carry0;
    }
  }

  function applyJobs() {
    if (typeof villagers === 'undefined') return;
    if (!rolesSeeded) {
      rolesSeeded = true;
      roles = villagers.map((v, i) => i < 4 ? ROLE_FARM : ROLE_IDLE);   // keep the old feel before the player touches anything
      saveRoles();
    }
    let changed = false;
    while (roles.length < villagers.length) { roles.push(ROLE_IDLE); changed = true; }
    if (roles.length > villagers.length) { roles.length = villagers.length; changed = true; }
    const cap = cutterCap();
    let cut = countRole(ROLE_WOOD);
    if (cut > cap) {
      for (let i = roles.length - 1; i >= 0 && cut > cap; i--) {
        if (roles[i] === ROLE_WOOD) { roles[i] = ROLE_IDLE; cut--; changed = true; releaseCutter(villagers[i]); }
      }
    }
    for (let i = 0; i < villagers.length; i++) {
      const v = villagers[i], role = roles[i] || ROLE_IDLE;
      if (v.role !== role && role === ROLE_WOOD && v.st === 'inside') v.ti = Math.min(v.ti, .6);   // a new cutter heads out promptly
      v.role = role; v.job = role === ROLE_FARM; v.wi = i;
    }
    if (changed) saveRoles();
  }

  // farms run at full speed with a farmer each, half speed with none. The 09 hook reads this.
  function farmCrewSpeed() {
    if (typeof farms === 'undefined') return 1;
    const n = Math.max(1, farms.length);
    const crew = Math.min(1, farmerCount() / n);
    const buff = (typeof wellFedActive === 'function' && wellFedActive()) ? 1.25 : 1;
    const hungry = typeof wheatCount === 'number' && wheatCount <= 0 ? .75 : 1;
    return (0.5 + 0.5 * crew) * buff * hungry;
  }

  // ---- the forest is cleared: the huts are the woodcutters' home ----
  let campG = null;
  function drawLumberCamp() {
    if (!lumberCamp || campG) return;
    const x = clearing.x1 - 190, y = clearing.y0 + 170;
    const px = projX(x, y), py = projY(x, y);
    campG = farmL.addChild(new PX.Container());
    campG.position.set(px, py); campG.scale.set(1.75);
    const g = campG.addChild(new PX.Graphics());
    g.beginFill(0x000000, .18); g.drawEllipse(0, 8, 74, 26); g.endFill();
    // stacked logs (the camp's little stock)
    for (let i = 0; i < 3; i++) {
      const yy = 2 - i * 6, w = 44 - i * 5;
      g.beginFill(0x3a220c); g.drawRoundedRect(-62, yy + 2, w, 8, 4); g.endFill();
      g.beginFill(i % 2 ? 0x7a4a22 : 0x8b5a2b); g.drawRoundedRect(-62, yy, w, 9, 4.5); g.endFill();
      g.beginFill(0xc79a5e); g.drawEllipse(-62 + w - 4, yy + 4.5, 5, 4); g.endFill();
    }
    // open-fronted timber shelter
    g.beginFill(0x5a3a1c); g.drawRoundedRect(-34, -34, 68, 42, 7); g.endFill();
    g.beginFill(0x2a1708); g.drawRoundedRect(-27, -27, 54, 33, 5); g.endFill();
    g.beginFill(0xb08a52); g.drawRoundedRect(-34, -40, 68, 9, 4); g.endFill();
    g.beginFill(0x8a5a2f); g.drawPolygon([-46, -40, 0, -68, 46, -40]); g.endFill();
    g.beginFill(0x5a3417); g.drawPolygon([-40, -41, 0, -64, 40, -41]); g.endFill();
    g.beginFill(0x6b4519); g.drawRect(-4, -66, 8, 10); g.endFill();
    // axe in the stump
    g.beginFill(0x4a2c0e); g.drawRoundedRect(40, -4, 18, 16, 4); g.endFill();
    g.beginFill(0x8a5a2f); g.drawRoundedRect(41, -5, 16, 6, 3); g.endFill();
    g.lineStyle({ width: 3, color: 0x6b4519, cap: 'round' }); g.moveTo(49, -2); g.lineTo(58, -20);
    g.lineStyle({ width: 1.5, color: 0x2f1d0c }); g.moveTo(53, -15); g.lineTo(63, -15);
  }
  function buildLumberCamp() {
    if (typeof lumberCamp === 'undefined' || lumberCamp) return false;
    if (gold < CAMP_COST) { toast('You need ' + CAMP_COST + ' gold for the woodcutter huts'); return false; }
    if ((typeof woodCount === 'number' ? woodCount : 0) < CAMP_WOOD) { toast('You need ' + CAMP_WOOD + ' wood for the woodcutter huts'); return false; }
    if (!spendGold(CAMP_COST)) return false;
    if (typeof spendWood === 'function') spendWood(CAMP_WOOD);
    lumberCamp = 1; saveCamp(); drawLumberCamp();
    if (typeof renderBuild === 'function') renderBuild();
    renderJobs();
    toast('Woodcutter Huts built! Logs are dropped here and two more cutters can work');
    return true;
  }

  // ---- HUD: villagers button + jobs sheet ----
  const jobsBtn = document.createElement('button');
  jobsBtn.id = 'villagebtn'; jobsBtn.type = 'button'; jobsBtn.setAttribute('aria-label', 'Villagers and jobs');
  jobsBtn.innerHTML = '<span class="vb-ico"></span><b class="vb-badge" id="idleBadge">0</b>';
  jobsBtn.querySelector('.vb-ico').innerHTML = ICON.villager;
  hud.appendChild(jobsBtn);

  const jobsPanel = document.createElement('div');
  jobsPanel.id = 'jobspanel'; jobsPanel.setAttribute('aria-hidden', 'true');
  jobsPanel.innerHTML =
    '<div class="jp-head"><span class="jp-title">Villagers</span><span class="jp-sub" id="jpSub"></span><button class="jp-x" id="jpClose" type="button" aria-label="Close">&#10005;</button></div>' +
    '<div class="jp-row"><span class="jp-ic" id="jpFarmIco"></span><div class="jp-mid"><b>Farmers</b><small id="jpFarmSub"></small></div>' +
      '<button class="jp-step" data-role="farmer" data-dir="-1" type="button">&#8722;</button><b class="jp-n" id="jpFarmN">0</b><button class="jp-step" data-role="farmer" data-dir="1" type="button">+</button></div>' +
    '<div class="jp-row"><span class="jp-ic" id="jpWoodIco"></span><div class="jp-mid"><b>Woodcutters</b><small id="jpWoodSub"></small></div>' +
      '<button class="jp-step" data-role="woodcutter" data-dir="-1" type="button">&#8722;</button><b class="jp-n" id="jpWoodN">0</b><button class="jp-step" data-role="woodcutter" data-dir="1" type="button">+</button></div>' +
    '<div class="jp-idle"><span class="jp-ic" id="jpIdleIco"></span><div class="jp-mid"><b>Idle</b><small>waiting for a job</small></div><b class="jp-n" id="jpIdleN">0</b></div>' +
    '<div id="jpNote"></div>' +
    '<button id="jpAuto" type="button">Auto-assign</button>';
  hud.appendChild(jobsPanel);

  const jpFarmIco = document.getElementById('jpFarmIco'), jpWoodIco = document.getElementById('jpWoodIco'), jpIdleIco = document.getElementById('jpIdleIco');
  if (jpFarmIco) jpFarmIco.innerHTML = ICON.wheat;
  if (jpWoodIco) jpWoodIco.innerHTML = WOOD_SVG;
  if (jpIdleIco) jpIdleIco.innerHTML = ICON.villager;
  const jpFarmMinus = document.querySelector('.jp-step[data-role="farmer"][data-dir="-1"]');
  const jpFarmPlus = document.querySelector('.jp-step[data-role="farmer"][data-dir="1"]');
  const jpWoodMinus = document.querySelector('.jp-step[data-role="woodcutter"][data-dir="-1"]');
  const jpWoodPlus = document.querySelector('.jp-step[data-role="woodcutter"][data-dir="1"]');

  let jobsOpen = false, jobsRenderKey = '';
  function setJobsOpen(open) {
    jobsOpen = !!open;
    jobsPanel.style.display = jobsOpen ? 'block' : 'none';
    jobsPanel.setAttribute('aria-hidden', jobsOpen ? 'false' : 'true');
    jobsBtn.classList.toggle('open', jobsOpen);
    if (jobsOpen) {
      if (typeof setTradeOpen === 'function') setTradeOpen(false);
      if (typeof closeHomePanel === 'function') closeHomePanel();
      if (typeof buildPanel !== 'undefined' && buildPanel) { buildPanel.style.display = 'none'; buildBtn.classList.remove('open'); }
      renderJobs();
    }
  }
  function renderJobs() {
    if (!jobsPanel) return;
    applyJobs();
    const nFarm = countRole(ROLE_FARM), nWood = countRole(ROLE_WOOD), nIdle = countRole(ROLE_IDLE);
    const nFarms = typeof farms !== 'undefined' ? farms.length : 0, cap = cutterCap();
    const key = [nFarm, nWood, nIdle, nFarms, cap, population, lumberCamp ? 1 : 0].join('|');
    if (key !== jobsRenderKey) {
      jobsRenderKey = key;
      const farmN = document.getElementById('jpFarmN'), woodN = document.getElementById('jpWoodN'), idleN = document.getElementById('jpIdleN');
      if (farmN) farmN.textContent = nFarm; if (woodN) woodN.textContent = nWood; if (idleN) idleN.textContent = nIdle;
      const farmSub = document.getElementById('jpFarmSub'); if (farmSub) farmSub.textContent = nFarms ? nFarm + ' of ' + nFarms + ' farms staffed' : 'No farms yet';
      const woodSub = document.getElementById('jpWoodSub');
      if (woodSub) woodSub.textContent = nWood + ' of ' + cap + ' slots' + (cap < 4 ? ' · huts add 2' : ' · huts built');
      const sub = document.getElementById('jpSub'); if (sub) sub.textContent = population + ' villagers';
      const note = document.getElementById('jpNote');
      if (note) note.textContent = (nWood === 0 && nIdle === 0) ? 'No idle hands \u2014 take a farmer off the fields to cut wood.'
        : (nFarms && nFarm < nFarms) ? 'Farms without a farmer grow at half speed.'
        : (nWood >= cap ? 'Build Woodcutter Huts to hire more woodcutters.' : '');
    }
    if (jpFarmMinus) jpFarmMinus.disabled = nFarm <= 0;
    if (jpFarmPlus) jpFarmPlus.disabled = nIdle <= 0;
    if (jpWoodMinus) jpWoodMinus.disabled = nWood <= 0;
    if (jpWoodPlus) jpWoodPlus.disabled = nWood >= cap || nIdle <= 0;
    const badge = document.getElementById('idleBadge');
    if (badge) { badge.textContent = nIdle; badge.style.display = nIdle ? 'flex' : 'none'; }
  }
  function bumpRole(role, dir) {
    applyJobs();
    if (dir > 0) {
      if (role === ROLE_WOOD && countRole(ROLE_WOOD) >= cutterCap()) { toast('Build Woodcutter Huts to hire more woodcutters'); return; }
      const idx = roles.indexOf(ROLE_IDLE);
      if (idx < 0) { toast('Everyone already has a job'); return; }
      roles[idx] = role;
    } else {
      let idx = -1;
      for (let i = roles.length - 1; i >= 0; i--) if (roles[i] === role) { idx = i; break; }
      if (idx < 0) return;
      roles[idx] = ROLE_IDLE;
      releaseCutter(villagers[idx]);
    }
    saveRoles(); applyJobs(); jobsRenderKey = ''; renderJobs();
  }
  function autoJobs() {
    applyJobs();
    const nFarms = typeof farms !== 'undefined' ? farms.length : 0, cap = cutterCap();
    for (const v of villagers) if (v.role === ROLE_WOOD) releaseCutter(v);
    roles = roles.map(() => ROLE_IDLE);
    let f = 0, c = 0;
    for (let i = 0; i < roles.length; i++) {
      if (f < nFarms) { roles[i] = ROLE_FARM; f++; }
      else if (c < cap) { roles[i] = ROLE_WOOD; c++; }
    }
    saveRoles(); applyJobs(); jobsRenderKey = ''; renderJobs();
    toast('Jobs assigned');
  }
  jobsBtn.addEventListener('click', () => setJobsOpen(!jobsOpen));
  const jpClose = document.getElementById('jpClose'); if (jpClose) jpClose.addEventListener('click', () => setJobsOpen(false));
  const jpAuto = document.getElementById('jpAuto'); if (jpAuto) jpAuto.addEventListener('click', autoJobs);
  jobsPanel.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('.jp-step') : null;
    if (b) bumpRole(b.dataset.role, +b.dataset.dir);
  });
  window.addEventListener('pointerdown', e => {
    if (jobsOpen && !jobsPanel.contains(e.target) && !jobsBtn.contains(e.target)) setJobsOpen(false);
  }, true);

  // ---- hunger: a visible state, not a two second toast ----
  const hungerBar = document.createElement('div');
  hungerBar.id = 'hungerbar';
  hungerBar.innerHTML = '<b>Your villagers are hungry</b><span>Harvest food — work is slower until they eat</span>';
  hud.appendChild(hungerBar);
  const isHungry = () => typeof wheatCount === 'number' && wheatCount <= 0;
  let hungerShown = false;
  function refreshHunger() {
    const on = isHungry();
    if (on === hungerShown) return;
    hungerShown = on;
    hungerBar.classList.toggle('on', on);
  }

  // ---- natural growth: a slow trickle when the village is fed and has room ----
  const GROW_EVERY_MS = 120000;
  let nextGrowAt = 0;
  try { nextGrowAt = parseInt(localStorage.getItem('nextGrowAt'), 10) || 0; } catch (e) {}
  const saveGrow = () => { try { localStorage.setItem('nextGrowAt', nextGrowAt); } catch (e) {} };
  function tickGrowth() {
    const now = Date.now();
    const cap = typeof homeCap === 'function' ? homeCap() : population;
    if (population >= cap) { if (nextGrowAt) { nextGrowAt = 0; saveGrow(); } return; }
    if (isHungry()) { nextGrowAt = now + GROW_EVERY_MS; saveGrow(); return; }
    const need = Math.max(1, Math.ceil(population / 2));
    if (typeof wheatCount === 'number' && wheatCount < need * 3) return;   // only grow with a real surplus
    if (!nextGrowAt) { nextGrowAt = now + GROW_EVERY_MS; saveGrow(); return; }
    if (now < nextGrowAt) return;
    nextGrowAt = now + GROW_EVERY_MS; saveGrow();
    if (typeof setPopulation === 'function') setPopulation(population + 1);
    toast('A newcomer joined your village');
  }

  drawLumberCamp();
  setInterval(() => {
    tickGrowth(); refreshHunger();
    if (jobsOpen) renderJobs(); else { const b = document.getElementById('idleBadge'); if (b) { const n = idleCount(); b.textContent = n; b.style.display = n ? 'flex' : 'none'; } }
  }, 1200);
  applyJobs(); jobsRenderKey = ''; refreshHunger();

  window.jobs = { roles, apply: applyJobs, set: bumpRole, auto: autoJobs, cap: cutterCap, crew: farmCrewSpeed, open: () => setJobsOpen(true) };
