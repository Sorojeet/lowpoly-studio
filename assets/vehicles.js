// VEHICLES (PS3 pack) — shaped bodies with glossy paint, glass, lights, spinning wheels.
// All face -Y (same as props.car). Every builder returns the root group with:
//   v.wheels (meshes to spin), v.lights { head, tail, beacon? } (materials for emit()), v.spec
//
//   const v = vehicle('taxi', [0, 0, 0], 90);                 // kind, location, heading (deg)
//   vehicle('suv', [4, 0, 0], 0, { color: '#2f6fb0', lightsOn: true });
//   vehicle('sedan', [8, 0, 0], 20, { rust: 0.8 });           // abandoned / wrecked look
//   drive(v, [[0, 0], [0, -40], [20, -60]], 1, 150);          // follow a path, wheels spin, turns to face travel
//   beacon(v, 1, 300);                                        // flash police / ambulance lights
//   const h = helicopter('heli', [0, 0, 30]); spin(h, 1, 300);
//   airliner('jet', [0, 0, 200], 45);  motorcycle('bike', [2, 0, 0]);
//
// kinds: sedan hatchback suv pickup van sportscar taxi police ambulance bus truck
import { THREE, stage, D, Rand, Buf, mat, emit, group, lerp } from '../studio/core.js';
import * as P from './palette.js';

const RUST = new THREE.Color('#6b4630');
const paint = (color, rust = 0) => {
  const c = new THREE.Color(color).lerp(RUST, rust * 0.75), hex = '#' + c.getHexString();
  return mat(`paint_${hex}_${rust > 0.3 ? 'm' : 'g'}`, hex, rust > 0.3 ? {} : { gloss: 0.75 });
};

// body station: [y, halfWidth, zBottom, zTop]  -> 6-point ring with chamfered shoulders
const bodyRing = ([y, w, zb, zt]) => { const zm = zb + (zt - zb) * 0.62; return [[-w, y, zb], [w, y, zb], [w, y, zm], [w * 0.9, y, zt], [-w * 0.9, y, zt], [-w, y, zm]]; };
// cabin station: [y, halfWidthBottom, zBottom, zTop, halfWidthTop]
const cabRing = ([y, wb, zb, zt, wt]) => [[-wb, y, zb], [wb, y, zb], [wt, y, zt], [-wt, y, zt]];

