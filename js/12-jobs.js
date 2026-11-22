  // ---------- work: villagers choose their own jobs ----------
  // One farmer per field, then a few woodcutters, everyone else rests. No menus, no counters to babysit.
  const ROLE_IDLE = 'idle', ROLE_FARM = 'farmer', ROLE_WOOD = 'woodcutter';
  let roles = [];
  const saveRoles = () => { try { localStorage.setItem('roles', JSON.stringify(roles)); } catch (e) {} };
  const countRole = role => { let n = 0; for (const r of roles) if (r === role) n++; return n; };
  const cutterCap = () => 3 + (typeof woodHut !== 'undefined' && woodHut && woodHut.owned ? 2 : 0);
  const idleCount = () => countRole(ROLE_IDLE);
  const farmerCount = () => countRole(ROLE_FARM);
  const cutterCount = () => countRole(ROLE_WOOD);

  function releaseCutter(v) {
    if (!v) return;
    if (v.cut) { v.cut.claim = null; v.cut = null; }
    if (v.st === 'toTree' || v.st === 'chop' || v.st === 'carryWood' || v.st === 'cutterRest') {
      v.st = 'idle'; v.walking = false; v.mv = 0;
      v.carry = v.carry0 === undefined ? v.carry : v.carry0;
    }
  }

  // fields first (one hand each), then the woods, then idle — recomputed whenever the village changes
  function desiredRoles(n) {
    const farmN = typeof farms !== 'undefined' ? farms.length : 0;
    const farmers = Math.min(n, farmN);
    const cutters = Math.min(cutterCap(), Math.max(0, n - farmers));
    const out = [];
    for (let i = 0; i < n; i++) out.push(i < farmers ? ROLE_FARM : i < farmers + cutters ? ROLE_WOOD : ROLE_IDLE);
    return out;
  }

  function applyJobs() {
    if (typeof villagers === 'undefined') return;
    const n = villagers.length;
    const want = desiredRoles(n);
    let changed = roles.length !== n;
    if (changed) roles.length = n;
    for (let i = 0; i < n; i++) {
      const v = villagers[i], old = roles[i] || ROLE_IDLE, role = want[i];
      if (old !== role) {
        if (old === ROLE_WOOD) releaseCutter(v);                         // leaving the axe: drop any tree claim
        if (role === ROLE_WOOD && v.st === 'inside') v.ti = Math.min(v.ti, .6);   // a new cutter heads out promptly
        changed = true;
      }
      roles[i] = role;
      v.role = role; v.job = role === ROLE_FARM; v.wi = i;
    }
    if (changed) saveRoles();
  }

  // farms run at full speed with a farmer each, half speed with none. The 09 hook reads this.
  function farmCrewSpeed(f) {
    if (typeof farms === 'undefined') return 1;
    const n = Math.max(1, farms.length);
    const crew = Math.min(1, farmerCount() / n);
    const hungry = typeof wheatCount === 'number' && wheatCount <= 0 ? .75 : 1;
    return (0.5 + 0.5 * crew) * hungry;
  }

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

  setInterval(() => { tickGrowth(); refreshHunger(); }, 1200);
  applyJobs(); refreshHunger();
  window.jobs = { roles, apply: applyJobs, cap: cutterCap, crew: farmCrewSpeed, cutters: cutterCount, idle: idleCount };
