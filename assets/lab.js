// LAB — underground research lab, observation rooms, sliding security doors.
//   labDesk('d1', loc, heading, { monitors: [drawA, drawB, drawC], portrait: 1 })  -> .screens   (monitors face -Y; portrait = which one stands upright)
//   serverRack(name, loc, heading)   sampleRack(name, loc, heading)   microscope(name, loc, heading)   files(name, loc)
//   const door = slidingDoor('door', loc, heading, { w: 1.4, h: 2.3 });  door.unlock(f);  door.open(f0, f1)   // red -> green lock light, panel slides aside
//   glassWall('win', loc, heading, { w: 4, h: 1.4, sill: 0.9 })     bunkBed('b1', loc, heading)    fenceGate('gate', loc, heading)
import { THREE, stage, D, Rand, Buf, mat, group, emit, EM } from '../studio/core.js';
import { screen } from './screens.js';

class K {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  c(color, o) { const m = mat(`l_${color}${o?.gloss ? 'g' : ''}${o?.emission ? 'e' + o.emission : ''}`, color, o); return this.m(m); }
  m(m) { let i = this.mats.indexOf(m); if (i < 0) { i = this.mats.length; this.mats.push(m); } return i; }
  done(loc, heading = 0, extra = {}) { const o = this.b.mesh(this.mats, this.name); o.position.set(loc[0], loc[1], loc[2] ?? 0); o.rotation.z = heading * D; stage.scene.add(o); return Object.assign(o, extra); }
}
const STEEL = '#aeb6be';

/** Desk with monitors; the user sits on the -Y side, screens face -Y. */
export function labDesk(name = 'desk', loc = [0, 0, 0], heading = 0, { w = 2.2, monitors = [], papers = true, seed = 0, portrait = -1 } = {}) {
  const k = new K(name), r = new Rand(seed + 4), top = k.c('#d8dcdf'), leg = k.c('#4a4f57');
  k.b.box(0, 0, 0.74, w, 0.85, 0.04, top);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * (w / 2 - 0.05), sy * 0.36, 0, 0.05, 0.05, 0.74, leg);
  k.b.box(0, -0.05, 0.78, 0.5, 0.18, 0.02, k.c('#2a2d33')); k.b.box(0.42, -0.08, 0.78, 0.07, 0.11, 0.025, k.c('#2a2d33'));   // keyboard, mouse
  if (papers) for (let i = 0; i < 5; i++) k.b.rbox(r.uniform(-w / 2 + 0.25, -0.4), r.uniform(-0.3, 0.1), 0.78 + i * 0.004, 0.21, 0.29, 0.004, r.uniform(-0.4, 0.4), k.c(i % 3 ? '#f4f1e8' : '#e8e0c8'));
  k.b.cyl(w / 2 - 0.2, 0.0, 0.78, 0.045, 0.1, k.c('#e8e4da'), 8);
  const o = k.done(loc, heading);
  const n = monitors.length, span = Math.min(w - 0.3, n * 0.62);
  o.screens = monitors.map((draw, i) => {
    const x = n === 1 ? 0 : -span / 2 + 0.31 + i * (span - 0.62) / (n - 1), yaw = n === 1 ? 0 : (i - (n - 1) / 2) * -14;
    const st = new Buf(); st.box(x, 0.24, 0.78, 0.2, 0.15, 0.02, 0); st.box(x, 0.26, 0.78, 0.04, 0.04, 0.25, 0); const sm = st.mesh([mat('l_stand', '#3a3d44')]); o.add(sm);
    const tall = i === portrait;                       // portrait = index of a monitor turned upright
    const s = screen(`${name}_m${i}`, [0, 0, 0], 0, { w: tall ? 0.42 : 0.58, h: tall ? 0.7 : 0.36, px: 512, glow: 1.6, draw, live: true, depth: 0.04, bezel: 0.02, frame: '#1b1d22' });
    o.add(s); s.position.set(x, 0.2, tall ? 1.42 : 1.24); s.rotation.z = yaw * D;
    return s;
  });
  return o;
}