// L, W, body stations (fractions of L along y from front -0.5 to rear +0.5), cabin stations, wheel radius, axle y fractions
const SPECS = {
  sedan:     { L: 4.5, W: 1.8, r: 0.33, axle: [-0.31, 0.3],
    body: [[-0.5, 0.82, 0.3, 0.52], [-0.47, 0.9, 0.24, 0.68], [-0.2, 0.9, 0.22, 0.8], [0.3, 0.9, 0.22, 0.84], [0.47, 0.9, 0.24, 0.8], [0.5, 0.84, 0.32, 0.62]],
    cab: [[-0.19, 0.82, 0.8, 0.82, 0.8], [-0.05, 0.78, 0.82, 1.38, 0.64], [0.2, 0.78, 0.83, 1.38, 0.64], [0.36, 0.82, 0.83, 0.85, 0.8]] },
  hatchback: { L: 3.9, W: 1.75, r: 0.31, axle: [-0.32, 0.33],
    body: [[-0.5, 0.8, 0.3, 0.55], [-0.46, 0.875, 0.24, 0.72], [-0.2, 0.875, 0.22, 0.84], [0.44, 0.875, 0.22, 0.88], [0.5, 0.82, 0.3, 0.7]],
    cab: [[-0.2, 0.8, 0.84, 0.86, 0.78], [-0.04, 0.76, 0.86, 1.45, 0.64], [0.36, 0.76, 0.87, 1.43, 0.64], [0.485, 0.8, 0.87, 0.9, 0.76]] },
  suv:       { L: 4.7, W: 1.95, r: 0.4, axle: [-0.31, 0.31],
    body: [[-0.5, 0.88, 0.42, 0.75], [-0.46, 0.975, 0.34, 0.95], [-0.2, 0.975, 0.32, 1.05], [0.46, 0.975, 0.32, 1.08], [0.5, 0.9, 0.42, 0.9]],
    cab: [[-0.19, 0.9, 1.05, 1.07, 0.88], [-0.07, 0.86, 1.07, 1.75, 0.76], [0.4, 0.86, 1.08, 1.75, 0.76], [0.49, 0.9, 1.08, 1.12, 0.84]] },
  pickup:    { L: 5.3, W: 1.95, r: 0.4, axle: [-0.31, 0.3], bed: [0.08, 0.48],
    body: [[-0.5, 0.88, 0.42, 0.75], [-0.46, 0.975, 0.34, 0.95], [-0.2, 0.975, 0.32, 1.05], [0.48, 0.975, 0.32, 1.05], [0.5, 0.94, 0.4, 1.0]],
    cab: [[-0.2, 0.9, 1.05, 1.07, 0.88], [-0.09, 0.86, 1.07, 1.72, 0.76], [0.06, 0.86, 1.05, 1.72, 0.76], [0.085, 0.9, 1.05, 1.07, 0.84]] },
  van:       { L: 5.0, W: 1.95, r: 0.36, axle: [-0.33, 0.31],
    body: [[-0.5, 0.88, 0.36, 0.8], [-0.47, 0.975, 0.3, 1.0], [-0.33, 0.975, 0.28, 1.12], [0.48, 0.975, 0.28, 1.15], [0.5, 0.95, 0.34, 1.1]],
    cab: [[-0.36, 0.9, 1.1, 1.12, 0.88], [-0.25, 0.9, 1.12, 1.95, 0.84], [0.485, 0.9, 1.15, 1.95, 0.84], [0.495, 0.9, 1.15, 1.2, 0.86]], panel: [-0.1, 0.5] },
  sportscar: { L: 4.3, W: 1.9, r: 0.34, axle: [-0.3, 0.31],
    body: [[-0.5, 0.8, 0.26, 0.42], [-0.44, 0.95, 0.2, 0.56], [-0.1, 0.95, 0.18, 0.68], [0.36, 0.95, 0.18, 0.76], [0.5, 0.88, 0.26, 0.66]],
    cab: [[-0.12, 0.8, 0.68, 0.7, 0.78], [0.06, 0.74, 0.7, 1.14, 0.58], [0.2, 0.74, 0.72, 1.12, 0.58], [0.4, 0.78, 0.75, 0.78, 0.72]], spoiler: true },
  bus:       { L: 11.5, W: 2.5, r: 0.5, axle: [-0.3, 0.28],
    body: [[-0.5, 1.2, 0.42, 1.25], [-0.495, 1.25, 0.34, 1.3], [0.495, 1.25, 0.34, 1.3], [0.5, 1.2, 0.42, 1.25]],
    cab: [[-0.499, 1.2, 1.3, 1.32, 1.2], [-0.48, 1.2, 1.3, 2.75, 1.14], [0.49, 1.2, 1.3, 2.75, 1.14], [0.498, 1.2, 1.3, 1.34, 1.18]], strips: true },
  truck:     { L: 8.2, W: 2.45, r: 0.52, axle: [-0.36, 0.2, 0.36], box: [-0.2, 0.5],
    body: [[-0.5, 1.15, 0.5, 1.2], [-0.49, 1.22, 0.42, 1.4], [-0.25, 1.22, 0.42, 1.4], [-0.24, 1.0, 0.5, 0.95], [0.5, 1.0, 0.5, 0.95]],
    cab: [[-0.495, 1.14, 1.4, 1.42, 1.12], [-0.46, 1.14, 1.4, 2.5, 1.08], [-0.26, 1.14, 1.4, 2.5, 1.08], [-0.245, 1.14, 1.4, 1.45, 1.1]] },
};
const VARIANTS = {
  taxi: ['sedan', { color: '#f2c12e', sign: true }],
  police: ['sedan', { color: '#f4f5f7', livery: '#1f2f4f', bar: ['#ff2a2a', '#2a6bff'] }],
  ambulance: ['van', { color: '#f4f5f7', livery: '#d83a2e', bar: ['#ff2a2a', '#ff2a2a'], solid: true }],
};

