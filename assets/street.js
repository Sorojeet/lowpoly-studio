// STREET & OUTDOOR PROPS (PS3 pack). Each returns one mesh/group at `loc`, rotated by `heading` degrees.
//
//   cone  barrier  hydrant  trashCan  dumpster  mailbox  busStop  billboard  sign  fence  crate  barrel
//   powerPole  phoneBooth  vendingMachine  lampPost (with a real light)  campfire (animated)  tent  debris
//
//   S.lampPost('lp', [3, 0, 0], 0, { on: true, light: true });      // light: adds a real spotlight pool
//   const fire = S.campfire('fire', [0, 0, 0]); S.flicker(fire, 1, n);
//   S.billboard('ad', [0, 20, 0], 0, { color: '#c94f4f', lit: 2 });
//   S.fence('f', [[0, 0], [10, 0], [10, 8]], { kind: 'wood' | 'chain' | 'concrete' });
import { THREE, stage, D, Rand, Buf, mat, emit, group, icoGeom } from '../studio/core.js';
import * as P from './palette.js';

class K {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  c(color, o) { const m = mat(`s_${color}${o?.gloss ? 'g' : ''}${o?.emission ? 'e' + o.emission : ''}${o?.opacity ? 'o' : ''}`, color, o); return this.m(m); }
  m(material) { let i = this.mats.indexOf(material); if (i < 0) { i = this.mats.length; this.mats.push(material); } return i; }
  done(loc, heading = 0, extra = {}) {
    const o = this.b.mesh(this.mats, this.name);
    o.position.set(loc[0], loc[1], loc[2] ?? 0); o.rotation.z = heading * D;
    stage.scene.add(o);
    return Object.assign(o, extra);
  }
}
const METAL = '#4a4e57';

