(function medusa() {
// medusa.js: a translucent jellyfish, lit from above and printed as text. Every character is placed by this script.
// 1. the body is ~22k points: a pulsing bell with sixteen ribs, four gonads, four frilled oral arms, 48 tentacles
// 2. the bell is see-through, so every point adds light to its text cell instead of hiding what is behind it
// 3. violet light falls from the surface; a teal glow rises from the lower left
// 4. light in each cell picks the character, its mix of colours picks the ink
const RAMP = " .,:;-~=+*xoO0%#&@$";
const A = document.getElementById("ascii"), ax = A.getContext("2d");
const G = document.getElementById("glow"), gx = G.getContext("2d");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
let W, H, cw, chH, cols, rows, N, S, cx, cy, dpr, wide;
let accI, accR, accG, accB, keys, cix;
let mouse = { x: -1e4, y: -1e4 }, snow = [], points = 0;

// ---------- noise (skin shimmer, sway) ----------
function hash(i, j, k) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const fx = x - i, fy = y - j, fz = z - k;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(hash(i, j, k), hash(i + 1, j, k), u), l(hash(i, j + 1, k), hash(i + 1, j + 1, k), u), v),
           l(l(hash(i, j, k + 1), hash(i + 1, j, k + 1), u), l(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), u), v), w);
}
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- light ----------
const VIOLET = [.58, .34, 1], LILAC = [.86, .62, 1], PINK = [1, .46, .86], INDIGO = [.36, .38, 1], TEAL = [.22, 1, .82];

// ---------- anatomy: fixed sample sets, posed every frame ----------
const TH_MAX = 1.78, NT = 48;
const bell = Array.from({ length: 9000 }, () => {
  const th = Math.acos(1 - rnd() * (1 - Math.cos(TH_MAX))), ph = rnd() * 6.2832;
  return [th, ph, Math.pow(Math.abs(Math.cos(ph * 8)), 28)];        // theta, phi, rib strength
});
const gonads = Array.from({ length: 1600 }, (_, i) => [i % 4, rnd() * 6.2832, rnd()]);
const arms = Array.from({ length: 4400 }, (_, i) => [i % 4, Math.pow(rnd(), .8), rnd() * 2 - 1]);
const tent = Array.from({ length: NT }, (_, k) => ({ k, len: 3.1 + rnd() * 1.4, ph: rnd() * 6.28 }));
const TSTEP = 74;

function resize() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const box = document.getElementById("jelly"); W = box.clientWidth; H = box.clientHeight; wide = W > 700;
  cw = W < 700 ? 4 : 5; chH = Math.round(cw * 1.75);
  cols = Math.ceil(W / cw); rows = Math.ceil(H / chH); N = cols * rows;
  accI = new Float32Array(N); accR = new Float32Array(N); accG = new Float32Array(N); accB = new Float32Array(N);
  keys = new Uint32Array(N); cix = new Uint8Array(N);
  A.width = W * dpr; A.height = H * dpr; ax.setTransform(dpr, 0, 0, dpr, 0, 0);
  G.width = W / 2; G.height = H / 2;
  S = Math.min(H * .17, W * .2);
  cx = W * .5; cy = H * .2;
  snow = Array.from({ length: Math.round(N / 220) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: .1 + Math.random() * .35, p: Math.random() * 6.28 }));
}

// body -> screen: spin about the body axis, lean the swim axis, tip toward the camera
let cyaw, syaw, ctl, stl, cpi, spi, bob = 0;
function pose(t) {
  const yaw = t * .12 + (mouse.x > -1e3 ? (mouse.x / W - .5) * .5 : 0), tilt = -.34 + Math.sin(t * .23) * .06, pitch = .32;
  cyaw = Math.cos(yaw); syaw = Math.sin(yaw); ctl = Math.cos(tilt); stl = Math.sin(tilt); cpi = Math.cos(pitch); spi = Math.sin(pitch);
}
function splat(x, y, z, w, c) {
  const x1 = x * cyaw - z * syaw, z1 = x * syaw + z * cyaw;           // spin
  const y2 = y * cpi - z1 * spi, z2 = y * spi + z1 * cpi;             // pitch toward camera
  const X = x1 * ctl - y2 * stl, Y = x1 * stl + y2 * ctl + bob;       // lean
  const col = ((cx + X * S) / cw) | 0, row = ((cy - Y * S) / chH) | 0;
  if (col < 0 || row < 0 || col >= cols || row >= rows) return;
  const i = row * cols + col;
  w *= z2 < 0 ? .62 : 1;                                              // far side is seen through the bell
  const tl = sstep(.6, 3.6, -Y - X * .7) * .85;                       // teal glow from the lower left
  const r = c[0] + (TEAL[0] - c[0]) * tl, g = c[1] + (TEAL[1] - c[1]) * tl, b = c[2] + (TEAL[2] - c[2]) * tl;
  accI[i] += w; accR[i] += w * r; accG[i] += w * g; accB[i] += w * b; points++;
}

