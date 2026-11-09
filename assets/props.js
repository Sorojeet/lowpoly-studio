// Street props: cars, traffic lights, street lamps, trees, birds/flocks, benches.
// Each returns a root object you can move/rotate; animation helpers included.
import { THREE, stage, D, Rand, mat, emit, box, cylinder, ico, mesh, group, parent, join, lerp } from '../studio/core.js';
import * as P from './palette.js';

// ------------------------------------------------------------------ car
export function car(name, loc = [0, 0, 0], heading = 0, { color = null, seed = 0, doorOpen = 0, kind = 'sedan', lightsOn = false } = {}) {
  const r = new Rand(seed);
  color = color || r.choice(P.CAR);
  const body = mat(`car_${color}`, color);
  const glass = mat('car_glass', '#2b3a4a');
  const tyre = mat('tyre', P.TYRE);
  const head = lightsOn ? mat('headlight_on', '#fff6d8', { emission: 3 }) : mat('headlight', '#fff6d8');
  const tail = mat('taillight', '#c81e1e', { emission: 0.6 });
  const [L, Wd] = kind === 'sedan' ? [4.4, 1.85] : [4.0, 1.9];
  const root = group(loc, null, name);
  root.rotation.z = heading * D;
  const [cabH, cabL, cabY] = kind === 'sedan' ? [0.58, 2.2, 0.25] : [0.75, 2.9, 0.45];
  const parts = [
    box([Wd, L, 0.62], [0, 0, 0.32], body, { origin: 'bottom', taper: 0.97 }),
    box([Wd * 0.88, cabL, cabH], [0, cabY, 0.94], glass, { origin: 'bottom', taper: 0.78 }),
    box([Wd * 0.7, cabL * 0.6, 0.04], [0, cabY, 0.94 + cabH], body, { origin: 'bottom' }),
  ];
  for (const sx of [-1, 1]) {
    parts.push(box([0.36, 0.05, 0.14], [0.58 * sx, -L / 2, 0.72], head));
    parts.push(box([0.36, 0.05, 0.14], [0.62 * sx, L / 2, 0.75], tail));
    for (const sy of [-1, 1])
      parts.push(cylinder(0.36, 0.26, 10, [sx * (Wd / 2 - 0.12), sy * L * 0.31, 0.36], tyre, { axis: 'X', origin: 'center' }));
  }
  parent(join(parts, `${name}_shell`), root);
  if (doorOpen) {
    const hinge = group([-Wd / 2, -0.35, 0.35], root);
    box([0.06, 1.1, 0.95], [0, 0.55, 0.45], body, { parent: hinge });
    hinge.rotation.z = -doorOpen * D;
  }
  return root;
}

// ------------------------------------------------------------------ traffic light
/** cycle: [[frame, 'red'|'amber'|'green'], ...] */
export function trafficLight(name, loc = [0, 0, 0], heading = 0, cycle = null) {
  const pole = mat('pole', '#4a4e57');
  const root = group(loc, null, name);
  root.rotation.z = heading * D;
  parent(join([
    cylinder(0.09, 4.6, 8, [0, 0, 0], pole),
    box([0.1, 2.4, 0.1], [0, -1.2, 4.5], pole),
    box([0.42, 0.34, 1.2], [0, -2.3, 3.85], mat('tl_box', '#1e2026')),
  ], `${name}_static`), root);
  const lamps = {};
  [['red', P.RED], ['amber', P.AMBER], ['green', P.GREEN]].forEach(([col, hex], i) => {
    const m = mat(`${name}_${col}`, '#222222', { emit: hex });
    cylinder(0.13, 0.06, 10, [-0.23, -2.3, 4.25 - i * 0.38], m, { axis: 'X', origin: 'center', parent: root });
    lamps[col] = m;
  });
  if (cycle) for (const [f, state] of cycle) for (const [col, m] of Object.entries(lamps)) emit(m, col === state ? 12 : 0, f, 'CONSTANT');
  return { root, lamps };
}