/** Spinnable wheel mesh centred on its axle. */
function wheel(r, w, flat = false) {
  const b = new Buf();
  b.tube([-w / 2, 0, 0], [w / 2, 0, 0], r, 0, 10);
  b.tube([-w / 2 - 0.012, 0, 0], [w / 2 + 0.012, 0, 0], r * 0.56, 1, 8);
  for (let k = 0; k < 2; k++) for (const sx of [-1, 1]) {   // spokes make the spin readable
    const a = k * Math.PI / 2, c = Math.cos(a) * r * 0.5, s = Math.sin(a) * r * 0.5;
    b.tube([sx * (w / 2 + 0.014), -c, -s], [sx * (w / 2 + 0.014), c, s], 0.035, 2, 4);
  }
  const m = b.mesh([mat('tyre', P.TYRE), mat('hub', '#b9bec6', { gloss: 0.7 }), mat('hub_dark', '#3a3d44')]);
  if (flat) m.scale.z = 0.82;
  return m;
}

export function vehicle(kind = 'sedan', loc = [0, 0, 0], heading = 0, o = {}) {
  let base = kind;
  if (VARIANTS[kind]) { base = VARIANTS[kind][0]; o = { ...VARIANTS[kind][1], ...o }; }
  const sp = SPECS[base], r = new Rand(o.seed ?? 0), rust = o.rust ?? 0;
  const L = sp.L, W = sp.W, color = o.color ?? r.choice(P.CAR);
  const name = o.name ?? `${kind}_${color}`;
  const root = group(loc, o.parent ?? null, name);
  root.rotation.z = heading * D;
  const lights = {
    head: mat(`${name}_head`, '#fff6d8', { emission: o.lightsOn ? 6 : 0.25, gloss: 0.9 }),
    tail: mat(`${name}_tail`, '#c81e1e', { emission: o.lightsOn ? 3 : 0.5, gloss: 0.6 }),
  };
  const b = new Buf(), mats = [];
  const M = m => { let i = mats.indexOf(m); if (i < 0) { i = mats.length; mats.push(m); } return i; };
  const body = M(paint(color, rust));
  const glass = M(mat(rust > 0.5 ? 'veh_glass_dusty' : 'veh_glass', rust > 0.5 ? '#4a4a44' : '#1c2a38', rust > 0.5 ? {} : { gloss: 1 }));
  const dark = M(mat('veh_dark', '#22242a')), chrome = M(mat('veh_chrome', P.CHROME, { gloss: 0.9 }));
  const st = s => [s[0] * L, ...s.slice(1)];
  const mid = [0, 0, 0.7];
  b.out(mid).loft(body, sp.body.map(s => bodyRing(st(s))));
  // cabin: glass greenhouse + painted roof + pillars
  const cab = sp.cab.map(st);
  b.out([0, (cab[1][0] + cab[2][0]) / 2, (cab[1][2] + cab[1][3]) / 2]).loft(sp.panel || o.solid ? glass : glass, cab.map(cabRing));
  const [c1, c2] = [cab[1], cab[cab.length - 2]];
  b.out(null);
  b.box(0, (c1[0] + c2[0]) / 2, c1[3] - 0.01, c1[4] * 2 + 0.04, c2[0] - c1[0] + 0.08, 0.06, body);
  const pillars = sp.strips ? Array.from({ length: 9 }, (_, k) => lerp(c1[0], c2[0], (k + 0.5) / 9)) : [(c1[0] + c2[0]) / 2 + (base === 'sedan' ? -0.1 : 0)];
  if (base !== 'sportscar' && base !== 'truck' && base !== 'pickup')
    for (const py of pillars) for (const sx of [-1, 1]) {
      const zb = c1[2], zt = c1[3], wb = c1[1], wt = c1[4];
      b.out([0, py, (zb + zt) / 2]).loft(body, [[[sx * (wb + 0.012), py - 0.06, zb], [sx * (wb + 0.012), py + 0.06, zb], [sx * wb * 0.9, py + 0.06, zb], [sx * wb * 0.9, py - 0.06, zb]],
        [[sx * (wt + 0.012), py - 0.06, zt], [sx * (wt + 0.012), py + 0.06, zt], [sx * wt * 0.9, py + 0.06, zt], [sx * wt * 0.9, py - 0.06, zt]]]);
    }
  b.out(null);
  if (sp.panel) {   // windowless cargo sides (van / ambulance)
    const [p0, p1] = sp.panel.map(f => f * L), zb = c1[2], zt = c1[3];
    b.box(0, (p0 + p1) / 2, zb, W + 0.03, p1 - p0, zt - zb - 0.02, body, 0.88);
  }
  if (sp.bed) {   // pickup bed walls
    const [p0, p1] = sp.bed.map(f => f * L), z = 1.05;
    for (const sx of [-1, 1]) b.box(sx * (W / 2 - 0.06), (p0 + p1) / 2, z - 0.02, 0.1, p1 - p0, 0.34, body);
    b.box(0, p1 - 0.05, z - 0.02, W - 0.1, 0.1, 0.34, body);
    b.box(0, (p0 + p1) / 2, z - 0.04, W - 0.2, p1 - p0, 0.04, dark);
  }
  if (sp.box) {   // truck cargo box
    const [p0, p1] = sp.box.map(f => f * L);
    b.box(0, (p0 + p1) / 2, 0.98, W + 0.06, p1 - p0, 2.55, M(mat(`cargo_${o.cargo ?? '#e9e6df'}`, o.cargo ?? '#e9e6df')));
    b.box(0, (p0 + p1) / 2, 0.55, 0.9, p1 - p0 + L * 0.2, 0.3, dark);
    if (o.stripe !== false) b.box(0, (p0 + p1) / 2, 1.9, W + 0.1, (p1 - p0) * 0.7, 0.5, body);
  }
  if (sp.spoiler) { for (const sx of [-1, 1]) b.box(sx * 0.6, L / 2 - 0.25, 0.7, 0.06, 0.12, 0.22, dark); b.box(0, L / 2 - 0.22, 0.9, W * 0.9, 0.3, 0.04, body); }
  // details: bumpers, grille, lights, plates, mirrors, arches
  const zf = sp.body[0][2], zr = sp.body[sp.body.length - 1][2];
  b.box(0, -L / 2 - 0.02, zf - 0.02, W * 0.94, 0.16, 0.2, dark);
  b.box(0, L / 2 + 0.02, zr - 0.02, W * 0.94, 0.16, 0.2, dark);
  b.box(0, -L / 2 - 0.03, zf + 0.2, W * 0.42, 0.06, 0.14, chrome);
  const hl = M(lights.head), tl = M(lights.tail), zh = sp.body[1][3] - 0.14, zt2 = sp.body[sp.body.length - 2][3] - 0.14;
  for (const sx of [-1, 1]) {
    b.box(sx * W * 0.34, -L / 2 - 0.005, zh - 0.07, W * 0.2, 0.08, 0.14, hl);
    b.box(sx * W * 0.36, L / 2 + 0.005, zt2 - 0.07, W * 0.18, 0.08, 0.14, tl);
    b.box(sx * (W / 2 + 0.1), cab[0][0] + 0.12, cab[0][2] + 0.02, 0.2, 0.08, 0.13, body);
    for (const ay of sp.axle) b.box(sx * (W / 2 - 0.1), ay * L, 0.12, 0.26, sp.r * 2.5, sp.r * 1.75, dark);
  }
  b.box(0, L / 2 + 0.11, zr + 0.05, 0.5, 0.02, 0.13, M(mat('plate', '#e8e8e2')));
  if (o.sign) b.box(0, (c1[0] + c2[0]) / 2, c1[3] + 0.05, 0.5, 0.2, 0.16, M(mat('taxi_sign', '#fff3b0', { emission: 2, emit: '#ffd84a' })));
  if (o.livery) {
    const lv = M(mat(`livery_${o.livery}`, o.livery));
    const zb = sp.body[2][2] + 0.3, y0 = sp.body[1][0] * L + 0.5, y1 = sp.body[sp.body.length - 2][0] * L - 0.3;
    for (const sx of [-1, 1]) b.box(sx * (W / 2 + 0.008), (y0 + y1) / 2, zb, 0.02, y1 - y0, 0.2, lv);
  }
  if (o.bar) {
    lights.beacon = o.bar.map((c, k) => mat(`${name}_beacon${k}`, c, { emission: 1, gloss: 0.6 }));
    const y = (c1[0] + c2[0]) / 2 - (base === 'van' ? 1.2 : 0), z = c1[3] + 0.05;
    b.box(0, y, z, W * 0.62, 0.22, 0.05, dark);
    o.bar.forEach((c, k) => b.box((k ? 1 : -1) * W * 0.17, y, z + 0.05, W * 0.26, 0.2, 0.12, M(lights.beacon[k])));
  }
  const shell = b.mesh(mats, `${name}_shell`);
  root.add(shell);
  // wheels
  root.wheels = [];
  for (const ay of sp.axle) for (const sx of [-1, 1]) {
    const w = wheel(sp.r, base === 'bus' || base === 'truck' ? 0.34 : 0.24, rust > 0.6 && r.random() < 0.5);
    w.position.set(sx * (W / 2 - 0.13), ay * L, sp.r * (w.scale.z < 1 ? 0.82 : 1));
    root.add(w); root.wheels.push(w);
  }
  if (rust > 0.6) { root.rotation.y = r.uniform(-2, 2) * D; }
  Object.assign(root, { lights, spec: sp, kind });
  return root;
}