// bell surface at (theta, phi), pulse p in 0..1
function bellAt(th, ph, p, t, o) {
  const R = 1 - .13 * p, Hh = .64 + .1 * p, m = sstep(.95, TH_MAX, th);
  const rr = R * Math.sin(th) * (1 - .2 * p * m) + .04 * Math.sin(ph * 8 + t * 1.7) * m;
  o[0] = rr * Math.cos(ph); o[2] = rr * Math.sin(ph);
  o[1] = Hh * Math.cos(th) + .06 * Math.sin(ph * 6 - t * 2.1) * m - .12 * p * m;
  return o;
}

function build(t) {
  points = 0; accI.fill(0); accR.fill(0); accG.fill(0); accB.fill(0);
  const T = 2.7, ph = (t % T) / T, beats = Math.floor(t / T);
  const p = ph < .24 ? sstep(0, .24, ph) : 1 - sstep(.24, 1, ph);    // quick squeeze, slow release
  bob = .16 * Math.sin(t * 2 * Math.PI / T - 1.2) + .08 * Math.sin(t * .31);
  pose(t);
  const o = [0, 0, 0];

  // bell: translucent dome, bright at the silhouette, ribs and margin
  for (const [th, phi, rib] of bell) {
    bellAt(th, phi, p, t, o);
    const sx = Math.sin(th) * Math.cos(phi), sz = Math.sin(th) * Math.sin(phi), sy = Math.cos(th);
    const facing = Math.abs((sx * syaw + sz * cyaw) * cpi + sy * spi);            // normal . view
    const fres = Math.pow(1 - facing, 2.2);
    const mar = sstep(1.5, TH_MAX, th), top = 1 - sstep(0, .9, th);
    const sh = noise(o[0] * 4 + t * .3, o[1] * 4, o[2] * 4);
    const w = .05 + .6 * fres + .5 * rib * (th / TH_MAX) + .55 * mar + .08 * top + .14 * sh;
    splat(o[0], o[1], o[2], w, rib > .3 ? LILAC : th < .55 ? LILAC : VIOLET);
  }
  // gonads: four glowing horseshoes under the crown
  for (const [k, s, r] of gonads) {
    const a = k * Math.PI / 2 + Math.PI / 4 + Math.sin(s) * .38, rad = .34 + .12 * Math.cos(s) + r * .03;
    const y = (.42 + .06 * Math.sin(s * 2)) * (.64 + .1 * p) / .64;
    splat(rad * Math.cos(a) * (1 - .12 * p), y, rad * Math.sin(a) * (1 - .12 * p), .42, PINK);
  }
  // oral arms: four frilled curtains twisting down from the mouth
  for (const [k, u, v] of arms) {
    const L = 2.7 * (1 - .1 * p), y = -.02 - u * L, a0 = k * Math.PI / 2 + .4, spread = .18 * u;
    const sway = .3 * u * Math.sin(t * .7 + k * 1.7 + u * 2.6), swz = .22 * u * Math.cos(t * .55 + k + u * 2.2);
    const a = k * Math.PI / 2 + u * 2.4 + t * .25, wdt = (.08 + .26 * Math.sin(Math.min(1, u * 1.15) * Math.PI)) * (1 + .15 * p);
    const ruf = .1 * Math.sin(v * 7 + u * 26 - t * 2.4) * wdt * 3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const x = ca * v * wdt - sa * ruf + sway + Math.cos(a0) * spread, z = sa * v * wdt + ca * ruf + swz + Math.sin(a0) * spread;
    splat(x, y, z, .22 + 1.3 * Math.pow(Math.abs(v), 3) + .25 * (1 - u), Math.abs(v) > .6 ? PINK : LILAC);
  }
  // tentacles: 48 threads from the margin, trailing and swaying
  for (const { k, len, ph: q } of tent) {
    const phi = k / NT * 6.2832;
    bellAt(TH_MAX, phi, p, t, o);
    const rx = o[0], ry = o[1], rz = o[2];
    for (let j = 0; j < TSTEP; j++) {
      const s = j / TSTEP, d = s * len * (1 + .05 * p);
      const x = rx * (1 - .2 * s) + .6 * s * Math.sin(t * 1.05 - s * 4.2 + q) + .18 * Math.sin(s * 9 - t * 1.7 + q) * s - .35 * s * s;
      const z = rz * (1 - .2 * s) + .55 * s * Math.cos(t * .85 - s * 3.6 + q * 1.3) + .18 * Math.cos(s * 8 - t * 1.4 + q) * s;
      splat(x, ry - d, z, 2.1 * Math.pow(1 - s, .7) + .35, s < .25 ? VIOLET : INDIGO);
    }
  }
  return { beats, p };
}

