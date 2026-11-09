// Core helpers shared by every asset and episode (three.js, Z-up, metres).
// Everything is procedural + seeded, so assets regenerate identically in every episode.
import * as THREE from 'three';

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);   // Z-up world, same as the original Blender library
THREE.Euler.DEFAULT_ORDER = 'ZYX';         // == Blender 'XYZ' euler (apply X, then Y, then Z)
export { THREE };
export const D = Math.PI / 180;

// Shared mutable stage: current scene + animator (set by studio/stage.js reset()).
export const stage = { scene: null, A: null, camera: null, renderer: null, light: null };

// Emission scale: lets shots use intuitive "strength" numbers (1 = softly lit, 5 = blazing).
export const EM = 0.4;

// ------------------------------------------------------------------ random
export class Rand {
  constructor(seed = 0) {
    let a = (Math.imul(seed + 1, 2654435761) >>> 0) || 1;
    this.next = () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  random() { return this.next(); }
  uniform(a, b) { return a + (b - a) * this.next(); }
  randint(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  randrange(n) { return Math.floor(this.next() * n); }
  choice(arr) { return arr[this.randrange(arr.length)]; }
  gauss(mu, s) { const u = 1 - this.next(), v = this.next(); return mu + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
}

// ------------------------------------------------------------------ materials
let MATS = new Map();
export function resetMats() { MATS = new Map(); }

/** Flat-shaded low-poly material. o.emission is a strength (scaled by EM); o.emit the glow colour. */
export function mat(name, color, o = {}) {
  if (MATS.has(name)) return MATS.get(name);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, side: o.side ?? THREE.FrontSide });
  m.emissive = new THREE.Color(o.emit ?? color);
  m.emissiveIntensity = (o.emission ?? 0) * EM;
  if (o.fog === false) m.fog = false;
  if (o.toneMapped === false) m.toneMapped = false;
  m.name = name;
  MATS.set(name, m);
  return m;
}

/** Set (or keyframe) emission strength of a material. */
export function emit(m, value, frame, interp = 'BEZIER') {
  if (frame === undefined) m.emissiveIntensity = value * EM;
  else stage.A.key(m, 'emissiveIntensity', frame, value * EM, interp);
}

export function lin(c) { const k = new THREE.Color(c); return [k.r, k.g, k.b]; }

// ------------------------------------------------------------------ mesh buffer
/** Collects flat triangles per material index, builds one BufferGeometry with groups. */
export class Buf {
  constructor() { this.parts = new Map(); }
  tri(mi, a, b, c) {
    let p = this.parts.get(mi);
    if (!p) this.parts.set(mi, (p = []));
    p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  }
  poly(mi, pts) { for (let i = 1; i < pts.length - 1; i++) this.tri(mi, pts[0], pts[i], pts[i + 1]); }
  box(cx, cy, z0, sx, sy, sz, mi = 0, taper = 1) {
    const hx = sx / 2, hy = sy / 2, v = [];
    for (const [z, t] of [[z0, 1], [z0 + sz, taper]])
      v.push([cx - hx * t, cy - hy * t, z], [cx + hx * t, cy - hy * t, z], [cx + hx * t, cy + hy * t, z], [cx - hx * t, cy + hy * t, z]);
    for (const q of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]])
      this.poly(mi, q.map(i => v[i]));
  }
  cyl(cx, cy, z0, r, h, mi = 0, n = 8, rTop = null) {
    rTop = rTop ?? r;
    const b = [], t = [];
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * i / n, c = Math.cos(a), s = Math.sin(a);
      b.push([cx + r * c, cy + r * s, z0]); t.push([cx + rTop * c, cy + rTop * s, z0 + h]);
    }
    this.poly(mi, b.slice().reverse()); this.poly(mi, t);
    for (let i = 0; i < n; i++) { const k = (i + 1) % n; this.poly(mi, [b[i], b[k], t[k], t[i]]); }
  }
  geom(g, mi = 0, m4 = null) {
    const p = g.attributes.position, idx = g.index, v = new THREE.Vector3();
    const get = i => { v.fromBufferAttribute(p, i); if (m4) v.applyMatrix4(m4); return [v.x, v.y, v.z]; };
    const cnt = idx ? idx.count : p.count;
    for (let i = 0; i < cnt; i += 3) {
      const a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
      this.tri(mi, get(a), get(b), get(c));
    }
  }
  build() {
    const keys = [...this.parts.keys()].sort((a, b) => a - b);
    let total = 0;
    for (const k of keys) total += this.parts.get(k).length;
    const arr = new Float32Array(total), g = new THREE.BufferGeometry();
    let off = 0;
    for (const k of keys) { const p = this.parts.get(k); arr.set(p, off); g.addGroup(off / 3, p.length / 3, k); off += p.length; }
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  }
  mesh(mats, name = '') {
    const m = new THREE.Mesh(this.build(), mats.length === 1 ? mats[0] : mats);
    m.castShadow = m.receiveShadow = true;
    m.name = name;
    return m;
  }
}

