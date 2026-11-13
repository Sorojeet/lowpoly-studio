// MEGACITY — overgrown, overpopulated skyline: huge slab towers that can rise in a time-lapse.
// Works on top of assets/city.js (same lots), so "before" and "after" shots are the same place.
//
//   const mega = megacity(city, { n: 60, seed: 3, exclude: ['0,0,0'] });   // towers swallow existing lots
//   mega.rise(20, 110);            // time-lapse: every tower grows out of the ground between two frames (staggered)
//   keepOut: [[x, y, r], ...] leaves gaps (e.g. around the camera) without changing where the other towers stand
//   megatower('hq', [x, y, 0], { w: 26, d: 26, h: 300, seed: 1 })          // a single tower; t.rise(f0, f1); emit(t.windows, 2, frame)
import { THREE, stage, Rand, Buf, mat, group, D } from '../studio/core.js';
import * as P from './palette.js';

const WALLS = ['#5c6068', '#6a6660', '#4f5560', '#70706a', '#585d5a'];

export function megatower(name = 'mega', loc = [0, 0, 0], { w = 22, d = 22, h = 180, seed = 0, lit = 1.4, litFraction = 0.55, crown = true, setback = true } = {}) {
  const r = new Rand(seed + 300), b = new Buf();
  const wi = r.randrange(WALLS.length), wall = mat(`mega_wall${wi}`, WALLS[wi]);
  const winOn = mat('mega_win_on', '#3a4656', { emit: P.WINDOW_LIT, emission: lit }), winOff = mat('mega_win_off', '#232b36', { gloss: 0.6 });
  const dark = mat('mega_dark', '#3a3d44'), beacon = mat('mega_beacon', '#ff3b30', { emission: 5 });
  const tiers = [[1, 0, h * r.uniform(0.55, 0.8)]];
  if (setback && r.random() < 0.75) tiers.push([r.uniform(0.62, 0.8), tiers[0][2], h]); else tiers[0][2] = h;
  for (const [k, z0, z1] of tiers) {
    const tw = w * k, td = d * k;
    b.box(0, 0, z0, tw, td, z1 - z0, 0);
    for (let z = z0 + 5; z < z1 - 4; z += 6.2) {                       // window bands, split into lit / dark runs
      for (const [ax, span, other] of [[0, tw, td], [1, td, tw]]) for (const side of [-1, 1]) {
        const cells = Math.max(2, Math.round(span / 5));
        for (let c = 0; c < cells; c++) {
          const u = ((c + 0.5) / cells - 0.5) * span, len = span / cells - 0.9, mi = r.random() < litFraction ? 1 : 2, o = side * (other / 2 + 0.03);
          if (ax === 0) b.box(u, o, z, len, 0.14, 3.0, mi); else b.box(o, u, z, 0.14, len, 3.0, mi);
        }
      }
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) b.box(sx * (tw / 2 - 0.4), sy * (td / 2 - 0.4), z0, 1.4, 1.4, z1 - z0 + 1.2, 3);   // corner piers
    b.box(0, 0, z1, tw + 0.8, td + 0.8, 0.9, 3);
  }
  if (crown) {
    const k = tiers[tiers.length - 1][0];
    b.box(w * k * 0.15, -d * k * 0.1, h + 0.9, w * k * 0.35, d * k * 0.35, 5, 3);
    b.cyl(-w * k * 0.2, d * k * 0.15, h + 0.9, 0.35, 22, 3, 5, 0.06);
    b.box(-w * k * 0.2, d * k * 0.15, h + 22.9, 0.9, 0.9, 0.9, 4);
  }
  const root = group(loc, null, name);
  root.add(b.mesh([wall, winOn, winOff, dark, beacon], `${name}_mesh`));
  return Object.assign(root, { size: [w, d, h], windows: winOn,
    rise(f0, f1) { stage.A.key(root, 'scale', f0, [1, 1, 0.001]); stage.A.key(root, 'scale', f1, [1, 1, 1]); } });
}

export function megacity(city, { n = 50, seed = 0, minH = 110, maxH = 300, exclude = [], keepOut = [], lit = 1.4, litFraction = 0.55, grow = 5 } = {}) {
  const r = new Rand(seed + 17), ex = new Set(exclude.map(String));
  const lots = city.lots.filter(l => !ex.has(l.id));
  for (let i = lots.length - 1; i > 0; i--) { const j = r.randrange(i + 1); [lots[i], lots[j]] = [lots[j], lots[i]]; }
  const towers = lots.slice(0, n).filter(l => !keepOut.some(k => Math.hypot(k[0] - l.x, k[1] - l.y) < k[2])).map((l, i) => {
    const far = Math.hypot(l.x, l.y) / 300;
    const h = Math.max(l.top + 25, r.uniform(minH, maxH) * (1.1 - 0.35 * Math.min(1, far)));
    return megatower(`mega${i}`, [l.x, l.y, 0], { w: l.w + grow, d: l.d + grow, h, seed: seed * 50 + i, lit, litFraction });
  });
  return { towers,
    /** Staggered construction between f0 and f1 (each tower takes `each` of that span). */
    rise(f0, f1, each = 0.45) { towers.forEach((t, i) => { const a = f0 + (f1 - f0) * (1 - each) * (i / Math.max(1, towers.length - 1)); t.rise(a, a + (f1 - f0) * each); }); } };
}
