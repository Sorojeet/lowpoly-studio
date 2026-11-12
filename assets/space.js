// SPACE — low-poly planets, a sun, orbit rings, for "what if" shots seen from space.
//
//   Lt.apply('space'); Lt.fog(1e5, 1e6);          // black sky, no ambient
//   const sun = Sp.sun('sun', [0, 0, 0], 30);      // emissive, glows with bloom; emit(sun.mat, 0, frame) switches it off
//   const earth = Sp.planet('earth', [110, 0, 0], 6, { kind: 'earth' | 'frozen' | 'mars' | 'moon' | 'gas', lights: true });
//   Sp.spinPlanet(earth, 1, n, 0.3);               // turns per second
//   Sp.orbitRing('ring', [0, 0, 0], 110);          Sp.sunlight(sun.position)  // aim the scene's sun lamp from a point
//   emit(earth.lights, 6, frame)                   // city lights on the night side
import { THREE, stage, D, Rand, Buf, mat, lin } from '../studio/core.js';

function noise3(seed) {
  const h = (x, y, z) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + Math.imul(seed + 1, 1442695041); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
  const n = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = sm(x - xi), v = sm(y - yi), w = sm(z - zi);
    return L(L(L(h(xi, yi, zi), h(xi + 1, yi, zi), u), L(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v), L(L(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), L(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w); };
  return (x, y, z) => (n(x, y, z) + 0.5 * n(x * 2.1, y * 2.1, z * 2.1) + 0.25 * n(x * 4.3, y * 4.3, z * 4.3)) / 1.75;
}

const KINDS = {
  earth:  { sea: ['#2f6fb5', '#2a62a5'], land: ['#5f9e52', '#7aa95c', '#c9b27a', '#8d8a70'], ice: '#f4f7fb', seaLevel: 0.52, cap: 0.8, clouds: true, atmo: '#6fb0ff' },
  frozen: { sea: ['#cfe0ee', '#bcd2e6'], land: ['#e9eef4', '#dfe7f0', '#f4f7fb', '#c9d6e4'], ice: '#ffffff', seaLevel: 0.52, cap: 0.6, clouds: false, atmo: '#9fc4e8' },
  mars:   { sea: ['#a8563a', '#9a4c32'], land: ['#c2704a', '#b5623e', '#d08a5a', '#8f4a34'], ice: '#f0e6dc', seaLevel: 0.4, cap: 0.9, clouds: false, atmo: '#e0a080' },
  moon:   { sea: ['#8d9096', '#84878d'], land: ['#b4b7bc', '#a6a9ae', '#c2c5c9', '#9a9da2'], ice: '#c9ccd0', seaLevel: 0.45, cap: 2, clouds: false, atmo: null },
  gas:    { sea: ['#d9a86a', '#c9925a'], land: ['#e6c48a', '#b8804e', '#f0dcae', '#a86e44'], ice: '#f0dcae', seaLevel: 0.5, cap: 2, clouds: false, atmo: '#f0d0a0', bands: true },
};

/** Faceted planet. Returns the mesh group with .lights (emissive city-lights material) and .mat. */
export function planet(name = 'planet', loc = [0, 0, 0], r = 6, { kind = 'earth', seed = 1, detail = 5, lights = false, tilt = 23 } = {}) {
  const K = KINDS[kind], nz = noise3(seed), R = new Rand(seed), root = new THREE.Group();
  root.position.set(...loc); root.name = name;
  const spinner = new THREE.Group(); spinner.rotation.x = tilt * D; root.add(spinner);
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, b = new Buf(), lightTris = new Buf();
  const V = i => [p.getX(i), p.getY(i), p.getZ(i)];
  for (let i = 0; i < p.count; i += 3) {
    const a = V(i), bb = V(i + 1), c = V(i + 2), cx = (a[0] + bb[0] + c[0]) / 3, cy = (a[1] + bb[1] + c[1]) / 3, cz = (a[2] + bb[2] + c[2]) / 3;
    const h = K.bands ? 0.5 + 0.5 * Math.sin(cz * 9 + nz(cx * 2, cy * 2, cz * 2) * 3) : nz(cx * 1.7 + 5, cy * 1.7 + 9, cz * 1.7 + 2);
    const land = h > K.seaLevel, polar = Math.abs(cz) > K.cap - 0.12 * nz(cx * 4, cy * 4, 3);
    const hex = polar ? K.ice : land ? K.land[Math.min(3, Math.floor((h - K.seaLevel) / (1 - K.seaLevel) * 5.5))] : K.sea[R.random() < 0.5 ? 0 : 1];
    const k = lin(hex), v = R.uniform(0.94, 1.05), lift = land && !K.bands ? 1 + (h - K.seaLevel) * 0.05 : 1;
    b.tint([k[0] * v, k[1] * v, k[2] * v]).tri(0, a.map(x => x * r * lift), bb.map(x => x * r * lift), c.map(x => x * r * lift));
    if (lights && land && R.random() < 0.6) {   // a small glowing triangle floating just above the face
      const s = R.uniform(0.14, 0.3), q = [a, bb, c].map(t => [cx + (t[0] - cx) * s, cy + (t[1] - cy) * s, cz + (t[2] - cz) * s].map(x => x * r * lift * 1.03));
      lightTris.tri(0, q[0], q[1], q[2]);
    }
  }
  const m = mat(`${name}_surface`, '#ffffff', { vertexColors: true, gloss: kind === 'earth' ? 0.25 : 0 });
  const body = b.mesh([m], `${name}_body`); body.castShadow = body.receiveShadow = false; spinner.add(body);
  let lm = null;
  if (lights) { lm = mat(`${name}_lights`, '#201a10', { emit: '#ffc070', emission: 0 }); const lo = lightTris.mesh([lm], `${name}_lights`); lo.castShadow = false; spinner.add(lo); }
  if (K.clouds) {
    const cb = new Buf();
    for (let i = 0; i < p.count; i += 3) {
      const a = V(i), bb = V(i + 1), c = V(i + 2), cx = (a[0] + bb[0] + c[0]) / 3, cy = (a[1] + bb[1] + c[1]) / 3, cz = (a[2] + bb[2] + c[2]) / 3;
      if (nz(cx * 2.6 + 40, cy * 2.6 + 11, cz * 3.4 + 7) > 0.62) cb.tri(0, a.map(x => x * r * 1.035), bb.map(x => x * r * 1.035), c.map(x => x * r * 1.035));
    }
    const cl = cb.mesh([mat(`${name}_clouds`, '#ffffff', { opacity: 0.85 })], `${name}_clouds`); cl.castShadow = false; spinner.add(cl); root.clouds = cl;
  }
  if (K.atmo) {
    const at = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 1.09, 3), new THREE.MeshBasicMaterial({ color: K.atmo, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false, fog: false }));
    root.add(at); root.atmo = at;
  }
  stage.scene.add(root);
  return Object.assign(root, { spinner, lights: lm, mat: m, radius: r });
}

