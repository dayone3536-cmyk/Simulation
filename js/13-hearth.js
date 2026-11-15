  // ---------- the Hearth: the village feast. The heartbeat that turns surplus into people ----------
  const FEAST_COOK_MS = 60000;      // cooking time
  const FEAST_COOL_MS = 180000;     // cooldown after the feast
  const FEAST_BUFF_MS = 120000;     // Well Fed duration
  const FLAME_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 6c3 10 14 13 14 26a14 14 0 0 1-28 0c0-8 5-12 8-18 1 5 3 7 5 8 2-5 1-11 1-16z" fill="#ffb347" stroke="#8a3b08" stroke-width="2.5" stroke-linejoin="round"/><path d="M32 27c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-8 1 2 2 3 3 3 0-2 0-4 0-6z" fill="#ffe27a" opacity=".95"/><path d="M13 53h38" stroke="#6b4519" stroke-width="4" stroke-linecap="round"/></svg>';

  const readNum = k => { try { return parseInt(localStorage.getItem(k), 10) || 0; } catch (e) { return 0; } };
  let feastCookEnd = readNum('feastCookEnd');
  let feastReadyAt = readNum('feastReadyAt');
  let buffUntil = readNum('buffUntil');
  let spirit = readNum('spirit');
  let feastBoost = false;
  try { feastBoost = localStorage.getItem('feastBoost') === '1'; } catch (e) {}

  const saveHearth = () => {
    try {
      localStorage.setItem('feastCookEnd', feastCookEnd || 0);
      localStorage.setItem('feastReadyAt', feastReadyAt || 0);
      localStorage.setItem('buffUntil', buffUntil || 0);
      localStorage.setItem('spirit', spirit || 0);
      localStorage.setItem('feastBoost', feastBoost ? '1' : '0');
    } catch (e) {}
  };

  const feastFood = () => 20 + (population | 0);
  const feastGold = () => 10 + Math.floor((population | 0) / 2);
  function wellFedActive() { return buffUntil > Date.now(); }
  function workerRateMul() {
    let m = 1 + Math.min(.1, spirit * .02);
    if (wellFedActive()) m *= 1.25;
    return m;
  }
  const spiritTitle = n => n >= 6 ? 'Township' : n >= 3 ? 'Village' : 'Hamlet';
  function feastState() {
    const now = Date.now();
    if (feastCookEnd) return 'cooking';
    if (feastReadyAt > now) return 'cooling';
    return 'ready';
  }

  // ---- prices rise with the mood, and ease back when the mood fades ----
  function applyFeastPrice() {
    if (typeof market === 'undefined' || feastBoost) return false;
    if (market.p < 9) {
      market.p++;
      if (market.hist && market.hist.length) market.hist[market.hist.length - 1] = market.p;
      if (typeof saveMarket === 'function') saveMarket();
      return true;
    }
    return false;
  }
  function removeFeastPrice() {
    if (typeof market === 'undefined') return;
    if (market.p > 2) {
      market.p--;
      if (market.hist && market.hist.length) market.hist[market.hist.length - 1] = market.p;
      if (typeof saveMarket === 'function') saveMarket();
    }
  }

  // ---- DOM: hearth card lives in the home panel, feast banner + buff pill live in the HUD ----
  const hearthIco = document.getElementById('hearthIco');
  if (hearthIco) hearthIco.innerHTML = FLAME_SVG;
  const hearthTitle = document.getElementById('hearthTitle');
  const hearthSub = document.getElementById('hearthSub');
  const hearthBtn = document.getElementById('hearthBtn');
  const hearthBtnTxt = document.getElementById('hearthBtnTxt');
  const hearthFill = document.getElementById('hearthFill');
  const hearthProgress = document.getElementById('hearthProgress');
  const hearthSpirit = document.getElementById('hearthSpirit');
  const hearthTitleTxt = document.getElementById('hearthTitleTxt');
  const hearthCard = document.getElementById('hearthCard');

  const feastBanner = document.createElement('div');
  feastBanner.id = 'feastBanner';
  feastBanner.innerHTML = '<span class="fb-ico">' + FLAME_SVG + '</span><div class="fb-text"><b>Feast complete!</b><span id="fbSub"></span></div>';
  hud.appendChild(feastBanner);
  const buffPill = document.createElement('div');
  buffPill.id = 'buffpill';
  buffPill.innerHTML = '<span class="bf-dot"></span><span id="buffTxt">Well Fed 2:00</span>';
  hud.appendChild(buffPill);
  const buffTxt = document.getElementById('buffTxt');
  function refreshBuffPill() {
    const on = wellFedActive();
    buffPill.classList.toggle('on', on);
    if (on && buffTxt) buffTxt.textContent = 'Well Fed ' + clockLeft(buffUntil - Date.now());
  }

  let feastBannerT = 0;
  function showFeastBanner() {
    if (!feastBanner) return;
    feastBanner.classList.remove('on'); void feastBanner.offsetWidth; feastBanner.classList.add('on');
    clearTimeout(feastBannerT); feastBannerT = setTimeout(() => feastBanner.classList.remove('on'), 4500);
  }

  function spendFood(n) {
    if (typeof wheatCount !== 'number' || wheatCount < n) return false;
    wheatCount -= n;
    saveFarms();
    setStat('wheat', ICON.wheat, 'Wheat', wheatCount);
    if (typeof refreshWheatHud === 'function') refreshWheatHud();
    if (typeof renderTrade === 'function') renderTrade();
    return true;
  }
  function addGoldReward(n) {
    setGold(gold + n);
    try { localStorage.setItem('goldCache', gold); } catch (e) {}
  }

  function holdFeast() {
    if (feastState() !== 'ready') return false;
    if (population < 5) { toast('You need at least 5 villagers to hold a feast'); return false; }
    const f = feastFood(), g = feastGold();
    if (typeof wheatCount !== 'number' || wheatCount < f) { toast('You need ' + f + ' food for the feast'); return false; }
    if (gold < g) { toast('You need ' + g + ' gold for the feast'); return false; }
    if (!spendGold(g)) return false;
    spendFood(f);
    feastCookEnd = Date.now() + FEAST_COOK_MS;
    feastReadyAt = 0;
    saveHearth(); renderHearth(); armHearth();
    toast('The village is cooking a feast\u2026');
    return true;
  }

  function finishFeast(quiet) {
    if (!feastCookEnd) return;
    feastCookEnd = 0;
    const cap = typeof homeCap === 'function' ? homeCap() : population;
    let gained = 0;
    if (population < cap) {
      gained = Math.min(2, cap - population);
      if (typeof setPopulation === 'function') setPopulation(population + gained);
    }
    if (!gained) addGoldReward(25);
    spirit++;
    buffUntil = Date.now() + FEAST_BUFF_MS;
    feastReadyAt = Date.now() + FEAST_COOL_MS;
    feastBoost = applyFeastPrice();
    saveHearth();
    refreshBuffPill();
    const sub = document.getElementById('fbSub');
    if (sub) sub.textContent = gained ? ('+' + gained + ' villagers \u00b7 Well Fed 2:00') : '+25 gold \u00b7 Well Fed 2:00';
    if (!quiet) showFeastBanner();
    if (typeof spawnHomeSparks === 'function') spawnHomeSparks();
    if (typeof villagers !== 'undefined') for (const v of villagers) if (!v.wave) v.wave = 1.3;
    if (gained) toast('Feast! ' + gained + ' newcomers joined your village');
    else toast('Feast! The village is full \u2014 +25 gold instead');
    renderHearth(); armHearth();
  }

  let hearthKey = '';
  function clockLeft(ms) {
    if (typeof clockText === 'function') return clockText(ms);
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function renderHearth() {
    if (!hearthTitle) return;
    const now = Date.now(), st = feastState();
    const f = feastFood(), g = feastGold();
    const left = st === 'cooking' ? Math.max(0, feastCookEnd - now) : st === 'cooling' ? Math.max(0, feastReadyAt - now) : 0;
    const key = st + '|' + Math.ceil(left / 1000) + '|' + spirit + '|' + population + '|' + wheatCount + '|' + gold;
    if (key === hearthKey) return;
    hearthKey = key;

    const poorFood = (typeof wheatCount !== 'number' || wheatCount < f), poorGold = gold < g, tooSmall = population < 5;
    if (hearthTitleTxt) hearthTitleTxt.textContent = spiritTitle(spirit);
    if (hearthSpirit) hearthSpirit.textContent = String(spirit);
    if (hearthCard) hearthCard.classList.toggle('cooking', st === 'cooking');
    if (hearthProgress) hearthProgress.style.display = st === 'cooking' ? 'block' : 'none';
    if (hearthFill) hearthFill.style.width = st === 'cooking' ? (100 * (1 - left / FEAST_COOK_MS)).toFixed(1) + '%' : '0%';

    if (st === 'cooking') {
      hearthTitle.textContent = 'The feast is cooking';
      hearthSub.textContent = 'Ready in ' + clockLeft(left) + ' \u00b7 the whole village can smell it';
      hearthBtnTxt.textContent = clockLeft(left); hearthBtn.disabled = true;
    } else if (st === 'cooling') {
      hearthTitle.textContent = 'The hearth rests';
      hearthSub.textContent = 'A feast can be held again in ' + clockLeft(left);
      hearthBtnTxt.textContent = clockLeft(left); hearthBtn.disabled = true;
    } else {
      hearthTitle.textContent = 'Hold a feast';
      hearthSub.textContent = tooSmall ? 'You need at least 5 villagers'
        : f + ' food + ' + g + ' gold \u2192 +2 villagers \u00b7 2 min Well Fed';
      hearthBtnTxt.textContent = 'Feast';
      hearthBtn.disabled = tooSmall || poorFood || poorGold;
    }
    const sure = hearthBtn && hearthBtn.title;
    if (hearthBtn) hearthBtn.title = tooSmall ? 'Needs 5 villagers' : poorFood ? ('Need ' + (f - (wheatCount | 0)) + ' more food') : poorGold ? ('Need ' + (g - gold) + ' more gold') : '';
  }

  let hearthTimer = 0;
  function armHearth() {
    if (hearthTimer) return;
    hearthTimer = setInterval(() => {
      const now = Date.now();
      if (feastCookEnd && now >= feastCookEnd) finishFeast(false);
      if (feastBoost && !wellFedActive()) { removeFeastPrice(); feastBoost = false; saveHearth(); }
      renderHearth();
      refreshBuffPill();
    }, 500);
  }

  if (hearthBtn) hearthBtn.addEventListener('click', holdFeast);
  if (wellFedActive() && !feastBoost) { feastBoost = applyFeastPrice(); saveHearth(); }
  if (feastBoost && !wellFedActive()) { removeFeastPrice(); feastBoost = false; saveHearth(); }
  if (feastCookEnd && Date.now() >= feastCookEnd) setTimeout(() => finishFeast(true), 1500);
  armHearth(); renderHearth(); refreshBuffPill();

  window.hearth = {
    state: feastState, hold: holdFeast, finishNow: () => finishFeast(false),
    spirit: () => spirit, buff: wellFedActive,
    cookEnd: () => feastCookEnd, readyAt: () => feastReadyAt
  };