/** Drive along a polyline [[x,y],...] between frames; faces the direction of travel and spins the wheels. */
export function drive(v, path, start, end, { z = 0, interp = 'LINEAR', easeIn = false } = {}) {
  const segs = []; let total = 0;
  for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, d, total]); total += d; }
  const A = stage.A, R = v.spec?.r ?? 0.35;
  let prevAng = null;
  for (let f = start; f <= end; f += 2) {
    let u = (f - start) / (end - start);
    if (easeIn) u = u * u * (3 - 2 * u);
    const s = u * total;
    for (let k = 0; k < segs.length; k++) {
      const [a, b, d, s0] = segs[k];
      if (s <= s0 + d || k === segs.length - 1) {
        const t = d === 0 ? 0 : Math.min(1, (s - s0) / d);
        let ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
        if (prevAng !== null) { while (ang - prevAng > Math.PI) ang -= 2 * Math.PI; while (ang - prevAng < -Math.PI) ang += 2 * Math.PI; }
        prevAng = ang;
        A.key(v, 'position', f, [lerp(a[0], b[0], t), lerp(a[1], b[1], t), z], interp);
        A.key(v, 'rotation', f, [0, 0, ang], 'BEZIER');
        break;
      }
    }
    for (const w of v.wheels || []) A.key(w, 'rotation', f, [s / R, 0, 0], 'LINEAR');
  }
}

