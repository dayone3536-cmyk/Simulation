// ---------- weapons: bow and crossbow crafted from wood ----------
const BOW_WOOD_COST = 15;        // wood logs required
const CROSSBOW_WOOD_COST = 35;   // wood logs required

let bowOwned = false;
let crossbowOwned = false;

try {
  bowOwned = localStorage.getItem('bowOwned') === '1';
  crossbowOwned = localStorage.getItem('crossbowOwned') === '1';
} catch (e) {}

function saveWeapons() {
  try {
    localStorage.setItem('bowOwned', bowOwned ? '1' : '0');
    localStorage.setItem('crossbowOwned', crossbowOwned ? '1' : '0');
  } catch (e) {}
}

// ---- DOM elements ----
const bowIconEl = document.getElementById('bowIcon');
const crossbowIconEl = document.getElementById('crossbowIcon');
const bowInfoEl = document.getElementById('bowInfo');
const crossbowInfoEl = document.getElementById('crossbowInfo');
const bowBuyEl = document.getElementById('bowBuy');
const crossbowBuyEl = document.getElementById('crossbowBuy');

// ---- tab switching ----
const tabStructures = document.getElementById('tabStructures');
const tabWeapons = document.getElementById('tabWeapons');
const panelStructures = document.getElementById('panelStructures');
const panelWeapons = document.getElementById('panelWeapons');

function switchBuildTab(tab) {
  const isWeapons = tab === 'weapons';
  tabStructures.classList.toggle('active', !isWeapons);
  tabWeapons.classList.toggle('active', isWeapons);
  tabStructures.setAttribute('aria-selected', !isWeapons);
  tabWeapons.setAttribute('aria-selected', isWeapons);
  panelStructures.hidden = isWeapons;
  panelWeapons.hidden = !isWeapons;
}

if (tabStructures && tabWeapons) {
  tabStructures.addEventListener('click', () => switchBuildTab('structures'));
  tabWeapons.addEventListener('click', () => switchBuildTab('weapons'));
}

// ---- initialize icons ----
function initWeaponIcons() {
  if (bowIconEl && typeof ART !== 'undefined') {
    bowIconEl.innerHTML = ART.icon('bow', 58);
  }
  if (crossbowIconEl && typeof ART !== 'undefined') {
    crossbowIconEl.innerHTML = ART.icon('crossbow', 58);
  }
}

// ---- helper to get current wood count ----
function getWoodCount() {
  return (window.wood && typeof window.wood.count === 'function') ? window.wood.count() : 0;
}

// ---- helper to spend wood ----
function spendWood(n) {
  return (window.wood && typeof window.wood.spend === 'function') ? window.wood.spend(n) : false;
}

// ---- render weapon build cards ----
function renderWeapons() {
  if (!bowBuyEl || !crossbowBuyEl) return;

  const wood = getWoodCount();

  // Bow
  if (bowOwned) {
    bowInfoEl.textContent = 'Crafted \u00B7 Equipped by hunters';
    bowBuyEl.textContent = 'Crafted';
    bowBuyEl.disabled = true;
    bowBuyEl.title = '';
  } else {
    const canAfford = wood >= BOW_WOOD_COST;
    bowInfoEl.textContent = 'A simple wooden bow for hunting and defense.';
    bowBuyEl.textContent = canAfford ? 'Craft \u00B7 ' + BOW_WOOD_COST + ' wood' : 'Need ' + BOW_WOOD_COST + ' wood';
    bowBuyEl.disabled = !canAfford;
    bowBuyEl.title = canAfford ? '' : 'Chop more trees to gather wood';
  }

  // Crossbow
  if (crossbowOwned) {
    crossbowInfoEl.textContent = 'Crafted \u00B7 Equipped by elite guards';
    crossbowBuyEl.textContent = 'Crafted';
    crossbowBuyEl.disabled = true;
    crossbowBuyEl.title = '';
  } else {
    const canAfford = wood >= CROSSBOW_WOOD_COST;
    crossbowInfoEl.textContent = 'A powerful mechanical bow. Requires more wood and skill.';
    crossbowBuyEl.textContent = canAfford ? 'Craft \u00B7 ' + CROSSBOW_WOOD_COST + ' wood' : 'Need ' + CROSSBOW_WOOD_COST + ' wood';
    crossbowBuyEl.disabled = !canAfford;
    crossbowBuyEl.title = canAfford ? '' : 'Chop more trees to gather wood';
  }
}

// ---- purchase handlers ----
function buyBow() {
  if (bowOwned) return;
  const wood = getWoodCount();
  if (wood < BOW_WOOD_COST) {
    if (typeof toast === 'function') toast('You need ' + BOW_WOOD_COST + ' wood to craft a bow');
    return;
  }
  if (!spendWood(BOW_WOOD_COST)) return;
  bowOwned = true;
  saveWeapons();
  renderWeapons();
  if (typeof toast === 'function') toast('Bow crafted! Your hunters are now armed');
}

function buyCrossbow() {
  if (crossbowOwned) return;
  const wood = getWoodCount();
  if (wood < CROSSBOW_WOOD_COST) {
    if (typeof toast === 'function') toast('You need ' + CROSSBOW_WOOD_COST + ' wood to craft a crossbow');
    return;
  }
  if (!spendWood(CROSSBOW_WOOD_COST)) return;
  crossbowOwned = true;
  saveWeapons();
  renderWeapons();
  if (typeof toast === 'function') toast('Crossbow crafted! Elite guards now patrol the village');
}

if (bowBuyEl) bowBuyEl.addEventListener('click', buyBow);
if (crossbowBuyEl) crossbowBuyEl.addEventListener('click', buyCrossbow);

// ---- hook into build panel open ----
const originalSetBuildOpen = window.setBuildOpen;
window.setBuildOpen = function(o) {
  if (originalSetBuildOpen) originalSetBuildOpen(o);
  if (o) {
    initWeaponIcons();
    renderWeapons();
  }
};

// also refresh when wood changes
const originalRefreshWoodHud = window.wood?.refresh;
if (window.wood) {
  window.wood.refresh = function() {
    if (originalRefreshWoodHud) originalRefreshWoodHud();
    renderWeapons();
  };
}

// expose for console
window.weapons = {
  bow: () => bowOwned,
  crossbow: () => crossbowOwned,
  giveBow: () => { bowOwned = true; saveWeapons(); renderWeapons(); },
  giveCrossbow: () => { crossbowOwned = true; saveWeapons(); renderWeapons(); },
  reset: () => { bowOwned = false; crossbowOwned = false; saveWeapons(); renderWeapons(); }
};

// initial render if panel is already open
if (document.getElementById('buildpanel')?.style.display === 'block') {
  initWeaponIcons();
  renderWeapons();
}