// ---------- draw ----------
const NR = RAMP.length;
function frame(t) {
  const st = build(t);
  ax.globalCompositeOperation = "source-over";
  ax.fillStyle = "#04050D"; ax.fillRect(0, 0, W, H);
  let g = ax.createRadialGradient(cx, cy, 0, cx, cy, S * 3.2);                 // violet light from above
  g.addColorStop(0, "rgba(140,70,230,.32)"); g.addColorStop(.5, "rgba(90,40,180,.12)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ax.fillStyle = g; ax.fillRect(0, 0, W, H);
  const tx = cx - S * 2.2, ty = cy + S * 4.4;
  g = ax.createRadialGradient(tx, ty, 0, tx, ty, S * 3);                      // teal glow below
  g.addColorStop(0, "rgba(30,190,160,.22)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ax.fillStyle = g; ax.fillRect(0, 0, W, H);

  ax.font = `600 ${Math.round(chH * .98)}px "JetBrains Mono",ui-monospace,Menlo,monospace`; ax.textBaseline = "top";
  for (const f of snow) {                                                     // drifting particles
    f.y -= f.s; f.x += Math.sin(t * .4 + f.p) * .15; if (f.y < 0) { f.y = H; f.x = Math.random() * W; }
    ax.fillStyle = `rgba(150,130,255,${.12 + .1 * Math.sin(t + f.p)})`; ax.fillText(".", f.x, f.y);
  }
  let n = 0, chars = 0;
  for (let i = 0; i < N; i++) {
    const I = accI[i]; if (I < .05) continue;
    const lum = 1 - Math.exp(-I * .34);
    const ci = Math.round(Math.pow(lum, .85) * (NR - 1)); if (ci < 1) continue;
    const hot = Math.max(0, lum - .8) * 3, b = .28 + .9 * lum;
    const r = Math.min(1, (accR[i] / I * (1 - hot) + hot) * b), gg = Math.min(1, (accG[i] / I * (1 - hot) + hot) * b), bb = Math.min(1, (accB[i] / I * (1 - hot) + hot) * b);
    const key = (Math.round(r * 15) << 8) | (Math.round(gg * 15) << 4) | Math.round(bb * 15);
    cix[i] = ci; keys[n++] = ((key << 19) | i) >>> 0;                    // colour in the high bits, cell in the low
  }
  const sorted = keys.subarray(0, n).sort();
  let cur = -1;
  for (let j = 0; j < n; j++) {
    const key = sorted[j] >>> 19, i = sorted[j] & 0x7FFFF, ci = cix[i];
    if (key !== cur) {
      cur = key;
      ax.fillStyle = `rgb(${((key >> 8) & 15) * 17},${((key >> 4) & 15) * 17},${(key & 15) * 17})`;
    }
    ax.fillText(RAMP[ci], (i % cols) * cw, ((i / cols) | 0) * chH); chars++;
  }
  hud.chars = chars; hud.beats = st.beats; hud.p = st.p;
  gx.clearRect(0, 0, G.width, G.height); gx.drawImage(A, 0, 0, G.width, G.height);
}

// ---------- loop, HUD and the code window ----------
const hud = { chars: 0, beats: 0, p: 0 }, $ = id => document.getElementById(id);
let last = 0, start = performance.now(), fpsN = 0, fpsT = 0, visible = true, heroOn = true;
function loop(now) {
  if (visible && heroOn && now - last >= 1000 / 30) {
    const t = (now - start) / 1000;
    frame(t); last = now; fpsN++;
    if (now - fpsT > 500) {
      const fps = Math.round(fpsN * 1000 / (now - fpsT)); fpsN = 0; fpsT = now;
      if ($("j-fps")) $("j-fps").textContent = fps; if ($("j-pts")) $("j-pts").textContent = points.toLocaleString("en-US");
    }
  }
  if (!still) requestAnimationFrame(loop);
}
addEventListener("resize", resize);
addEventListener("pointermove", e => { const r = A.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }, { passive: true });
addEventListener("pointerleave", () => { mouse.x = mouse.y = -1e4; });
document.addEventListener("visibilitychange", () => { visible = !document.hidden; });


resize();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
  if (still) frame(4); else requestAnimationFrame(loop);
});
new IntersectionObserver(([e]) => { heroOn = e.isIntersecting; }).observe(document.getElementById("jelly"));
})();
