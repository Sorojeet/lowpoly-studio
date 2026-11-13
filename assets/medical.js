// MEDICAL — hospital ward props.  Fronts face -Y.
//   hospitalBed('bed1', [x, y, 0], heading, { blanket: '#6fb3b0' })   ivStand('iv', loc)   cabinet('cab', loc, heading)
//   const m = monitor('mon', [x, y, 0], heading, { draw: ecg({ bpm: 80, panicAt: 30, flatAt: 120 }) });   // live ECG; racing, then flatline
import { THREE, stage, D, Buf, mat, group } from '../studio/core.js';
import { screen } from './screens.js';

class K {
  constructor(name) { this.b = new Buf(); this.mats = []; this.name = name; }
  c(color, o) { const m = mat(`m_${color}${o?.gloss ? 'g' : ''}`, color, o); let i = this.mats.indexOf(m); if (i < 0) { i = this.mats.length; this.mats.push(m); } return i; }
  done(loc, heading = 0) { const o = this.b.mesh(this.mats, this.name); o.position.set(loc[0], loc[1], loc[2] ?? 0); o.rotation.z = heading * D; stage.scene.add(o); return o; }
}
const STEEL = '#c3c9cf';

export function hospitalBed(name = 'hbed', loc = [0, 0, 0], heading = 0, { blanket = '#6fb3b0', made = true } = {}) {
  const k = new K(name), st = k.c(STEEL, { gloss: 0.7 }), wh = k.c('#f4f6f7');
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { k.b.box(sx * 0.42, sy * 0.95, 0.1, 0.05, 0.05, 0.4, st); k.b.cyl(sx * 0.42, sy * 0.95, 0, 0.05, 0.1, k.c('#2a2d33'), 6); }
  k.b.box(0, 0, 0.5, 0.95, 2.05, 0.06, st);
  k.b.box(0, -0.1, 0.56, 0.9, 1.75, 0.14, wh); k.b.box(0, 0.84, 0.56, 0.9, 0.3, 0.3, wh, 0.9);                  // mattress + raised head
  k.b.box(0, 0.8, 0.86, 0.6, 0.3, 0.09, k.c('#ffffff'), 0.85);
  if (made) k.b.box(0, -0.35, 0.7, 0.94, 1.25, 0.05, k.c(blanket));
  k.b.box(0, 1.03, 0.5, 0.98, 0.05, 0.75, k.c('#dfe5e8')); k.b.box(0, -1.03, 0.5, 0.98, 0.05, 0.4, k.c('#dfe5e8'));
  for (const sx of [-1, 1]) { k.b.tube([sx * 0.49, 0.5, 0.92], [sx * 0.49, -0.3, 0.92], 0.015, st, 5); for (const y of [0.5, 0.1, -0.3]) k.b.tube([sx * 0.49, y, 0.56], [sx * 0.49, y, 0.92], 0.012, st, 5); }
  return k.done(loc, heading);
}
export function ivStand(name = 'iv', loc = [0, 0, 0]) {
  const k = new K(name), st = k.c(STEEL, { gloss: 0.7 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; k.b.tube([0, 0, 0.06], [Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0.04], 0.015, st, 4); }
  k.b.cyl(0, 0, 0.04, 0.016, 1.85, st, 6); k.b.tube([-0.14, 0, 1.87], [0.14, 0, 1.87], 0.01, st, 4);
  k.b.box(0.12, 0, 1.56, 0.11, 0.04, 0.26, k.c('#cfe6ee', { gloss: 0.6 }), 0.8); k.b.tube([0.12, 0, 1.56], [0.1, -0.05, 1.0], 0.004, k.c('#e8eef0'), 3);
  return k.done(loc);
}
export function cabinet(name = 'cab', loc = [0, 0, 0], heading = 0, { w = 1.0, h = 0.9 } = {}) {
  const k = new K(name), c = k.c('#eef1f2'), d = k.c('#cfd6da');
  k.b.box(0, 0, 0, w, 0.5, h, c); k.b.box(0, 0, h, w + 0.04, 0.54, 0.04, k.c('#9fb4b8'));
  for (let i = 0; i < 3; i++) { k.b.box(0, -0.255, 0.08 + i * (h - 0.1) / 3, w - 0.08, 0.02, (h - 0.1) / 3 - 0.04, d); k.b.box(0, -0.275, 0.08 + (i + 0.45) * (h - 0.1) / 3, 0.2, 0.02, 0.03, k.c(STEEL, { gloss: 0.7 })); }
  return k.done(loc, heading);
}
export const ecg = ({ bpm = 70, flatAt = null, panicAt = null } = {}) => (c, W, H, f) => {
  c.fillStyle = '#05100c'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#123a2a'; c.lineWidth = 1; for (let x = 0; x < W; x += W / 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += H / 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const beat = u => { const p = u % 1; return p < 0.08 ? Math.sin(p / 0.08 * Math.PI) * 0.12 : p < 0.16 ? 0 : p < 0.19 ? -(p - 0.16) / 0.03 * 0.15 : p < 0.23 ? -0.15 + (p - 0.19) / 0.04 * 1.0 : p < 0.27 ? 0.85 - (p - 0.23) / 0.04 * 1.1 : p < 0.3 ? -0.25 + (p - 0.27) / 0.03 * 0.25 : p < 0.5 ? Math.sin((p - 0.3) / 0.2 * Math.PI) * 0.2 : 0; };
  const flat = flatAt !== null && f >= flatAt, rate = (panicAt !== null && f >= panicAt ? 2.3 : 1) * bpm / 70;
  const sweep = 6, head = (f * sweep) % W;
  for (const [y0, col, sp, amp] of [[H * 0.3, flat ? '#ff4d4d' : '#4dff88', 1, 0.22], [H * 0.62, '#4dc3ff', 0.7, 0.1], [H * 0.86, '#ffd24a', 0.4, 0.06]]) {
    c.strokeStyle = col; c.lineWidth = H * 0.02; c.beginPath();
    for (let x = 0; x < W; x += 3) {
      if (x > head && x < head + W * 0.06) { c.stroke(); c.beginPath(); continue; }
      const fx = x <= head ? f - (head - x) / sweep : f - (head + W - x) / sweep;          // frame this pixel was drawn
      const dead = flatAt !== null && fx >= flatAt;
      const y = y0 - (dead ? 0 : beat(fx / 30 * rate * 1.17 * sp + 0.1) * H * amp * 3);
      x ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  if (flat && Math.floor(f / 8) % 2) { c.fillStyle = '#ff4d4d'; c.font = `${H * 0.14}px sans-serif`; c.textAlign = 'right'; c.fillText('!', W * 0.96, H * 0.16); }
};
const ecgDraw = ecg();
export function monitor(name = 'monitor', loc = [0, 0, 0], heading = 0, { draw = ecgDraw } = {}) {
  const k = new K(name), st = k.c(STEEL, { gloss: 0.7 });
  k.b.cyl(0, 0, 0, 0.25, 0.05, k.c('#3a3d44'), 8); k.b.cyl(0, 0, 0.05, 0.025, 1.15, st, 6); k.b.box(0, 0, 1.0, 0.36, 0.3, 0.03, st);
  const o = k.done(loc, heading);
  const s = screen(`${name}_scr`, [0, -0.06, 1.42], 0, { w: 0.5, h: 0.36, px: 256, glow: 2.2, draw, live: true, depth: 0.12, bezel: 0.03, frame: '#e4e8ea' });
  o.add(s); s.position.set(0, -0.06, 1.42);
  return Object.assign(o, { screen: s });
}
