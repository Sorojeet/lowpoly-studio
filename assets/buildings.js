// BUILDINGS (PS3 pack) — detailed street-level buildings for close and mid shots.
// (assets/city.js is still the tool for a whole skyline; these are the hero buildings in front of it.)
// Every builder returns the root group, front door facing -Y, origin at ground centre, with:
//   b.windows (emissive material -> emit(b.windows, 2, frame) to light it), b.size [w, d, h]
//
//   house('h1', [0, 0, 0], 0, { color: '#e8d9c4', roof: '#a8483a', floors: 2, seed: 1 })
//   shop('cafe', [12, 0, 0], 0, { sign: '#c94f4f', awning: '#2f6f73', floors: 2 })
//   apartment('apt', [...], 0, { floors: 6, balconies: true })     office('tower', [...], 0, { floors: 14 })
//   warehouse('wh', [...])    gasStation('gas', [...])    ruin('r1', [...], 0, { floors: 3 })
//   streetRow('row', [x, y, 0], { n: 6, seed: 3 })   -> a whole terraced street of mixed buildings
//   road([[x0, y0], [x1, y1]], { width: 8 })          sidewalk / lot helpers: slab(...)
import { THREE, stage, D, Rand, Buf, mat, group } from '../studio/core.js';
import * as P from './palette.js';

const FL = 3.1;   // floor height
class B {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  m(material) { let i = this.mats.indexOf(material); if (i < 0) { i = this.mats.length; this.mats.push(material); } return i; }
  c(color, o) { return this.m(mat(`b_${color}${o?.gloss ? 'g' : ''}${o?.emission ? 'e' + o.emission : ''}`, color, o)); }
  done(loc, heading, extra = {}) {
    const root = group(loc, null, this.name);
    root.rotation.z = heading * D;
    root.add(this.b.mesh(this.mats, `${this.name}_mesh`));
    return Object.assign(root, extra);
  }
}
const winMat = (name, lit) => mat(`${name}_win`, '#24303e', { emit: P.WINDOW_LIT, emission: lit ?? 0, gloss: 0.9 });