/** Flash emergency lights (police / ambulance) between frames. */
export function beacon(v, start, end, period = 8) {
  if (!v.lights.beacon) return;
  for (let f = start, k = 0; f <= end; f += period, k++)
    v.lights.beacon.forEach((m, i) => emit(m, (k + i) % 2 ? 14 : 0.3, f, 'CONSTANT'));
}

// ------------------------------------------------------------------ motorcycle
export function motorcycle(name = 'bike', loc = [0, 0, 0], heading = 0, { color = '#c23b3b', rust = 0 } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const b = new Buf(), mats = [paint(color, rust), mat('veh_dark', '#22242a'), mat('veh_chrome', P.CHROME, { gloss: 0.9 }), mat(`${name}_head`, '#fff6d8', { emission: 1, gloss: 0.9 })];
  b.out([0, 0, 0.6]).loft(0, [[[-0.12, -0.45, 0.62], [0.12, -0.45, 0.62], [0.1, -0.45, 0.86], [-0.1, -0.45, 0.86]], [[-0.16, -0.05, 0.6], [0.16, -0.05, 0.6], [0.13, -0.05, 0.92], [-0.13, -0.05, 0.92]], [[-0.1, 0.25, 0.62], [0.1, 0.25, 0.62], [0.08, 0.25, 0.8], [-0.08, 0.25, 0.8]]]);
  b.out(null);
  b.box(0, 0.45, 0.72, 0.26, 0.6, 0.1, 1);           // seat
  b.box(0, -0.05, 0.3, 0.26, 0.5, 0.32, 2);          // engine
  b.tube([0, -0.5, 0.95], [0, -0.82, 0.34], 0.035, 2, 5);   // fork
  b.tube([-0.33, -0.5, 1.02], [0.33, -0.5, 1.02], 0.02, 1, 5);   // bars
  b.tube([0.12, 0.1, 0.3], [0.14, 0.95, 0.38], 0.045, 2, 6);   // exhaust
  b.box(0, -0.58, 0.9, 0.16, 0.06, 0.14, 3);
  b.box(0, 0.86, 0.5, 0.14, 0.4, 0.05, 0);
  root.add(b.mesh(mats, `${name}_body`));
  root.wheels = [-0.82, 0.78].map(y => { const w = wheel(0.33, 0.12); w.position.set(0, y, 0.33); root.add(w); return w; });
  root.spec = { r: 0.33 };
  root.lights = { head: mats[3] };
  return root;
}

