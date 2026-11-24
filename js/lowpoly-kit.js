// ---------- low-poly placeholder kit ----------
// Flat-shaded, outline-free stand-ins for the farm, home and woodcutter hut.
// Same 2:1 dimetric view and footprints as the game, so the real Blender models
// can drop in later without moving the layout. Loaded by lowpoly.html.
(function (root) {
  'use strict';

  const PAL = {
    ink:     '#2b2118',
    grass:   { hi: '#8fb45c', base: '#73994a', sh: '#5d803b', deep: '#4b6a30' },
    soil:    { hi: '#8a6238', base: '#6f4c2a', sh: '#583a1f' },
    plaster: { hi: '#f1e4c8', base: '#e4d4b3', sh: '#c8b691', deep: '#b09b77' },
    timber:  { hi: '#8a5a30', base: '#6b4424', sh: '#4d2e16', deep: '#3b2210' },
    thatch:  { hi: '#e9bf68', base: '#d3a348', sh: '#ae7c2f', deep: '#8a6023' },
    stone:   { hi: '#bbb2a0', base: '#9c9380', sh: '#7b7364', deep: '#625b4e' },
    leaf:    { hi: '#80b351', base: '#5f9139', sh: '#47702b' },
    wheat:   { hi: '#f4d77b', base: '#e3bb55', sh: '#bd8f33' },
    cloth:   { hi: '#7c9dae', base: '#5b8094', sh: '#406173' },
    door:    '#7a4622',
    pane:    '#302518',
    glow:    '#ffd488',
    bloom:   ['#efc4bc', '#f2e2ab', '#e5a9b7']
  };

  // 2:1 dimetric, matching the game's 80px world cell (80 × √2/2 ≈ 56.6).
  const T = { x: 56, y: 28 };
  const iso = (u, v, z, o) => [o.x + (u - v) * T.x, o.y + (u + v) * T.y - (z || 0)];
  const r1 = n => Math.round(n * 10) / 10;
  const pt = p => r1(p[0]) + ',' + r1(p[1]);
  const P = (pts, fill, extra) => `<polygon points="${pts.map(pt).join(' ')}" fill="${fill}"${extra ? ' ' + extra : ''}/>`;
  const T3 = (a, b, c, fill, extra) => P([a, b, c], fill, extra);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function band(a, b, w, fill, extra) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * w / 2, ny = dx / L * w / 2;
    return P([[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny],
              [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]], fill, extra);
  }

  function seeded(seed) {
    let s = (seed | 0) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // ---------- ground ----------
  function pad(o, u0, v0, u1, v1, margin) {
    const m = margin == null ? .9 : margin, D = 14;
    const x0 = u0 - m, y0 = v0 - m, x1 = u1 + m, y1 = v1 + m;
    const A = iso(x0, y0, 0, o), B = iso(x1, y0, 0, o), C = iso(x1, y1, 0, o), Dp = iso(x0, y1, 0, o);
    const A2 = iso(x0, y0, -D, o), B2 = iso(x1, y0, -D, o), C2 = iso(x1, y1, -D, o), D2 = iso(x0, y1, -D, o);
    let s = P([B, C, C2, B2], PAL.soil.sh) + P([Dp, C, C2, D2], PAL.soil.base);
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ring = [A, mid(A, B), B, mid(B, C), C, mid(C, Dp), Dp, mid(Dp, A)];
    const ctr = iso((x0 + x1) / 2, (y0 + y1) / 2, 1, o);
    const tones = [PAL.grass.base, PAL.grass.hi, PAL.grass.base, PAL.grass.sh,
                   PAL.grass.hi, PAL.grass.base, PAL.grass.sh, PAL.grass.hi];
    for (let i = 0; i < 8; i++) s += T3(ctr, ring[i], ring[(i + 1) % 8], tones[i]);
    return s;
  }

  function shadow(o, u0, v0, u1, v1) {
    const g = .16, h = 6;
    const A = iso(u0 - g, v0 - g, 0, o), B = iso(u1 + g, v0 - g, 0, o);
    const C = iso(u1 + g, v1 + g, 0, o), D = iso(u0 - g, v1 + g, 0, o);
    return P([[A[0], A[1] + h], [B[0], B[1] + h], [C[0], C[1] + h], [D[0], D[1] + h]], PAL.ink, 'opacity=".17"');
  }

  function tuft(o, u, v, z, k, tone) {
    const p = iso(u, v, z, o), s = k || 1;
    return T3([p[0] - 4 * s, p[1]], [p[0] - 2 * s, p[1] - 10 * s], [p[0] + 1 * s, p[1]], tone) +
           T3([p[0], p[1] + .5], [p[0] + 1.5 * s, p[1] - 13 * s], [p[0] + 4.5 * s, p[1]], tone) +
           T3([p[0] + 2 * s, p[1]], [p[0] + 5 * s, p[1] - 8 * s], [p[0] + 6 * s, p[1]], tone);
  }

  function pebble(o, u, v, z, k, tone) {
    const p = iso(u, v, z, o), s = k || 1;
    return P([[p[0] - 4 * s, p[1]], [p[0], p[1] - 3 * s], [p[0] + 4 * s, p[1]], [p[0], p[1] + 1.5 * s]], tone);
  }

  function dressing(o, u0, v0, u1, v1, seed) {
    const rnd = seeded(seed), s = [];
    for (let i = 0; i < 4; i++) {
      const u = u0 - .55 + rnd() * (u1 - u0 + 1.1), v = v0 - .55 + rnd() * (v1 - v0 + 1.1);
      s.push(tuft(o, u, v, 0, .7 + rnd() * .5, i % 2 ? PAL.leaf.base : PAL.leaf.sh));
    }
    for (let i = 0; i < 3; i++) {
      const u = u0 - .5 + rnd() * (u1 - u0 + 1), v = v0 - .5 + rnd() * (v1 - v0 + 1);
      s.push(pebble(o, u, v, 0, .65 + rnd() * .4, PAL.stone.base));
    }
    return s.join('');
  }

  // ---------- boxes and walls ----------
  function box(o, u0, v0, u1, v1, z0, z1, left, right, top) {
    const A = iso(u0, v0, z1, o), B = iso(u1, v0, z1, o);
    const C = iso(u1, v1, z1, o), D = iso(u0, v1, z1, o);
    const A0 = iso(u0, v0, z0, o), B0 = iso(u1, v0, z0, o);
    const C0 = iso(u1, v1, z0, o), D0 = iso(u0, v1, z0, o);
    return P([B, C, C0, B0], right) + P([C, D, D0, C0], left) + P([A, B, C, D], top);
  }

  function wall(o, u0, v0, u1, v1, z0, z1, lit, shade, litB, shadeB) {
    const r0b = iso(u1, v0, z0, o), r1b = iso(u1, v1, z0, o);
    const r0t = iso(u1, v0, z1, o), r1t = iso(u1, v1, z1, o);
    const l0b = iso(u0, v1, z0, o), l0t = iso(u0, v1, z1, o);
    return T3(r0t, r1t, r1b, shade) + T3(r0t, r1b, r0b, shadeB) +
           T3(r1t, l0t, l0b, lit) + T3(r1t, l0b, r1b, litB);
  }

  function beamV1(o, u0, u1, z, v, w, fill) { return band(iso(u0, v, z, o), iso(u1, v, z, o), w, fill); }
  function beamU1(o, v0, v1, z, u, w, fill) { return band(iso(u, v0, z, o), iso(u, v1, z, o), w, fill); }
  function postV1(o, u, z0, z1, v, w, fill) { return band(iso(u, v, z0, o), iso(u, v, z1, o), w, fill); }
  function postU1(o, v, z0, z1, u, w, fill) { return band(iso(u, v, z0, o), iso(u, v, z1, o), w, fill); }

  function windowV1(o, u0, u1, z0, z1, v, frame) {
    const f = frame || PAL.timber.base, g = .07;
    let s = P([iso(u0, v, z1, o), iso(u1, v, z1, o), iso(u1, v, z0, o), iso(u0, v, z0, o)], f);
    s += P([iso(u0 + g, v, z1 - 4, o), iso(u1 - g, v, z1 - 4, o),
            iso(u1 - g, v, z0 + 4, o), iso(u0 + g, v, z0 + 4, o)], PAL.pane);
    s += T3(iso(u0 + g, v, z0 + 5, o), iso((u0 + u1) / 2, v, z0 + 5, o),
            iso((u0 + u1) / 2, v, z1 - 6, o), PAL.glow, 'opacity=".28"');
    s += postV1(o, (u0 + u1) / 2, z0 + 4, z1 - 4, v, 2.2, f);
    s += beamV1(o, u0 + g, u1 - g, (z0 + z1) / 2, v, 2.2, f);
    s += band(iso(u0 - .04, v, z0 - 3, o), iso(u1 + .04, v, z0 - 3, o), 5, f);
    return s;
  }

  function windowU1(o, v0, v1, z0, z1, u, frame) {
    const f = frame || PAL.timber.base, g = .07;
    let s = P([iso(u, v0, z1, o), iso(u, v1, z1, o), iso(u, v1, z0, o), iso(u, v0, z0, o)], f);
    s += P([iso(u, v0 + g, z1 - 4, o), iso(u, v1 - g, z1 - 4, o),
            iso(u, v1 - g, z0 + 4, o), iso(u, v0 + g, z0 + 4, o)], PAL.pane);
    s += T3(iso(u, v0 + g, z0 + 5, o), iso(u, (v0 + v1) / 2, z0 + 5, o),
            iso(u, (v0 + v1) / 2, z1 - 6, o), PAL.glow, 'opacity=".22"');
    s += postU1(o, (v0 + v1) / 2, z0 + 4, z1 - 4, u, 2.2, f);
    s += beamU1(o, v0 + g, v1 - g, (z0 + z1) / 2, u, 2.2, f);
    s += band(iso(u, v0 - .04, z0 - 3, o), iso(u, v1 + .04, z0 - 3, o), 5, f);
    return s;
  }

  function doorV1(o, uc, w, z0, z1, v) {
    const u0 = uc - w / 2, u1 = uc + w / 2;
    let s = P([iso(u0 - .05, v, z1 + 5, o), iso(u1 + .05, v, z1 + 5, o),
               iso(u1 + .05, v, z0, o), iso(u0 - .05, v, z0, o)], PAL.timber.deep);
    s += T3(iso(u0, v, z1, o), iso(uc, v, z1, o), iso(uc, v, z0, o), PAL.door);
    s += P([iso(uc, v, z1, o), iso(u1, v, z1, o), iso(u1, v, z0, o), iso(uc, v, z0, o)], PAL.timber.base);
    for (let i = 1; i <= 2; i++) {
      const u = u0 + (u1 - u0) * i / 3;
      s += postV1(o, u, z0 + 3, z1 - 3, v, 1.2, PAL.timber.deep);
    }
    s += beamV1(o, u0, u1, z1 + 2, v, 4, PAL.timber.sh);
    const h = iso(uc + w * .3, v, z0 + (z1 - z0) * .48, o);
    s += P([[h[0], h[1] - 3], [h[0] + 3, h[1]], [h[0], h[1] + 3], [h[0] - 3, h[1]]], PAL.thatch.hi);
    return s;
  }

  // ---------- roof ----------
  function chimney(o, u, v, z0, z1, s) {
    const h = s || .19;
    return box(o, u - h, v - h, u + h, v + h, z0, z1, PAL.stone.base, PAL.stone.sh, PAL.stone.base) +
           box(o, u - h * 1.35, v - h * 1.35, u + h * 1.35, v + h * 1.35, z1, z1 + 6,
               PAL.stone.hi, PAL.stone.base, PAL.stone.hi) +
           band(iso(u - h, v, z1 + 2, o), iso(u + h, v, z1 + 2, o), 1.2, PAL.stone.deep, 'opacity=".4"');
  }

  function smoke(o, u, v, z) {
    const a = iso(u, v, z, o), b = iso(u + .09, v + .03, z + 18, o), c = iso(u + .2, v + .07, z + 34, o);
    const blob = (p, k) => P([[p[0] - 6 * k, p[1]], [p[0] - 2 * k, p[1] - 7 * k],
                              [p[0] + 5 * k, p[1] - 4 * k], [p[0] + 6 * k, p[1] + 2 * k],
                              [p[0] + 1 * k, p[1] + 4 * k]], '#e8efe5', 'opacity=".18"');
    return blob(a, .8) + blob(b, .95) + blob(c, 1.1);
  }

  function roof(o, u0, v0, u1, v1, zEave, zRidge, opts) {
    const op = opts || {}, ov = op.overhang == null ? .26 : op.overhang, vm = (v0 + v1) / 2;
    const A = iso(u0 - ov, v0 - ov, zEave, o), B = iso(u1, v0 - ov, zEave, o);
    const C = iso(u1, v1 + ov, zEave, o), D = iso(u0 - ov, v1 + ov, zEave, o);
    const R1 = iso(u0 - ov, vm, zRidge, o), R2 = iso(u1, vm, zRidge, o);
    let s = P([A, B, R2, R1], PAL.thatch.sh);                     // far slope

    if (op.chimney !== false) {
      const cb = zEave + (zRidge - zEave) * .22;
      s += chimney(o, u0 + .55, vm, cb, zRidge + 26, .19);
    }

    // gable wall, with its timber truss
    const gm = iso(u1, vm, zEave, o);
    s += T3(B, C, R2, op.gable || PAL.plaster.sh) + T3(B, R2, gm, op.gableB || PAL.plaster.deep);
    s += band(B, C, 5, PAL.timber.base) + band(gm, R2, 4, PAL.timber.base);
    s += band(iso(u1, v0 + (v1 - v0) * .36, zEave + 9, o),
              iso(u1, vm, zEave + (zRidge - zEave) * .56, o), 3.2, PAL.timber.base);
    s += band(iso(u1, v0 + (v1 - v0) * .64, zEave + 9, o),
              iso(u1, vm, zEave + (zRidge - zEave) * .56, o), 3.2, PAL.timber.base);
    const vent = iso(u1, vm, zEave + (zRidge - zEave) * .42, o);
    s += P([[vent[0], vent[1] - 4], [vent[0] + 4, vent[1]],
            [vent[0], vent[1] + 4], [vent[0] - 4, vent[1]]], PAL.timber.deep);

    // near slope: four columns of flat triangles
    const N = 4;
    const tones = [PAL.thatch.base, PAL.thatch.hi, PAL.thatch.base,
                   PAL.thatch.sh, PAL.thatch.hi, PAL.thatch.base];
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const e0 = lerp(D, C, t0), e1 = lerp(D, C, t1);
      const r0 = lerp(R1, R2, t0), r1 = lerp(R1, R2, t1);
      s += T3(e0, e1, r1, tones[(i * 2) % tones.length]);
      s += T3(e0, r1, r0, tones[(i * 2 + 1) % tones.length]);
    }
    for (const q of [.34, .68]) {
      const a = lerp(lerp(D, C, 0), lerp(R1, R2, 0), q);
      const b = lerp(lerp(D, C, 1), lerp(R1, R2, 1), q);
      s += band(a, b, 3, PAL.thatch.sh, 'opacity=".34"');
    }

    s += band(D, C, 6, PAL.thatch.sh) + band(D, C, 2, PAL.thatch.hi, 'opacity=".55"');
    s += band(R1, R2, 10, PAL.thatch.deep) + band(R1, R2, 6, PAL.thatch.hi) +
         band(R1, R2, 2, '#f7e3ab');
    if (op.smoke) s += smoke(o, u0 + .55, vm, zRidge + 38);
    return s;
  }

  function dormer(o, u0, u1, vF, vB, zBase, zEave, zRidge) {
    let s = box(o, u0, vB, u1, vF, zBase, zEave, PAL.plaster.base, PAL.plaster.sh, PAL.plaster.hi);
    s += windowV1(o, u0 + .16, u1 - .16, zBase + 12, zEave - 10, vF, PAL.timber.sh);
    const vm = (vB + vF) / 2, ov = .14;
    const A = iso(u0 - ov, vB, zEave, o), B = iso(u1 + ov, vB, zEave, o);
    const C = iso(u1 + ov, vF, zEave, o), D = iso(u0 - ov, vF, zEave, o);
    const R1 = iso(u0 - ov, vm, zRidge, o), R2 = iso(u1 + ov, vm, zRidge, o);
    s += P([A, B, R2, R1], PAL.thatch.sh);
    s += T3(B, C, R2, PAL.plaster.sh) + T3(B, R2, iso(u1 + ov, vm, zEave, o), PAL.plaster.deep);
    s += T3(D, C, R2, PAL.thatch.base) + T3(D, R2, R1, PAL.thatch.hi);
    s += band(D, C, 5, PAL.thatch.sh) + band(D, C, 1.6, PAL.thatch.hi, 'opacity=".6"');
    s += band(R1, R2, 7, PAL.thatch.deep) + band(R1, R2, 4, PAL.thatch.hi);
    return s;
  }

  // ---------- the two homes ----------
  function house(kind) {
    const manor = kind === 'manor';
    const o = { x: 250, y: manor ? 360 : 330 };
    const u0 = .58, u1 = 2.42, v0 = .58, v1 = 2.42;
    let s = pad(o, u0, v0, u1, v1, .9) + shadow(o, u0, v0, u1, v1);

    if (!manor) {
      const zBase = 14, zTop = 112, zRidge = 212;
      s += box(o, u0 - .1, v0 - .1, u1 + .1, v1 + .1, 0, zBase - .5,
               PAL.stone.base, PAL.stone.sh, PAL.stone.hi);
      s += band(iso(u0 - .1, v1 + .1, zBase * .48, o),
                iso(u1 + .1, v1 + .1, zBase * .48, o), 1.4, PAL.stone.deep, 'opacity=".5"');
      s += wall(o, u0, v0, u1, v1, zBase, zTop,
                PAL.plaster.base, PAL.plaster.sh, PAL.plaster.hi, PAL.plaster.deep);

      // timber frame
      s += beamV1(o, u0, u1, zBase + 3, v1, 5, PAL.timber.base);
      s += beamV1(o, u0, u1, zTop - 4, v1, 7, PAL.timber.base);
      s += beamU1(o, v0, v1, zBase + 3, u1, 5, PAL.timber.base);
      s += beamU1(o, v0, v1, zTop - 4, u1, 7, PAL.timber.base);
      s += postV1(o, u0 + .06, zBase, zTop, v1, 6, PAL.timber.base);
      s += postV1(o, u1 - .06, zBase, zTop, v1, 6, PAL.timber.base);
      s += postU1(o, v0 + .06, zBase, zTop, u1, 6, PAL.timber.base);
      s += postU1(o, v1 - .06, zBase, zTop, u1, 6, PAL.timber.base);
      s += postV1(o, .98, zBase + 9, zTop - 10, v1, 3.6, PAL.timber.base);
      s += postV1(o, 2.02, zBase + 9, zTop - 10, v1, 3.6, PAL.timber.base);
      s += postU1(o, 1.5, zBase + 9, zTop - 10, u1, 3.6, PAL.timber.base);
      s += band(iso(1.82, v1, zBase + 8, o), iso(2.34, v1, zTop - 16, o), 3.4, PAL.timber.sh);
      s += band(iso(u1, v0 + .16, zBase + 8, o), iso(u1, 1.02, zTop - 16, o), 3.4, PAL.timber.sh);

      // openings
      s += windowV1(o, .74, 1.04, 55, 85, v1);
      s += windowU1(o, 1.22, 1.60, 53, 83, u1);
      s += doorV1(o, 1.5, .54, zBase + 3, zBase + 60, v1);
      s += box(o, 1.18, v1, 1.82, v1 + .18, 0, 6, PAL.stone.base, PAL.stone.sh, PAL.stone.hi);
      // window box
      s += box(o, .73, v1 - .02, 1.05, v1 + .13, 47, 53, PAL.timber.base, PAL.timber.sh, PAL.timber.hi);
      for (let i = 0; i < 3; i++) {
        const p = iso(.78 + i * .1, v1 + .06, 53, o);
        s += T3([p[0] - 3, p[1]], [p[0], p[1] - 8], [p[0] + 3, p[1]], PAL.bloom[i]);
      }

      s += roof(o, u0, v0, u1, v1, zTop, zRidge, { smoke: true });
      return { body: s + dressing(o, u0, v0, u1, v1, 7), x0: 0, y0: 90, w: 500, h: 460 };
    }

    // manor: a jettied upper floor, a tall roof and a dormer
    const zBase = 14, zMid = 128, zTop = 242, zRidge = 360;
    s += box(o, u0 - .12, v0 - .12, u1 + .12, v1 + .12, 0, zBase - .5,
             PAL.stone.base, PAL.stone.sh, PAL.stone.hi);
    s += band(iso(u0 - .12, v1 + .12, zBase * .46, o),
              iso(u1 + .12, v1 + .12, zBase * .46, o), 1.4, PAL.stone.deep, 'opacity=".5"');
    s += wall(o, u0, v0, u1, v1, zBase, zMid,
              PAL.plaster.base, PAL.plaster.sh, PAL.plaster.hi, PAL.plaster.deep);

    // lower frame
    s += beamV1(o, u0, u1, zBase + 3, v1, 5, PAL.timber.base);
    s += beamV1(o, u0, u1, zMid - 4, v1, 7, PAL.timber.base);
    s += beamU1(o, v0, v1, zBase + 3, u1, 5, PAL.timber.base);
    s += beamU1(o, v0, v1, zMid - 4, u1, 7, PAL.timber.base);
    for (const u of [u0 + .06, 1.16, 1.84, u1 - .06]) s += postV1(o, u, zBase, zMid, v1, 4.2, PAL.timber.base);
    for (const v of [v0 + .06, 1.16, 1.84, v1 - .06]) s += postU1(o, v, zBase, zMid, u1, 4.2, PAL.timber.base);

    // lower openings
    s += windowV1(o, .78, 1.06, 53, 91, v1);
    s += windowV1(o, 1.94, 2.22, 53, 91, v1);
    s += windowU1(o, 1.20, 1.58, 53, 91, u1);
    s += doorV1(o, 1.5, .58, zBase + 3, zBase + 66, v1);
    s += box(o, 1.14, v1, 1.86, v1 + .22, 0, 7, PAL.stone.base, PAL.stone.sh, PAL.stone.hi);

    // jettied upper floor
    const ju0 = u0 - .15, ju1 = u1 + .15, jv0 = v0 - .15, jv1 = v1 + .15;
    s += wall(o, ju0, jv0, ju1, jv1, zMid, zTop,
              PAL.plaster.hi, PAL.plaster.base, PAL.plaster.base, PAL.plaster.sh);
    s += beamV1(o, ju0, ju1, zMid + 3, jv1, 9, PAL.timber.base);
    s += beamV1(o, ju0, ju1, zTop - 5, jv1, 8, PAL.timber.base);
    s += beamU1(o, jv0, jv1, zMid + 3, ju1, 9, PAL.timber.base);
    s += beamU1(o, jv0, jv1, zTop - 5, ju1, 8, PAL.timber.base);
    for (const u of [ju0 + .06, 1.16, 1.84, ju1 - .06]) s += postV1(o, u, zMid, zTop, jv1, 4.6, PAL.timber.base);
    for (const v of [jv0 + .06, 1.5, jv1 - .06]) s += postU1(o, v, zMid, zTop, ju1, 4.6, PAL.timber.base);
    s += band(iso(ju0 + .1, jv1, zMid + 10, o), iso(.95, jv1, zTop - 14, o), 3.2, PAL.timber.sh);
    s += band(iso(ju1 - .1, jv1, zMid + 10, o), iso(2.08, jv1, zTop - 14, o), 3.2, PAL.timber.sh);
    s += windowV1(o, .80, 1.08, 158, 210, jv1);
    s += windowV1(o, 1.34, 1.66, 158, 210, jv1);
    s += windowV1(o, 1.92, 2.20, 158, 210, jv1);
    s += windowU1(o, .96, 1.26, 156, 208, ju1);
    s += windowU1(o, 1.74, 2.04, 156, 208, ju1);

    s += roof(o, ju0, jv0, ju1, jv1, zTop, zRidge, { overhang: .3, smoke: true, gable: PAL.plaster.base });
    s += dormer(o, 1.02, 1.98, jv1 - .30, jv1 - .95, 246, 306, 350);
    return { body: s + dressing(o, u0, v0, u1, v1, 11), x0: 0, y0: -10, w: 500, h: 590 };
  }

  // ---------- woodcutter hut ----------
  function hexCut(p, r, tone) {
    return P([[p[0] - r, p[1]], [p[0] - r * .5, p[1] - r * .82], [p[0] + r * .55, p[1] - r * .78],
              [p[0] + r, p[1]], [p[0] + r * .5, p[1] + r * .78], [p[0] - r * .55, p[1] + r * .74]], tone);
  }

  function logEnd(o, u, v, z, k) {
    const p = iso(u, v, z, o), r = 5.2 * (k || 1);
    return hexCut(p, r, PAL.wheat.base) + hexCut(p, r * .48, PAL.wheat.hi);
  }

  function logAlongU(o, u0, u1, v, z0, z1) {
    return box(o, u0, v, u1, v + .2, z0, z1, PAL.timber.base, PAL.timber.sh, PAL.timber.hi) +
           logEnd(o, u1 + .01, v + .1, (z0 + z1) / 2, .9);
  }

  function woodpile(o, u, v) {
    return logAlongU(o, u, u + .72, v, 3, 11) +
           logAlongU(o, u, u + .72, v + .23, 3, 11) +
           logAlongU(o, u + .07, u + .65, v + .12, 11, 19);
  }

  function stump(o, u, v) {
    const p = iso(u, v, 0, o), q = iso(u, v, 18, o);
    let s = box(o, u - .15, v - .15, u + .15, v + .15, 0, 18,
                PAL.timber.base, PAL.timber.sh, PAL.timber.base);
    s += hexCut(q, 9, PAL.wheat.base) + hexCut(q, 4.6, PAL.wheat.hi);
    s += band([q[0] + 2, q[1] - 3], [q[0] - 11, q[1] - 42], 3.6, PAL.timber.base);
    s += P([[q[0] - 12, q[1] - 35], [q[0] - 22, q[1] - 40],
            [q[0] - 15, q[1] - 51], [q[0] - 8, q[1] - 44]], PAL.stone.hi);
    return s;
  }

  function hut() {
    const o = { x: 230, y: 260 };
    const u0 = .65, u1 = 2.35, v0 = .65, v1 = 2.35;
    const zBase = 12, zTop = 96, zRidge = 180;
    let s = pad(o, u0, v0, u1, v1, .8) + shadow(o, u0, v0, u1, v1);
    s += box(o, u0 - .12, v0 - .12, u1 + .12, v1 + .12, 0, zBase - .5,
             PAL.stone.base, PAL.stone.sh, PAL.stone.hi);
    s += wall(o, u0, v0, u1, v1, zBase, zTop,
              PAL.timber.base, PAL.timber.sh, PAL.timber.hi, PAL.timber.deep);

    // log courses, with cut ends on the visible corner
    for (let i = 0; i < 5; i++) {
      const z = zBase + 10 + i * 15;
      if (z > zTop - 5) break;
      s += beamV1(o, u0 - .02, u1 + .02, z, v1, 8, i % 2 ? PAL.timber.hi : PAL.timber.base);
      s += beamV1(o, u0 - .02, u1 + .02, z - 7, v1, 2, PAL.timber.deep, 'opacity=".4"');
      s += beamU1(o, v0 - .02, v1 + .02, z, u1, 8, i % 2 ? PAL.timber.base : PAL.timber.hi);
      s += beamU1(o, v0 - .02, v1 + .02, z - 7, u1, 2, PAL.timber.deep, 'opacity=".4"');
      s += logEnd(o, u1 + .04, v1 + .04, z - 2, .55);
    }

    s += doorV1(o, 1.5, .5, zBase + 4, zBase + 58, v1);
    s += windowU1(o, 1.20, 1.56, 46, 70, u1);
    s += box(o, 1.2, v1, 1.8, v1 + .16, 0, 5, PAL.stone.base, PAL.stone.sh, PAL.stone.hi);
    s += roof(o, u0, v0, u1, v1, zTop, zRidge, { overhang: .24, smoke: true });

    s += woodpile(o, .22, 1.02);
    s += stump(o, 2.14, 2.58);
    return { body: s + dressing(o, u0, v0, u1, v1, 23), x0: 0, y0: 20, w: 460, h: 440 };
  }

  // ---------- wheat farm ----------
  function fenceLine(o, a, b, z, h, step, fill) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step)), posts = [];
    let s = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      posts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    for (const [u, v] of posts) {
      s += band(iso(u, v, z, o), iso(u, v, z + h, o), 5, fill);
      const q = iso(u, v, z + h, o);
      s += P([[q[0], q[1] - 3], [q[0] + 3, q[1]], [q[0], q[1] + 2], [q[0] - 3, q[1]]], PAL.timber.hi);
    }
    for (const zz of [z + h * .42, z + h * .78]) {
      for (let i = 0; i < n; i++) {
        s += band(iso(posts[i][0], posts[i][1], zz, o),
                  iso(posts[i + 1][0], posts[i + 1][1], zz, o), 3, fill);
      }
    }
    return s;
  }

  function wheat(o, u, v, z, h, rnd) {
    const p = iso(u, v, z, o);
    let s = '';
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 3 + (rnd() - .5) * 2;
      const bh = h * (.78 + rnd() * .38);
      const lean = (rnd() - .5) * 8;
      const tip = [p[0] + dx + lean, p[1] - bh];
      s += T3([p[0] + dx - 1.6, p[1] + .5], [tip[0] - .6, tip[1]],
              [p[0] + dx + 1.8, p[1]], i === 1 ? PAL.wheat.base : PAL.wheat.sh);
      s += P([[tip[0], tip[1] - 3], [tip[0] + 2.6, tip[1]],
              [tip[0], tip[1] + 7], [tip[0] - 2.6, tip[1]]],
             i === 1 ? PAL.wheat.hi : PAL.wheat.base);
    }
    return s;
  }

  function scarecrow(o, u, v, z) {
    const p = iso(u, v, z, o), hy = p[1] - 60;
    let s = band([p[0], p[1]], [p[0], p[1] - 74], 4, PAL.timber.base);
    s += band([p[0] - 22, p[1] - 48], [p[0] + 22, p[1] - 48], 3.5, PAL.timber.sh);
    s += P([[p[0] - 10, p[1] - 24], [p[0] + 10, p[1] - 24],
            [p[0] + 7, p[1] - 52], [p[0] - 7, p[1] - 52]], PAL.cloth.base);
    s += T3([p[0] - 10, p[1] - 24], [p[0] + 10, p[1] - 24], [p[0] + 4, p[1] - 44], PAL.cloth.sh);
    s += band([p[0] - 21, p[1] - 52], [p[0] - 12, p[1] - 48], 6, PAL.cloth.sh);
    s += band([p[0] + 12, p[1] - 48], [p[0] + 21, p[1] - 52], 6, PAL.cloth.sh);
    s += T3([p[0] - 23, p[1] - 50], [p[0] - 18, p[1] - 58], [p[0] - 17, p[1] - 48], PAL.wheat.base);
    s += T3([p[0] + 23, p[1] - 50], [p[0] + 18, p[1] - 58], [p[0] + 17, p[1] - 48], PAL.wheat.base);
    s += T3([p[0] - 5, p[1] - 53], [p[0], p[1] - 62], [p[0] + 5, p[1] - 53], PAL.wheat.hi);
    s += P([[p[0] - 7, hy], [p[0] - 3, hy - 7], [p[0] + 4, hy - 7], [p[0] + 8, hy],
            [p[0] + 3, hy + 7], [p[0] - 4, hy + 7]], PAL.wheat.base);
    s += P([[p[0] - 11, hy - 6], [p[0] + 11, hy - 6],
            [p[0] + 6, hy - 14], [p[0] - 6, hy - 14]], PAL.thatch.sh);
    s += band([p[0] - 9, hy - 6], [p[0] + 9, hy - 6], 3, PAL.thatch.deep);
    return s;
  }

  function farm() {
    const o = { x: 250, y: 220 };
    const u0 = .45, u1 = 5.55, v0 = .45, v1 = 2.45;
    let s = pad(o, u0, v0, u1, v1, .8) + shadow(o, u0, v0, u1, v1);
    s += box(o, u0, v0, u1, v1, 0, 7, PAL.soil.base, PAL.soil.sh, PAL.soil.hi);

    // furrows
    for (let i = 0; i < 9; i++) {
      const vv = v0 + (i + .5) / 9 * (v1 - v0);
      s += P([iso(u0 + .08, vv, 7, o), iso(u1 - .08, vv, 7, o),
              iso(u1 - .08, vv + .11, 7, o), iso(u0 + .08, vv + .11, 7, o)],
             i % 2 ? PAL.soil.base : PAL.soil.hi);
      s += P([iso(u0 + .08, vv + .11, 7, o), iso(u1 - .08, vv + .11, 7, o),
              iso(u1 - .08, vv + .16, 7, o), iso(u0 + .08, vv + .16, 7, o)],
             PAL.soil.sh, 'opacity=".55"');
    }

    // far fence, scarecrow, crops, then the near fence on top
    s += fenceLine(o, [u0 - .08, v0 - .08], [u1 + .08, v0 - .08], 0, 20, 1.1, PAL.timber.base);
    s += fenceLine(o, [u0 - .08, v0 - .08], [u0 - .08, v1 + .08], 0, 20, 1.1, PAL.timber.base);
    s += scarecrow(o, u1 - .5, v0 + .42, 7);

    const rnd = seeded(31), tufts = [];
    for (const vv of [.78, 1.16, 1.54, 1.92, 2.26]) {
      for (let u = u0 + .28; u < u1 - .12; u += .52) {
        const uu = u + (rnd() - .5) * .16, vv2 = vv + (rnd() - .5) * .1;
        tufts.push({ k: uu + vv2, svg: wheat(o, uu, vv2, 7, 20 + rnd() * 12, rnd) });
      }
    }
    tufts.sort((a, b) => a.k - b.k);
    for (const t of tufts) s += t.svg;

    s += fenceLine(o, [u0 - .08, v1 + .08], [u1 + .08, v1 + .08], 0, 20, 1.1, PAL.timber.base);
    s += fenceLine(o, [u1 + .08, v0 - .08], [u1 + .08, v1 + .08], 0, 20, 1.1, PAL.timber.sh);
    s += dressing(o, u0, v0, u1, v1, 19);
    return { body: s, x0: 0, y0: 110, w: 700, h: 410 };
  }

  // ---------- public API ----------
  const META = {
    cabin: {
      name: 'Cozy Cabin', foot: '3 × 3', role: 'Home · level 1',
      note: 'Jettied gable, stone plinth, flower box. Reads as the starter home at a glance.'
    },
    manor: {
      name: 'Timber Manor', foot: '3 × 3', role: 'Home · level 2',
      note: 'Same footprint, taller silhouette: overhanging upper floor, dormer, two rows of windows.'
    },
    farm: {
      name: 'Wheat Farm', foot: '5 × 2', role: 'Production · field',
      note: 'A raised soil bed with flat wheat facets, a light fence and a scarecrow for scale.'
    },
    hut: {
      name: 'Woodcutter Hut', foot: '2 × 2', role: 'Production · wood',
      note: 'Stacked log courses, cut ends, woodpile and chopping block. Small but readable.'
    }
  };
  const BUILDERS = { cabin: () => house('cabin'), manor: () => house('manor'), farm, hut };
  const cache = {};

  function art(kind) {
    if (!BUILDERS[kind]) return '';
    if (cache[kind]) return cache[kind];
    const a = BUILDERS[kind]();
    const vb = [a.x0 || 0, a.y0 || 0, a.w, a.h].join(' ');
    cache[kind] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${META[kind].name}">${a.body}</svg>`;
    return cache[kind];
  }
  function data(kind) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(art(kind));
  }

  root.LOWPOLY = { PAL, art, data, META };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LOWPOLY;
})(typeof window !== 'undefined' ? window : globalThis);