/** Window with frame + sill on a wall. face: 'S' (-Y), 'N', 'E', 'W'. (u = position along the wall) */
function win(k, face, u, z, w, h, half, wi, frame, depth = 0.06) {
  const put = (du, dz, sw, sh, out, mi) => {
    const o = half + out / 2 - 0.01;
    if (face === 'S') k.b.box(u + du, -o, z + dz, sw, out, sh, mi);
    else if (face === 'N') k.b.box(u + du, o, z + dz, sw, out, sh, mi);
    else if (face === 'E') k.b.box(o, u + du, z + dz, out, sw, sh, mi);
    else k.b.box(-o, u + du, z + dz, out, sw, sh, mi);
  };
  put(0, 0, w, h, depth, wi);
  put(0, -0.08, w + 0.2, 0.08, depth + 0.1, frame);          // sill
  put(0, h, w + 0.12, 0.07, depth + 0.04, frame);            // lintel
  put(0, h * 0.5 - 0.02, w, 0.04, depth + 0.03, frame);      // glazing bar
}
function windowGrid(k, w, d, floors, z0, wi, frame, { skipFront = 0, cols = null, wh = [1.1, 1.4], faces = 'SNEW' } = {}) {
  for (let fl = 0; fl < floors; fl++) {
    const z = z0 + fl * FL + 0.95;
    for (const face of faces) {
      const span = face === 'S' || face === 'N' ? w : d, half = (face === 'S' || face === 'N' ? d : w) / 2;
      const n = cols ?? Math.max(1, Math.floor(span / 2.6));
      if (face === 'S' && fl < skipFront) continue;
      for (let c = 0; c < n; c++) win(k, face, ((c + 0.5) / n - 0.5) * span, z, wh[0], wh[1], half, wi, frame);
    }
  }
}
function door(k, x, yFront, z, { w = 1.1, h = 2.2, color = '#5a3d2b', frame = '#e9e4d8', step = true } = {}) {
  k.b.box(x, yFront - 0.03, z, w, 0.08, h, k.c(color));
  k.b.box(x, yFront - 0.05, z + h, w + 0.3, 0.12, 0.14, k.c(frame));
  for (const sx of [-1, 1]) k.b.box(x + sx * (w / 2 + 0.07), yFront - 0.05, z, 0.14, 0.12, h, k.c(frame));
  k.b.box(x + w * 0.32, yFront - 0.09, z + h * 0.45, 0.06, 0.05, 0.06, k.c('#d8c070', { gloss: 0.8 }));
  if (step) k.b.box(x, yFront - 0.45, 0, w + 0.8, 0.9, z, k.c('#b9b2a6'));
}
/** Gabled roof along X with overhang. */
function gable(k, w, d, z, rise, mi, wallMi, over = 0.35) {
  const hw = w / 2 + over, hd = d / 2 + over, b = k.b;
  b.out([0, 0, z]).poly(mi, [[-hw, -hd, z], [hw, -hd, z], [hw, 0, z + rise], [-hw, 0, z + rise]]);
  b.poly(mi, [[-hw, hd, z], [hw, hd, z], [hw, 0, z + rise], [-hw, 0, z + rise]]);
  b.out(null);
  for (const sx of [-1, 1]) b.out([0, 0, z]).poly(wallMi, [[sx * w / 2, -d / 2, z], [sx * w / 2, d / 2, z], [sx * w / 2, 0, z + rise * (d / 2) / hd]]);
  b.out([0, 0, z + 10]).poly(mi, [[-hw, -hd, z - 0.001], [hw, -hd, z - 0.001], [hw, hd, z - 0.001], [-hw, hd, z - 0.001]]);
  b.out(null);
  // fascia thickness
  b.box(0, -hd, z - 0.1, hw * 2, 0.08, 0.14, mi); b.box(0, hd, z - 0.1, hw * 2, 0.08, 0.14, mi);
}
function roofClutter(k, w, d, z, r, n = 3) {
  const grey = k.c('#8d9096'), dark = k.c('#4a4d55');
  for (let i = 0; i < n; i++) {
    const x = r.uniform(-w / 2 + 1.2, w / 2 - 1.2), y = r.uniform(-d / 2 + 1.2, d / 2 - 1.2);
    if (r.random() < 0.6) { k.b.box(x, y, z, 1.3, 0.9, 0.8, grey); k.b.cyl(x, y, z + 0.8, 0.3, 0.08, dark, 8); }
    else k.b.cyl(x, y, z, 0.18, 1.1, dark, 6);
  }
}

// ------------------------------------------------------------------ house
export function house(name = 'house', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? r.uniform(7, 9), d = o.d ?? r.uniform(6, 7.5), floors = o.floors ?? r.choice([1, 2, 2]);
  const wall = k.c(o.color ?? r.choice(['#e8d9c4', '#d9c3a5', '#c7ccd3', '#e2b9a0', '#bfc9b5', '#f0e6d6'])), trim = k.c('#f2efe8');
  const roof = k.c(o.roof ?? r.choice(['#a8483a', '#5a5f6b', '#7a4a36', '#3f5a52'])), wi = k.m(winMat(name, o.lit));
  const h = floors * FL, base = 0.3;
  k.b.box(0, 0, 0, w + 0.2, d + 0.2, base, k.c('#9a958c'));
  k.b.box(0, 0, base, w, d, h, wall);
  gable(k, w, d, base + h, w * 0.26, roof, wall);
  const dx = r.choice([-1, 1]) * w * 0.22;
  door(k, dx, -d / 2, base, { color: o.door ?? r.choice(['#5a3d2b', '#8a2f2f', '#2f4a6b', '#3f5a3f']) });
  // porch roof
  k.b.box(dx, -d / 2 - 0.7, base + 2.5, 2.4, 1.5, 0.12, roof);
  for (const sx of [-1, 1]) k.b.cyl(dx + sx * 1.05, -d / 2 - 1.3, base, 0.07, 2.5, trim, 6);
  for (let fl = 0; fl < floors; fl++) {
    const z = base + fl * FL + 1.0;
    for (const x of [-w * 0.3, 0, w * 0.3]) { if (fl === 0 && Math.abs(x - dx) < 1.2) continue; win(k, 'S', x, z, 1.1, 1.3, d / 2, wi, trim); }
    for (const x of [-w * 0.25, w * 0.25]) win(k, 'N', x, z, 1.1, 1.3, d / 2, wi, trim);
    for (const f of 'EW') win(k, f, 0, z, 1.1, 1.3, w / 2, wi, trim);
  }
  k.b.box(-w * 0.28, d * 0.12, base + h + w * 0.1, 0.7, 0.7, w * 0.26 + 0.2, k.c('#8a5a48'));   // chimney
  return k.done(loc, heading, { windows: k.mats[wi], size: [w, d, base + h + w * 0.26] });
}