// ------------------------------------------------------------------ boat
/** Small fishing boat, bow toward -Y, waterline at z = 0. boat.lamp = cabin light material. */
export function boat(name = 'boat', loc = [0, 0, 0], heading = 0, { color = '#c94f4f', cabin = '#f2efe8', rust = 0 } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const lamp = mat(`${name}_lamp`, '#2a3442', { emit: '#ffd48a', emission: 0, gloss: 0.8 });
  const b = new Buf(), mats = [paint(color, rust), mat(`boat_${cabin}`, cabin), mat('veh_dark', '#22242a'), lamp, mat('boat_deck', '#9a7a55')];
  const st = (y, w, zb, zt) => [[-w * 0.55, y, zb], [w * 0.55, y, zb], [w, y, zt], [-w, y, zt]];
  b.out([0, 0, 0.3]).loft(0, [st(-5.2, 0.05, 0.2, 1.5), st(-3.6, 1.1, -0.5, 1.25), st(-1, 1.7, -0.7, 1.05), st(3.2, 1.6, -0.7, 1.05), st(4.6, 1.2, -0.4, 1.2)]);
  b.out(null);
  b.box(0, 0.2, 1.02, 3.0, 7.2, 0.06, 4);
  b.box(0, 1.6, 1.08, 2.2, 2.6, 1.9, 1); b.box(0, 1.6, 2.98, 2.5, 3.0, 0.12, 0);
  b.box(0, 0.28, 1.95, 1.8, 0.05, 0.75, 3);
  for (const sx of [-1, 1]) b.box(sx * 1.11, 1.6, 1.95, 0.05, 1.6, 0.7, 3);
  b.tube([0, -1.2, 1.05], [0, -1.2, 5.2], 0.07, 2, 6); b.tube([0, -1.2, 4.2], [0, -3.6, 2.2], 0.04, 2, 4);
  b.tube([0, 1.6, 3.1], [0, 1.6, 4.1], 0.05, 2, 5);
  for (const sx of [-1, 1]) b.box(sx * 1.55, -0.5, 1.08, 0.06, 6.5, 0.4, 0);
  root.add(b.mesh(mats, `${name}_hull`));
  return Object.assign(root, { lamp });
}

// ------------------------------------------------------------------ aircraft
const circ = (y, rad, z = 0, n = 10, sq = 1) => Array.from({ length: n }, (_, i) => { const a = 2 * Math.PI * (i + 0.5) / n; return [rad * Math.cos(a), y, z + rad * sq * Math.sin(a)]; });
const wing = (b, mi, rootY, tipY, span, chordR, chordT, z, zTip, sx) => {
  const t = 0.09;
  b.out([sx * span / 2, (rootY + tipY) / 2 + chordR / 2, (z + zTip) / 2]).loft(mi, [
    [[0, rootY, z - chordR * t], [0, rootY + chordR, z], [0, rootY + chordR * 0.3, z + chordR * t]],
    [[sx * span, tipY, zTip - chordT * t], [sx * span, tipY + chordT, zTip], [sx * span, tipY + chordT * 0.3, zTip + chordT * t]]]);
  b.out(null);
};

/** Passenger jet, nose toward -Y. ~38 m long. */
export function airliner(name = 'jet', loc = [0, 0, 0], heading = 0, { color = '#f4f5f7', accent = '#2f6fb0', scale = 1 } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D; root.scale.setScalar(scale);
  const b = new Buf(), mats = [mat(`jet_${color}`, color, { gloss: 0.5 }), mat(`jet_${accent}`, accent, { gloss: 0.5 }), mat('veh_glass', '#1c2a38', { gloss: 1 }), mat('jet_engine', '#8f959e', { gloss: 0.6 })];
  const R = 1.9;
  b.out([0, 0, 0]).loft(0, [circ(-19, 0.2, -0.3), circ(-17.5, 1.2, -0.15), circ(-15, R), circ(8, R), circ(15, 1.1, 0.5), circ(19, 0.25, 0.9)]);
  b.out(null);
  b.box(0, -17.2, 0.35, 1.9, 1.0, 0.45, 2, 0.7);                                     // cockpit glass
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 22; k++) b.box(sx * (R - 0.03), -13.5 + k * 1.0, 0.35, 0.06, 0.45, 0.4, 2);   // cabin windows
    wing(b, 0, -3.5, 3.5, 16.5, 7, 2, -0.9, 0.3, sx);
    wing(b, 0, 14.5, 17, 6, 3.2, 1.4, 0.7, 1.0, sx);
    b.tube([sx * 5.8, -3.6, -1.9], [sx * 5.8, 0.2, -1.9], 1.0, 3, 10);                 // engine
    b.tube([sx * 5.8, -3.9, -1.9], [sx * 5.8, -3.55, -1.9], 1.08, 1, 10);
    b.box(sx * 5.8, -1.2, -1.2, 0.25, 2.4, 0.8, 0);
  }
  b.out([0, 17, 4]).loft(1, [[[-0.15, 13.2, 1.4], [0.15, 13.2, 1.4], [0, 18.6, 1.4]], [[-0.06, 17.6, 7.2], [0.06, 17.6, 7.2], [0, 19.6, 7.2]]]);
  root.add(b.out(null).mesh(mats, `${name}_body`));
  return root;
}