export function icoGeom(r, { subdiv = 1, jitter = 0, scale = [1, 1, 1], seed = 0 } = {}) {
  const g = new THREE.IcosahedronGeometry(r, Math.max(0, subdiv - 1));
  const R = new Rand(seed), map = new Map(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let o = map.get(key);
    if (!o) { o = [R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 1)]; map.set(key, o); }
    p.setXYZ(i, (x + o[0] * jitter * r) * scale[0], (y + o[1] * jitter * r) * scale[1], (z + o[2] * jitter * r) * scale[2]);
  }
  return g;
}

// ------------------------------------------------------------------ object builders
function place(o, loc, parent, name) {
  o.position.set(loc[0], loc[1], loc[2]);
  if (name) o.name = name;
  (parent || stage.scene).add(o);
  return o;
}

export function box(size, loc = [0, 0, 0], m, { origin = 'center', taper = 1, parent, name } = {}) {
  const [sx, sy, sz] = size;
  const z0 = origin === 'center' ? -sz / 2 : origin === 'bottom' ? 0 : -sz;
  const b = new Buf(); b.box(0, 0, z0, sx, sy, sz, 0, taper);
  return place(b.mesh([m]), loc, parent, name);
}

export function cylinder(r, h, n, loc, m, { axis = 'Z', rTop = null, origin = 'bottom', parent, name } = {}) {
  const b = new Buf(); b.cyl(0, 0, origin === 'bottom' ? 0 : -h / 2, r, h, 0, n, rTop);
  const o = place(b.mesh([m]), loc, parent, name);
  if (axis === 'X') o.rotation.set(0, Math.PI / 2, 0);
  else if (axis === 'Y') o.rotation.set(Math.PI / 2, 0, 0);
  return o;
}

export function ico(r, loc, m, opts = {}) {
  const b = new Buf(); b.geom(icoGeom(r, opts));
  return place(b.mesh([m]), loc, opts.parent, opts.name);
}

export function mesh(verts, faces, m, loc = [0, 0, 0], { parent, name } = {}) {
  const b = new Buf();
  for (const f of faces) b.poly(0, f.map(i => verts[i]));
  return place(b.mesh([m]), loc, parent, name);
}

export function group(loc = [0, 0, 0], parent, name) { return place(new THREE.Group(), loc, parent, name); }
export function parent(child, par) { par.add(child); return child; }

/** Merge static meshes into one (baked world transforms, one draw call per material). */
export function join(objs, name = '') {
  objs = objs.filter(o => o && o.isMesh);
  stage.scene.updateMatrixWorld(true);
  const mats = [], b = new Buf(), v = new THREE.Vector3();
  for (const o of objs) {
    const arr = Array.isArray(o.material), ms = arr ? o.material : [o.material], g = o.geometry, p = g.attributes.position;
    const groups = g.groups.length ? g.groups : [{ start: 0, count: p.count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = ms[arr ? gr.materialIndex : 0];
      let mi = mats.indexOf(m);
      if (mi < 0) { mi = mats.length; mats.push(m); }
      const parts = b.parts.get(mi) || (b.parts.set(mi, []), b.parts.get(mi));
      for (let i = gr.start; i < gr.start + gr.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        parts.push(v.x, v.y, v.z);
      }
    }
    o.removeFromParent();
    g.dispose();
  }
  const out = b.mesh(mats, name);
  stage.scene.add(out);
  return out;
}

export const ease = t => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;
export const hypot = Math.hypot;