// ------------------------------------------------------------------ street lamp
export function streetLamp(name, loc = [0, 0, 0], heading = 0, lampMat = null) {
  const pole = mat('pole', '#4a4e57');
  lampMat = lampMat || mat('lamp', '#fff1c9', { emit: '#ffd48a' });
  const root = group(loc, null, name);
  root.rotation.z = heading * D;
  cylinder(0.07, 6, 6, [0, 0, 0], pole, { parent: root });
  box([0.08, 1.2, 0.08], [0, -0.6, 6.0], pole, { parent: root });
  box([0.3, 0.55, 0.12], [0, -1.15, 5.92], lampMat, { parent: root });
  return root;
}

// ------------------------------------------------------------------ nature
export function tree(name, loc = [0, 0, 0], { seed = 0, size = 1, kind = 'round' } = {}) {
  const r = new Rand(seed + 1000);
  const trunk = cylinder(0.14 * size, 1.8 * size, 6, [0, 0, 0], mat('trunk', P.TRUNK), { rTop: 0.1 * size });
  const li = seed % P.LEAF.length;
  const leaf = mat(`leaf${li}`, P.LEAF[li]);
  const parts = [trunk];
  if (kind === 'pine') {
    for (let i = 0; i < 3; i++)
      parts.push(cylinder((1.1 - i * 0.28) * size, 1.4 * size, 7, [0, 0, (1.2 + i * 0.9) * size], leaf, { rTop: 0.05 }));
  } else {
    parts.push(ico(1.15 * size, [0, 0, 2.4 * size], leaf, { jitter: 0.18, seed }));
    if (r.random() < 0.6)
      parts.push(ico(0.75 * size, [r.uniform(-0.5, 0.5) * size, r.uniform(-0.5, 0.5) * size, 3.1 * size], leaf, { jitter: 0.2, seed: seed + 1 }));
  }
  const rot = r.uniform(0, 6.28);
  const o = join(parts, name);
  o.position.set(...loc);
  o.rotation.z = rot;
  return o;
}

export function bird(name, color = '#3a3d44') {
  const m = mat(`bird_${color}`, color, { side: THREE.DoubleSide });
  const body = ico(0.12, [0, 0, 0], m, { scale: [0.7, 1.6, 0.7], name });
  const wings = [-1, 1].map(sx => mesh([[0, -0.08, 0], [0, 0.1, 0], [0.42 * sx, 0.06, 0]], [[0, 1, 2]], m, [0, 0, 0], { parent: body }));
  return { body, wings };
}

/** Birds flying along `path` [[x,y,z], ...] between frames start-end. */
export function flock(n, path, start, end, { seed = 0, spread = 4, flapPeriod = 8, color = '#3a3d44' } = {}) {
  const r = new Rand(seed), A = stage.A, out = [];
  for (let i = 0; i < n; i++) {
    const { body, wings } = bird(`bird${seed}_${i}`, color);
    const off = [r.uniform(-spread, spread), r.uniform(-spread, spread), r.uniform(-spread / 3, spread / 3)];
    const delay = r.uniform(0, 12);
    path.forEach((p, k) => {
      const f = Math.round(lerp(start, end, k / (path.length - 1)) + delay);
      A.key(body, 'position', f, [p[0] + off[0], p[1] + off[1], p[2] + off[2]], 'LINEAR');
    });
    const a = path[0], z = path[path.length - 1];
    body.rotation.z = Math.atan2(z[1] - a[1], z[0] - a[0]) - Math.PI / 2;
    const ph = r.uniform(0, 6.28);
    for (let f = start; f < end + 20; f += 2)
      wings.forEach((w, s) => A.key(w, 'rotation', f, [0, (s ? 1 : -1) * 0.9 * Math.sin(2 * Math.PI * f / flapPeriod + ph), 0], 'LINEAR'));
    out.push(body);
  }
  return out;
}

export function bench(name, loc = [0, 0, 0], heading = 0) {
  const wood = mat('bench_wood', '#9a6b45'), metal = mat('pole', '#4a4e57');
  const parts = [box([1.8, 0.45, 0.06], [0, 0, 0.45], wood), box([1.8, 0.06, 0.4], [0, 0.22, 0.7], wood)];
  for (const sx of [-0.8, 0.8]) parts.push(box([0.06, 0.4, 0.45], [sx, 0, 0], metal, { origin: 'bottom' }));
  const o = join(parts, name);
  o.position.set(...loc);
  o.rotation.z = heading * D;
  return o;
}
