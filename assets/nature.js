// NATURE (PS3 pack) — terrain, water, trees, rocks, bushes, grass, flowers, mountains.
//
//   const land = terrain('land', { size: 400, res: 64, height: 30, seed: 2, flat: [[0, 0, 40]] });   // flat = [x, y, radius] clearings
//   land.heightAt(x, y)                                  -> ground z, to place things on the terrain
//   water('lake', [0, 0, 2], { size: 300 });             waves(lake, 1, n) animates a gentle swell
//   tree('t1', [x, y, z], { kind: 'oak' | 'pine' | 'palm' | 'birch' | 'dead' | 'autumn', seed, size })
//   forest('woods', { n: 120, area: [-150, 150, -150, 150], land, kinds: ['pine', 'oak'], keepOut: [[0, 0, 30]] })
//   rock('r', [x, y, z], { size: 2, seed })   bush(...)   grassField('grass', { n: 3000, area, land })   flowers(...)
//   mountains('range', { radius: 900, n: 14, height: 260, snow: true })
import { THREE, stage, D, Rand, Buf, mat, group, join, icoGeom, lin, lerp } from '../studio/core.js';
import * as P from './palette.js';

// ------------------------------------------------------------------ value noise
function noise2(seed) {
  const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed + 1, 1442695041); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
  return (x, y, oct = 4) => { let a = 1, f = 1, s = 0, t = 0; for (let o = 0; o < oct; o++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.03; } return s / t; };
}

export const BIOMES = {
  temperate: { sand: '#d8c690', grass: ['#7aa95c', '#6a9a50'], rock: '#8d8a84', snow: '#f4f6fa', dirt: '#8a7052', snowLine: 0.78, water: '#3f8fb5' },
  desert:    { sand: '#e0c088', grass: ['#d9b676', '#cfa868'], rock: '#b0805a', snow: '#e9d7b0', dirt: '#b89060', snowLine: 2, water: '#4aa0a8' },
  snow:      { sand: '#cfd6dc', grass: ['#e9eef4', '#dfe6ee'], rock: '#7d8690', snow: '#ffffff', dirt: '#aab2ba', snowLine: 0.45, water: '#5f8fb0' },
  wasteland: { sand: '#8a8272', grass: ['#7d7a5c', '#6f6a52'], rock: '#5f5a54', snow: '#bdb8ae', dirt: '#5e5346', snowLine: 2, water: '#56705e' },
  autumn:    { sand: '#cdb98a', grass: ['#a8a04e', '#b88a3c'], rock: '#84807a', snow: '#f4f6fa', dirt: '#7a5a40', snowLine: 0.85, water: '#3f7f9f' },
};

/** Faceted heightfield coloured per-face by height and slope. */
export function terrain(name = 'terrain', { size = 400, res = 64, height = 30, seed = 1, scale = 0.012, biome = 'temperate', flat = [], sea = null, center = [0, 0], edgeRise = 0 } = {}) {
  const nz = noise2(seed), bio = typeof biome === 'string' ? BIOMES[biome] : biome, r = new Rand(seed);
  const heightAt = (x, y) => {
    let h = Math.pow(nz(x * scale + 31.7, y * scale + 17.3, 5), 1.6) * height;
    if (edgeRise) { const dd = Math.hypot(x - center[0], y - center[1]) / (size / 2); h += edgeRise * Math.max(0, dd - 0.45) ** 2 * 3.3; }
    for (const [fx, fy, fr, fz = 0] of flat) { const dd = Math.hypot(x - fx, y - fy); const t = Math.min(1, Math.max(0, (dd - fr) / (fr * 0.8))); h = lerp(fz, h, t * t * (3 - 2 * t)); }
    return h;
  };
  const b = new Buf(), step = size / res, col = k => lin(k);
  const C = { sand: col(bio.sand), g0: col(bio.grass[0]), g1: col(bio.grass[1]), rock: col(bio.rock), snow: col(bio.snow), dirt: col(bio.dirt) };
  const P0 = (i, j) => { const x = center[0] - size / 2 + i * step, y = center[1] - size / 2 + j * step; return [x, y, heightAt(x, y)]; };
  for (let i = 0; i < res; i++) for (let j = 0; j < res; j++) {
    const q = [P0(i, j), P0(i + 1, j), P0(i + 1, j + 1), P0(i, j + 1)];
    for (const t of (i + j) % 2 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 3], [1, 2, 3]]) {
      const [a, bb, c] = t.map(k => q[k]);
      const ux = bb[0] - a[0], uy = bb[1] - a[1], uz = bb[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nzz = ux * vy - uy * vx, slope = 1 - Math.abs(nzz) / Math.hypot(nx, ny, nzz);
      const zc = (a[2] + bb[2] + c[2]) / 3, hN = zc / Math.max(1e-6, height + edgeRise), v = r.uniform(0.92, 1.06);
      let k = r.random() < 0.5 ? C.g0 : C.g1;
      if (sea !== null && zc < sea + 0.9) k = C.sand;
      else if (slope > 0.3) k = C.rock;
      else if (hN > bio.snowLine) k = C.snow;
      else if (slope > 0.2) k = C.dirt;
      b.tint([k[0] * v, k[1] * v, k[2] * v]).tri(0, a, bb, c);
    }
  }
  const m = b.mesh([mat(`${name}_mat`, '#ffffff', { vertexColors: true })], name);
  stage.scene.add(m);
  return Object.assign(m, { heightAt, size, biome: bio });
}