export function serverRack(name = 'rack', loc = [0, 0, 0], heading = 0, { seed = 0, h = 2.1 } = {}) {
  const k = new K(name), r = new Rand(seed + 8), body = k.c('#22252b'), face = k.c('#30343c');
  k.b.box(0, 0, 0, 0.7, 1.0, h, body);
  const leds = [mat(`${name}_ledG`, '#4dff88', { emission: 4 }), mat(`${name}_ledB`, '#4dc3ff', { emission: 4 }), mat(`${name}_ledR`, '#ff4d4d', { emission: 3 })];
  for (let z = 0.12; z < h - 0.1; z += 0.13) {
    k.b.box(0, -0.505, z, 0.62, 0.01, 0.1, face);
    for (let i = 0; i < 6; i++) if (r.random() < 0.6) k.b.box(-0.25 + i * 0.04, -0.512, z + 0.03, 0.015, 0.006, 0.015, k.m(r.choice(leds)));
  }
  const o = k.done(loc, heading, { leds });
  stage.A.hooks.push(f => leds.forEach((m, i) => { m.emissiveIntensity = EM * (2 + 3 * (Math.sin(f * (0.7 + i * 0.4) + seed) > 0.2 ? 1 : 0)); }));
  return o;
}

export function sampleRack(name = 'samples', loc = [0, 0, 0], heading = 0, { seed = 0 } = {}) {
  const k = new K(name), r = new Rand(seed + 12), wh = k.c('#e8ecef'), gl = k.c('#cfe6ee', { gloss: 0.8 });
  const liq = ['#ff5a5a', '#4dc3ff', '#8cbf5f', '#ffd24a', '#c96ad1'].map(c => k.c(c, { emission: 0.4 }));
  k.b.box(0, 0, 0, 0.5, 0.18, 0.06, wh);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const x = -0.2 + i * 0.08, y = -0.04 + j * 0.08; k.b.cyl(x, y, 0.06, 0.016, 0.16, gl, 6); k.b.cyl(x, y, 0.06, 0.013, 0.08 + r.uniform(0, 0.05), r.choice(liq), 6); }
  return k.done(loc, heading);
}

export function microscope(name = 'scope', loc = [0, 0, 0], heading = 0) {
  const k = new K(name), w = k.c('#e8ecef'), d = k.c('#2a2d33');
  k.b.box(0, 0, 0, 0.22, 0.28, 0.04, w); k.b.box(0, 0.1, 0.04, 0.06, 0.06, 0.3, w); k.b.box(0, -0.02, 0.12, 0.14, 0.14, 0.02, d);
  k.b.tube([0, 0.08, 0.32], [0, -0.04, 0.24], 0.03, w, 8); k.b.tube([0, 0.08, 0.32], [0, 0.0, 0.42], 0.022, d, 8); k.b.cyl(0, -0.04, 0.16, 0.012, 0.08, d, 6);
  return k.done(loc, heading);
}

export function files(name = 'files', loc = [0, 0, 0], { n = 4, seed = 0 } = {}) {
  const k = new K(name), r = new Rand(seed + 21);
  for (let i = 0; i < n; i++) k.b.rbox(r.uniform(-0.1, 0.1), r.uniform(-0.1, 0.1), i * 0.035, 0.25, 0.33, 0.03, r.uniform(-0.3, 0.3), k.c(r.choice(['#c9a25a', '#b89a6a', '#d9cfae'])));
  return k.done(loc);
}

/** Security door that slides sideways; frame faces -Y. */
export function slidingDoor(name = 'door', loc = [0, 0, 0], heading = 0, { w = 1.4, h = 2.3, color = '#8d949b' } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const fr = new Buf(), fm = mat(`${name}_frame`, '#3a3d44');
  fr.box(-w / 2 - 0.12, 0, 0, 0.24, 0.3, h + 0.15, 0); fr.box(w / 2 + 0.12, 0, 0, 0.24, 0.3, h + 0.15, 0); fr.box(0, 0, h, w + 0.48, 0.3, 0.15, 0);
  root.add(fr.mesh([fm]));
  const pb = new Buf(); pb.box(0, 0, 0, w, 0.08, h, 0); pb.box(0, -0.045, h * 0.55, w * 0.5, 0.01, 0.06, 1); pb.box(0, -0.045, h * 0.62, w * 0.5, 0.01, 0.06, 1);
  pb.box(0, -0.045, h * 0.7, w * 0.36, 0.01, 0.28, 2);
  const panel = pb.mesh([mat(`${name}_panel`, color, { gloss: 0.4 }), mat(`${name}_stripe`, '#e8c84a'), mat(`${name}_glass`, '#1b222b', { gloss: 0.9 })]);
  const pg = group([0, 0, 0], root); pg.add(panel);
  const lock = mat(`${name}_lock`, '#ff2a1a', { emit: '#ff2a1a', emission: 4 });
  const lb = new Buf(); lb.box(w / 2 + 0.12, -0.16, 1.15, 0.14, 0.03, 0.22, 0); lb.box(w / 2 + 0.12, -0.18, 1.2, 0.07, 0.01, 0.07, 1);
  root.add(lb.mesh([mat(`${name}_lockbox`, '#1b1d22'), lock]));
  return Object.assign(root, { panel: pg, lock, w,
    unlock(f) { for (const p of ['emissive', 'color']) { stage.A.key(lock, p, f - 1, [1, 0.03, 0.02], 'CONSTANT'); stage.A.key(lock, p, f, [0.1, 1, 0.35], 'CONSTANT'); } },
    open(f0, f1) { stage.A.key(pg, 'position', f0, [0, 0, 0]); stage.A.key(pg, 'position', f1, [w * 1.02, 0.12, 0]); } });
}

