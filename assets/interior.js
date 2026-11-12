// INTERIORS (PS3 pack) — a room shell plus furniture, for indoor scenes.
//
//   const r = room('room', [0, 0, 0], { w: 7, d: 6, h: 2.8, wall: '#d9cfc0', floor: '#9a7652', window: true });
//   // the room is open toward -Y (camera side); back wall at +d/2. r.lamp is a ceiling light (emit + real light)
//   sofa  table  chair  bed  tv (screen glows; emit(tv.screen, 4))  bookshelf  floorLamp  rug  plant  desk  fridge  counter
import { THREE, stage, D, Rand, Buf, mat, group, icoGeom } from '../studio/core.js';

class K {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  m(material) { let i = this.mats.indexOf(material); if (i < 0) { i = this.mats.length; this.mats.push(material); } return i; }
  c(color, o) { return this.m(mat(`i_${color}${o?.gloss ? 'g' : ''}${o?.emission ? 'e' + o.emission : ''}`, color, o)); }
  done(loc, heading = 0, extra = {}) {
    const o = this.b.mesh(this.mats, this.name);
    o.position.set(loc[0], loc[1], loc[2] ?? 0); o.rotation.z = heading * D;
    stage.scene.add(o);
    return Object.assign(o, extra);
  }
}

export function room(name = 'room', loc = [0, 0, 0], { w = 7, d = 6, h = 2.8, wall = '#d9cfc0', floor = '#9a7652', window = true, door = true, ceiling = false, light = true, lightColor = '#ffe2b8' } = {}) {
  const k = new K(name), wl = k.c(wall), fl = k.c(floor), fl2 = k.c('#' + new THREE.Color(floor).multiplyScalar(0.8).getHexString()), trim = k.c('#f2efe8'), t = 0.2;
  for (let i = 0; i < Math.round(w / 0.5); i++) k.b.box(-w / 2 + (i + 0.5) * 0.5, 0, -0.1, 0.5, d, 0.1, i % 2 ? fl : fl2);   // floorboards
  // back wall (with window opening) and side walls
  if (window) {
    const ww = w * 0.34, wz = 1.0, wh = 1.3;
    k.b.box(0, d / 2 + t / 2, 0, w, t, wz, wl); k.b.box(0, d / 2 + t / 2, wz + wh, w, t, h - wz - wh, wl);
    for (const sx of [-1, 1]) k.b.box(sx * (w / 4 + ww / 4), d / 2 + t / 2, wz, w / 2 - ww / 2, t, wh, wl);
    k.b.box(0, d / 2 - 0.02, wz - 0.06, ww + 0.2, 0.16, 0.06, trim); k.b.box(0, d / 2 + t / 2, wz + wh / 2 - 0.02, ww, 0.05, 0.04, trim); k.b.box(0, d / 2 + t / 2, wz, 0.05, 0.05, wh, trim);
  } else k.b.box(0, d / 2 + t / 2, 0, w, t, h, wl);
  for (const sx of [-1, 1]) k.b.box(sx * (w / 2 + t / 2), 0, 0, t, d + t * 2, h, wl);
  k.b.box(0, d / 2 - 0.03, 0, w, 0.06, 0.12, trim);
  for (const sx of [-1, 1]) k.b.box(sx * (w / 2 - 0.03), 0, 0, 0.06, d, 0.12, trim);
  if (door) { k.b.box(w / 2 - 0.02, -d * 0.2, 0, 0.06, 0.95, 2.1, k.c('#6b4a33')); k.b.box(w / 2 - 0.06, -d * 0.2 - 0.36, 1.0, 0.05, 0.05, 0.12, k.c('#d8c070', { gloss: 0.8 })); }
  if (ceiling) k.b.box(0, 0, h, w + t * 2, d + t * 2, 0.15, trim);
  const lampM = mat(`${name}_lamp`, '#fff4dc', { emit: lightColor, emission: 4 });
  k.b.cyl(0, 0, h - 0.5, 0.02, 0.5, k.c('#22262c'), 4); k.b.cyl(0, 0, h - 0.75, 0.28, 0.26, k.m(lampM), 8, 0.1);
  const o = k.done(loc, 0, { lamp: lampM, size: [w, d, h] });
  if (light) { o.light = new THREE.PointLight(lightColor, 9, 18, 1.4); o.light.position.set(0, 0, h - 0.9); o.add(o.light); }
  return o;
}