// ------------------------------------------------------------------ shop (glass front, awning, sign, flats above)
export function shop(name = 'shop', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? 8, d = o.d ?? 9, floors = o.floors ?? r.choice([2, 3]);
  const wall = k.c(o.color ?? r.choice(P.BUILDINGS)), trim = k.c('#f2efe8'), wi = k.m(winMat(name, o.lit));
  const signC = o.sign ?? r.choice(['#c94f4f', '#2f6fb0', '#3f8f6f', '#e0a02a', '#7a4fb0']);
  const awn = o.awning ?? r.choice(['#2f6f73', '#b83a3a', '#e0c070', '#3a4a7a']);
  const h = floors * FL + 0.6;
  k.b.box(0, 0, 0, w, d, h, wall);
  k.b.box(0, 0, h, w + 0.3, d + 0.3, 0.3, k.c('#77736d'));                 // parapet
  k.b.box(0, 0, h + 0.3, w - 0.4, d - 0.4, 0.02, k.c(P.ROOF));
  // shop front
  const glass = k.m(mat(`${name}_front`, '#2a3c4c', { emit: '#ffe2a8', emission: o.lit ?? 0.15, gloss: 1 }));
  k.b.box(-w * 0.14, -d / 2 - 0.02, 0.5, w * 0.58, 0.08, 2.2, glass);
  k.b.box(-w * 0.14, -d / 2 - 0.05, 0.2, w * 0.62, 0.14, 0.3, k.c('#3a3d44'));
  door(k, w * 0.3, -d / 2, 0.15, { color: '#2e3138', h: 2.4, w: 1.2 });
  k.b.box(0, -d / 2 - 0.1, 3.05, w - 0.6, 0.2, 0.75, k.m(mat(`${name}_sign`, signC, { emission: o.signGlow ?? 0.5 })));
  k.b.box(0, -d / 2 - 0.22, 3.25, w * 0.5, 0.05, 0.3, k.c('#f6f2e8', { emission: 0.8 }));     // lettering block
  // awning: sloped slab with stripes
  const b = k.b, ya = -d / 2, a1 = k.c(awn), a2 = k.c('#f2efe8');
  for (let s = 0; s < 8; s++) {
    const x0 = -w / 2 + 0.3 + s * (w - 0.6) / 8, x1 = x0 + (w - 0.6) / 8;
    b.out([0, ya, 0]).poly(s % 2 ? a2 : a1, [[x0, ya - 0.05, 2.95], [x1, ya - 0.05, 2.95], [x1, ya - 1.5, 2.45], [x0, ya - 1.5, 2.45]]);
    b.poly(s % 2 ? a2 : a1, [[x0, ya - 1.5, 2.45], [x1, ya - 1.5, 2.45], [x1, ya - 1.5, 2.25], [x0, ya - 1.5, 2.25]]);
  }
  b.out(null);
  windowGrid(k, w, d, floors - 1, FL + 0.6, wi, trim, { faces: 'SN' });
  roofClutter(k, w, d, h + 0.3, r, 2);
  return k.done(loc, heading, { windows: k.mats[wi], front: k.mats[glass], size: [w, d, h] });
}

