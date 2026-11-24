  // ---------- icons: hand-built SVG, no emoji. Replace any string with an SVG from game-icons.net / Kenney / SVG Repo ----------
  const ICON = {
    coin: ART.icon('coin'),
    villager: ART.icon('villager'),
    check: ART.icon('check'),
    cross: ART.icon('cross'),
    wheat: ART.icon('wheat')
  };
  document.querySelectorAll("[data-ic]").forEach(e => { e.innerHTML = ICON[e.dataset.ic]; });

  // ---------- HUD + gold (saved in Supabase) ----------
  const SUPABASE_URL = 'https://illuyxprrvgdxdpnwcqc.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_nYxpvEA0gp5udUktTXcwYw_stN5h7gA';   // publishable key only. NEVER put the secret key in this file.
  const hud = document.getElementById('hud'), goldEl = document.getElementById('goldnum');
  const buildBtn = document.getElementById('buildbtn'), buildPanel = document.getElementById('buildpanel');
  function setBuildOpen(o) {
    buildPanel.style.display = o ? 'block' : 'none';
    buildPanel.setAttribute('aria-hidden', o ? 'false' : 'true');
    buildBtn.classList.toggle('open', o);
    if (o && window.woodHut) window.woodHut.close();
  }
  buildBtn.addEventListener('click', () => {
    setBuildOpen(buildPanel.style.display !== 'block');
    buildBtn.classList.remove('hint');
  });
  const buildClose = document.getElementById('buildClose');
  if (buildClose) buildClose.addEventListener('click', () => setBuildOpen(false));
  // The old three-dots stat sheet is gone. HUD pills carry the numbers players need.
  function setStat() {}
  let gold = 0, sb = null, goldPending = 0;   // goldPending = gold spent that the server does not know about yet
  try { goldPending = parseInt(localStorage.getItem('goldPending'), 10) || 0; } catch (e) {}
  const goldSave = () => { try { localStorage.setItem('goldCache', gold); } catch (e) {} };
  // gold is a purse, never a debt: it can never show or store a negative number
  const setGold = n => {
    n = Math.max(0, Math.floor(Number(n) || 0));
    gold = n; goldEl.textContent = n.toLocaleString(); setStat('gold', ICON.coin, 'Gold', n.toLocaleString());
    goldSave();
  };
  function savedGold() {
    try { const v = parseInt(localStorage.getItem('goldCache'), 10); if (Number.isFinite(v)) return v; } catch (e) {}
    return null;
  }
  async function initGold() {
    let local = savedGold();
    if (local !== null && local < 0) local = 50;              // repair an old save that slipped into debt: start again at 50
    const settle = () => { goldPending = 0; try { localStorage.setItem('goldPending', 0); } catch (e2) {} };
    const ok = window.supabase && !SUPABASE_URL.startsWith('PASTE') && !SUPABASE_KEY.startsWith('PASTE');
    if (!ok) { setGold(local !== null ? local : 50); settle(); return; }  // not connected yet: just show the saved purse (or the starting 50)
    try {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { const r = await sb.auth.signInAnonymously(); if (r.error) throw r.error; }   // same browser = same player
      const { data, error } = await sb.rpc('get_player');      // creates the player with 50 gold the first time
      if (error) throw error;
      // The purse saved in this browser is the real ledger: wheat sales and purchases happen here.
      // The server only seeds a brand-new player. goldPending must never drag the balance below zero.
      setGold(local !== null ? local : Math.max(0, data - goldPending));
      settle();
    } catch (e) {
      console.error('Gold load failed', e);                       // happens inside Claude's preview: it blocks outside servers. On your real site it works.
      setGold(local !== null ? local : 50);
      settle();
    }
  }
  initGold();

  // ---------- seeded random ----------
  let seed = (Math.random() * 2 ** 32) >>> 0;
  function rng() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const rr = (a, b) => a + rng() * (b - a);

