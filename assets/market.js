// MARKET — supermarket fixtures: shelving (stocked or looted), carts, checkouts, floor litter.
//   shelf('a1', [x, y, 0], heading, { w: 3.6, stock: 0.04, seed: 1 })   // stock 0 = bare, 1 = full; double-sided gondola
//   cart('c1', loc, heading, { tipped: true })    checkout('till', loc, heading)    litter('mess', { n: 60, area: [x0, x1, y0, y1] })
import { THREE, stage, D, Rand, Buf, mat, group } from '../studio/core.js';

class K {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  c(color, o) { const m = mat(`k_${color}${o?.gloss ? 'g' : ''}`, color, o); let i = this.mats.indexOf(m); if (i < 0) { i = this.mats.length; this.mats.push(m); } return i; }
  done(loc, heading = 0) { const o = this.b.mesh(this.mats, this.name); o.position.set(loc[0], loc[1], loc[2] ?? 0); o.rotation.z = heading * D; stage.scene.add(o); return o; }
}
export const GOODS = ['#d94f3d', '#f2c14e', '#3f7fbf', '#4f9d8f', '#e8e4da', '#e8743b', '#7a5fb0', '#8cbf5f'];

export function shelf(name = 'shelf', loc = [0, 0, 0], heading = 0, { w = 3.6, h = 2.0, d = 1.0, levels = 4, stock = 0.05, seed = 0, color = '#d9dde0', accent = '#c8402f' } = {}) {
  const k = new K(name), r = new Rand(seed + 60), c = k.c(color), up = k.c('#8d949b'), ac = k.c(accent);
  k.b.box(0, 0, 0, w, d, 0.16, up); k.b.box(0, 0, 0.16, w, 0.05, h - 0.16, c);                       // plinth + spine
  for (const sx of [-1, 1]) k.b.box(sx * (w / 2 - 0.03), 0, 0.16, 0.06, d * 0.9, h - 0.16, up);
  k.b.box(0, 0, h, w, d * 0.5, 0.05, up);
  for (let l = 0; l < levels; l++) {
    const z = 0.16 + l * (h - 0.3) / levels, dz = (h - 0.3) / levels;
    for (const sy of [-1, 1]) {
      k.b.box(0, sy * d / 4, z, w - 0.1, d / 2, 0.035, c); k.b.box(0, sy * (d / 2 - 0.01), z - 0.02, w - 0.1, 0.02, 0.07, ac);   // shelf + price strip
      for (let x = -w / 2 + 0.2; x < w / 2 - 0.2; x += 0.22) {
        if (r.random() > stock) continue;
        const g = k.c(r.choice(GOODS)), hh = r.uniform(0.12, Math.min(0.34, dz - 0.08));
        if (r.random() < 0.5) k.b.box(x, sy * r.uniform(0.2, d / 2 - 0.1), z + 0.035, 0.16, 0.12, hh, g); else k.b.cyl(x, sy * r.uniform(0.2, d / 2 - 0.1), z + 0.035, 0.06, hh * 0.7, g, 6);
      }
    }
  }
  return k.done(loc, heading);
}

export function cart(name = 'cart', loc = [0, 0, 0], heading = 0, { tipped = false } = {}) {
  const k = new K(name), st = k.c('#b9c0c7', { gloss: 0.8 }), T = (a, b, r = 0.012) => k.b.tube(a, b, r, st, 4);
  const x = 0.26, y0 = -0.45, y1 = 0.45, zb = 0.45, zt = 0.95;
  for (const sx of [-1, 1]) {
    T([sx * x, y0, zt], [sx * x, y1, zt]); T([sx * x * 0.85, y0 * 0.85, zb], [sx * x * 0.85, y1, zb]);
    for (let i = 0; i <= 6; i++) { const y = y0 + (y1 - y0) * i / 6; T([sx * x * (0.85 + 0.15 * 1), y, zt], [sx * x * 0.85, y * (i ? 1 : 0.85) + 0, zb], 0.007); }
    T([sx * x * 0.8, y1 - 0.05, 0.12], [sx * x * 0.8, y0 + 0.1, 0.12]); T([sx * x * 0.8, y1 - 0.05, 0.12], [sx * x, y1, zt + 0.1]);
    for (const y of [y0 + 0.12, y1 - 0.1]) k.b.tube([sx * x * 0.8 - 0.02, y, 0.06], [sx * x * 0.8 + 0.02, y, 0.06], 0.06, k.c('#2a2d33'), 6);
  }
  for (const y of [y0, y1]) { T([-x, y, zt], [x, y, zt]); for (let i = 1; i < 5; i++) T([-x + i * x * 0.4, y, zt], [(-x + i * x * 0.4) * 0.85, y * (y < 0 ? 0.85 : 1), zb], 0.007); }
  k.b.box(0, 0, zb - 0.01, x * 1.7, 0.88, 0.02, st);
  k.b.tube([-x, y1 + 0.03, zt + 0.1], [x, y1 + 0.03, zt + 0.1], 0.02, k.c('#c8402f'), 6);
  const o = k.done(loc, heading);
  if (tipped) { o.rotation.y = 90 * D; o.position.z += 0.27; }
  return o;
}

export function checkout(name = 'till', loc = [0, 0, 0], heading = 0) {
  const k = new K(name), c = k.c('#d9dde0'), dk = k.c('#3a3d44');
  k.b.box(0, 0, 0, 0.9, 2.6, 0.85, c); k.b.box(0, -0.2, 0.85, 0.7, 1.9, 0.03, dk); k.b.box(0, 1.0, 0.85, 0.5, 0.4, 0.3, dk);
  k.b.box(0.1, 1.05, 1.15, 0.36, 0.05, 0.28, k.c('#1b1d22', { gloss: 0.8 })); k.b.cyl(-0.3, 1.2, 0.85, 0.02, 1.2, k.c('#8d949b'), 5); k.b.box(-0.3, 1.2, 2.0, 0.36, 0.08, 0.3, k.c('#c8402f'));
  return k.done(loc, heading);
}

/** Looted-floor mess: crushed boxes, cans, torn paper. */
export function litter(name = 'litter', { n = 50, area = [-5, 5, -5, 5], seed = 0, z = 0 } = {}) {
  const k = new K(name), r = new Rand(seed + 90);
  for (let i = 0; i < n; i++) {
    const x = r.uniform(area[0], area[1]), y = r.uniform(area[2], area[3]), t = r.random(), yaw = r.uniform(0, 3.14);
    if (t < 0.4) k.b.rbox(x, y, z, r.uniform(0.2, 0.5), r.uniform(0.15, 0.35), 0.02, yaw, k.c(r.choice(['#c9b08a', '#e8e4da', '#b89a6a'])));
    else if (t < 0.7) k.b.tube([x, y, z + 0.04], [x + 0.13 * Math.cos(yaw), y + 0.13 * Math.sin(yaw), z + 0.04], 0.04, k.c(r.choice(GOODS)), 6);
    else k.b.rbox(x, y, z, r.uniform(0.15, 0.3), r.uniform(0.1, 0.2), r.uniform(0.05, 0.14), yaw, k.c(r.choice(GOODS)));
  }
  const o = k.done([0, 0, 0]); o.castShadow = false; return o;
}