/** Water surface: glossy, slightly see-through, faceted so the sun glints across it. */
export function water(name = 'water', loc = [0, 0, 0], { size = 400, res = 24, color = '#3f8fb5', opacity = 0.82, seed = 3 } = {}) {
  const g = new THREE.PlaneGeometry(size, size, res, res).toNonIndexed();
  const m = new THREE.Mesh(g, mat(`${name}_mat`, color, { gloss: 0.45, shininess: 90, opacity }));
  m.position.set(...loc); m.name = name; m.receiveShadow = true; m.renderOrder = 2;
  m.userData = { base: Float32Array.from(g.attributes.position.array), seed, amp: 0 };
  stage.scene.add(m);
  return m;
}
/** Animate the swell (amp metres). Call once; runs every frame. */
export function waves(w, { amp = 0.12, speed = 1, len = 9 } = {}) {
  stage.A.hooks.push(f => {
    const p = w.geometry.attributes.position, base = w.userData.base, t = f / 30 * speed;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      p.setZ(i, amp * (Math.sin(x / len + t * 1.3) + Math.sin(y / len * 1.31 - t) + 0.6 * Math.sin((x + y) / len * 0.7 + t * 0.7)));
    }
    p.needsUpdate = true; w.geometry.computeVertexNormals();
  });
}

// ------------------------------------------------------------------ trees
const LEAVES = { oak: ['#5f9e52', '#77b255', '#4e8a4a'], pine: ['#2f6b4a', '#3a7a52', '#27593f'], palm: ['#5aa054', '#6fb35a'], birch: ['#9ac25a', '#b3cf62'],
  autumn: ['#d98a2e', '#c9552e', '#e0b23c', '#b8452a'], dead: [], snowy: ['#3a6e56', '#2f5f4a'] };