export function spinPlanet(pl, start, end, tps = 0.2) {
  for (const f of [start, end]) {
    stage.A.key(pl.spinner, 'rotation', f, [pl.spinner.rotation.x, 0, (f - start) / 30 * tps * 2 * Math.PI], 'LINEAR');
    if (pl.clouds) stage.A.key(pl.clouds, 'rotation', f, [0, 0, (f - start) / 30 * tps * 0.35 * 2 * Math.PI], 'LINEAR');
  }
}

/** The Sun: bright faceted ball + soft corona shells. sun.mat / sun.corona for emit() and opacity. */
export function sun(name = 'sun', loc = [0, 0, 0], r = 30, { color = '#ffd27a', strength = 9, light = 0 } = {}) {
  const root = new THREE.Group(); root.position.set(...loc); root.name = name;
  const m = mat(`${name}_mat`, '#ffe9b0', { emit: color, emission: strength, fog: false });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2).toNonIndexed(), m); core.geometry.computeVertexNormals(); root.add(core);
  root.corona = [1.18, 1.42, 1.8].map((s, i) => {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: [0.2, 0.09, 0.035][i], depthWrite: false, fog: false, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
    root.add(c); return c;
  });
  if (light) { root.light = new THREE.PointLight('#fff4e0', light, 0, 0); root.add(root.light); }   // light = intensity; lights planets from the sun's position
  stage.scene.add(root);
  return Object.assign(root, { mat: m, core });
}
/** Make a sun() vanish between two frames (snap by default). */
export function vanish(s, frame, dur = 2) {
  const A = stage.A;
  A.key(s, 'scale', frame, [1, 1, 1], 'LINEAR'); A.key(s, 'scale', frame + dur, [0.0001, 0.0001, 0.0001]);
  if (s.light) { A.key(s.light, 'intensity', frame, undefined, 'LINEAR'); A.key(s.light, 'intensity', frame + dur, 0); }
}

/** Dashed orbit ring in the XY plane; ring.material.opacity can be keyed. arc = [startDeg, endDeg]. */
export function orbitRing(name = 'orbit', center = [0, 0, 0], radius = 100, { color = '#9fc4ff', dashes = 90, width = 0.5, arc = [0, 360], opacity = 0.55 } = {}) {
  const b = new Buf(), n = Math.round(dashes * (arc[1] - arc[0]) / 360);
  for (let i = 0; i < n; i++) {
    const a0 = (arc[0] + (arc[1] - arc[0]) * i / n) * D, a1 = (arc[0] + (arc[1] - arc[0]) * (i + 0.55) / n) * D;
    const P = (a, rr) => [center[0] + Math.cos(a) * rr, center[1] + Math.sin(a) * rr, center[2]];
    b.poly(0, [P(a0, radius - width / 2), P(a1, radius - width / 2), P(a1, radius + width / 2), P(a0, radius + width / 2)]);
  }
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, fog: false });
  const o = new THREE.Mesh(b.build(), m); o.name = name; stage.scene.add(o); return o;
}
/** Straight dashed line between two points (e.g. the path Earth flies off on). Reveal by keying line.material.opacity. */
export function pathLine(name, a, b2, { color = '#ff8a5a', dash = 4, width = 0.6, opacity = 0.8 } = {}) {
  const b = new Buf(), len = Math.hypot(b2[0] - a[0], b2[1] - a[1]), n = Math.floor(len / dash), yaw = Math.atan2(b2[1] - a[1], b2[0] - a[0]);
  for (let i = 0; i < n; i++) { const t = (i + 0.3) / n; b.rbox(a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t, a[2] - 0.05, dash * 0.55, width, 0.1, yaw, 0); }
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false });
  const o = new THREE.Mesh(b.build(), m); o.name = name; stage.scene.add(o); return o;
}

/** Aim the scene's directional "sun" lamp so light comes from point `from` toward `to`. Sets Lt elev/azim. */
export function sunlight(from, to = [0, 0, 0]) {
  const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], len = Math.hypot(...d), L = stage.light.L;
  L.elev = Math.asin(-d[2] / len) / D; L.azim = Math.atan2(-d[0], d[1]) / D;
  stage.light.focus = [to[0], to[1], to[2]];
}