// ------------------------------------------------------------------ apartment block
export function apartment(name = 'apt', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? 14, d = o.d ?? 11, floors = o.floors ?? r.randint(4, 8);
  const wall = k.c(o.color ?? r.choice(P.BUILDINGS)), trim = k.c('#e9e4d8'), wi = k.m(winMat(name, o.lit));
  const h = floors * FL + 0.4;
  k.b.box(0, 0, 0, w + 0.3, d + 0.3, 0.4, k.c('#8f8a82'));
  k.b.box(0, 0, 0.4, w, d, h - 0.4, wall);
  for (let fl = 1; fl < floors; fl++) k.b.box(0, 0, 0.4 + fl * FL - 0.1, w + 0.12, d + 0.12, 0.14, trim);   // floor bands
  k.b.box(0, 0, h, w + 0.4, d + 0.4, 0.5, trim);
  k.b.box(0, 0, h + 0.5, w - 0.6, d - 0.6, 0.02, k.c(P.ROOF));
  door(k, 0, -d / 2, 0.4, { w: 1.8, h: 2.4, color: '#2e3138' });
  k.b.box(0, -d / 2 - 0.9, 2.95, 3.4, 1.8, 0.14, trim);
  const cols = Math.floor(w / 2.8);
  for (let fl = 0; fl < floors; fl++) {
    const z = 0.4 + fl * FL + 0.9;
    for (let c = 0; c < cols; c++) {
      const u = ((c + 0.5) / cols - 0.5) * w;
      if (fl === 0 && Math.abs(u) < 2) continue;
      win(k, 'S', u, z, 1.3, 1.5, d / 2, wi, trim);
      if ((o.balconies ?? true) && fl > 0 && c % 2 === (floors + cols) % 2) {   // balcony
        k.b.box(u, -d / 2 - 0.55, z - 0.3, 2.0, 1.1, 0.12, trim);
        k.b.box(u, -d / 2 - 1.07, z - 0.18, 2.0, 0.06, 0.85, k.c('#4a4d55'));
        for (const sx of [-1, 1]) k.b.box(u + sx * 0.97, -d / 2 - 0.55, z - 0.18, 0.06, 1.1, 0.85, k.c('#4a4d55'));
      }
      win(k, 'N', u, z, 1.3, 1.5, d / 2, wi, trim);
    }
    for (const f of 'EW') for (const u of [-d * 0.25, d * 0.25]) win(k, f, u, z, 1.2, 1.5, w / 2, wi, trim);
  }
  roofClutter(k, w, d, h + 0.5, r, 4);
  k.b.cyl(w * 0.3, d * 0.2, h + 0.5, 1.1, 1.9, k.c('#8b6f55'), 8);
  return k.done(loc, heading, { windows: k.mats[wi], size: [w, d, h] });
}

// ------------------------------------------------------------------ office tower (glass curtain wall)
export function office(name = 'office', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? 16, d = o.d ?? 16, floors = o.floors ?? r.randint(10, 18);
  const frame = k.c(o.color ?? r.choice(['#c7ccd3', '#a9b8c6', '#8d98a6', '#e8e4dc']));
  const glass = k.m(mat(`${name}_glass`, o.glass ?? '#5f8fb0', { emit: P.WINDOW_LIT, emission: o.lit ?? 0, gloss: 1 }));
  const h = floors * FL;
  k.b.box(0, 0, 0, w + 0.6, d + 0.6, 4.2, frame);                              // lobby plinth
  k.b.box(0, -d / 2 - 0.32, 0.3, w * 0.6, 0.08, 3.3, glass);
  k.b.box(0, -d / 2 - 1.2, 3.7, w * 0.5, 2.4, 0.2, frame);
  k.b.box(0, 0, 4.2, w - 0.3, d - 0.3, h, glass);                              // glass body
  for (let fl = 0; fl <= floors; fl++) k.b.box(0, 0, 4.2 + fl * FL - 0.12, w, d, 0.24, frame);   // spandrels
  const nx = Math.round(w / 3.2), ny = Math.round(d / 3.2);
  for (let c = 0; c <= nx; c++) for (const sy of [-1, 1]) k.b.box((c / nx - 0.5) * (w - 0.3), sy * (d / 2 - 0.1), 4.2, 0.3, 0.3, h, frame);
  for (let c = 1; c < ny; c++) for (const sx of [-1, 1]) k.b.box(sx * (w / 2 - 0.1), (c / ny - 0.5) * (d - 0.3), 4.2, 0.3, 0.3, h, frame);
  k.b.box(0, 0, 4.2 + h, w * 0.5, d * 0.5, 2.6, frame);
  k.b.cyl(w * 0.15, 0, 4.2 + h + 2.6, 0.12, 7, k.c('#4a4d55'), 5, 0.03);
  const beacon = k.m(mat(`${name}_beacon`, '#ff3b30', { emission: 4 }));
  k.b.box(w * 0.15, 0, 4.2 + h + 9.6, 0.3, 0.3, 0.3, beacon);
  roofClutter(k, w, d, 4.2 + h, r, 3);
  return k.done(loc, heading, { windows: k.mats[glass], beacon: k.mats[beacon], size: [w, d, 4.2 + h] });
}

