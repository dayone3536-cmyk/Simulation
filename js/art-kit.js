// ---------- art kit: one source of truth for the village style ----------
// Storybook vector: one light (top-left), one outline, three tones per material.
// Everything here is generated, so the style can never drift between assets.
// Loaded before 02-icons-hud-rng.js. Exposes window.ART.
(function (root) {
  'use strict';

  const PAL = {
    ink: '#3A2412',
    gold:    { sh: '#A96F22', base: '#D9A03F', hi: '#F2C96B', pale: '#F8E3A6' },
    plaster: { sh: '#B49F76', base: '#DCC9A2', hi: '#F2E6C9' },
    timber:  { sh: '#472A12', base: '#6B4220', hi: '#8A5A2E' },
    stone:   { sh: '#68675C', base: '#8B8A7D', hi: '#A8A79A' },
    earth:   { sh: '#5A4626', base: '#7A6238', hi: '#9A7E4A' },
    leaf:    { sh: '#2F5F1E', base: '#4F8F2E', hi: '#7FBF4A' },
    cloth:   { sh: '#2F4E63', base: '#3F6B85', hi: '#5E8FA8' },
    skin:    { sh: '#B07A55', base: '#D9A074', hi: '#EFC39A' },
    door: '#7A3F22',
    pane: '#241608'
  };

  // ---------- icons (64 x 64, no gradients) ----------
  const iconWrap = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;

  function grainHead(cx, cy, w, h, rot, fill) {
    const top = cy - h / 2, bot = cy + h / 2;
    const d = `M${cx} ${top} C${cx + w} ${top + h * .30} ${cx + w * .92} ${bot - h * .26} ${cx} ${bot} ` +
              `C${cx - w * .92} ${bot - h * .26} ${cx - w} ${top + h * .30} ${cx} ${top} Z`;
    let notch = '';
    for (let i = 1; i <= 3; i++) {
      const y = top + h * i / 4, half = w * (.62 - i * .06);
      notch += `<path d="M${(cx - half).toFixed(1)} ${y.toFixed(1)} Q${cx} ${(y - 3).toFixed(1)} ${(cx + half).toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${PAL.gold.sh}" stroke-width="1.4" stroke-linecap="round" opacity=".72"/>`;
    }
    return `<g transform="rotate(${rot} ${cx} ${cy})"><path d="${d}" fill="${fill}" stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"/>${notch}</g>`;
  }

  function iconCoin() {
    return iconWrap(
      `<circle cx="32" cy="32" r="25" fill="${PAL.gold.base}" stroke="${PAL.ink}" stroke-width="2.5"/>` +
      `<circle cx="32" cy="32" r="20.5" fill="none" stroke="${PAL.gold.sh}" stroke-width="2"/>` +
      `<circle cx="32" cy="32" r="17" fill="${PAL.gold.hi}" opacity=".30"/>` +
      `<path d="M13.5 24 A20 20 0 0 1 29 11.5" fill="none" stroke="${PAL.gold.pale}" stroke-width="3.2" stroke-linecap="round" opacity=".95"/>` +
      `<path d="M32 19.5l2.7 7.5h7.9l-6.4 4.7 2.5 7.6-6.7-4.6-6.7 4.6 2.5-7.6-6.4-4.7h7.9z" fill="${PAL.gold.sh}" stroke="${PAL.ink}" stroke-width="1.2" stroke-linejoin="round"/>`
    );
  }

  function iconWheat() {
    return iconWrap(
      // stems first, so the heads sit on top
      `<path d="M25 51 C24 44 21.5 39.5 18.5 35" fill="none" stroke="${PAL.gold.sh}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M39 51 C40 44 42.5 39.5 45.5 35" fill="none" stroke="${PAL.gold.sh}" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M32 52 L32 34" fill="none" stroke="${PAL.gold.sh}" stroke-width="3.6" stroke-linecap="round"/>` +
      grainHead(18, 26, 6, 24, -24, PAL.gold.base) +
      grainHead(46, 26, 6, 24, 24, PAL.gold.base) +
      grainHead(32, 20, 7.2, 30, 0, PAL.gold.hi) +
      // twine band
      `<rect x="24.4" y="47.2" width="15.2" height="7.4" rx="3.7" fill="${PAL.timber.base}" stroke="${PAL.ink}" stroke-width="1.8"/>` +
      `<path d="M27.5 49.6h9M27.5 52.2h9" stroke="${PAL.timber.hi}" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>`
    );
  }

  function iconVillager() {
    return iconWrap(
      `<path d="M13 56 C14 40 21 33.5 32 33.5 C43 33.5 50 40 51 56 Z" fill="${PAL.cloth.base}" stroke="${PAL.ink}" stroke-width="2.3" stroke-linejoin="round"/>` +
      `<path d="M26.5 34.5 L32 42 L37.5 34.5" fill="${PAL.cloth.sh}" stroke="${PAL.ink}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<circle cx="32" cy="22" r="11" fill="${PAL.skin.base}" stroke="${PAL.ink}" stroke-width="2.3"/>` +
      `<path d="M21.5 19 C23 8.5 41 8.5 42.5 19 C38 13.5 26 13.5 21.5 19 Z" fill="${PAL.timber.sh}" stroke="${PAL.ink}" stroke-width="1.4" stroke-linejoin="round"/>` +
      `<path d="M18.5 54 C22 50 25 48 28 47" fill="none" stroke="${PAL.cloth.hi}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`
    );
  }

  function iconCheck() {
    return iconWrap(
      `<path d="M13.5 33 L26 45.5 L50.5 18" fill="none" stroke="${PAL.ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M13.5 33 L26 45.5 L50.5 18" fill="none" stroke="${PAL.leaf.hi}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  function iconCross() {
    return iconWrap(
      `<path d="M18 18 L46 46 M46 18 L18 46" fill="none" stroke="${PAL.ink}" stroke-width="11" stroke-linecap="round"/>` +
      `<path d="M18 18 L46 46 M46 18 L18 46" fill="none" stroke="${PAL.plaster.hi}" stroke-width="6.5" stroke-linecap="round"/>`
    );
  }

  const ICONS = {
    coin: iconCoin,
    wheat: iconWheat,
    villager: iconVillager,
    check: iconCheck,
    cross: iconCross
  };

  // ---------- isometric building kit (dimetric 2:1, one light, one outline) ----------
  const B = { w: 420, h: 360, ax: 56, ay: 28, cx: 210, cy: 170 };
  const iso = (u, v, z) => [B.cx + (u - v) * B.ax, B.cy + (u + v) * B.ay - (z || 0)];
  const pt = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  const P = (arr, fill, attrs) => `<polygon points="${arr.map(pt).join(' ')}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;
  const L = (a, b, color, w, extra) => `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"${extra ? ' ' + extra : ''}/>`;
  const lerpP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function fringe(a, b, drop, n, fill) {
    // a thatch edge: straight along the eave, scalloped underneath
    let d = `M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
    for (let i = n; i > 0; i--) {
      const p1 = lerpP(a, b, i / n), p0 = lerpP(a, b, (i - 1) / n);
      const x1 = p1[0], y1 = p1[1] + drop, x0 = p0[0], y0 = p0[1] + drop;
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + drop * .55;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${x0.toFixed(1)} ${y0.toFixed(1)}`;
    }
    return `<path d="${d} Z" fill="${fill}" stroke="${PAL.ink}" stroke-width="1.2" stroke-linejoin="round"/>`;
  }

  function strawBox(u0, v0, u1, v1, z0, z1, opts) {
    const o = opts || {};
    const A = iso(u0, v0, z1), Bp = iso(u1, v0, z1), C = iso(u1, v1, z1), D = iso(u0, v1, z1);
    const A0 = iso(u0, v0, z0), B0 = iso(u1, v0, z0), C0 = iso(u1, v1, z0), D0 = iso(u0, v1, z0);
    const top = o.top || PAL.gold.hi, left = o.left || PAL.gold.base, right = o.right || PAL.gold.sh;
    let s = P([Bp, C, C0, B0], right, `stroke="${PAL.ink}" stroke-width="1.4" stroke-linejoin="round"`);
    s += P([C, D, D0, C0], left, `stroke="${PAL.ink}" stroke-width="1.4" stroke-linejoin="round"`);
    s += P([A, Bp, C, D], top, `stroke="${PAL.ink}" stroke-width="1.4" stroke-linejoin="round"`);
    if (o.straw) {
      for (let i = 1; i <= 3; i++) {
        const t = i / 4;
        const p0 = lerpP(iso(u0, v0, z1 + .1), iso(u1, v0, z1 + .1), t);
        const p1 = lerpP(iso(u1, v0, z1 + .1), iso(u1, v1, z1 + .1), t);
        s += L(p0, p1, PAL.gold.sh, 1.2, 'opacity=".55"');
      }
    }
    return s;
  }

  function building(kind) {
    const manor = kind === 'manor';
    const wallB = 12;
    const wallT = manor ? 120 : 98;
    const roofH = manor ? 98 : 92;
    const U0 = .6, U1 = 2.4, V0 = .6, V1 = 2.4;
    const PL = .4, PR = 2.6;
    let s = '';

    // --- plinth: packed earth, so the house belongs to the lawn ---
    const pA = iso(PL, PL, wallB), pB = iso(PR, PL, wallB), pC = iso(PR, PR, wallB), pD = iso(PL, PR, wallB);
    const pA0 = iso(PL, PL, 0), pB0 = iso(PR, PL, 0), pC0 = iso(PR, PR, 0), pD0 = iso(PL, PR, 0);
    s += P([pB, pC, pC0, pB0], PAL.earth.sh, `stroke="${PAL.ink}" stroke-width="1.6" stroke-linejoin="round"`);
    s += P([pC, pD, pD0, pC0], PAL.earth.base, `stroke="${PAL.ink}" stroke-width="1.6" stroke-linejoin="round"`);
    s += P([pA, pB, pC, pD], PAL.earth.hi, `stroke="${PAL.ink}" stroke-width="1.6" stroke-linejoin="round"`);
    s += P([iso(.75, PR - .01, wallB), iso(1.15, PR - .01, wallB), iso(1.15, PR - .01, 3), iso(.75, PR - .01, 3)], PAL.earth.sh, 'opacity=".55"');
    // a small threshold stone at the door
    s += strawBox(1.18, 2.66, 1.68, 2.94, 0, 5, { top: PAL.stone.hi, left: PAL.stone.base, right: PAL.stone.sh });

    // --- walls: left face lit, right face in shade ---
    const r0B = iso(U1, V0, wallB), r1B = iso(U1, V1, wallB), r0T = iso(U1, V0, wallT), r1T = iso(U1, V1, wallT);
    const l1B = iso(U0, V1, wallB), l1T = iso(U0, V1, wallT);
    s += P([r0T, r1T, r1B, r0B], PAL.plaster.sh, `stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"`);
    s += P([r1T, l1T, l1B, r1B], PAL.plaster.base, `stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"`);
    // soft shade under the eaves
    s += P([r1T, l1T, iso(U0, V1, wallT - 11), iso(U1, V1, wallT - 11)], PAL.ink, 'opacity=".12"');
    s += P([r0T, r1T, iso(U1, V1, wallT - 8), iso(U1, V0, wallT - 8)], PAL.ink, 'opacity=".16"');

    // --- timber frame ---
    const postL = (u, w) => P([iso(u - w / 2, V1, wallB), iso(u + w / 2, V1, wallB), iso(u + w / 2, V1, wallT), iso(u - w / 2, V1, wallT)], PAL.timber.base, `stroke="${PAL.ink}" stroke-width="1.1"`);
    const postR = (v, w) => P([iso(U1, v - w / 2, wallB), iso(U1, v + w / 2, wallB), iso(U1, v + w / 2, wallT), iso(U1, v - w / 2, wallT)], PAL.timber.base, `stroke="${PAL.ink}" stroke-width="1.1"`);
    s += postL(U0 + .06, .12) + postL(1.5, .10) + postL(U1 - .06, .12);
    s += postR(V0 + .06, .12) + postR(1.5, .10) + postR(V1 - .06, .12);
    s += P([iso(U0, V1, wallT), iso(U1, V1, wallT), iso(U1, V1, wallT - 9), iso(U0, V1, wallT - 9)], PAL.timber.base, `stroke="${PAL.ink}" stroke-width="1.1"`);
    s += P([iso(U1, V0, wallT), iso(U1, V1, wallT), iso(U1, V1, wallT - 9), iso(U1, V0, wallT - 9)], PAL.timber.base, `stroke="${PAL.ink}" stroke-width="1.1"`);
    s += L(iso(U0, V1, wallT - 3), iso(U1, V1, wallT - 3), PAL.timber.hi, 1.4, 'opacity=".75"');
    // brace
    s += L(iso(.98, V1, wallB + 4), iso(1.58, V1, wallT - 12), PAL.ink, 10);
    s += L(iso(.98, V1, wallB + 4), iso(1.58, V1, wallT - 12), PAL.timber.base, 6.5);

    // --- door on the lit wall ---
    const du0 = 1.22, du1 = 1.62, dz = wallB + 4, dh = 52;
    s += P([iso(du0, V1, dz), iso(du1, V1, dz), iso(du1, V1, dz + dh), iso(du0, V1, dz + dh)], PAL.door, `stroke="${PAL.ink}" stroke-width="1.8" stroke-linejoin="round"`);
    s += L(iso(du0 + .13, V1, dz + 3), iso(du0 + .13, V1, dz + dh - 3), PAL.timber.sh, 1.3, 'opacity=".75"');
    s += L(iso(du0 + .27, V1, dz + 3), iso(du0 + .27, V1, dz + dh - 3), PAL.timber.sh, 1.3, 'opacity=".75"');
    s += P([iso(du0 - .07, V1, dz + dh + 1), iso(du1 + .07, V1, dz + dh + 1), iso(du1 + .07, V1, dz + dh + 8), iso(du0 - .07, V1, dz + dh + 8)], PAL.timber.base, `stroke="${PAL.ink}" stroke-width="1.1"`);
    const hp = iso(du1 - .07, V1, dz + dh * .52);
    s += `<circle cx="${hp[0].toFixed(1)}" cy="${hp[1].toFixed(1)}" r="2" fill="${PAL.gold.hi}" stroke="${PAL.ink}" stroke-width=".9"/>`;

    // --- window on the shaded wall ---
    const win = (v0, v1, z0, z1) => {
      let o = P([iso(U1, v0, z0), iso(U1, v1, z0), iso(U1, v1, z1), iso(U1, v0, z1)], PAL.timber.hi, `stroke="${PAL.ink}" stroke-width="1.6"`);
      const i0 = lerpP([iso(U1, v0, z0)], [iso(U1, v0, z0)], 0); // keep shape below readable
      o += P([iso(U1, v0 + .05, z0 + 4), iso(U1, v1 - .05, z0 + 4), iso(U1, v1 - .05, z1 - 4), iso(U1, v0 + .05, z1 - 4)], PAL.pane, '');
      o += L(iso(U1, (v0 + v1) / 2, z0 + 4), iso(U1, (v0 + v1) / 2, z1 - 4), PAL.timber.hi, 1.6);
      o += L(iso(U1, v0 + .05, (z0 + z1) / 2), iso(U1, v1 - .05, (z0 + z1) / 2), PAL.timber.hi, 1.6);
      o += L(iso(U1, v0 - .04, z0 - 2), iso(U1, v1 + .04, z0 - 2), PAL.timber.hi, 2.6);
      return o;
    };
    s += win(1.24, 1.64, 54, 86);
    if (manor) s += win(1.24, 1.64, 94, 114);

    // --- roof: hip with a short ridge, thick golden thatch ---
    const RA = iso(.28, .28, wallT), RB = iso(2.72, .28, wallT), RC = iso(2.72, 2.72, wallT), RD = iso(.28, 2.72, wallT);
    const R1 = iso(.55, 1.5, wallT + roofH), R2 = iso(2.45, 1.5, wallT + roofH);
    // back faces first (mostly hidden, but they keep the shape honest)
    s += P([RA, RB, R2, R1], PAL.gold.sh, `stroke="${PAL.ink}" stroke-width="1.8" stroke-linejoin="round"`);
    s += P([RA, RD, R1], PAL.gold.sh, `stroke="${PAL.ink}" stroke-width="1.8" stroke-linejoin="round"`);
    // front faces
    s += P([RD, RC, R2, R1], PAL.gold.base, `stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"`);
    s += P([RB, RC, R2], PAL.gold.sh, `stroke="${PAL.ink}" stroke-width="2" stroke-linejoin="round"`);
    // layered thatch courses: broad bands with a lit top edge
    for (const t of [.22, .44, .66, .86]) {
      s += L(lerpP(RD, R1, t), lerpP(RC, R2, t), PAL.gold.sh, 6, 'opacity=".16"');
      s += L(lerpP(RD, R1, t), lerpP(RC, R2, t), PAL.gold.hi, 2, 'opacity=".55"');
    }
    for (const t of [.30, .58, .84]) {
      s += L(lerpP(RB, R2, t), lerpP(RC, R2, t), PAL.ink, 4, 'opacity=".10"');
      s += L(lerpP(RB, R2, t), lerpP(RC, R2, t), PAL.gold.hi, 1.6, 'opacity=".30"');
    }
    // stitch groups
    for (let i = 0; i < 12; i++) {
      const t = (i + .5) / 12, p = lerpP(RD, RC, t);
      for (let k = -1; k <= 1; k++) {
        const x = p[0] + k * 7, y = p[1] - 8 - Math.abs(k) * 2;
        s += L([x, y], [x + 1.6, y - 12], PAL.gold.sh, 1.5, 'opacity=".50"');
      }
    }
    for (let i = 0; i < 7; i++) {
      const t = (i + .5) / 7, p = lerpP(RB, RC, t);
      for (let k = -1; k <= 1; k++) {
        const x = p[0] + k * 6, y = p[1] - 7 - Math.abs(k) * 2;
        s += L([x, y], [x + 1.2, y - 10], PAL.gold.sh, 1.4, 'opacity=".45"');
      }
    }
    // thick scalloped eaves
    s += fringe(RD, RC, 12, 9, PAL.gold.base);
    s += fringe(RB, RC, 11, 6, PAL.gold.base);
    s += L(RD, RC, PAL.gold.hi, 2.6, 'opacity=".9"');
    s += L(RB, RC, PAL.gold.hi, 2.4, 'opacity=".75"');
    // ridge cap
    s += L(R1, R2, PAL.ink, 9);
    s += L(R1, R2, PAL.gold.hi, 6);
    s += L(R1, R2, PAL.gold.pale, 2, 'opacity=".8"');

    // --- a couple of ground stones and grass tufts so the base is not a clean cut ---
    s += `<ellipse cx="${iso(.45, 2.2, 2)[0].toFixed(1)}" cy="${iso(.45, 2.2, 2)[1].toFixed(1)}" rx="8" ry="3.4" fill="${PAL.stone.hi}" stroke="${PAL.ink}" stroke-width="1.1" opacity=".95"/>`;
    s += `<ellipse cx="${iso(2.62, 1.62, 2)[0].toFixed(1)}" cy="${iso(2.62, 1.62, 2)[1].toFixed(1)}" rx="5.5" ry="2.6" fill="${PAL.stone.base}" stroke="${PAL.ink}" stroke-width="1" opacity=".9"/>`;
    const tuft = (u, v, k) => {
      const p = iso(u, v, 1), o = [];
      for (const [dx, h] of [[-4, 9], [0, 13], [4, 8]]) o.push(L([p[0] + dx * k, p[1]], [p[0] + dx * k * 1.5, p[1] - h * k], PAL.leaf.sh, 2.2 * k, 'opacity=".92"'));
      return o.join('');
    };
    s += tuft(.34, 2.30, .9) + tuft(.58, 3.02, 1) + tuft(2.52, 2.86, 1.05) + tuft(2.70, 2.35, .85);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${B.w} ${B.h}">${s}</svg>`;
  }

  // ---------- public API ----------
  const cache = {};
  function icon(name, size) {
    if (!ICONS[name]) return '';
    const key = 'i:' + name + ':' + (size || 0);
    if (cache[key]) return cache[key];
    let svg = ICONS[name]();
    if (size) svg = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    cache[key] = svg;
    return svg;
  }
  function buildingSvg(kind) {
    const key = 'b:' + kind;
    if (!cache[key]) cache[key] = building(kind === 'manor' ? 'manor' : 'cabin');
    return cache[key];
  }
  const dataUri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  function iconData(name, size) {
    const px = size || 256;
    return dataUri(icon(name, px));
  }
  function buildingData(kind, pxWidth) {
    const key = 'bd:' + kind + ':' + (pxWidth || 0);
    if (cache[key]) return cache[key];
    const w = pxWidth || 840, h = Math.round(w * B.h / B.w);
    const svg = buildingSvg(kind).replace('<svg ', `<svg width="${w}" height="${h}" `);
    cache[key] = dataUri(svg);
    return cache[key];
  }

  const ART = { PAL, icon, iconData, building: buildingSvg, buildingData, dataUri, BOX: B };
  root.ART = ART;
  if (typeof module !== 'undefined' && module.exports) module.exports = ART;
})(typeof window !== 'undefined' ? window : globalThis);
