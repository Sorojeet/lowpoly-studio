// Power station, cooling towers, pylons, power lines, rising smoke.
// Reusable for any "infrastructure fails" beat (Ep1 blackout, later dams/plants).
import { THREE, stage, D, Rand, mat, box, cylinder, ico, group, parent, join } from '../studio/core.js';

export function coolingTower(name, loc, r = 9, h = 26, m = null) {
  m = m || mat('concrete_tower', '#d8d2c6');
  const o = join([
    cylinder(r, h * 0.55, 14, [0, 0, 0], m, { rTop: r * 0.68 }),
    cylinder(r * 0.68, h * 0.3, 14, [0, 0, h * 0.55], m, { rTop: r * 0.64 }),
    cylinder(r * 0.64, h * 0.15, 14, [0, 0, h * 0.85], m, { rTop: r * 0.72 }),
  ], name);
  o.position.set(...loc);
  return o;
}

/** Returns { root, windows, beacon, stackTop, towerTops }. */
export function plant(name = 'Plant', loc = [0, 0, 0]) {
  const root = group(loc, null, name);
  const wall = mat('plant_wall', '#b9c2c9'), dark = mat('plant_dark', '#5b6670'), red = mat('plant_red', '#c8503c');
  const white = mat('stack_white', '#f2f2f2');
  const parts = [
    box([36, 18, 12], [0, 0, 0], wall, { origin: 'bottom' }),
    box([36.4, 18.4, 1], [0, 0, 12], dark, { origin: 'bottom' }),
    box([20, 14, 18], [-26, 4, 0], wall, { origin: 'bottom' }),
    cylinder(2.2, 48, 10, [14, 12, 0], red, { rTop: 1.6 }),
    box([10, 6, 5], [-6, -16, 0], dark, { origin: 'bottom' }),
    box([10, 6, 5], [8, -16, 0], dark, { origin: 'bottom' }),
    box([110, 80, 0.3], [0, 10, 0], mat('plant_pad', '#8f8c86'), { origin: 'bottom' }),
  ];
  for (let i = 0; i < 6; i++)
    parts.push(cylinder(1.6 + 0.6 * (1 - i / 6) + 0.05, 1.5, 10, [14, 12, 8 + i * 7], white, { rTop: 1.6 + 0.6 * (1 - (i + 0.2) / 6) }));
  parent(join(parts, `${name}_static`), root);
  [-28, 0].forEach((x, i) => parent(coolingTower(`${name}_ct${i}`, [x, 34, 0]), root));
  const win = mat('plant_windows', '#1d2733', { emit: '#ffe0a0' });
  for (let k = 0; k < 8; k++) box([2.6, 0.2, 1.4], [-15 + k * 4.3, -9.1, 8], win, { parent: root });
  const beacon = mat('beacon', '#330000', { emission: 6, emit: '#ff2a2a' });
  ico(0.6, [14, 12, 48.6], beacon, { parent: root });
  return {
    root, windows: win, beacon,
    stackTop: [loc[0] + 14, loc[1] + 12, loc[2] + 48],
    towerTops: [-28, 0].map(x => [loc[0] + x, loc[1] + 34, loc[2] + 26]),
  };
}

/** Puffs spawning every `rate` frames at src, rising + growing, shrinking away at end of life. */
export function smoke(name, src, start, end, { rate = 6, rise = 0.18, drift = [0.06, 0.02], size = 2.5, seed = 0, color = '#eeeeee', stopFrame = null } = {}) {
  const r = new Rand(seed), m = mat(`smoke_${color}`, color), life = 150, A = stage.A, puffs = [];
  let k = 0;
  for (let f0 = start - life; f0 < end; f0 += rate, k++) {
    if (stopFrame && f0 > stopFrame) break;
    const p = ico(size, src, m, { jitter: 0.25, seed: seed + k, name: `${name}_${k}` });
    p.castShadow = false;
    const wob = r.uniform(-1, 1) * 6;
    for (const f of [f0, f0 + life]) {
      const t = (f - f0) / life;
      A.key(p, 'position', f, [src[0] + drift[0] * (f - f0) + wob * t, src[1] + drift[1] * (f - f0), src[2] + rise * (f - f0)], 'LINEAR');
    }
    // grow, then pop out near the end of life
    A.key(p, 'scale', f0, [0.4, 0.4, 0.34], 'LINEAR');
    const s = 0.4 + 2.2 * 0.85;
    A.key(p, 'scale', f0 + life * 0.85, [s, s, s * 0.85], 'LINEAR');
    A.key(p, 'scale', f0 + life, [0.01, 0.01, 0.01], 'LINEAR');
    puffs.push(p);
  }
  return puffs;
}

export function pylon(name, loc, heading = 0, h = 30) {
  const m = mat('steel', '#7d848c'), parts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const leg = cylinder(0.25, h, 4, [sx * 3, sy * 3, 0], m, { rTop: 0.15 });
    leg.rotation.set(-5.5 * sy * D, 5.5 * sx * D, 0);
    parts.push(leg);
  }
  for (const [z, w] of [[h * 0.55, 9], [h * 0.8, 12], [h * 0.98, 6]]) parts.push(box([w, 0.4, 0.4], [0, 0, z], m));
  for (const z of [h * 0.25, h * 0.5, h * 0.75]) { const s = 6 * (1 - z / h * 0.55); parts.push(box([s, s, 0.3], [0, 0, z], m)); }
  const o = join(parts, name);
  o.position.set(...loc);
  o.rotation.z = heading * D;
  return o;
}

export function powerLine(name, pts, h = 30) {
  const m = mat('cable', '#2b2b2b'), objs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const d = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
    for (const off of [-5.5, 0, 5.5]) {
      const nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
      const c = cylinder(0.06, d, 4, [ax + nx, ay + ny, h * 0.8 - 0.5], m);
      c.rotation.set(0, Math.PI / 2, ang);
      objs.push(c);
    }
  }
  return join(objs, name);
}