// ------------------------------------------------------------------ warehouse / factory
export function warehouse(name = 'warehouse', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? 22, d = o.d ?? 14, h = o.h ?? 7;
  const wall = k.c(o.color ?? '#9aa3a8'), roof = k.c(o.roof ?? '#5a6570'), trim = k.c('#3f454d'), wi = k.m(winMat(name, o.lit));
  k.b.box(0, 0, 0, w, d, h, wall);
  gable(k, w, d, h, 2.2, roof, wall, 0.3);
  for (let i = 0; i < 3; i++) {   // roller doors
    const x = (i - 1) * w * 0.28;
    k.b.box(x, -d / 2 - 0.03, 0, 4, 0.1, 4.4, k.c(i === 1 && o.open ? '#15171b' : '#c9c4b8'));
    for (let s = 1; s < 8; s++) k.b.box(x, -d / 2 - 0.09, s * 0.55, 4, 0.03, 0.04, trim);
    k.b.box(x, -d / 2 - 0.08, 4.4, 4.4, 0.16, 0.25, trim);
  }
  for (let c = 0; c < 7; c++) for (const f of 'SN') win(k, f, ((c + 0.5) / 7 - 0.5) * w, 5.3, 2.0, 0.9, d / 2, wi, trim);
  if (o.chimney ?? true) { k.b.cyl(w * 0.36, d * 0.2, h, 0.9, 11, k.c('#8a5a48'), 8, 0.6); k.b.cyl(w * 0.36, d * 0.2, h + 10, 0.66, 1.0, k.c('#e9e4d8'), 8, 0.62); }
  return k.done(loc, heading, { windows: k.mats[wi], size: [w, d, h + 2.2], stackTop: [w * 0.36, d * 0.2, h + 11] });
}