function treeBuf(b, M, kind, r, s) {
  const trunkC = kind === 'birch' ? '#e6e2d6' : kind === 'dead' ? '#5a4c40' : kind === 'palm' ? '#9a7a55' : P.TRUNK;
  const tk = M(trunkC), cols = LEAVES[kind] ?? LEAVES.oak, lf = () => M(r.choice(cols));
  const blob = (rad, pos, sc = [1, 1, 0.85], mi = lf()) => { const g = icoGeom(rad, { jitter: 0.2, seed: r.randrange(9999), scale: sc }); g.translate(...pos); b.geom(g, mi); };
  if (kind === 'pine' || kind === 'snowy') {
    const h = 6.5 * s, n = 4, mi = lf();
    b.cyl(0, 0, 0, 0.2 * s, h * 0.35, tk, 6, 0.14 * s);
    for (let i = 0; i < n; i++) {
      const z = h * (0.2 + i * 0.2), rad = (1.9 - i * 0.42) * s;
      b.cyl(0, 0, z, rad, h * 0.3, mi, 7, 0.08 * s);
      if (kind === 'snowy') b.cyl(0, 0, z + h * 0.13, rad * 0.7, h * 0.18, M('#f4f7fb'), 7, 0.1 * s);
    }
  } else if (kind === 'palm') {
    let p = [0, 0, 0]; const lean = [r.uniform(-0.25, 0.25), r.uniform(-0.25, 0.25)], segs = 5, h = 6 * s;
    for (let i = 0; i < segs; i++) { const q = [p[0] + lean[0] * (i + 1) * 0.3 * s, p[1] + lean[1] * (i + 1) * 0.3 * s, p[2] + h / segs]; b.tube(p, q, (0.2 - i * 0.02) * s, tk, 6, (0.18 - i * 0.02) * s); p = q; }
    const mi = lf();
    for (let k = 0; k < 7; k++) {   // fronds: bent 2-segment blades
      const a = k / 7 * 2 * Math.PI + r.uniform(-0.2, 0.2), c = Math.cos(a), sn = Math.sin(a), L = 2.6 * s, wd = 0.45 * s;
      const m1 = [p[0] + c * L * 0.55, p[1] + sn * L * 0.55, p[2] + 0.5 * s], tip = [p[0] + c * L, p[1] + sn * L, p[2] - 0.7 * s];
      const sx = -sn * wd, sy = c * wd;
      b.poly(mi, [[p[0] + sx * 0.4, p[1] + sy * 0.4, p[2]], [m1[0] + sx, m1[1] + sy, m1[2]], [m1[0] - sx, m1[1] - sy, m1[2]], [p[0] - sx * 0.4, p[1] - sy * 0.4, p[2]]]);
      b.poly(mi, [[m1[0] + sx, m1[1] + sy, m1[2]], tip, [m1[0] - sx, m1[1] - sy, m1[2]]]);
    }
    for (let k = 0; k < 3; k++) blob(0.16 * s, [p[0] + r.uniform(-0.2, 0.2), p[1] + r.uniform(-0.2, 0.2), p[2] - 0.2 * s], [1, 1, 1], M('#6b4a2a'));
  } else {
    const h = (kind === 'birch' ? 4.2 : 3.2) * s, tr = (kind === 'birch' ? 0.12 : 0.24) * s;
    b.cyl(0, 0, 0, tr * 1.25, h, tk, 6, tr * 0.7);
    if (kind === 'birch') for (let i = 0; i < 4; i++) b.cyl(0, 0, h * (0.15 + i * 0.2), tr * 1.02, 0.08 * s, M('#3a3632'), 6);
    const nb = kind === 'dead' ? 6 : 3;
    for (let i = 0; i < nb; i++) {   // branches
      const a = r.uniform(0, 6.28), z0 = h * r.uniform(0.55, 0.95), len = r.uniform(1.0, 1.9) * s;
      const tip = [Math.cos(a) * len, Math.sin(a) * len, z0 + len * r.uniform(0.5, 0.9)];
      b.tube([0, 0, z0], tip, tr * 0.45, tk, 5, tr * 0.15);
      if (kind === 'dead') b.tube(tip, [tip[0] * 1.3 + r.uniform(-0.4, 0.4), tip[1] * 1.3, tip[2] + r.uniform(0.3, 0.9) * s], tr * 0.15, tk, 4, 0.01);
      else blob(r.uniform(0.9, 1.3) * s * (kind === 'birch' ? 0.75 : 1), tip);
    }
    if (kind !== 'dead') { blob((kind === 'birch' ? 1.1 : 1.7) * s, [0, 0, h + 0.9 * s]); blob(1.1 * s, [r.uniform(-0.8, 0.8) * s, r.uniform(-0.8, 0.8) * s, h + 1.9 * s]); }
  }
}
function matIndexer(prefix = 'n') {
  const mats = [];
  const M = c => { const m = mat(`${prefix}_${c}`, c); let i = mats.indexOf(m); if (i < 0) { i = mats.length; mats.push(m); } return i; };
  return { mats, M };
}
export function tree(name = 'tree', loc = [0, 0, 0], { kind = 'oak', seed = 0, size = 1 } = {}) {
  const r = new Rand(seed + 4000), b = new Buf(), { mats, M } = matIndexer();
  treeBuf(b, M, kind, r, size);
  const m = b.mesh(mats, name);
  m.position.set(...loc); m.rotation.z = r.uniform(0, 6.28);
  stage.scene.add(m);
  return m;
}

