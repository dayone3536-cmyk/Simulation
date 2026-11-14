  // ---------- villagers: the people who live in the cabin ----------
  let population = 10;                              // default 10 people live in the cabin
  try { const s = parseInt(localStorage.getItem('population'), 10); if (s >= 0 && s <= 200) population = s; } catch (e) {}
  const villagers = []; let vLast = 0;
  const TUNIC = ['#c8553d', '#3f7cac', '#6a994e', '#e0a030', '#8e5ea2', '#d98880', '#2a9d8f', '#e76f51', '#4f6fb3', '#b5651d'];
  const SKIN = ['#f6d2b0', '#ecbf92', '#c98f63', '#8d5a3b'], HAIR = ['#3b2415', '#7a4a21', '#d9a441', '#1f1f1f', '#a63d2a'];
  const outside = (x, y, m) => {
    for (const f of farms) { const b = farmBounds(f); if (b && x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m) return false; }
    const x0 = home.c * CELL - m, y0 = home.r * CELL - m, x1 = (home.c + HOME_N) * CELL + m, y1 = (home.r + HOME_N) * CELL + m;
    return !(x > x0 && x < x1 && y > y0 && y < y1);
  };
  function pickSpot() {                              // somewhere in the clearing around the cabin, never inside it
    const cx = (home.c + HOME_N / 2) * CELL, cy = (home.r + HOME_N / 2) * CELL;
    for (let k = 0; k < 30; k++) {
      const x = cx + rr(-6, 6) * CELL, y = cy + rr(-5, 6) * CELL;
      if (x > clearing.x0 + 30 && x < clearing.x1 - 30 && y > clearing.y0 + 30 && y < clearing.y1 - 30 && outside(x, y, 22)) return [x, y];
    }
    return [cx, (home.r + HOME_N + 1.5) * CELL];
  }
  function mkVillager(i, inHouse) {
    const [x, y] = pickSpot();
    return { x, y, st: inHouse ? 'inside' : 'idle', wait: rr(.2, 3), tx: x, ty: y, a: inHouse ? 0 : 1, ph: rr(0, 6.28), cyc: rr(0, 1), dir: 0, vr: i % 5, sp: rr(46, 62), wave: 0, face: 1, ti: rr(2, 7), walking: false, yaw: rr(0, 6.28), spd: 0, gp: rr(0, 6.28), mv: 0, lk: 0, look: 0, lookT: rr(.5, 3), fem: rng() < .5, carry: rng() < .22, beard: rng() < .25, hs: (rng() * 3) | 0, bld: rr(.93, 1.07), pants: PANTS[(rng() * 5) | 0],
      tun: TUNIC[i % TUNIC.length], skin: SKIN[(rng() * SKIN.length) | 0], hair: HAIR[(rng() * HAIR.length) | 0], hat: rng() < .3, sz: rr(.74, .84) };
  }
  function syncVillagers() {
    while (villagers.length < population) villagers.push(mkVillager(villagers.length, villagers.length % 5 === 4));
    for (let i = population; i < villagers.length; i++) killVSprite(villagers[i]);
    villagers.length = population;
    villagers.forEach((v, i) => { v.job = i < WORKERS; v.wi = i; });     // the first few villagers are the farm hands
    setStat('pop', ICON.villager, 'Population', population);
  }
  function setPopulation(n) { population = Math.max(0, Math.min(200, n | 0)); try { localStorage.setItem('population', population); } catch (e) {} syncVillagers(); }
  function go(v, tx, ty, dt) {                       // walk toward a point: turn first, speed up, slow down, stride = distance walked
    const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
    if (d < 1e-4) return true;
    const th = Math.atan2(dx + dy, dx - dy), df = wrapA(th - v.yaw);
    v.yaw += Math.max(-8 * dt, Math.min(8 * dt, df)); v.tyaw = v.yaw;
    const want = v.sp * (Math.abs(df) > 1 ? .2 : 1) * Math.min(1, d / (v.sp * .3) + .25);
    v.spd += Math.max(-v.sp * 5 * dt, Math.min(v.sp * 2.5 * dt, want - v.spd));
    const step = v.spd * dt;
    if (d <= step) { v.x = tx; v.y = ty; return true; }
    v.x += dx / d * step; v.y += dy / d * step; v.walking = true; v.gp += step * Math.PI / (.39 * v.sz * 100 * v.bld);
    return false;
  }
  function updateVillagers(time) {
    const dt = Math.min(.05, Math.max(0, time - vLast)); vLast = time;
    const doorX = (home.c + 1.4) * CELL, doorY = (home.r + HOME_N - .55) * CELL, stepY = (home.r + HOME_N + .55) * CELL, span = stepY - doorY;
    for (const v of villagers) {
      v.walking = false;
      if (v.job && farms.length) {                                   // farm hands: out of the cabin, over to a growing field, work until that wheat is ripe
        const grow = farms.filter(f => farmState(f) === 'growing');
        if (grow.length) {
          if (v.st === 'inside') v.ti = 0;
          else if (v.st === 'idle' || v.st === 'walk' || v.st === 'toDoor') { v.wf = grow[v.wi % grow.length]; workSpot(v, false, v.wf); v.st = 'toFarm'; }
        } else if (v.st === 'toFarm' || v.st === 'work') { v.st = 'idle'; v.wait = rr(.5, 2.5); }
      }
      if (v.st === 'idle') {
        v.wait -= dt; v.wave = Math.max(0, v.wave - dt);
        if (v.wait <= 0) { if (rng() < .3) v.st = 'toDoor'; else { [v.tx, v.ty] = pickSpot(); v.st = 'walk'; } }
        else if (rng() < dt * .2) v.wave = 1.2;
      } else if (v.st === 'walk') {
        if (!outside(v.tx, v.ty, 22)) [v.tx, v.ty] = pickSpot();       // the cabin was moved onto the target
        if (go(v, v.tx, v.ty, dt)) { v.st = 'idle'; v.wait = rr(1, 3.5); }
      } else if (v.st === 'toDoor') {
        if (go(v, doorX, stepY, dt)) v.st = 'enter';
      } else if (v.st === 'enter') {
        const arrived = go(v, doorX, doorY, dt);
        v.a = Math.max(0, Math.min(1, Math.hypot(v.x - doorX, v.y - doorY) / span));
        if (arrived) { v.st = 'inside'; v.a = 0; v.ti = rr(4, 10); }
      } else if (v.st === 'inside') {
        v.ti -= dt;
        if (v.ti <= 0) { v.st = 'exit'; v.x = doorX; v.y = doorY; v.a = 0; }
      } else if (v.st === 'exit') {
        const arrived = go(v, doorX, stepY, dt);
        v.a = Math.max(0, Math.min(1, 1 - Math.hypot(v.x - doorX, v.y - stepY) / span));
        if (arrived) { v.st = 'idle'; v.a = 1; v.wait = rr(.5, 2.5); }
      }
      if (v.st === 'toFarm') { if (go(v, v.tx, v.ty, dt)) { v.st = 'work'; v.ti = rr(3.5, 7); v.tyaw = 3 * Math.PI / 4 + rr(-.6, .6); } }
      else if (v.st === 'work') { v.ti -= dt; v.yaw += wrapA(v.tyaw - v.yaw) * Math.min(1, dt * 4); if (v.ti <= 0) { if (v.wf) workSpot(v, true, v.wf); v.st = 'toFarm'; } }
      v.wk = (v.wk || 0) + ((v.st === 'work' ? 1 : 0) - (v.wk || 0)) * Math.min(1, dt * 6);
      v.mv += ((v.walking ? 1 : 0) - v.mv) * Math.min(1, dt * 9); if (!v.walking) v.spd = 0;
      v.lk += (v.look - v.lk) * Math.min(1, dt * 5);
      if ((v.lookT -= dt) <= 0) { v.look = v.walking ? rr(-.3, .3) : rr(-1.1, 1.1); v.lookT = rr(1.2, 4); }
      if (!v.walking && v.st === 'idle') { if (v.tyaw === undefined || rng() < dt * .12) v.tyaw = v.yaw + rr(-1.6, 1.6); v.yaw += wrapA(v.tyaw - v.yaw) * Math.min(1, dt * 3); }
      if (v.st === 'idle' || v.st === 'walk' || v.st === 'toDoor') {    // slide off the cabin walls if it was moved on top of them
        if (!outside(v.x, v.y, 10)) {
          const x0 = home.c * CELL - 10, y0 = home.r * CELL - 10, x1 = (home.c + HOME_N) * CELL + 10, y1 = (home.r + HOME_N) * CELL + 10;
          const m = Math.min(v.x - x0, x1 - v.x, v.y - y0, y1 - v.y);
          if (m === v.x - x0) v.x = x0; else if (m === x1 - v.x) v.x = x1; else if (m === v.y - y0) v.y = y0; else v.y = y1;
        }
        v.x = Math.max(clearing.x0 + 20, Math.min(clearing.x1 - 20, v.x)); v.y = Math.max(clearing.y0 + 20, Math.min(clearing.y1 - 20, v.y));
      }
    }
  }
  
  // ---------- living villagers: a real walking skeleton (legs, arms, spine, head) drawn in code, seen from the game camera ----------
  // Stride phase is driven by distance walked, and the body always faces where it walks, so feet never slide and nobody moonwalks.
  const LAT = .5, LAC = .866, PANTS = ['#5a4632', '#3f3a33', '#4a5a3a', '#6b5a3e', '#33425a'];
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const shd = (h, k) => { const n = parseInt(h.slice(1), 16), f = c => Math.max(0, Math.min(255, c * k | 0)); return 'rgb(' + f(n >> 16) + ',' + f(n >> 8 & 255) + ',' + f(n & 255) + ')'; };
  function limb(a, b, r0, r1, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, an = Math.atan2(ny, nx);
    ctx.beginPath(); ctx.moveTo(a[0] + nx * r0, a[1] + ny * r0); ctx.lineTo(b[0] + nx * r1, b[1] + ny * r1);
    ctx.arc(b[0], b[1], r1, an, an + Math.PI, true); ctx.lineTo(a[0] - nx * r0, a[1] - ny * r0); ctx.arc(a[0], a[1], r0, an + Math.PI, an, true); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = .8; ctx.strokeStyle = 'rgba(30,15,5,.5)'; ctx.stroke();
    const o = nx > 0 ? -.35 : .35; ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = r0 * .5;
    ctx.beginPath(); ctx.moveTo(a[0] + nx * r0 * o, a[1] + ny * r0 * o); ctx.lineTo(b[0] + nx * r1 * o, b[1] + ny * r1 * o); ctx.stroke();
  }
  function paintVillager(v, time) {
    const H = v.sz * 100 * v.bld, w = v.mv, p = v.gp, br = Math.sin(time * 1.9 + v.ph), fem = v.fem, wk = v.wk || 0;
    const fx = Math.cos(v.yaw), fy = Math.sin(v.yaw), rx = -fy, ry = fx, OUT = 'rgba(30,15,5,.5)';      // forward / right on the ground, (x right, y toward camera)
    const J = (f, s, z) => [(fx * f + rx * s) * H, ((fy * f + ry * s) * LAT - z * LAC) * H];
    const skin = v.skin, sk2 = shd(skin, .8), tun = v.tun, boot = '#4a2f1b';
    ctx = v.cx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, v.cv.width, v.cv.height); ctx.setTransform(VS, 0, 0, VS, VW / 2 * VS, VBASE * VS); ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(H * .03, H * .01, H * .25, H * .09, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, H * .15, H * .05, 0, 0, 7); ctx.fill();
    // ---- legs: hip swing + knee bend, pelvis height solved so the lowest foot always touches the ground ----
    const LT = .245, L = [];
    for (const s of [-1, 1]) {
      const q = p + (s > 0 ? Math.PI : 0), ha = .5 * w * Math.sin(q) + .02, kn = .85 * w * Math.pow(Math.max(0, Math.cos(q + .35)), 1.4) + .1 * w * Math.max(0, -Math.sin(q)) + .03;
      const sa = ha - kn; L.push({ s, ha, sa, kf: LT * Math.sin(ha), kz: -LT * Math.cos(ha), af: LT * Math.sin(ha) + LT * Math.sin(sa), az: -LT * Math.cos(ha) - LT * Math.cos(sa) });
    }
    const hL = L[0].ha, hR = L[1].ha, pz = Math.max(-L[0].az, -L[1].az) + .04, ps = .014 * w * Math.sin(p), lean = .06 * w + .015 + wk * (.17 + .04 * Math.sin(time * 5 + v.ph));
    L.sort((a, b) => (fy * a.af + ry * a.s * .055) - (fy * b.af + ry * b.s * .055));
    for (const l of L) {
      const sd = ps + l.s * .055, hp = J(0, sd, pz), kp = J(l.kf, sd, pz + l.kz), ap = J(l.af, sd, pz + l.az), pt = Math.max(-.5, Math.min(.6, l.sa * .7));
      limb(hp, kp, .036 * H, .03 * H, v.pants); limb(kp, ap, .03 * H, .022 * H, fem ? skin : v.pants);
      limb(J(l.af - .03, sd, pz + l.az - .02), J(l.af + .085 * Math.cos(pt), sd, pz + l.az + .085 * Math.sin(pt) - .03), .03 * H, .022 * H, boot);
      limb(ap, [ap[0] + (kp[0] - ap[0]) * .22, ap[1] + (kp[1] - ap[1]) * .22], .028 * H, .027 * H, boot);
    }
    // ---- skirt / tunic hem, swinging with the legs ----
    { const hz = fem ? pz - .22 : pz - .07, fl = fem ? .135 : .1, a = J(lean * .11, ps - .075, pz + .11), b = J(lean * .11, ps + .075, pz + .11), c = J(hL * .1, ps - fl, hz), d = J(hR * .1, ps + fl, hz);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.quadraticCurveTo((c[0] + d[0]) / 2, (c[1] + d[1]) / 2 + (.03 + .03 * fy) * H, d[0], d[1]); ctx.lineTo(b[0], b[1]); ctx.closePath();
      ctx.fillStyle = shd(tun, .82); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .8; ctx.stroke(); }
    // ---- arms (counter-swing to the legs, one waves, one may carry a basket) ----
    const arm = s => {
      const sd = ps + s * (fem ? .105 : .125), z0 = pz + .285, wv = s > 0 && v.wave > 0 ? Math.min(1, v.wave * 3) : 0, cr = s > 0 && v.carry && !wv && !wk;
      const al = s * .55 * w * Math.sin(p) * (cr ? .2 : 1) + .03 + wk * (.85 + .35 * Math.sin(time * 5 + v.ph + s * 1.3)), a2 = al + .2 + .5 * Math.max(0, al), mx = (a, b) => a + (b - a) * wv, wg = Math.sin(time * 13), lf = lean * .3;
      const S = J(lf, ps + s * (fem ? .095 : .115), z0);
      let E = J(mx(lf + .165 * Math.sin(al), lf + .03), mx(sd, ps + s * .15), mx(z0 - .165 * Math.cos(al), z0 - .045));
      let Hd = J(mx(lf + .165 * Math.sin(al) + .15 * Math.sin(a2), lf + .06 + .02 * wg), mx(sd, ps + s * .19 + .03 * wg), mx(z0 - .165 * Math.cos(al) - .15 * Math.cos(a2), z0 + .12));
      if (cr) { E = J(lf + .02, sd + .01, z0 - .15); Hd = J(.1, ps + .07, z0 - .2); }
      limb(S, E, .033 * H, .027 * H, shd(tun, .92)); limb(E, Hd, .026 * H, .02 * H, skin);
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(Hd[0], Hd[1], .025 * H, 0, 7); ctx.fill();
      if (cr) { ctx.fillStyle = '#a8742f'; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.ellipse(Hd[0], Hd[1] + .04 * H, .06 * H, .04 * H, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#6b4519'; ctx.beginPath(); ctx.ellipse(Hd[0], Hd[1] + .028 * H, .05 * H, .02 * H, 0, 0, 7); ctx.fill(); }
    };
    const farFirst = [-1, 1].filter(s => ry * s < 0), nearLast = [-1, 1].filter(s => ry * s >= 0);
    // ---- head position, long hair mass behind the body when we face the camera ----
    const hc = J(lean * .4 + .012, ps, pz + .405 + .003 * br), R = .074 * H * (fem ? .97 : 1), hy = v.yaw + v.lk * .9, hxx = Math.cos(hy), hyy = Math.sin(hy), vis = hyy * LAC;
    const tail = () => { if (!fem) return; const sw = Math.sin(time * 2.2 + v.ph) * .02 + w * Math.sin(p * 2) * .03; limb(hc, J(lean * .3 - .05 + sw, ps + sw, pz + .2), R * .95, R * .5, v.hair); };
    if (vis > 0) tail();
    for (const s of farFirst) arm(s);
    // ---- torso ----
    const lv = (z, a, b) => { const c = J(lean * (z - pz), ps, z); return [c[0], c[1], Math.hypot(b * fx, a * rx) * H]; };
    const T = [lv(pz + .02, fem ? .088 : .075, .05), lv(pz + .11, fem ? .06 : .066, .045), lv(pz + .23, fem ? .078 : .09, .056), lv(pz + .3 + .004 * br, fem ? .1 : .115, .05)];
    ctx.beginPath(); ctx.moveTo(T[0][0] - T[0][2], T[0][1]);
    for (let i = 1; i < 3; i++) ctx.quadraticCurveTo(T[i][0] - T[i][2], T[i][1], (T[i][0] - T[i][2] + T[i + 1][0] - T[i + 1][2]) / 2, (T[i][1] + T[i + 1][1]) / 2);
    ctx.lineTo(T[3][0] - T[3][2], T[3][1]); ctx.quadraticCurveTo(T[3][0], T[3][1] - .05 * H, T[3][0] + T[3][2], T[3][1]);
    for (let i = 2; i > 0; i--) ctx.quadraticCurveTo(T[i + 1][0] + T[i + 1][2], T[i][1], T[i][0] + T[i][2], (T[i][1] + T[i - 1][1]) / 2);
    ctx.lineTo(T[0][0] + T[0][2], T[0][1]); ctx.quadraticCurveTo(T[0][0], T[0][1] + .03 * H, T[0][0] - T[0][2], T[0][1]); ctx.closePath();
    const g = ctx.createLinearGradient(T[2][0] - T[2][2], 0, T[2][0] + T[2][2], 0); g.addColorStop(0, shd(tun, 1.18)); g.addColorStop(1, shd(tun, .74));
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .9; ctx.stroke();
    ctx.strokeStyle = '#3a2616'; ctx.lineWidth = .026 * H; ctx.beginPath(); ctx.moveTo(T[1][0] - T[1][2], T[1][1]); ctx.quadraticCurveTo(T[1][0], T[1][1] + fy * .035 * H, T[1][0] + T[1][2], T[1][1]); ctx.stroke();   // belt
    if (fy > .1) { ctx.fillStyle = sk2; ctx.beginPath(); ctx.moveTo(T[3][0] - .03 * H, T[3][1] - .004 * H); ctx.lineTo(T[3][0], T[3][1] + .05 * H); ctx.lineTo(T[3][0] + .03 * H, T[3][1] - .004 * H); ctx.fill();
      ctx.strokeStyle = shd(tun, .65); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(T[3][0], T[3][1] + .05 * H); ctx.lineTo(T[2][0], T[1][1] - .01 * H); ctx.stroke(); }
    for (const s of nearLast) arm(s);
    limb(J(lean * .3, ps, pz + .3), hc, .03 * H, .027 * H, sk2);                                      // neck
    if (vis <= 0) tail();
    // ---- head: ears, hair, face window, fringe, eyes, nose, mouth, hat ----
    const sdx = -hyy, sdy = hxx;
    for (const e of [-1, 1]) { ctx.fillStyle = sk2; ctx.beginPath(); ctx.ellipse(hc[0] + sdx * e * R, hc[1] + sdy * e * LAT * R + R * .12, R * .2, R * .27, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = v.hair; ctx.beginPath(); ctx.arc(hc[0], hc[1], R * 1.03, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = .9; ctx.stroke();
    if (vis > -.2) {
      const k = Math.max(.12, (vis + .2) / 1.07), cx = hc[0] + hxx * R * .55, cy = hc[1] + hyy * LAT * R * .55 + R * .05, rw = R * (.3 + .5 * k), rh = R * .84;
      ctx.save(); ctx.beginPath(); ctx.arc(hc[0], hc[1], R, 0, 7); ctx.clip();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, 7); ctx.fill();
      if (v.beard && vis > .15) { ctx.fillStyle = v.hair; ctx.beginPath(); ctx.ellipse(cx, cy + rh * .62, rw * .95, rh * .5, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = v.hair; ctx.beginPath(); ctx.ellipse(cx, cy - rh * .78, rw * 1.2, rh * .42 + (v.hs === 1 ? R * .12 : 0), 0, 0, 7); ctx.fill();   // fringe
      ctx.restore();
      if (vis > .05) {
        const bl = ((time * .37 + v.ph) % 1) < .035 ? .12 : 1, lx = Math.cos(hy + .0) * 0, ey = cy - rh * .1;
        for (const e of [-1, 1]) {
          const ex = cx + e * rw * .46; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, R * .14 * Math.max(.5, k), R * .17 * bl, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(ex + hxx * R * .03 + lx, ey + R * .01, R * .075 * Math.max(.5, k), R * .1 * bl, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = v.hair; ctx.lineWidth = R * .07; ctx.beginPath(); ctx.moveTo(ex - R * .15 * k, ey - R * .27 + e * R * .02); ctx.lineTo(ex + R * .15 * k, ey - R * .3 - e * R * .02); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,110,110,.28)'; for (const e of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + e * rw * .66, cy + rh * .22, R * .13 * k, 0, 7); ctx.fill(); }
        ctx.strokeStyle = '#7a3b2a'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(cx, cy + rh * .3, R * .2 * k + .5, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
        ctx.fillStyle = shd(skin, .85); ctx.beginPath(); ctx.ellipse(cx, cy + rh * .16, R * .06, R * .09, 0, 0, 7); ctx.fill();
      }
      if (vis < .6) { ctx.fillStyle = skin; ctx.strokeStyle = OUT; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(hc[0] + hxx * R * 1.02, hc[1] + hyy * LAT * R + R * .02, R * .15, 0, 7); ctx.fill(); ctx.stroke(); }   // nose in profile
    }
    if (Math.abs(hyy) < .6) { ctx.fillStyle = skin; ctx.strokeStyle = OUT; ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(hc[0] + sdx * (hxx > 0 ? 1 : -1) * R * .25, hc[1] + R * .1, R * .17, R * .24, 0, 0, 7); ctx.fill(); ctx.stroke(); }   // near ear
    if (v.hat) { const hz = hc[1] - R * .78; ctx.fillStyle = '#d9b45a'; ctx.strokeStyle = OUT; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.ellipse(hc[0], hz, R * 1.8, R * .9, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(hc[0], hz - R * .45, R * .95, R * .8, 0, Math.PI, 0); ctx.lineTo(hc[0] + R * .95, hz - R * .05); ctx.quadraticCurveTo(hc[0], hz + R * .25, hc[0] - R * .95, hz - R * .05); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = R * .22; ctx.beginPath(); ctx.moveTo(hc[0] - R * .93, hz - R * .08); ctx.quadraticCurveTo(hc[0], hz + R * .22, hc[0] + R * .93, hz - R * .08); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // Each villager is painted (by the code above) into its own small canvas, and the GPU moves that picture around.
  // The painting only needs refreshing ~20 times a second (8 when standing still) instead of 60, which is a big saving on old phones.
  const VW = 100, VH = 96, VS = 1.5, VBASE = 76;     // canvas is VW x VH world units, feet sit VBASE units down from the top, VS = pixels per unit
  function killVSprite(v) { if (v.spr) { v.spr.texture.destroy(true); v.spr.destroy(); } v.spr = null; v.cv = null; v.cx = null; }
  function updateVillagerSprites(time) {
    const vl = cpx - cw / 2 / zoom - 60, vr = cpx + cw / 2 / zoom + 60, vt = cpy - ch / 2 / zoom - 100, vb = cpy + ch / 2 / zoom + 40;
    const hx1 = (home.c + HOME_N) * CELL, hy1 = (home.r + HOME_N) * CELL;
    for (const v of villagers) {
      const u = projX(v.x, v.y), w = projY(v.x, v.y);
      let spr = v.spr;
      if (v.a <= .02 || u < vl || u > vr || w < vt || w > vb) { if (spr) spr.visible = false; continue; }
      if (!spr) {
        v.cv = document.createElement('canvas'); v.cv.width = Math.round(VW * VS); v.cv.height = Math.round(VH * VS); v.cx = v.cv.getContext('2d');
        spr = v.spr = new PX.Sprite(PX.Texture.from(v.cv)); spr.anchor.set(.5, VBASE / VH); spr.scale.set(1 / VS); v.lay = null; v.pt = -1;
      }
      const front = v.x > hx1 || v.y > hy1 || v.st === 'enter' || v.st === 'exit' || v.st === 'toDoor';   // in front of the cabin, or tucked behind it
      if (v.lay !== front) { (front ? vFront : vBack).addChild(spr); v.lay = front; }
      spr.visible = true; spr.alpha = v.a; spr.position.set(u, w); spr.zIndex = v.x + v.y;
      if (v.pt < 0 || time - v.pt >= (v.walking || v.wave > 0 || v.wk > .05 ? 1 / 20 : 1 / 8)) { v.pt = time; paintVillager(v, time); spr.texture.baseTexture.update(); }
    }
  }