export function sofa(name = 'sofa', loc = [0, 0, 0], heading = 0, { color = '#4f7a8a', w = 2.1 } = {}) {
  const k = new K(name), c = k.c(color), c2 = k.c('#3f6272'), leg = k.c('#3a2c22');
  k.b.box(0, 0, 0.12, w, 0.9, 0.3, c2);
  for (const sx of [-1, 1]) { k.b.box(sx * (w / 4 - 0.02), -0.05, 0.42, w / 2 - 0.2, 0.74, 0.16, c, 0.94); k.b.box(sx * (w / 4 - 0.02), 0.3, 0.5, w / 2 - 0.2, 0.2, 0.5, c, 0.9); k.b.box(sx * (w / 2 - 0.1), 0, 0.12, 0.2, 0.9, 0.58, c2, 0.92); }
  k.b.box(0, 0.4, 0.12, w, 0.14, 0.8, c2);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * (w / 2 - 0.12), sy * 0.36, 0, 0.07, 0.07, 0.12, leg);
  return k.done(loc, heading);
}
export function table(name = 'table', loc = [0, 0, 0], heading = 0, { w = 1.5, d = 0.9, h = 0.75, color = '#8a6a48', round = false } = {}) {
  const k = new K(name), c = k.c(color), l = k.c('#6b4f36');
  if (round) { k.b.cyl(0, 0, h - 0.05, w / 2, 0.05, c, 12); k.b.cyl(0, 0, 0, 0.06, h - 0.05, l, 6); k.b.cyl(0, 0, 0, w * 0.28, 0.04, l, 8); }
  else { k.b.box(0, 0, h - 0.06, w, d, 0.06, c); for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * (w / 2 - 0.07), sy * (d / 2 - 0.07), 0, 0.07, 0.07, h - 0.06, l); }
  return k.done(loc, heading);
}
export function chair(name = 'chair', loc = [0, 0, 0], heading = 0, { color = '#8a6a48', seat = null } = {}) {
  const k = new K(name), c = k.c(color), s = k.c(seat ?? color);
  k.b.box(0, 0, 0.43, 0.44, 0.44, 0.05, s);
  for (const sx of [-1, 1]) { k.b.box(sx * 0.19, -0.19, 0, 0.045, 0.045, 0.43, c); k.b.box(sx * 0.19, 0.19, 0, 0.045, 0.045, 0.95, c); }
  k.b.box(0, 0.19, 0.68, 0.42, 0.035, 0.24, c);
  return k.done(loc, heading);
}
export function bed(name = 'bed', loc = [0, 0, 0], heading = 0, { color = '#5a7fa8', w = 1.5 } = {}) {
  const k = new K(name), fr = k.c('#7a5a40');
  k.b.box(0, 0, 0.12, w, 2.05, 0.2, fr); k.b.box(0, 1.05, 0.12, w + 0.08, 0.08, 0.95, fr); k.b.box(0, -1.03, 0.12, w + 0.08, 0.06, 0.4, fr);
  k.b.box(0, 0, 0.32, w - 0.06, 1.96, 0.2, k.c('#f2efe8'));
  k.b.box(0, -0.28, 0.5, w - 0.02, 1.4, 0.08, k.c(color), 0.97);
  for (const sx of w > 1.3 ? [-0.33, 0.33] : [0]) k.b.box(sx, 0.7, 0.52, 0.55, 0.36, 0.1, k.c('#ffffff'), 0.85);
  return k.done(loc, heading);
}
export function tv(name = 'tv', loc = [0, 0, 0], heading = 0, { on = true, color = '#6fb0ff', stand = true } = {}) {
  const k = new K(name), d = k.c('#17191d', { gloss: 0.6 }), wd = k.c('#6b4f36');
  const screen = k.m(mat(`${name}_screen`, '#10141a', { emit: color, emission: on ? 4 : 0, gloss: 1 }));
  let z = 0;
  if (stand) { k.b.box(0, 0, 0, 1.6, 0.45, 0.5, wd); k.b.box(0, -0.23, 0.08, 1.5, 0.02, 0.34, k.c('#55402c')); z = 0.5; }
  k.b.box(0, 0, z, 0.4, 0.2, 0.04, d); k.b.box(0, 0, z + 0.04, 0.08, 0.05, 0.1, d);
  k.b.box(0, 0, z + 0.14, 1.3, 0.05, 0.76, d); k.b.box(0, -0.03, z + 0.17, 1.24, 0.02, 0.7, screen);
  return k.done(loc, heading, { screen: k.mats[screen] });
}
export function bookshelf(name = 'shelf', loc = [0, 0, 0], heading = 0, { w = 1.2, h = 2.0, seed = 0, color = '#7a5a40' } = {}) {
  const k = new K(name), c = k.c(color), r = new Rand(seed + 5), cols = ['#b83a3a', '#2f6fb0', '#3f8f6f', '#e0a02a', '#7a4fb0', '#e9e4d8', '#3a3d44'];
  k.b.box(0, 0.14, 0, w, 0.03, h, c);
  for (const sx of [-1, 1]) k.b.box(sx * (w / 2 - 0.02), 0, 0, 0.04, 0.3, h, c);
  const n = Math.round(h / 0.4);
  for (let s = 0; s <= n; s++) {
    const z = s * (h - 0.04) / n; k.b.box(0, 0, z, w, 0.3, 0.04, c);
    if (s === n) break;
    let x = -w / 2 + 0.07;
    while (x < w / 2 - 0.12) { const bw = r.uniform(0.035, 0.08), bh = r.uniform(0.2, 0.32); if (r.random() < 0.85) k.b.box(x + bw / 2, -0.02, z + 0.04, bw, 0.2, bh, k.c(r.choice(cols))); x += bw + 0.006; }
  }
  return k.done(loc, heading);
}
export function floorLamp(name = 'flamp', loc = [0, 0, 0], { on = true, light = true, color = '#ffd9a0' } = {}) {
  const k = new K(name), d = k.c('#2a2d33'), sh = k.m(mat(`${name}_shade`, '#f4e6c8', { emit: color, emission: on ? 3 : 0, side: THREE.DoubleSide }));
  k.b.cyl(0, 0, 0, 0.16, 0.03, d, 8); k.b.cyl(0, 0, 0.03, 0.018, 1.45, d, 5); k.b.cyl(0, 0, 1.4, 0.24, 0.3, sh, 8, 0.15);
  const o = k.done(loc, 0, { shade: k.mats[sh] });
  if (light) { o.light = new THREE.PointLight(color, on ? 3 : 0, 10, 1.6); o.light.position.set(0, 0, 1.5); o.add(o.light); }
  return o;
}
export function rug(name = 'rug', loc = [0, 0, 0], heading = 0, { w = 2.4, d = 1.6, color = '#a8483a', border = '#e0c890' } = {}) {
  const k = new K(name); k.b.box(0, 0, 0, w, d, 0.015, k.c(border)); k.b.box(0, 0, 0.015, w - 0.3, d - 0.3, 0.008, k.c(color));
  const o = k.done(loc, heading); o.castShadow = false; return o;
}
export function plant(name = 'plant', loc = [0, 0, 0], { size = 1, seed = 0, pot = '#b0664a' } = {}) {
  const k = new K(name), r = new Rand(seed + 3), g = k.c('#4e8a4a'), g2 = k.c('#6aa85a');
  k.b.cyl(0, 0, 0, 0.16 * size, 0.3 * size, k.c(pot), 8, 0.21 * size);
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + r.uniform(-0.3, 0.3), L = r.uniform(0.45, 0.8) * size, c = Math.cos(a), s = Math.sin(a), up = r.uniform(0.5, 1.0) * size;
    k.b.out([0, 0, -5]).poly(i % 2 ? g : g2, [[c * 0.05 - s * 0.07, s * 0.05 + c * 0.07, 0.3 * size], [c * L * 0.6 - s * 0.1, s * L * 0.6 + c * 0.1, 0.3 * size + up], [c * L, s * L, 0.3 * size + up * 0.8], [c * L * 0.6 + s * 0.1, s * L * 0.6 - c * 0.1, 0.3 * size + up], [c * 0.05 + s * 0.07, s * 0.05 - c * 0.07, 0.3 * size]]); }
  k.b.out(null);
  k.mats.forEach(m => { if (m.name.includes('4e8a4a') || m.name.includes('6aa85a')) m.side = THREE.DoubleSide; });
  return k.done(loc, 0);
}
export function desk(name = 'desk', loc = [0, 0, 0], heading = 0, { computer = true, on = true } = {}) {
  const k = new K(name), c = k.c('#b08a5a'), d = k.c('#17191d', { gloss: 0.5 });
  k.b.box(0, 0, 0.7, 1.4, 0.7, 0.05, c); for (const sx of [-1, 1]) k.b.box(sx * 0.66, 0, 0, 0.05, 0.66, 0.7, c); k.b.box(0.42, 0, 0.3, 0.45, 0.6, 0.4, k.c('#9a7648'));
  let screen = null;
  if (computer) {
    screen = mat(`${name}_screen`, '#10141a', { emit: '#9fd3ff', emission: on ? 4 : 0, gloss: 1 });
    k.b.box(0, 0.18, 0.75, 0.22, 0.14, 0.02, d); k.b.box(0, 0.2, 0.77, 0.04, 0.03, 0.12, d); k.b.box(0, 0.2, 0.86, 0.62, 0.03, 0.38, d); k.b.box(0, 0.18, 0.88, 0.57, 0.012, 0.34, k.m(screen));
    k.b.box(0, -0.1, 0.75, 0.42, 0.14, 0.015, d); k.b.box(0.34, -0.1, 0.75, 0.06, 0.1, 0.025, d);
  }
  return k.done(loc, heading, { screen });
}
export function fridge(name = 'fridge', loc = [0, 0, 0], heading = 0, { color = '#e6e8ea' } = {}) {
  const k = new K(name), c = k.c(color, { gloss: 0.6 }), h = k.c('#8d9096', { gloss: 0.8 });
  k.b.box(0, 0, 0, 0.75, 0.7, 1.85, c); k.b.box(0, -0.355, 1.22, 0.75, 0.012, 0.015, k.c('#9a9ea4'));
  k.b.box(-0.3, -0.37, 1.3, 0.03, 0.03, 0.35, h); k.b.box(-0.3, -0.37, 0.7, 0.03, 0.03, 0.45, h);
  return k.done(loc, heading);
}
export function counter(name = 'counter', loc = [0, 0, 0], heading = 0, { w = 2.4, color = '#e9e4d8', top = '#4a4d55', sink = true } = {}) {
  const k = new K(name), c = k.c(color), t = k.c(top, { gloss: 0.5 }), h = k.c('#8d9096', { gloss: 0.8 });
  k.b.box(0, 0, 0.1, w, 0.6, 0.78, c); k.b.box(0, 0.02, 0, w, 0.52, 0.1, k.c('#3a3d44')); k.b.box(0, -0.02, 0.88, w + 0.04, 0.66, 0.04, t);
  const n = Math.round(w / 0.6);
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; k.b.box(x, -0.305, 0.16, w / n - 0.04, 0.012, 0.66, k.c('#f6f3ec')); k.b.box(x, -0.32, 0.72, 0.14, 0.02, 0.02, h); }
  if (sink) { k.b.box(w * 0.2, -0.02, 0.905, 0.5, 0.38, 0.012, h); k.b.tube([w * 0.2, 0.2, 0.92], [w * 0.2, 0.2, 1.15], 0.015, h, 5); k.b.tube([w * 0.2, 0.2, 1.15], [w * 0.2, 0.06, 1.13], 0.015, h, 5); }
  return k.done(loc, heading);
}