export function cone(name = 'cone', loc = [0, 0, 0], heading = 0) {
  const k = new K(name), o = k.c('#f2681e'), w = k.c('#f4f4f0');
  k.b.box(0, 0, 0, 0.42, 0.42, 0.04, o);
  k.b.cyl(0, 0, 0.04, 0.15, 0.22, o, 8, 0.11); k.b.cyl(0, 0, 0.26, 0.11, 0.14, w, 8, 0.085); k.b.cyl(0, 0, 0.4, 0.085, 0.26, o, 8, 0.03);
  return k.done(loc, heading);
}
export function barrier(name = 'barrier', loc = [0, 0, 0], heading = 0, { kind = 'jersey' } = {}) {
  const k = new K(name);
  if (kind === 'jersey') { k.b.box(0, 0, 0, 2.4, 0.6, 0.25, k.c('#b9b4aa')); k.b.box(0, 0, 0.25, 2.4, 0.5, 0.65, k.c('#b9b4aa'), 0.45); }
  else {   // striped roadwork barrier
    for (const sx of [-1, 1]) { k.b.box(sx * 0.9, 0, 0, 0.08, 0.5, 0.06, k.c(METAL)); k.b.box(sx * 0.9, 0, 0, 0.06, 0.06, 1.0, k.c(METAL)); }
    for (let i = 0; i < 8; i++) k.b.box(-0.88 + i * 0.25, 0, 0.72, 0.25, 0.05, 0.22, k.c(i % 2 ? '#f4f4f0' : '#d83a2e'));
  }
  return k.done(loc, heading);
}
export function hydrant(name = 'hydrant', loc = [0, 0, 0], heading = 0, { color = '#d83a2e' } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.5 });
  k.b.cyl(0, 0, 0, 0.16, 0.08, c, 8); k.b.cyl(0, 0, 0.08, 0.11, 0.5, c, 8); k.b.cyl(0, 0, 0.58, 0.13, 0.06, c, 8); k.b.cyl(0, 0, 0.64, 0.1, 0.1, c, 8, 0.03);
  k.b.tube([-0.2, 0, 0.42], [0.2, 0, 0.42], 0.05, c, 6); k.b.tube([0, 0, 0.4], [0, -0.19, 0.4], 0.06, c, 6);
  return k.done(loc, heading);
}
export function trashCan(name = 'trash', loc = [0, 0, 0], heading = 0, { color = '#3f6b52' } = {}) {
  const k = new K(name);
  k.b.cyl(0, 0, 0, 0.26, 0.85, k.c(color), 8, 0.3); k.b.cyl(0, 0, 0.85, 0.32, 0.06, k.c(METAL), 8); k.b.cyl(0, 0, 0.91, 0.2, 0.02, k.c('#15171b'), 8);
  return k.done(loc, heading);
}
export function dumpster(name = 'dumpster', loc = [0, 0, 0], heading = 0, { color = '#2f6f5a', open = false } = {}) {
  const k = new K(name), c = k.c(color), d = k.c('#22262c');
  k.b.box(0, 0, 0.12, 2.0, 1.1, 1.1, c, 1.08);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.cyl(sx * 0.8, sy * 0.4, 0, 0.08, 0.12, d, 6);
  for (const sx of [-1, 1]) k.b.box(sx * 1.12, 0, 0.8, 0.1, 0.5, 0.08, d);
  if (open) k.b.out([0, 0.6, 2]).poly(d, [[-1.08, 0.59, 1.22], [1.08, 0.59, 1.22], [1.08, 0.75, 2.2], [-1.08, 0.75, 2.2]]), k.b.out(null);
  else k.b.box(0, 0, 1.22, 2.2, 1.24, 0.07, d);
  return k.done(loc, heading);
}
export function mailbox(name = 'mailbox', loc = [0, 0, 0], heading = 0, { color = '#2f5fa8' } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.4 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * 0.2, sy * 0.18, 0, 0.05, 0.05, 0.3, k.c(METAL));
  k.b.box(0, 0, 0.3, 0.55, 0.5, 0.75, c); k.b.box(0, 0, 1.05, 0.55, 0.5, 0.18, c, 0.7);
  k.b.box(0, -0.26, 0.9, 0.36, 0.02, 0.05, k.c('#15171b'));
  return k.done(loc, heading);
}
export function busStop(name = 'busstop', loc = [0, 0, 0], heading = 0, { color = '#2f6fb0', lit = 0.6 } = {}) {
  const k = new K(name), fr = k.c(METAL), gl = k.c('#9fc4d8', { gloss: 1, opacity: 0.35 });
  for (const sx of [-1, 1]) for (const sy of [0.55, -0.4]) k.b.box(sx * 1.7, sy, 0, 0.08, 0.08, 2.5, fr);
  k.b.box(0, 0.1, 2.5, 3.8, 1.5, 0.1, k.c(color));
  k.b.box(0, 0.56, 0.35, 3.3, 0.03, 1.9, gl);
  k.b.box(1.7, 0.08, 0.35, 0.03, 0.9, 1.9, k.m(mat(`${name}_ad`, '#f4e9c8', { emission: lit, emit: '#fff0c0' })));
  k.b.box(-0.2, 0.3, 0.42, 2.4, 0.4, 0.07, k.c('#9a6b45'));
  for (const sx of [-1.2, 0.8]) k.b.box(sx, 0.3, 0, 0.06, 0.34, 0.42, fr);
  k.b.box(-2.3, -0.5, 0, 0.06, 0.06, 2.8, fr); k.b.box(-2.3, -0.5, 2.3, 0.5, 0.04, 0.5, k.c(color));
  return k.done(loc, heading);
}
export function billboard(name = 'billboard', loc = [0, 0, 0], heading = 0, { color = '#c94f4f', accent = '#f6f2e8', w = 9, h = 4, lit = 0.4, height = 6 } = {}) {
  const k = new K(name), fr = k.c(METAL), face = k.m(mat(`${name}_face`, color, { emission: lit }));
  for (const sx of [-1, 1]) k.b.box(sx * w * 0.3, 0.2, 0, 0.3, 0.3, height + h, fr);
  k.b.box(0, 0, height, w, 0.2, h, fr); k.b.box(0, -0.12, height + 0.2, w - 0.4, 0.06, h - 0.4, face);
  k.b.box(-w * 0.12, -0.17, height + h * 0.52, w * 0.55, 0.03, h * 0.2, k.m(mat(`${name}_txt`, accent, { emission: lit * 1.5 })));
  k.b.box(-w * 0.2, -0.17, height + h * 0.28, w * 0.38, 0.03, h * 0.1, k.m(mat(`${name}_txt`, accent)));
  k.b.out([0, 0, height]).poly(k.c(accent), [[w * 0.2, -0.17, height + h * 0.2], [w * 0.4, -0.17, height + h * 0.2], [w * 0.3, -0.17, height + h * 0.75]]); k.b.out(null);
  k.b.box(0, -0.6, height - 0.15, w, 1.0, 0.08, fr);
  return k.done(loc, heading, { face: k.mats[face] });
}
/** kind: stop | yield | speed | street | warning | arrow */
export function sign(name = 'sign', loc = [0, 0, 0], heading = 0, { kind = 'stop', height = 2.3 } = {}) {
  const k = new K(name), w = k.c('#f4f4f0'), y = -0.045;
  k.b.cyl(0, 0, 0, 0.035, height + 0.4, k.c(METAL), 6);
  const disc = (n, rad, mi, rot = 0, yy = y) => { const pts = Array.from({ length: n }, (_, i) => { const a = rot + i / n * 2 * Math.PI; return [Math.cos(a) * rad, yy, height + Math.sin(a) * rad]; }); k.b.out([0, 1, height]).poly(mi, pts); k.b.out([0, -1, height]).poly(k.c('#8d9096'), pts.map(p => [p[0], 0.02, p[2]])); k.b.out(null); };
  if (kind === 'stop') { disc(8, 0.38, k.c('#c8201e'), Math.PI / 8); k.b.box(0, y - 0.01, height - 0.06, 0.46, 0.01, 0.12, w); }
  else if (kind === 'yield') { disc(3, 0.45, k.c('#c8201e'), -Math.PI / 2); disc(3, 0.26, w, -Math.PI / 2, y - 0.01); }
  else if (kind === 'speed') { disc(10, 0.36, k.c('#c8201e')); disc(10, 0.27, w, 0, y - 0.01); k.b.box(0, y - 0.02, height - 0.1, 0.24, 0.01, 0.2, k.c('#15171b')); }
  else if (kind === 'warning') { disc(4, 0.45, k.c('#f2c12e')); k.b.box(0, y - 0.01, height - 0.05, 0.06, 0.01, 0.26, k.c('#15171b')); k.b.box(0, y - 0.01, height - 0.2, 0.07, 0.01, 0.07, k.c('#15171b')); }
  else if (kind === 'arrow') { k.b.box(0, y, height - 0.2, 0.9, 0.03, 0.4, k.c('#2f6fb0')); k.b.out([0, 1, 0]).poly(w, [[-0.3, y - 0.02, height - 0.06], [-0.3, y - 0.02, height + 0.06], [0.1, y - 0.02, height + 0.06], [0.1, y - 0.02, height + 0.14], [0.32, y - 0.02, height], [0.1, y - 0.02, height - 0.14], [0.1, y - 0.02, height - 0.06]]); k.b.out(null); }
  else { k.b.box(0.35, 0, height + 0.15, 0.9, 0.03, 0.2, k.c('#2f7a4a')); k.b.rbox(0, 0.35, height - 0.1, 0.9, 0.03, 0.2, Math.PI / 2, k.c('#2f7a4a')); }
  return k.done(loc, heading);
}
/** Fence along a polyline [[x,y],...]. kind: wood | chain | concrete | picket */
export function fence(name = 'fence', path, { kind = 'wood', height = null, z = 0 } = {}) {
  const k = new K(name), h = height ?? { wood: 1.8, chain: 2.2, concrete: 2.4, picket: 1.0 }[kind];
  const wood = k.c(kind === 'picket' ? '#f2efe8' : '#8a6a48'), metal = k.c('#8d9096');
  for (let i = 0; i < path.length - 1; i++) {
    const [a, b] = [path[i], path[i + 1]], len = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const at = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const [mx, my] = at(0.5);
    if (kind === 'concrete') { k.b.rbox(mx, my, z, len, 0.22, h, yaw, k.c('#b9b4aa')); k.b.rbox(mx, my, z + h, len, 0.34, 0.1, yaw, k.c('#9a958c')); continue; }
    const n = Math.max(1, Math.round(len / (kind === 'chain' ? 2.6 : 2.0)));
    for (let p = 0; p <= n; p++) { const [x, y] = at(p / n); k.b.rbox(x, y, z, 0.1, 0.1, h + 0.1, yaw, kind === 'chain' ? metal : wood); }
    if (kind === 'chain') { k.b.rbox(mx, my, z + 0.1, len, 0.02, h - 0.15, yaw, k.c('#aeb4bc', { opacity: 0.4 })); for (const zz of [0.08, h - 0.05]) k.b.rbox(mx, my, z + zz, len, 0.05, 0.05, yaw, metal); }
    else if (kind === 'picket') { const m = Math.round(len / 0.22); for (let p = 0; p < m; p++) { const [x, y] = at((p + 0.5) / m); k.b.rbox(x, y, z + 0.08, 0.12, 0.03, h - 0.08, yaw, wood, 0.6); } for (const zz of [0.3, h * 0.7]) k.b.rbox(mx, my, z + zz, len, 0.05, 0.08, yaw, wood); }
    else { const m = Math.round(len / 0.26); for (let p = 0; p < m; p++) { const [x, y] = at((p + 0.5) / m); k.b.rbox(x, y, z + 0.06, 0.23, 0.03, h - 0.06 - ((p * 7) % 3) * 0.04, yaw, wood); } for (const zz of [0.4, h * 0.75]) k.b.rbox(mx, my, z + zz, len, 0.07, 0.1, yaw, k.c('#6f5238')); }
  }
  return k.done([0, 0, 0], 0);
}
export function crate(name = 'crate', loc = [0, 0, 0], heading = 0, { size = 1, color = '#a8804f' } = {}) {
  const k = new K(name), c = k.c(color), e = k.c('#7a5a36'), s = size;
  k.b.box(0, 0, 0, s, s, s, c);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * (s / 2 - 0.03), sy * (s / 2 - 0.03), 0, 0.09 * s, 0.09 * s, s + 0.01, e);
  for (const zz of [0, s - 0.08 * s]) { k.b.box(0, 0, zz, s + 0.03, 0.08 * s, 0.08 * s, e); k.b.box(0, 0, zz, 0.08 * s, s + 0.03, 0.08 * s, e); for (const sd of [-1, 1]) { k.b.box(0, sd * (s / 2), zz, s + 0.03, 0.04, 0.08 * s, e); k.b.box(sd * (s / 2), 0, zz, 0.04, s + 0.03, 0.08 * s, e); } }
  return k.done(loc, heading);
}
export function barrel(name = 'barrel', loc = [0, 0, 0], heading = 0, { color = '#2f6fb0', fallen = false, fire = false } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.3 }), d = k.c('#2a2d33');
  k.b.cyl(0, 0, 0, 0.29, 0.9, c, 10);
  for (const z of [0, 0.3, 0.6, 0.87]) k.b.cyl(0, 0, z, 0.305, 0.035, d, 10);
  let fm = null;
  if (fire) { fm = mat(`${name}_fire`, '#ff9a2e', { emission: 8, emit: '#ff7a1e' }); const g = icoGeom(0.24, { jitter: 0.3, seed: 2, scale: [1, 1, 1.4] }); g.translate(0, 0, 1.0); k.b.geom(g, k.m(fm)); }
  const o = k.done(loc, heading, { fire: fm });
  if (fallen) { o.rotation.x = Math.PI / 2; o.position.z += 0.3; }
  return o;
}
export function powerPole(name = 'pole', loc = [0, 0, 0], heading = 0, { height = 9 } = {}) {
  const k = new K(name), w = k.c('#6b5038'), g = k.c('#9aa0a8');
  k.b.cyl(0, 0, 0, 0.16, height, w, 6, 0.11);
  for (const [z, wd] of [[height - 0.6, 2.4], [height - 1.5, 1.8]]) { k.b.box(0, 0, z, wd, 0.12, 0.12, w); for (const sx of [-1, 0, 1]) k.b.cyl(sx * wd * 0.42, 0, z + 0.12, 0.05, 0.16, g, 6); }
  k.b.cyl(0.3, 0, height - 2.6, 0.22, 0.7, g, 8);
  return k.done(loc, heading, { top: [loc[0], loc[1], (loc[2] ?? 0) + height - 0.4] });
}
/** Sagging wires between pole tops: wires('w', [pole1.top, pole2.top, ...]) */
export function wires(name, tops, { sag = 0.8, offsets = [-1, 0, 1] } = {}) {
  const k = new K(name), c = k.c('#1d1f24');
  for (let i = 0; i < tops.length - 1; i++) for (const o of offsets) {
    const a = tops[i], b = tops[i + 1], yaw = Math.atan2(b[1] - a[1], b[0] - a[0]), ox = -Math.sin(yaw) * o, oy = Math.cos(yaw) * o;
    let p = [a[0] + ox, a[1] + oy, a[2]];
    for (let s = 1; s <= 6; s++) { const t = s / 6, q = [a[0] + (b[0] - a[0]) * t + ox, a[1] + (b[1] - a[1]) * t + oy, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]; k.b.tube(p, q, 0.018, c, 3); p = q; }
  }
  const o = k.done([0, 0, 0]); o.castShadow = false; return o;
}
export function phoneBooth(name = 'booth', loc = [0, 0, 0], heading = 0, { color = '#c8201e' } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.4 }), gl = k.c('#9fc4d8', { gloss: 1, opacity: 0.35 });
  k.b.box(0, 0, 0, 1.0, 1.0, 0.1, c); k.b.box(0, 0, 2.3, 1.05, 1.05, 0.3, c);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * 0.46, sy * 0.46, 0.1, 0.08, 0.08, 2.2, c);
  for (const sx of [-1, 1]) k.b.box(sx * 0.46, 0, 0.3, 0.02, 0.84, 1.9, gl);
  k.b.box(0, 0.46, 0.3, 0.84, 0.02, 1.9, gl);
  k.b.box(0, 0.36, 1.1, 0.4, 0.14, 0.6, k.c('#22262c'));
  k.b.box(0, -0.5, 2.36, 0.7, 0.02, 0.16, k.c('#f6f2e8', { emission: 0.8 }));
  return k.done(loc, heading);
}
export function vendingMachine(name = 'vending', loc = [0, 0, 0], heading = 0, { color = '#c8201e', lit = 2 } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.5 });
  k.b.box(0, 0, 0, 1.0, 0.8, 1.9, c);
  const front = k.m(mat(`${name}_front`, '#dfeaf2', { emission: lit, emit: '#e8f4ff' }));
  k.b.box(-0.14, -0.41, 0.6, 0.62, 0.03, 1.15, front);
  const cols = ['#e0a02a', '#3f8f6f', '#2f6fb0', '#f4f4f0'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) k.b.cyl(-0.36 + i * 0.15, -0.43, 0.68 + j * 0.27, 0.05, 0.16, k.c(cols[(i + j) % 4]), 6);
  k.b.box(0.34, -0.41, 0.9, 0.2, 0.03, 0.5, k.c('#22262c')); k.b.box(-0.14, -0.41, 0.2, 0.62, 0.03, 0.22, k.c('#22262c'));
  return k.done(loc, heading, { front: k.mats[front] });
}
/** Street lamp. on: bulb glows; light: adds a real spot light pool on the ground (use for a few hero lamps). */
export function lampPost(name = 'lamp', loc = [0, 0, 0], heading = 0, { on = true, light = false, height = 5.5, color = '#ffd9a0', style = 'modern' } = {}) {
  const k = new K(name), p = k.c('#3a3e46'), bulb = k.m(mat(`${name}_bulb`, '#fff1c9', { emit: color, emission: on ? 9 : 0 }));
  k.b.cyl(0, 0, 0, 0.14, 0.5, p, 8, 0.08); k.b.cyl(0, 0, 0.5, 0.07, height - 0.5, p, 6, 0.055);
  let head;
  if (style === 'classic') { k.b.cyl(0, 0, height, 0.2, 0.06, p, 6); k.b.cyl(0, 0, height + 0.06, 0.16, 0.38, bulb, 6, 0.22); k.b.cyl(0, 0, height + 0.44, 0.27, 0.14, p, 6, 0.04); head = [0, 0, height + 0.2]; }
  else { k.b.tube([0, 0, height], [0, -1.3, height + 0.25], 0.045, p, 5); k.b.box(0, -1.45, height + 0.17, 0.3, 0.7, 0.1, p); k.b.box(0, -1.45, height + 0.13, 0.22, 0.56, 0.05, bulb); head = [0, -1.45, height + 0.1]; }
  const o = k.done(loc, heading, { bulb: k.mats[bulb] });
  if (light) {
    const s = new THREE.SpotLight(color, on ? 160 : 0, 28, 1.0, 0.7, 1.6);
    s.position.set(...head); s.target.position.set(head[0], head[1], 0); o.add(s, s.target); o.light = s;
  }
  return o;
}
export function campfire(name = 'campfire', loc = [0, 0, 0], { light = true } = {}) {
  const root = group(loc, null, name), k = new K(`${name}_base`), st = k.c('#7d7a74'), wd = k.c('#4a3626');
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const g = icoGeom(0.14, { jitter: 0.25, seed: i }); g.translate(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.07); k.b.geom(g, st); }
  for (let i = 0; i < 4; i++) { const a = i / 4 * 3.1416 + 0.3; k.b.tube([Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.05], [-Math.cos(a) * 0.3, -Math.sin(a) * 0.3, 0.28], 0.06, wd, 5); }
  const base = k.b.mesh(k.mats, `${name}_base`); root.add(base);
  root.flames = [['#ff5a1e', 0.3, 0.75], ['#ff9a2e', 0.22, 0.6], ['#ffe08a', 0.13, 0.42]].map(([c, rad, h], i) => {
    const b = new Buf(); b.cyl(0, 0, 0, rad, h, 0, 5, 0.01);
    const m = b.mesh([mat(`${name}_flame${i}`, c, { emission: 10 + i * 4, emit: c })]); m.position.z = 0.12; m.castShadow = false; root.add(m); return m;
  });
  if (light) { root.light = new THREE.PointLight('#ff9a4a', 40, 22, 1.8); root.light.position.set(0, 0, 0.9); root.light.castShadow = false; root.add(root.light); }
  return root;
}
/** Flicker a campfire (or any object with .flames / .light) between frames. */
export function flicker(fire, start, end, { seed = 0, base = 40 } = {}) {
  const r = new Rand(seed + 9);
  for (let f = start; f <= end; f += 3) {
    fire.flames?.forEach((m, i) => { stage.A.key(m, 'scale', f, [r.uniform(0.8, 1.15), r.uniform(0.8, 1.15), r.uniform(0.75, 1.3)], 'LINEAR'); stage.A.key(m, 'rotation', f, [r.uniform(-0.12, 0.12), r.uniform(-0.12, 0.12), r.uniform(0, 6)], 'LINEAR'); });
    if (fire.light) stage.A.key(fire.light, 'intensity', f, base * r.uniform(0.7, 1.2), 'LINEAR');
  }
}
export function tent(name = 'tent', loc = [0, 0, 0], heading = 0, { color = '#d9772e', w = 2.4, l = 3.0, h = 1.5 } = {}) {
  const k = new K(name), c = k.m(mat(`s_${color}_ds`, color, { side: THREE.DoubleSide })), d = k.c('#22262c');
  const A = [-w / 2, -l / 2, 0], B = [w / 2, -l / 2, 0], C = [w / 2, l / 2, 0], Dp = [-w / 2, l / 2, 0], T1 = [0, -l / 2, h], T2 = [0, l / 2, h];
  k.b.out([0, 0, 0.3]); k.b.poly(c, [A, Dp, T2, T1]); k.b.poly(c, [B, C, T2, T1]); k.b.poly(c, [Dp, C, T2]);
  k.b.poly(c, [A, [-0.25, -l / 2, 0], T1]); k.b.poly(c, [B, [0.25, -l / 2, 0], T1]); k.b.out(null);
  k.b.out([0, -l, 0.5]).poly(d, [[-0.25, -l / 2 + 0.02, 0], [0.25, -l / 2 + 0.02, 0], [0, -l / 2 + 0.02, h * 0.98]]); k.b.out(null);
  return k.done(loc, heading);
}
/** Scattered trash / papers / bricks for abandoned streets. */
export function debris(name = 'debris', { n = 40, area = [-10, 10, -10, 10], seed = 0, z = 0 } = {}) {
  const r = new Rand(seed + 120), k = new K(name), cols = ['#b9b4aa', '#8a8580', '#e8e4da', '#7a5a48', '#5a5f66'].map(c => k.c(c));
  for (let i = 0; i < n; i++) {
    const x = r.uniform(area[0], area[1]), y = r.uniform(area[2], area[3]), s = r.uniform(0.12, 0.5);
    if (r.random() < 0.35) k.b.rbox(x, y, z + 0.01, s * 1.3, s * 0.9, 0.012, r.uniform(0, 3), cols[2]);     // paper
    else k.b.rbox(x, y, z, s, s * r.uniform(0.5, 1), s * r.uniform(0.2, 0.6), r.uniform(0, 3), r.choice(cols), r.uniform(0.6, 1));
  }
  return k.done([0, 0, 0]);
}