/** Helicopter, nose toward -Y. Returns root with .rotor and .tailRotor (animate with spin()). */
export function helicopter(name = 'heli', loc = [0, 0, 0], heading = 0, { color = '#d83a2e', accent = '#f4f5f7' } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const b = new Buf(), mats = [paint(color), mat(`heli_${accent}`, accent, { gloss: 0.5 }), mat('veh_glass', '#1c2a38', { gloss: 1 }), mat('veh_dark', '#22242a')];
  b.out([0, 0, 1.6]).loft(0, [circ(-2.6, 0.35, 1.25, 8), circ(-1.9, 1.0, 1.5, 8, 1.05), circ(-0.3, 1.2, 1.7, 8, 1.1), circ(1.4, 1.05, 1.75, 8), circ(2.6, 0.45, 1.95, 8)]);
  b.out(null);
  b.tube([0, 2.4, 1.95], [0, 7.6, 2.3], 0.3, 0, 6, 0.14);                              // tail boom
  b.out([0, 7.4, 2.9]).loft(1, [[[-0.06, 6.6, 2.2], [0.06, 6.6, 2.2], [0, 7.9, 2.2]], [[-0.03, 7.5, 3.7], [0.03, 7.5, 3.7], [0, 8.1, 3.7]]]);
  b.out(null);
  b.box(0, -2.0, 1.55, 1.7, 1.3, 0.95, 2, 0.6);                                        // canopy
  b.box(0, 0.2, 2.85, 0.9, 1.6, 0.35, 1, 0.7);                                         // engine cowl
  b.tube([0, 0.1, 3.1], [0, 0.1, 3.55], 0.09, 3, 6);                                   // mast
  for (const sx of [-1, 1]) {                                                          // skids
    b.tube([sx * 1.05, -2.2, 0.08], [sx * 1.05, 1.9, 0.08], 0.06, 3, 5);
    for (const y of [-1.2, 1.0]) b.tube([sx * 0.7, y, 0.8], [sx * 1.05, y, 0.08], 0.045, 3, 5);
  }
  root.add(b.mesh(mats, `${name}_body`));
  const blade = (len, wid, n) => { const q = new Buf(); for (let k = 0; k < n; k++) q.rbox(Math.cos(k * 2 * Math.PI / n) * len / 2, Math.sin(k * 2 * Math.PI / n) * len / 2, -0.02, len, wid, 0.04, k * 2 * Math.PI / n, 0); return q.mesh([mats[3]]); };
  root.rotor = blade(5.6, 0.28, 4); root.rotor.position.set(0, 0.1, 3.56); root.add(root.rotor);
  root.tailRotor = blade(0.9, 0.12, 2); root.tailRotor.rotation.y = Math.PI / 2; root.tailRotor.position.set(0.2, 7.75, 2.95); root.add(root.tailRotor);
  return root;
}

/** Spin helicopter rotors between frames (rps = revolutions per second). */
export function spin(h, start, end, rps = 4) {
  for (const f of [start, end]) {
    const a = (f - start) / 30 * rps * 2 * Math.PI;
    stage.A.key(h.rotor, 'rotation', f, [0, 0, a], 'LINEAR');
    stage.A.key(h.tailRotor, 'rotation', f, [a * 1.5, Math.PI / 2, 0], 'LINEAR');
  }
}