function scatter(n, area, r, { land, keepOut = [], minZ = -1e9, maxZ = 1e9, maxSlope = 0.5 } = {}) {
  const pts = [];
  for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) {
    const x = r.uniform(area[0], area[1]), y = r.uniform(area[2], area[3]);
    if (keepOut.some(([kx, ky, kr]) => Math.hypot(x - kx, y - ky) < kr)) continue;
    const z = land ? land.heightAt(x, y) : 0;
    if (z < minZ || z > maxZ) continue;
    if (land && Math.abs(land.heightAt(x + 1.5, y) - z) + Math.abs(land.heightAt(x, y + 1.5) - z) > maxSlope * 3) continue;
    pts.push([x, y, z]); i++;
  }
  return pts;
}

/** Many trees merged into one mesh. keepOut: [[x, y, radius], ...]; minZ keeps trees off beaches / out of water. */
export function forest(name = 'forest', { n = 80, area = [-100, 100, -100, 100], land = null, kinds = ['oak', 'pine'], seed = 0, size = [0.8, 1.4], ...sc } = {}) {
  const r = new Rand(seed + 900), b = new Buf(), { mats, M } = matIndexer(), v = new THREE.Vector3(), m4 = new THREE.Matrix4();
  for (const [x, y, z] of scatter(n, area, r, { land, ...sc })) {
    const t = new Buf(); treeBuf(t, M, r.choice(kinds), r, r.uniform(size[0], size[1]));
    m4.makeRotationZ(r.uniform(0, 6.28)).setPosition(x, y, z - 0.1);
    for (const [mi, arr] of t.parts) {
      const dst = b.parts.get(mi) || (b.parts.set(mi, []), b.parts.get(mi));
      for (let i = 0; i < arr.length; i += 3) { v.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(m4); dst.push(v.x, v.y, v.z); }
    }
  }
  const m = b.mesh(mats, name); stage.scene.add(m); return m;
}