/** Wall with a big observation window (glass is see-through, slightly tinted). */
export function glassWall(name = 'obs', loc = [0, 0, 0], heading = 0, { w = 6, h = 3, win = [3.2, 1.3], sill = 0.95, color = '#c9d3d6' } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const b = new Buf(), [ww, wh] = win, t = 0.18;
  b.box(0, 0, 0, w, t, sill, 0); b.box(0, 0, sill + wh, w, t, h - sill - wh, 0);
  b.box(-(w + ww) / 4, 0, sill, (w - ww) / 2, t, wh, 0); b.box((w + ww) / 4, 0, sill, (w - ww) / 2, t, wh, 0);
  b.box(0, -t / 2 - 0.05, sill - 0.04, ww + 0.1, 0.12, 0.04, 1); b.box(0, 0, sill + wh, ww + 0.1, t + 0.04, 0.05, 1);
  root.add(b.mesh([mat(`${name}_wall`, color), mat(`${name}_trim`, '#5a6068')]));
  const g = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fc4d0, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.3, depthWrite: false }));
  g.position.set(0, 0, sill + wh / 2); g.renderOrder = 3; root.add(g);
  return Object.assign(root, { glass: g });
}

export function bunkBed(name = 'bunk', loc = [0, 0, 0], heading = 0, { blanket = ['#7a5fb0', '#4f9d8f'], upper = 1.6 } = {}) {   // upper: height of the top bunk (room to sit up below)
  const k = new K(name), st = k.c('#5a6068'), mt = k.c('#e4dfd3');
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) k.b.box(sx * 0.45, sy * 0.95, 0, 0.05, 0.05, upper + 0.55, st);
  for (const [z, bl] of [[0.35, blanket[0]], [upper, blanket[1]]]) {
    k.b.box(0, 0, z, 0.95, 1.95, 0.05, st); k.b.box(0, 0, z + 0.05, 0.88, 1.88, 0.12, mt); k.b.box(0, -0.25, z + 0.17, 0.9, 1.3, 0.04, k.c(bl)); k.b.box(0, 0.75, z + 0.17, 0.55, 0.3, 0.08, k.c('#f4f1e8'));
  }
  for (let z = 0.5; z < upper; z += 0.25) k.b.box(0.45, -1.0, z, 0.05, 0.05, 0.03, st);
  for (const sy of [-1, 1]) k.b.box(0, sy * 0.95, upper + 0.3, 0.9, 0.04, 0.04, st);    // guard rails
  return k.done(loc, heading);
}

/** Chain-link fence run with a closed gate in the middle (factory / depot). Faces -Y. */
export function fenceGate(name = 'gate', loc = [0, 0, 0], heading = 0, { w = 14, h = 2.6, gate = 4 } = {}) {
  const k = new K(name), post = k.c('#5a6068'), mesh = k.m(mat('l_chain', '#9aa2aa', { opacity: 0.35 })), wire = k.c('#3a3d44');
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 2) k.b.box(x, 0, 0, 0.1, 0.1, h + 0.2, post);
  for (let x = -w / 2; x < w / 2 - 0.01; x += 2) if (Math.abs(x + 1) > gate / 2) k.b.box(x + 1, 0, 0.05, 2, 0.02, h - 0.05, mesh);
  k.b.box(0, -0.03, 0.08, gate, 0.05, 0.06, wire); k.b.box(0, -0.03, h - 0.08, gate, 0.05, 0.06, wire);
  for (let x = -gate / 2; x <= gate / 2 + 0.01; x += 0.5) k.b.box(x, -0.03, 0.08, 0.05, 0.05, h - 0.12, wire);
  for (let x = -w / 2; x < w / 2; x += 0.4) k.b.tube([x, 0, h + 0.2], [x + 0.4, 0, h + 0.32], 0.012, wire, 3);       // barbed wire
  return k.done(loc, heading);
}