// ------------------------------------------------------------------ gas station
export function gasStation(name = 'gas', loc = [0, 0, 0], heading = 0, o = {}) {
  const k = new B(name), accent = k.c(o.color ?? '#d83a2e'), white = k.c('#f2f0ea'), grey = k.c('#8d9096');
  const wi = k.m(mat(`${name}_front`, '#2a3c4c', { emit: '#ffe2a8', emission: o.lit ?? 0.2, gloss: 1 }));
  k.b.box(0, 9, 0, 13, 7, 3.6, white);                                         // kiosk
  k.b.box(0, 9, 3.6, 13.4, 7.4, 0.5, accent);
  k.b.box(-1.5, 5.48, 0.5, 7, 0.08, 2.3, wi);
  door(k, 4, 5.5, 0.05, { color: '#2e3138', step: false });
  const lamp = k.m(mat(`${name}_canopy_light`, '#fff7e0', { emission: o.lit ? 6 : 1.2 }));
  k.b.box(0, -1, 4.6, 15, 8, 0.7, white);                                      // canopy
  k.b.box(0, -1, 4.55, 15.1, 8.1, 0.25, accent);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * 3.2, -1 + sy * 2, 4.5, 2.2, 1.0, 0.06, lamp);
  for (const sx of [-1, 1]) {
    k.b.box(sx * 5.5, -1, 0, 0.45, 0.45, 4.6, grey);
    k.b.box(sx * 2.6, -1, 0, 2.4, 5.5, 0.18, grey);                            // island
    for (const sy of [-1.5, 1.5]) {                                            // pumps
      k.b.box(sx * 2.6, -1 + sy, 0.18, 0.9, 0.55, 1.6, white);
      k.b.box(sx * 2.6, -1 + sy, 1.78, 0.95, 0.6, 0.3, accent);
      k.b.box(sx * 2.6, -1 + sy - 0.29, 1.2, 0.5, 0.03, 0.35, k.c('#16181d', { emission: 0.2, gloss: 1 }));
    }
  }
  k.b.box(-9.5, -5.5, 0, 0.4, 0.4, 7, grey);                                   // price sign
  k.b.box(-9.5, -5.5, 4.6, 2.6, 0.4, 2.8, k.m(mat(`${name}_sign`, o.color ?? '#d83a2e', { emission: 1.2 })));
  k.b.box(-9.5, -5.72, 5.0, 2.0, 0.05, 0.5, k.c('#f6f2e8', { emission: 1 }));
  return k.done(loc, heading, { windows: k.mats[wi], lamps: k.mats[lamp], size: [15, 20, 5.3] });
}

// ------------------------------------------------------------------ ruin (broken walls, rubble) for post-apocalypse scenes
export function ruin(name = 'ruin', loc = [0, 0, 0], heading = 0, o = {}) {
  const r = new Rand(o.seed ?? 0), k = new B(name);
  const w = o.w ?? 12, d = o.d ?? 10, floors = o.floors ?? 3;
  const wall = k.c(o.color ?? '#b5ada0'), inner = k.c('#7d766c'), dark = k.c('#22262c'), rebar = k.c('#5a3a2a');
  const seg = 1.5;
  const wallRun = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.round(len / seg), yaw = Math.atan2(y1 - y0, x1 - x0);
    let hgt = floors * FL * r.uniform(0.5, 1);
    for (let i = 0; i < n; i++) {
      hgt = Math.max(0.8, Math.min(floors * FL, hgt + r.uniform(-2.2, 2.0)));
      const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      k.b.rbox(x, y, 0, seg + 0.02, 0.4, hgt, yaw, wall, 1);
      k.b.rbox(x, y, hgt, seg * 0.7, 0.3, r.uniform(0.2, 0.7), yaw + r.uniform(-0.1, 0.1), inner, 0.6);
      for (let fl = 0; fl < floors; fl++) if (hgt > fl * FL + 2.6 && i % 2 === 1) k.b.rbox(x, y, fl * FL + 1.0, 0.9, 0.46, 1.4, yaw, dark);
      if (r.random() < 0.3) k.b.tube([x, y, hgt], [x + r.uniform(-0.3, 0.3), y + r.uniform(-0.3, 0.3), hgt + r.uniform(0.5, 1.2)], 0.03, rebar, 4);
    }
  };
  wallRun(-w / 2, -d / 2, w / 2, -d / 2); wallRun(w / 2, -d / 2, w / 2, d / 2); wallRun(w / 2, d / 2, -w / 2, d / 2); wallRun(-w / 2, d / 2, -w / 2, -d / 2);
  for (let fl = 1; fl < floors; fl++) {   // broken floor slabs
    const fw = w * r.uniform(0.35, 0.7), fd = d * r.uniform(0.4, 0.9), sx = r.choice([-1, 1]);
    k.b.box(sx * (w - fw) / 2, (d - fd) / 2 * r.choice([-1, 1]), fl * FL - 0.25, fw, fd, 0.25, inner);
  }
  for (let i = 0; i < 26; i++) {   // rubble
    const a = r.uniform(0, 6.28), rad = r.uniform(0, Math.max(w, d) * 0.75), s = r.uniform(0.3, 1.1);
    k.b.rbox(Math.cos(a) * rad, Math.sin(a) * rad * 0.8, 0, s * 1.4, s, s * r.uniform(0.3, 0.8), r.uniform(0, 3), r.random() < 0.6 ? wall : inner, r.uniform(0.5, 0.9));
  }
  return k.done(loc, heading, { size: [w, d, floors * FL] });
}

