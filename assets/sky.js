// universe.js: a 48-second camera loop, printed as text.
// the galaxy turning -> dive in to home -> drift around the sun and its planets -> pull back out to the galaxy.
// Every layer adds light to text cells; light picks the character, the mix of colours picks the ink.
(function universe() {
  const C = document.getElementById("sky"), cx = C.getContext("2d");
  const GL = document.getElementById("skyglow"), gx = GL.getContext("2d");
  const host = document.getElementById("top");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RAMP = " .,:;-~=+*xoO0%#&@$", NR = RAMP.length;
  const LOOP = 65;   // solar system -> aurora -> galaxy -> dive back in
  let W, H, cw, chH, cols, rows, N, dpr, U, ox, oy, wide;
  let aI, aR, aG, aB, keys, cix;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const sstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const hash = (i, j) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const vnoise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v; };

  // ---------- the galaxy: polar coords in the disk plane ----------
  const CORE = [1, .8, .52], ARM = [.62, .74, 1], DISK = [.78, .78, .95], HII = [1, .45, .74], WARM = [1, .9, .72];
  const pr = [], pt = [], ph = [], pw = [], pc = [];
  const add = (r, t, h, w, c) => { pr.push(r); pt.push(t); ph.push(h); pw.push(w); pc.push(c); };
  const WIND = 1 / Math.tan(17 * Math.PI / 180), R0 = .07;
  const armAngle = (r, arm) => arm * Math.PI + Math.log(r / R0) * WIND;
  for (let i = 0; i < 15000; i++) { const arm = i & 1, r = R0 + Math.pow(rnd(), .8) * .98;
    add(r * (1 + gauss() * .05), armAngle(r, arm) + gauss() * (.2 + .12 * r), gauss() * .02, .55 + .6 * Math.exp(-r * 1.6), r < .22 ? WARM : ARM); }
  for (let i = 0; i < 6500; i++) { const arm = i & 1, r = .14 + rnd() * .8;
    add(r, armAngle(r, arm) - .3 + gauss() * .07, gauss() * .01, -.75 * (1 - r * .5), CORE); }
  for (let k = 0; k < 70; k++) { const arm = k & 1, r = .25 + rnd() * .7, t0 = armAngle(r, arm) + gauss() * .1;
    for (let j = 0; j < 9; j++) add(r + gauss() * .012, t0 + gauss() * .03, 0, 1.3, HII); }
  for (let i = 0; i < 6000; i++) add(Math.min(1.15, -Math.log(rnd()) * .33), rnd() * 6.2832, gauss() * .03, .22, DISK);
  for (let i = 0; i < 4200; i++) { const r = Math.abs(gauss()) * .11, bar = rnd() < .35;
    add(bar ? Math.abs(gauss()) * .2 : r, bar ? (rnd() < .5 ? 0 : Math.PI) + gauss() * .18 : rnd() * 6.2832, gauss() * .05 * (1 - r * 2), 1.15, CORE); }
  const NP = pr.length;
  const SUN_R = .6, SUN_T = armAngle(.6, 0) - .12;          // where "home" sits, on an arm

  // ---------- the solar system ----------
  // a fly-through: the camera flies outward from the sun (behind it, right shoulder), passing planets on either side,
  // easing almost to a stop beside Earth for a slow, rolling look before heading out past Jupiter and Saturn
  const SUN = [10, 1.2, 18], SUN_RAD = 2.6;
  const PLANETS = [   // name, x, y, z, radius, spin speed
    ["mercury", 1.3, 0, -3, .45, .2],
    ["venus", -1.7, 0, -7.5, .66, .08],
    ["earth", 1.35, -.15, -14.6, .95, .11],
    ["mars", -1.5, 0, -19.5, .58, .14],
    ["jupiter", 3, 0, -25, 1.75, .18],
    ["saturn", -2.7, 0, -30.4, 1.3, .16],
  ];
  const EARTH = PLANETS[2];
  const ORBITS = PLANETS.map(p => Math.hypot(p[1] - SUN[0], p[3] - SUN[2]));
  const BELT_R = (ORBITS[3] + ORBITS[4]) / 2;
  const BELT = Array.from({ length: 2600 }, () => [BELT_R + gauss() * .7, Math.random() * 6.2832, gauss() * .08, .4 + Math.random() * .8]);
  // camera path: distance travelled vs time, with a long slow stretch beside Earth
  const EWIN = u => sstep(.2, .32, u) * (1 - sstep(.58, .7, u));
  const ZTAB = (() => { const n = 400, a = new Float32Array(n + 1); let acc = 0;
    for (let i = 1; i <= n; i++) { acc += 1 - .88 * EWIN(i / n); a[i] = acc; } for (let i = 0; i <= n; i++) a[i] /= acc; return a; })();
  const pathZ = u => { const f = Math.min(400, Math.max(0, u * 400)), i = Math.floor(f), r = f - i; return 4 - 36 * (ZTAB[i] + (ZTAB[Math.min(400, i + 1)] - ZTAB[i]) * r); };
  // 3D value noise for planet surfaces
  const h3 = (i, j, k) => { let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function n3(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz), L = (a, b, q) => a + (b - a) * q;
    return L(L(L(h3(i, j, k), h3(i + 1, j, k), u), L(h3(i, j + 1, k), h3(i + 1, j + 1, k), u), v),
             L(L(h3(i, j, k + 1), h3(i + 1, j, k + 1), u), L(h3(i, j + 1, k + 1), h3(i + 1, j + 1, k + 1), u), v), w);
  }
  const fbm = (x, y, z) => n3(x, y, z) * .55 + n3(x * 2.1, y * 2.1, z * 2.1) * .3 + n3(x * 4.3, y * 4.3, z * 4.3) * .15;
  const mix = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q];
  // surface colour and brightness at a point on the unit sphere (planet frame, y = spin axis)
  function surface(name, x, y, z, T) {
    if (name === "earth") {
      const h = fbm(x * 1.8 + 3, y * 1.8, z * 1.8);
      let c = h > .53 ? mix([.3, .58, .26], [.62, .5, .3], Math.min(1, n3(x * 4, y * 4, z * 4) * 1.3)) : mix([.05, .2, .62], [.14, .44, .86], Math.max(0, (h - .38) / .15));
      if (Math.abs(y) > .84) c = [.95, .97, 1];
      const cl = fbm(x * 2.6 + T * .05, y * 3.4, z * 2.6 - T * .03);
      if (cl > .55) c = mix(c, [1, 1, 1], Math.min(1, (cl - .55) * 4));
      return [c, 1];
    }
    if (name === "mars") {
      let c = mix([.86, .4, .2], [.5, .24, .14], sstep(.5, .66, fbm(x * 2.5, y * 2.5, z * 2.5)));
      if (Math.abs(y) > .88) c = [.98, .95, .92];
      return [c, 1];
    }
    if (name === "jupiter") {
      const lat = Math.asin(Math.max(-1, Math.min(1, y))), lon = Math.atan2(z, x);
      const band = Math.sin(y * 17 + n3(x * 2.5, y * 6, z * 2.5) * 2.2);
      let c = mix([.98, .9, .74], [.74, .5, .32], band * .5 + .5);
      if (Math.abs(y) > .8) c = mix(c, [.55, .45, .4], .5);
      const sl = (lon - .6) / .34, sa = (lat + .36) / .12;
      if (sl * sl + sa * sa < 1) c = mix([.92, .38, .26], c, Math.sqrt(sl * sl + sa * sa) * .6);
      return [c, 1];
    }
    if (name === "saturn") { const band = Math.sin(y * 12 + n3(x * 2, y * 5, z * 2) * 1.2); return [mix([.98, .88, .66], [.82, .7, .5], band * .5 + .5), 1]; }
    if (name === "venus") { const sw = Math.sin(y * 7 + fbm(x * 2.2, y * 2.2, z * 2.2) * 5); return [mix([1, .9, .68], [.88, .72, .5], sw * .5 + .5), 1]; }
    // mercury and the moon: grey, cratered
    const cr = n3(x * 7, y * 7, z * 7), base = .72 + .28 * fbm(x * 3, y * 3, z * 3);
    return [[.66 * base, .63 * base, .6 * base], cr > .72 ? .55 : 1];
  }

  // ---------- 3D starfield for the flight ----------
  const STARS = Array.from({ length: 3200 }, () => ({ x: (Math.random() * 2 - 1) * 1.6, y: (Math.random() * 2 - 1) * 1.1, z: Math.random(), c: Math.random() < .2 ? [1, .85, .7] : Math.random() < .5 ? [.75, .82, 1] : [.95, .96, 1] }));

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight; wide = W > 900;
    cw = W < 700 ? 4 : 5; chH = Math.round(cw * 1.75);
    cols = Math.ceil(W / cw); rows = Math.ceil(H / chH); N = cols * rows;
    aI = new Float32Array(N); aR = new Float32Array(N); aG = new Float32Array(N); aB = new Float32Array(N);
    keys = new Uint32Array(N); cix = new Uint8Array(N);
    C.width = W * dpr; C.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    GL.width = W / 2; GL.height = H / 2;
    U = wide ? Math.min(H * .58, W * .34) : Math.min(W * .42, H * .2);
    ox = W * (wide ? .7 : .58); oy = H * (wide ? .5 : .17);
  }

  // add light at a screen point
  function splat(x, y, w, c) {
    const col = (x / cw) | 0, row = (y / chH) | 0;
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    const k = row * cols + col;
    aI[k] += w; if (w > 0) { aR[k] += w * c[0]; aG[k] += w * c[1]; aB[k] += w * c[2]; }
  }
  // fill a disc of cells (sun, planets)
  function ball(px, py, R, fn) {
    const c0 = Math.max(0, ((px - R) / cw) | 0), c1 = Math.min(cols - 1, ((px + R) / cw) | 0);
    const r0 = Math.max(0, ((py - R) / chH) | 0), r1 = Math.min(rows - 1, ((py + R) / chH) | 0);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const dx = ((c + .5) * cw - px) / R, dy = ((r + .5) * chH - py) / R, d = Math.hypot(dx, dy);
      fn(r * cols + c, dx, dy, d);
    }
  }
  const put = (k, w, c) => { aI[k] += w; aR[k] += w * c[0]; aG[k] += w * c[1]; aB[k] += w * c[2]; };

  let mx = 0, my = 0, lastT = 0, glyphs = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  function frame(T) {
    const t = T % LOOP, dt = Math.min(.1, Math.max(0, T - lastT)); lastT = T;
    aI.fill(0); aR.fill(0); aG.fill(0); aB.fill(0);
    // phases
    const aSolar = sstep(13, 16, t) * (1 - sstep(37.5, 40.5, t));
    const aAur = sstep(38, 41, t) * (1 - sstep(55, 58, t));
    const aGal = t < 30 ? 1 - sstep(13, 16, t) : sstep(55, 58, t);
    const zoom = t < 30 ? 1 - sstep(8, 16, t) : 1;                     // 0 = at home, 1 = whole galaxy
    const speed = .035 + .1 * aSolar;
    // a wandering camera for the solar system: smooth random drift in position, distance, tilt and angle
    const wn = (k, f) => vnoise(T * f, k * 7.3) * 2 - 1;
    const camX = wn(1, .06) * .3, camY = wn(2, .05) * .18, camZ = 1 + wn(3, .045) * .38, camInc = .42 + wn(4, .04) * .2, camRot = T * .04 + wn(5, .03) * .9;

    // --- stars: fly forward; fast = streaks
    const F = Math.min(W, H) * .55, scx = ox - mx * 30, scy = oy - my * 20;
    for (const s of STARS) {
      s.z -= speed * dt;
      if (s.z <= .02) { s.z = 1; s.x = (Math.random() * 2 - 1) * 1.6; s.y = (Math.random() * 2 - 1) * 1.1; continue; }
      const px = scx + s.x / s.z * F, py = scy + s.y / s.z * F;
      const b = Math.min(2.4, .35 + (1 - s.z) * 2.4) * (.7 + .3 * Math.sin(T * 1.3 + s.x * 9)) * (1 - aAur * .6);
      splat(px, py, b, s.c);
      if (s.z < .4) for (let j = 1; j < 4; j++) { const zz = s.z + j * (.012 + .03 * aSolar); splat(scx + s.x / zz * F, scy + s.y / zz * F, b * (1 - j / 4) * .7, s.c); }   // short trails on near stars
    }

    // --- solar system: first-person flight out through the planets
    if (aSolar > .01) {
      const u = Math.min(1, Math.max(0, (t - 12.5) / 25)), ew = EWIN(u);
      const F = Math.min(W, H) * (wide ? .62 : .8);
      const camx = .35 * Math.sin(T * .27) * (1 - ew) + mx * .4, camy = 1.35 + .15 * Math.sin(T * .19) - my * .3, camz = pathZ(u);
      // beside Earth the camera turns to hold it in frame and rolls slowly
      const edx = EARTH[1] - camx, edz = EARTH[3] - camz, edy = EARTH[2] - camy;
      const yawE = -Math.atan2(edx, Math.max(.3, -edz)), pitE = Math.atan2(-edy, Math.max(.3, Math.hypot(edx, edz)));
      const yaw = (.07 * Math.sin(T * .23) + .1 * mx) * (1 - ew) + yawE * .85 * ew, cyw = Math.cos(yaw), syw = Math.sin(yaw);
      const pit = .3 * (1 - ew) + pitE * .85 * ew, cp = Math.cos(pit), sp = Math.sin(pit);
      const roll = ew * (.1 + .14 * Math.sin(T * .22)), crl = Math.cos(roll), srl = Math.sin(roll);
      const vx = wide ? W * .66 : ox, vy = wide ? H * .56 : oy * 1.25;
      // world -> screen; returns null behind the camera
      const P = (x, y, z) => { const dx = x - camx, dy = y - camy, dz = z - camz;
        const rx = dx * cyw - dz * syw, rz = dx * syw + dz * cyw;
        const ry = dy * cp - rz * sp, depth = -(dy * sp + rz * cp);
        if (depth < .08) return null;
        const X = rx / depth * F, Y = ry / depth * F;
        return [vx + X * crl - Y * srl, vy - (X * srl + Y * crl), depth]; };
      // camera-space vector (x right, y up, z toward viewer) -> world
      const toWorld = (nx, ny, nz) => { const dy = ny * cp + nz * sp, rz = -ny * sp + nz * cp; return [nx * cyw + rz * syw, dy, -nx * syw + rz * cyw]; };
      // orbit rings on the plane of the system, sweeping under the camera
      for (const R of ORBITS) for (let j = 0; j < 420; j++) {
        const a = j / 420 * 6.2832, q = P(SUN[0] + Math.cos(a) * R, SUN[1], SUN[2] + Math.sin(a) * R);
        if (q) splat(q[0], q[1], Math.min(1.6, 2.6 / q[2]) * .8 * aSolar, [.55, .62, .88]);
      }
      // asteroid belt
      for (const [r, a, h, br] of BELT) { const q = P(SUN[0] + Math.cos(a) * r, SUN[1] + h, SUN[2] + Math.sin(a) * r);
        if (q) splat(q[0], q[1], Math.min(2, 3 / q[2]) * br * aSolar, [.85, .8, .72]); }
      // one textured, sun-lit sphere
      const drawBody = (name, x, y, z, rad, spinRate, atmo) => {
        const q = P(x, y, z); if (!q) return null;
        const R = rad / q[2] * F; if (R < 1.5) { splat(q[0], q[1], 1.2 * aSolar, [.9, .9, .9]); return q; }
        let lx = SUN[0] - x, ly = SUN[1] - y, lz = SUN[2] - z; const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
        const spin = T * spinRate, cs = Math.cos(spin), ss = Math.sin(spin);
        ball(q[0], q[1], R * (atmo ? 1.08 : 1), (k, sdx, sdy, d) => {
          d *= atmo ? 1.08 : 1;
          const ux = (sdx * crl + sdy * srl) * (atmo ? 1.08 : 1), uy = (-sdx * srl + sdy * crl) * (atmo ? 1.08 : 1);   // undo the roll
          if (d >= 1) { if (atmo && d < 1.08) { const n = toWorld(ux / d, -uy / d, 0), li = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
              put(k, (1.4 * li + .15) * (1 - (d - 1) / .08) * aSolar, [.45, .65, 1]); } return; }
          const nz = Math.sqrt(1 - d * d), n = toWorld(ux, -uy, nz);
          const lam = Math.max(0, n[0] * lx + n[1] * ly + n[2] * lz);
          const px = n[0] * cs - n[2] * ss, pz = n[0] * ss + n[2] * cs;
          const [c, alb] = surface(name, px, n[1], pz, T);
          const rim = atmo ? .5 * Math.pow(1 - nz, 2.5) * (lam > 0 ? 1 : .2) : 0;
          put(k, (2.9 * lam * alb + .06) * aSolar, rim ? mix(c, [.5, .7, 1], Math.min(1, rim)) : c);
        });
        return [q[0], q[1], q[2], R];
      };
      for (const [name, x, y, z, rad, spinRate] of PLANETS) {
        const body = drawBody(name, x, y, z, rad, spinRate, name === "earth");
        if (name === "earth") {                                   // the Moon
          const ma = T * .16 + 1.2; drawBody("moon", x + Math.cos(ma) * rad * 2.6, y + .25, z + Math.sin(ma) * rad * 2.6, rad * .27, .05, false);
        }
        if (name === "saturn" && body) {                          // rings with the Cassini gap, hidden behind the planet
          for (let j = 0; j < 30; j++) {
            const rr = 1.25 + j / 29 * 1.05, dens = rr > 1.93 && rr < 2.02 ? 0 : rr < 1.48 ? .3 : rr < 1.93 ? 1 : .65;
            if (!dens) continue;
            for (let i = 0; i < 300; i++) { const a = i / 300 * 6.2832;
              const rq = P(x + Math.cos(a) * rad * rr, y + Math.sin(a) * rad * rr * .42, z + Math.sin(a) * rad * rr * .9);
              if (!rq || (rq[2] > body[2] && Math.hypot(rq[0] - body[0], rq[1] - body[1]) < body[3])) continue;
              splat(rq[0], rq[1], .5 * dens * aSolar, mix([.98, .9, .72], [.78, .66, .5], j / 29)); }
          }
        }
      }
    }

    // --- aurora over a frozen lake: navy sky, ray curtains with a crisp lit edge, a pine treeline, ice with streaked reflections
    if (aAur > .01) {
      const hz = Math.round((wide ? .6 : .46) * rows), ta = T - 38;
      const sky = new Float32Array(cols * hz), skC = new Float32Array(cols * hz * 3);
      const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const EDGE = [.8, 1, 1], LOW = [.22, 1, .88], MID = [.1, .92, .74], HIGH = [.25, .72, 1], PINK = [1, .36, .7], ROSE = [1, .32, .5];
      // edge height, sway, ray length, phase, strength, how much pink at the tops
      const RIB = [[.16, .045, .18, 3.4, .45, 1], [.3, .085, .34, 0, 1, .75], [.47, .05, .22, 1.9, .7, .2]];
      for (const [base, amp, len, ph, st, pink] of RIB) {
        const sx = Math.min(1, Math.max(.45, W / 1200));                                         // fewer, gentler waves on narrow screens
        const yAt = x => (x *= sx, base + amp * Math.sin(x * 4.2 + ta * .12 + ph) + amp * .45 * Math.sin(x * 9.5 - ta * .23 + ph * 2) + .01 * Math.sin(x * 31 + ta * .6));
        for (let c = 0; c < cols; c++) {
          const x = c / cols, yn = yAt(x), yb = yn * rows;
          const slope = Math.abs(yAt(x + .002) - yn) / .002;
          const fold = 1 + 1.3 * sstep(.2, .75, slope);                                         // seen edge-on where it bends: a bright pillar
          const clump = vnoise(c * .04 + ta * .05, ph * 3), stripe = vnoise(c * .42 + ta * .3, ph * 7 + ta * .2);   // broad bundles of thin rays
          const ray = (.12 + 1.9 * Math.pow(clump, 1.3)) * (.15 + 1.7 * Math.pow(stripe, 2.4)) * (.75 + .25 * hash(c, ph * 10 | 0));
          const hgt = Math.max(4, len * rows * (.45 + .9 * vnoise(c * .03 - ta * .08, ph + 9)) * (.6 + .6 * stripe) * Math.sqrt(fold));
          const lit = (.55 + .45 * vnoise(x * 7 + ta * .35, ph * 2)) * (.8 + .2 * Math.sin(ta * .9 + x * 6 + ph));
          const pk = pink * sstep(.35, .7, vnoise(x * 2.2 + ta * .04, ph * 5));
          const topC = mixc(HIGH, mixc(PINK, ROSE, vnoise(x * 5, ph)), pk);
          for (let r = Math.max(0, Math.floor(yb - hgt)); r < Math.min(hz, Math.ceil(yb + 5)); r++) {
            const d = yb - r, f = d / hgt;
            let w, col;
            if (d < 0) { w = Math.exp(d * 1.1) * .9; col = LOW; }                                // soft glow just under the edge
            else {
              const edge = Math.exp(-d * 1.5) * 6.5;                                             // the thin lit hem
              const body = Math.pow(Math.max(0, 1 - f), 1.35 - .85 * pk) * ray * 2.4 * (1 + 1.8 * pk * sstep(.4, .85, f));
              w = edge + body;
              col = d < 1.5 ? EDGE : f < .3 ? mixc(LOW, MID, f / .3) : mixc(MID, topC, sstep(.3, .8, f));
            }
            w *= st * fold * lit * 1.5;
            if (w < .02) continue;
            const k = r * cols + c;
            sky[k] += w; skC[k * 3] += w * col[0]; skC[k * 3 + 1] += w * col[1]; skC[k * 3 + 2] += w * col[2];
          }
        }
      }
      // pointed pines along the far shore
      const tree = c => { const id = Math.floor(c / 5), pos = ((c % 5) + 5) % 5, h = 1 + Math.floor(hash(id, 41) * 4 + (vnoise(c * .05, 6) > .55 ? 2 : 0));
        return Math.max(1, Math.round(h * (1 - Math.abs(pos - 2) / 3))); };
      const isStar = (c, r) => hash(c, r * 7 + 3) > .985;
      // per column: average aurora colour (tints the ice) and how much aurora there is (feeds the streaks on the water)
      const tint = new Float32Array(cols * 3), colW = new Float32Array(cols);
      for (let c = 0; c < cols; c++) { let s0 = 0, s1 = 0, s2 = 0, sw = 0;
        for (let r = 0; r < hz; r++) { const k = r * cols + c; sw += sky[k]; s0 += skC[k * 3]; s1 += skC[k * 3 + 1]; s2 += skC[k * 3 + 2]; }
        colW[c] = Math.min(2.2, sw / (hz * .12));
        tint[c * 3] = sw > .1 ? s0 / sw : .3; tint[c * 3 + 1] = sw > .1 ? s1 / sw : .9; tint[c * 3 + 2] = sw > .1 ? s2 / sw : .8; }
      const NAVY = [.3, .46, 1];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const k = r * cols + c;
        if (r < hz) {
          if (r >= hz - tree(c)) continue;                                                     // silhouette: leave it dark
          const h = r / hz, fill = (.05 + .3 * h * h) * (.7 + .3 * hash(c, r));                // faint navy grain, lighter toward the horizon
          const glow = r > hz - 8 ? 1.1 * Math.pow(1 - (hz - r) / 8, 2) : 0;
          put(k, (fill + glow) * aAur, glow ? [.4, .75, 1] : NAVY);
          if (sky[k] > .02) { const m = sky[k]; put(k, m * aAur, [skC[k * 3] / m, skC[k * 3 + 1] / m, skC[k * 3 + 2] / m]); }
          if (isStar(c, r) && sky[k] < .6) put(k, (1.1 + .8 * Math.sin(T * 2 + c)) * aAur, [.9, .95, 1]);   // stars
          continue;
        }
        // lake: dark water mirroring the sky, ice floes drifting on it
        const dy = (r - hz + 1) / (rows - hz), z = 1 / (dy + .06), u = (c / cols - .5) * z;
        if (r === hz) { put(k, (.7 + .4 * vnoise(c * .3, 1)) * aAur, [.75, .9, 1]); continue; }  // pale snow line on the far shore
        const wob = Math.sin(r * 1.3 - T * 1.9 + vnoise(c * .08, r * .4) * 3) * (.3 + dy * 2.6);
        const mr = hz - 1 - Math.round((r - hz - 1) * .9), mc = Math.min(cols - 1, Math.max(0, Math.round(c + wob)));
        let ref = 0, rcol = [tint[mc * 3], tint[mc * 3 + 1], tint[mc * 3 + 2]];
        if (mr >= 0 && mr < hz - tree(mc)) {
          const mk = mr * cols + mc;
          if (sky[mk] > .03) { const m = sky[mk]; ref = m * .55; rcol = [skC[mk * 3] / m, skC[mk * 3 + 1] / m, skC[mk * 3 + 2] / m]; }
          else if (isStar(mc, mr) && dy < .5) { ref = .7 * (1 - dy * 2); rcol = [.85, .92, 1]; }
        }
        const streak = Math.pow(vnoise(c * .6 + T * .15, r * .035 - T * .2), 2) * 1.6;            // long vertical smears of the aurora's light
        ref += colW[mc] * streak * (1 - .55 * dy);
        put(k, (.16 + .1 * dy) * aAur, [.22, .38, .9]);                                         // the water itself is deep blue, not black
        const n = fbm(u * 2.4 + T * .02, z * 1.5, 1.7), ice = n > .545;
        if (ice) {
          const e = Math.max(0, 1 - (n - .545) / .03);                                         // bright rim along each floe's edge
          const crack = Math.abs(vnoise(u * 3.2, z * 2.4) - .5) < .022 ? .5 : 0;
          const tx = vnoise(u * 7, z * 5) * .35;
          const lum = (1.5 + 1.1 * dy + tx * 1.6 + e * 2 + ref * .4) * (1 - crack);
          put(k, lum * aAur, mixc([.74, .86, 1], rcol, .15 + .25 * e + .15 * Math.min(1, ref)));
        } else if (ref > .03) {
          const band = .7 + .3 * Math.sin(r * 2.3 - T * 2.2 + c * .02);                        // ripples
          put(k, ref * (1.3 - .5 * dy) * band * aAur, rcol);
        } else if (hash(c, r * 13 + (T * 4 | 0)) > .996) put(k, .5 * aAur, [.6, .95, .9]);     // glints
      }
      // shooting star every ~7 s
      const sp = ta % 7; if (sp < .9) { const sx = (.3 + .5 * hash(Math.floor(ta / 7), 3)) * W, sy = .06 * H; for (let j = 0; j < 20; j++) splat(sx + (sp * 280 - j * 6), sy + (sp * 75 - j * 1.6), (1 - j / 20) * 2.4 * aAur, [.9, .95, 1]); }
    }

    // --- galaxy: zoom out from home to the whole disk
    if (aGal > .01) {
      const rot = T * .02, inc = 1.05 + my * .08, roll = -.42 + mx * .06;
      const ci = Math.cos(inc), si = Math.sin(inc), cr = Math.cos(roll), sr = Math.sin(roll);
      const proj = (r, th, h) => { const a = th + rot, x1 = r * Math.cos(a), z1 = r * Math.sin(a), y2 = h * ci - z1 * si; return [x1 * cr - y2 * sr, x1 * sr + y2 * cr]; };
      const S = U * Math.exp(Math.log(7) * (1 - zoom));
      const home = proj(SUN_R, SUN_T, 0);
      const gox = ox + (-home[0] * S) * (1 - zoom), goy = oy - (-home[1] * S) * (1 - zoom);
      const fade = aGal;
      for (let i = 0; i < NP; i++) {
        const a = pt[i] + rot, r = pr[i], x1 = r * Math.cos(a), z1 = r * Math.sin(a), y2 = ph[i] * ci - z1 * si;
        const X = x1 * cr - y2 * sr, Y = x1 * sr + y2 * cr;
        const sx = gox + X * S, sy = goy - Y * S;
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const k = ((sy / chH) | 0) * cols + ((sx / cw) | 0), w = pw[i] * fade * (1 + (1 - zoom) * .6), c = pc[i];
        aI[k] += w; if (w > 0) { aR[k] += w * c[0]; aG[k] += w * c[1]; aB[k] += w * c[2]; }
      }
      // a marker for home while zoomed in
      if (zoom < .9) { const hx = gox + home[0] * S, hy = goy - home[1] * S; splat(hx, hy, 3 * (1 - zoom) * fade, [1, .9, .6]); }
    }

    // --- draw
    cx.fillStyle = "#05060B"; cx.fillRect(0, 0, W, H);
    if (aSolar > .01) {
      const g = cx.createRadialGradient(W * 1.02, H * .05, 0, W * 1.02, H * .05, Math.max(W, H) * .75);
      g.addColorStop(0, `rgba(255,170,90,${.2 * aSolar})`); g.addColorStop(.5, `rgba(255,120,60,${.05 * aSolar})`); g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    if (aAur > .01) {
      const g = cx.createLinearGradient(0, 0, 0, H);
      const hzf = wide ? .6 : .46;   // navy sky, lightest at the horizon, then dark blue water
      g.addColorStop(0, `rgba(4,8,28,${aAur})`); g.addColorStop(hzf * .55, `rgba(9,22,58,${aAur})`); g.addColorStop(hzf, `rgba(22,48,92,${aAur})`);
      g.addColorStop(Math.min(1, hzf + .04), `rgba(8,20,48,${aAur})`); g.addColorStop(1, `rgba(3,8,22,${aAur})`);
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    if (aGal > .01) {
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, U * 1.1);
      g.addColorStop(0, `rgba(255,190,120,${.16 * aGal * zoom})`); g.addColorStop(.35, `rgba(120,130,255,${.06 * aGal})`); g.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    }
    cx.font = `500 ${Math.round(chH * .98)}px "JetBrains Mono",ui-monospace,Menlo,monospace`; cx.textBaseline = "top";
    let n = 0;
    for (let i = 0; i < N; i++) {
      const I = aI[i]; if (I < .08) continue;
      const lum = 1 - Math.exp(-I * .42);
      const ch = Math.round(Math.pow(lum, .9) * (NR - 1)); if (ch < 1) continue;
      const m = (aR[i] + aG[i] + aB[i]) / 3 || 1;
      const hot = Math.max(0, lum - .8) * 3, b = .3 + .85 * lum;
      const r = Math.min(1, (aR[i] / m * .75 * (1 - hot) + hot) * b), gg = Math.min(1, (aG[i] / m * .75 * (1 - hot) + hot) * b), bb = Math.min(1, (aB[i] / m * .75 * (1 - hot) + hot) * b);
      const key = (Math.round(r * 15) << 8) | (Math.round(gg * 15) << 4) | Math.round(bb * 15);
      cix[i] = ch; keys[n++] = ((key << 19) | i) >>> 0;
    }
    glyphs = n;
    const sorted = keys.subarray(0, n).sort();
    let cur = -1;
    for (let j = 0; j < n; j++) {
      const key = sorted[j] >>> 19, i = sorted[j] & 0x7FFFF;
      if (key !== cur) { cur = key; cx.fillStyle = `rgb(${((key >> 8) & 15) * 17},${((key >> 4) & 15) * 17},${(key & 15) * 17})`; }
      cx.fillText(RAMP[cix[i]], (i % cols) * cw, ((i / cols) | 0) * chH);
    }
    gx.clearRect(0, 0, GL.width, GL.height); gx.drawImage(C, 0, 0, GL.width, GL.height);
    GL.style.opacity = (.85 * (1 - .2 * aAur)).toFixed(2);
  }

  let on = true, vis = true, last = 0, clock = +(new URLSearchParams(location.search).get("t")) || 15.5;   // open on the solar-system flight (?t= jumps to a scene)
  new IntersectionObserver(([e]) => { on = e.isIntersecting; }).observe(host);
  document.addEventListener("visibilitychange", () => { vis = !document.hidden; });
  // a stats line under the scene: what is playing, and how much text it took to draw it
  const hud = document.getElementById("hud");
  const scene = t => t < 13 ? "galaxy" : t < 38.5 ? "solar system" : t < 56 ? "aurora" : "galaxy";
  let frames = 0, hudAt = 0;
  function stats(now) {
    if (now - hudAt < 250) return; hudAt = now;
    const t = clock % LOOP;
    if (window.onSkyTick) window.onSkyTick(t, scene(t), LOOP);
    if (!hud) return;
    hud.innerHTML = `<b>${scene(t)}</b>  t ${t.toFixed(1).padStart(4)}s  <span class="x">frame ${String(frames).padStart(5)}  </span>${glyphs.toLocaleString("en-US").padStart(6)} glyphs  <span class="x">${cols}×${rows} grid</span>`;
  }
  window.skyJump = t => { clock = t; };   // let the page jump to a scene
  // 60 fps, falling back to 30 on devices where a frame costs too much; the 2 ms slack stops timer jitter from skipping frames
  let budget = 1000 / 60, cost = 0;
  function loop(now) {
    if (on && vis && now - last >= budget - 2) {
      const s = performance.now();
      clock += Math.min(.1, (now - last) / 1000); frame(clock); last = now; frames++; stats(now);
      cost = cost * .9 + (performance.now() - s) * .1; if (cost > 14) budget = 1000 / 30; else if (cost < 9) budget = 1000 / 60;
    }
    else if (!(on && vis)) last = now;
    requestAnimationFrame(loop);
  }
  addEventListener("resize", resize);
  resize();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    if (still) { lastT = 33; frame(33); if (hud) hud.innerHTML = `<b>solar system</b>  still frame  ${glyphs.toLocaleString("en-US")} glyphs  ${cols}×${rows}`; } else requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });
  });
})();