// ------------------------------------------------------------------ rocks, bushes, grass, flowers
export function rock(name = 'rock', loc = [0, 0, 0], { size = 1, seed = 0, color = P.ROCK, moss = false } = {}) {
  const r = new Rand(seed + 60), b = new Buf();
  const g = icoGeom(size, { jitter: 0.28, seed, scale: [r.uniform(0.9, 1.4), r.uniform(0.8, 1.2), r.uniform(0.5, 0.8)] });
  b.geom(g, 0);
  const mats = [mat(`rock_${color}`, color)];
  if (moss) { const g2 = icoGeom(size * 0.75, { jitter: 0.2, seed: seed + 1, scale: [1.1, 1, 0.35] }); g2.translate(0, 0, size * 0.42); b.geom(g2, 1); mats.push(mat('moss', '#5f8a4a')); }
  const m = b.mesh(mats, name); m.position.set(loc[0], loc[1], loc[2] + size * 0.2); m.rotation.z = r.uniform(0, 6.28);
  stage.scene.add(m); return m;
}
/** Scatter rocks (one merged mesh). */
export function rocks(name = 'rocks', { n = 30, area = [-50, 50, -50, 50], land = null, seed = 0, size = [0.3, 1.6], color = P.ROCK, ...sc } = {}) {
  const r = new Rand(seed + 300), objs = scatter(n, area, r, { land, maxSlope: 2, ...sc }).map((p, i) => rock(`${name}_${i}`, p, { size: r.uniform(size[0], size[1]), seed: seed * 100 + i, color }));
  return objs.length ? join(objs, name) : null;
}
export function bush(name = 'bush', loc = [0, 0, 0], { size = 1, seed = 0, color = null, berries = null } = {}) {
  const r = new Rand(seed + 20), b = new Buf(), { mats, M } = matIndexer();
  const c = color ?? r.choice(['#5f9e52', '#4e8a4a', '#6aa85a']);
  for (let i = 0; i < 4; i++) { const g = icoGeom(r.uniform(0.45, 0.7) * size, { jitter: 0.22, seed: seed + i, scale: [1, 1, 0.8] }); g.translate(r.uniform(-0.5, 0.5) * size, r.uniform(-0.5, 0.5) * size, r.uniform(0.3, 0.6) * size); b.geom(g, M(c)); }
  if (berries) for (let i = 0; i < 8; i++) { const g = icoGeom(0.07 * size, {}); g.translate(r.uniform(-0.7, 0.7) * size, r.uniform(-0.7, 0.7) * size, r.uniform(0.5, 1.0) * size); b.geom(g, M(berries)); }
  const m = b.mesh(mats, name); m.position.set(...loc); stage.scene.add(m); return m;
}
/** Thousands of grass blades as one instanced mesh (cheap). */
export function grassField(name = 'grass', { n = 2500, area = [-30, 30, -30, 30], land = null, seed = 0, colors = ['#6a9a50', '#86b862', '#5a8a46'], height = 0.45, ...sc } = {}) {
  const r = new Rand(seed + 40), g = new THREE.BufferGeometry();
  const tuft = [];
  for (let k = 0; k < 3; k++) { const a = k * 2.1, c = Math.cos(a) * 0.09, s = Math.sin(a) * 0.09, lx = Math.cos(a + 1.3) * 0.12, ly = Math.sin(a + 1.3) * 0.12; tuft.push(-c, -s, 0, c, s, 0, lx, ly, 1); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(tuft, 3)); g.computeVertexNormals();
  const pts = scatter(n, area, r, { land, ...sc });
  const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide, flatShading: true }), Math.max(1, pts.length));
  const o = new THREE.Object3D(), col = new THREE.Color();
  pts.forEach(([x, y, z], i) => {
    o.position.set(x, y, z); o.rotation.set(0, 0, r.uniform(0, 6.28)); const s = r.uniform(0.6, 1.4); o.scale.set(s, s, s * height); o.updateMatrix();
    im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(r.choice(colors)));
  });
  im.count = pts.length; im.receiveShadow = true; im.name = name;
  stage.scene.add(im); return im;
}
export function flowers(name = 'flowers', { n = 200, area = [-20, 20, -20, 20], land = null, seed = 0, colors = ['#f2c14e', '#e8743b', '#f4f4f4', '#c94f8a', '#7a6fd0'], ...sc } = {}) {
  const r = new Rand(seed + 50), b = new Buf(), { mats, M } = matIndexer();
  for (const [x, y, z] of scatter(n, area, r, { land, ...sc })) {
    const h = r.uniform(0.25, 0.5);
    b.tube([x, y, z], [x, y, z + h], 0.012, M('#4e8a4a'), 3);
    const g = icoGeom(r.uniform(0.06, 0.1), { scale: [1, 1, 0.6] }); g.translate(x, y, z + h); b.geom(g, M(r.choice(colors)));
  }
  const m = b.mesh(mats, name); m.castShadow = false; stage.scene.add(m); return m;
}

/** Ring of distant mountains for the horizon (fog blends them into the sky). */
export function mountains(name = 'mountains', { radius = 900, n = 14, height = 260, seed = 5, color = '#6f7f8f', snow = true, center = [0, 0], arc = [0, 360] } = {}) {
  const r = new Rand(seed + 70), b = new Buf(), mats = [mat(`${name}_rock`, color), mat(`${name}_snow`, '#f4f6fa')];
  for (let i = 0; i < n; i++) {
    const a = (arc[0] + (arc[1] - arc[0]) * (i + r.uniform(-0.3, 0.3)) / n) * D, rad = radius * r.uniform(0.9, 1.25), h = height * r.uniform(0.55, 1.15), w = h * r.uniform(1.1, 1.7);
    const cx = center[0] + Math.cos(a) * rad, cy = center[1] + Math.sin(a) * rad, sides = 6, base = [], mid = [];
    const peak = [cx + r.uniform(-0.15, 0.15) * w, cy + r.uniform(-0.15, 0.15) * w, h];
    for (let k = 0; k < sides; k++) { const t = k / sides * 2 * Math.PI + r.uniform(-0.25, 0.25), rr = w * r.uniform(0.75, 1.15); base.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, -5]); mid.push([lerp(base[k][0], peak[0], 0.68), lerp(base[k][1], peak[1], 0.68), h * 0.66 * r.uniform(0.9, 1.1)]); }
    b.out([cx, cy, 0]);
    for (let k = 0; k < sides; k++) { const q = (k + 1) % sides; b.poly(0, [base[k], base[q], mid[q], mid[k]]); b.tri(snow ? 1 : 0, mid[k], mid[q], peak); }
  }
  const m = b.out(null).mesh(mats, name); m.castShadow = false; stage.scene.add(m); return m;
}