// ------------------------------------------------------------------ ground pieces
/** Flat slab (sidewalk, plaza, lot). */
export function slab(name, loc, size, color = P.SIDEWALK, h = 0.18) {
  const k = new B(name); k.b.box(0, 0, 0, size[0], size[1], h, k.c(color));
  const g = k.done(loc, 0); g.children[0].castShadow = false; return g;
}
/** Straight road between two points with centre dashes, edge lines and kerbs. */
export function road(name, a, b, { width = 8, lanes = true, kerb = true, color = P.ASPHALT } = {}) {
  const k = new B(name), len = Math.hypot(b[0] - a[0], b[1] - a[1]), yaw = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, c = Math.cos(yaw), s = Math.sin(yaw);
  k.b.rbox(cx, cy, 0, len, width, 0.04, yaw, k.c(color));
  const lane = k.c(P.LANE), kb = k.c('#b9b4aa');
  if (lanes) for (let t = -len / 2 + 2; t < len / 2 - 2; t += 6) k.b.rbox(cx + c * t, cy + s * t, 0.04, 3, 0.16, 0.012, yaw, lane);
  for (const sd of [-1, 1]) {
    const ox = -s * sd * (width / 2 - 0.25), oy = c * sd * (width / 2 - 0.25);
    k.b.rbox(cx + ox, cy + oy, 0.04, len, 0.12, 0.012, yaw, lane);
    if (kerb) k.b.rbox(cx - s * sd * (width / 2 + 0.1), cy + c * sd * (width / 2 + 0.1), 0, len, 0.2, 0.2, yaw, kb);
  }
  const g = k.done([0, 0, 0], 0); g.children[0].castShadow = false; return g;
}
/** Zebra crossing across a road at point p; yaw = road direction in degrees. */
export function crossing(name, p, yawDeg = 0, { width = 8, stripes = 7 } = {}) {
  const k = new B(name), yaw = yawDeg * D, c = Math.cos(yaw), s = Math.sin(yaw), lane = k.c(P.LANE);
  for (let i = 0; i < stripes; i++) { const t = ((i + 0.5) / stripes - 0.5) * (width - 0.8); k.b.rbox(p[0] - s * t, p[1] + c * t, 0.045, 2.6, 0.5, 0.012, yaw, lane); }
  const g = k.done([0, 0, 0], 0); g.children[0].castShadow = false; return g;
}

/** A terraced row of mixed buildings along +X starting at loc, fronts facing -Y. Returns { buildings, length }. */
export function streetRow(name, loc = [0, 0, 0], { n = 5, seed = 0, kinds = ['shop', 'apartment', 'shop', 'house', 'office', 'shop', 'apartment'], gap = 0.6, heading = 0, lit } = {}) {
  const r = new Rand(seed + 77), out = [];
  const make = { shop, apartment, house, office, warehouse };
  let x = 0;
  const h = heading * D, c = Math.cos(h), s = Math.sin(h);
  for (let i = 0; i < n; i++) {
    const kind = kinds[(i + r.randrange(kinds.length)) % kinds.length];
    const w = { shop: r.uniform(7, 9), apartment: r.uniform(12, 15), house: r.uniform(7.5, 9), office: 14, warehouse: 20 }[kind];
    const d = { shop: 9, apartment: 11, house: 7, office: 14, warehouse: 13 }[kind];
    const cx = x + w / 2, cy = d / 2;
    const b = make[kind](`${name}_${i}`, [loc[0] + cx * c - cy * s, loc[1] + cx * s + cy * c, loc[2] ?? 0], heading, { seed: seed * 13 + i, w, d, lit });
    out.push(b); x += w + gap + (kind === 'house' ? 1.5 : 0);
  }
  return { buildings: out, length: x };
}
