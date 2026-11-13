// PERSON — general-purpose low-poly human for any video (PS3-pack). Same joints as Survivor,
// so every motion in rig.js works: walk, run, idle, wave, point, cheer, talk, sit, crouch, collapse ...
//
//   const p = new Person('Asha', { outfit: 'doctor', hair: 'bun', skin: P.SKIN[2], loc: [0, 0, 0], facing: 180 });
//   p.idle(1, 120); p.wave(30);
//   const q = Person.random('extra1', 42, { loc: [3, 0, 0] });        // seeded random citizen
//   const people = crowd(12, { x: [-10, 10], y: [-4, 4] }, { seed: 3, idle: [1, 150] });
//
// outfit: casual | hoodie | suit | worker | police | doctor | dress | soldier | farmer
// hair:   short | long | bun | ponytail | spiky | afro | bald | balding (bare crown, hair at the sides) | neat (fitted short cut with fringe)      hat: cap | beanie | helmet | police | straw | none
// Other options: shirt, pants, shoes, hairColor (hex), height (1 = 1.78 m), build (width, 1 = average),
//                backpack (colour or false), glasses, beard (bool)
import { THREE, D, Rand, Buf, mat, group, icoGeom } from '../../studio/core.js';
import { Rig } from './rig.js';
import * as P from '../palette.js';

export const OUTFITS = {
  casual:  { shirt: ['#3f7fbf', '#c94f4f', '#e8e4da', '#4f9d8f', '#f2c14e', '#7a5fb0'], pants: ['#34506e', '#2b2d33', '#6b5a48'], shoes: '#f2f2f2', sleeves: 'short' },
  hoodie:  { shirt: ['#e8743b', '#4a5568', '#7a9a5a', '#b0506a', '#2f6fb0'], pants: ['#34506e', '#2b2d33'], shoes: '#f2f2f2', sleeves: 'long', hood: true },
  suit:    { shirt: ['#23262e', '#2c3a52', '#4a4d55'], pants: null, shoes: '#17181c', sleeves: 'long', tie: ['#b83232', '#2f6fb0', '#c8a03a'], collar: '#f2f2f2' },
  worker:  { shirt: ['#f08a24'], pants: ['#3a4a5e'], shoes: '#3b2e25', sleeves: 'long', vest: '#e8f03a', hat: 'helmet' },
  police:  { shirt: ['#1f2f4f'], pants: ['#182236'], shoes: '#111216', sleeves: 'short', belt: '#111216', badge: '#e8c84a', hat: 'police' },
  doctor:  { shirt: ['#f4f6f8'], pants: ['#4fa3a0'], shoes: '#f2f2f2', sleeves: 'long', coat: true, collar: '#4fa3a0' },
  dress:   { shirt: ['#c94f6d', '#4f6fc9', '#e0b23c', '#5aa07a', '#8a5fc0'], pants: null, shoes: '#3b2e25', sleeves: 'short', skirt: true },
  soldier: { shirt: ['#5a6b44'], pants: ['#4a5a3a'], shoes: '#2a2620', sleeves: 'long', vest: '#3f4a32', belt: '#2a2620', hat: 'helmetArmy' },
  farmer:  { shirt: ['#b0563c', '#c9a23f'], pants: ['#3f5f8a'], shoes: '#5a4030', sleeves: 'short', bib: true, hat: 'straw' },
};
export const HAIR_COLORS = ['#2a1f1a', '#4a3324', '#8a5a2e', '#c9a25a', '#1a1a1e', '#8d8d92', '#a8452e'];
const HAIRS = ['short', 'long', 'bun', 'ponytail', 'spiky', 'afro', 'short', 'long'];

/** Material palette shared by all people: one material per colour. */
class Parts {
  constructor() { this.b = new Buf(); this.mats = []; this.idx = new Map(); }
  mi(color, o = {}) {
    const key = color + (o.gloss ? 'g' : '') + (o.emission ? 'e' : '');
    if (!this.idx.has(key)) { this.idx.set(key, this.mats.length); this.mats.push(mat(`p_${key}`, color, o)); }
    return this.idx.get(key);
  }
  into(parent, name) {
    if (!this.b.parts.size) return null;
    const m = this.b.mesh(this.mats.slice(), name);   // material indices are dense: 0..n-1 in first-use order
    parent.add(m);
    return m;
  }
}
const ring = (z, rx, ry, n = 8, cy = 0, cx = 0) => Array.from({ length: n }, (_, i) => {
  const a = 2 * Math.PI * (i + 0.5) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a), z];
});

export class Person extends Rig {
  constructor(name = 'Person', o = {}) {
    super();
    this.name = name;
    const of = OUTFITS[o.outfit || 'casual'], r = new Rand(o.seed ?? 0);
    const skin = o.skin ?? P.SKIN[0], shirt = o.shirt ?? r.choice(of.shirt);
    const pants = o.pants ?? (of.pants ? r.choice(of.pants) : (of.skirt ? shirt : shirt));
    const shoes = o.shoes ?? of.shoes, hairC = o.hairColor ?? HAIR_COLORS[0];
    const hair = o.hair ?? 'short', hat = o.hat ?? of.hat ?? 'none';
    const bw = o.build ?? 1, sleeves = o.sleeves ?? of.sleeves;
    const j = this.j;
    const root = (j.root = group(o.loc ?? [0, 0, 0], o.parent ?? null, name));
    root.rotation.z = (o.facing ?? 0) * D;
    root.scale.setScalar(o.height ?? 1);
    const hips = (j.hips = group([0, 0, this.H], root));
    const spine = (j.spine = group([0, 0, 0.08], hips));
    const head = (j.head = group([0, 0, 0.6], spine));
    const legSkin = of.skirt;     // bare legs under a dress

    // ---- pelvis (+ skirt / coat tails, which hang from the hips)
    let p = new Parts();
    p.b.loft(p.mi(pants), [ring(-0.12, 0.17 * bw, 0.11), ring(0.0, 0.185 * bw, 0.12), ring(0.1, 0.175 * bw, 0.115)]);
    if (of.skirt) p.b.loft(p.mi(shirt), [ring(-0.52, 0.3 * bw, 0.26, 10), ring(-0.2, 0.24 * bw, 0.19, 10), ring(0.1, 0.18 * bw, 0.12, 10)]);
    if (of.coat) p.b.loft(p.mi(shirt), [ring(-0.45, 0.22 * bw, 0.16), ring(0.1, 0.2 * bw, 0.135)], { cap: false });
    if (of.belt) p.b.loft(p.mi(of.belt), [ring(0.07, 0.19 * bw, 0.125), ring(0.12, 0.19 * bw, 0.125)]);
    p.into(hips, `${name}_pelvis`);

    // ---- torso
    p = new Parts();
    const ts = p.mi(of.vest ?? shirt);
    p.b.loft(ts, [ring(0, 0.18 * bw, 0.115), ring(0.2, 0.165 * bw, 0.105), ring(0.4, 0.215 * bw, 0.135), ring(0.52, 0.2 * bw, 0.115), ring(0.56, 0.08, 0.07)]);
    if (of.vest) for (const z of [0.14, 0.3]) p.b.loft(p.mi('#d8dde0', { emission: 0.35 }), [ring(z, 0.2 * bw, 0.128), ring(z + 0.045, 0.2 * bw, 0.128)], { cap: false });
    if (of.collar) p.b.out([0, 0, 0.4]).poly(p.mi(of.collar), [[-0.07, -0.118, 0.52], [0.07, -0.118, 0.52], [0, -0.136, 0.3]]), p.b.out(null);
    if (of.tie) { const t = p.mi(o.tie ?? r.choice(of.tie)); p.b.out([0, 0, 0.4]).poly(t, [[-0.022, -0.128, 0.5], [0.022, -0.128, 0.5], [0.03, -0.14, 0.28], [0, -0.14, 0.23], [-0.03, -0.14, 0.28]]); p.b.out(null); }
    if (of.badge) p.b.box(0.1 * bw, -0.128, 0.38, 0.045, 0.012, 0.055, p.mi(of.badge, { gloss: 0.8 }));
    if (of.bib) { p.b.box(0, -0.125, 0.12, 0.2, 0.02, 0.26, p.mi(pants)); for (const sx of [-1, 1]) p.b.box(0.08 * sx, 0, 0.38, 0.04, 0.27, 0.19, p.mi(pants)); }
    if (of.hood) { const hg = icoGeom(0.13, { scale: [1.15, 0.7, 0.75], seed: 2 }); hg.translate(0, 0.13, 0.52); p.b.geom(hg, ts); p.b.box(0, -0.115, 0.1, 0.2, 0.02, 0.1, ts); }
    if (o.backpack) p.b.box(0, 0.2, 0.12, 0.3, 0.16, 0.38, p.mi(o.backpack === true ? P.BAG : o.backpack), 0.9);
    p.into(spine, `${name}_torso`);

    // ---- head
    p = new Parts();
    const sk = p.mi(skin), hc = p.mi(hairC), eye = p.mi('#151518');
    p.b.cyl(0, 0, -0.04, 0.055, 0.1, sk, 6);
    const hg = icoGeom(0.135, { subdiv: 2, scale: [0.95, 1.02, 1.12], seed: 3 }); hg.translate(0, 0, 0.17);
    p.b.geom(hg, sk);
    p.b.box(0, -0.06, 0.035, 0.15, 0.13, 0.08, sk, 1.25);            // jaw
    p.b.box(0, -0.138, 0.115, 0.036, 0.04, 0.055, sk, 0.5);          // nose
    for (const sx of [-1, 1]) {
      p.b.box(0.05 * sx, -0.128, 0.17, 0.034, 0.012, 0.03, eye);
      p.b.box(0.05 * sx, -0.13, 0.208, 0.05, 0.014, 0.012, hc);      // brow
      p.b.box(0.128 * sx, 0, 0.13, 0.02, 0.04, 0.06, sk);            // ear
    }
    p.b.box(0, -0.122, 0.075, 0.06, 0.012, 0.012, p.mi('#8a4a44'));  // mouth
    if (o.beard) p.b.box(0, -0.075, 0.02, 0.16, 0.12, 0.085, hc, 1.2);
    if (o.glasses) { const gl = p.mi('#1b1d22'); for (const sx of [-1, 1]) p.b.box(0.05 * sx, -0.14, 0.152, 0.06, 0.01, 0.05, gl); p.b.box(0, -0.14, 0.175, 0.26, 0.01, 0.012, gl); }
    const blob = (rad, sc, pos, seed = 5, jit = 0.07, mi = hc) => { const g = icoGeom(rad, { subdiv: 2, scale: sc, jitter: jit, seed }); g.translate(...pos); p.b.geom(g, mi); };
    const hatted = hat !== 'none';
    // fitted hair shell: a slightly larger copy of the skull, kept only where `keep(x, y, z)` says hair grows
    const shell = (keep, grow = 1.1, mi = hc) => {
      const g = icoGeom(0.135 * grow, { subdiv: 3, scale: [0.97, 1.04, 1.12] }); g.translate(0, 0.004, 0.172);
      const q = g.attributes.position;
      for (let i = 0; i < q.count; i += 3) {
        const v = [0, 1, 2].map(k => [q.getX(i + k), q.getY(i + k), q.getZ(i + k)]);
        const c = [0, 1, 2].map(k => (v[0][k] + v[1][k] + v[2][k]) / 3);
        if (keep(c[0], c[1], c[2])) p.b.tri(mi, v[0], v[1], v[2]);
      }
    };
    const line = y => 0.262 - 0.19 * Math.min(1, Math.max(0, (y + 0.085) / 0.13));   // hairline: high on the forehead, low at the nape
    if (hair === 'balding') {            // bare crown, a band of hair round the sides and back
      shell((x, y, z) => y > -0.05 && z > line(y) - 0.02 && z < 0.262 - Math.max(0, y) * 0.25, 1.1);
      for (const sx of [-1, 1]) p.b.box(0.132 * sx, -0.02, 0.15, 0.03, 0.1, 0.09, hc, 0.8);
    } else if (hair === 'neat') {        // short, tidy cut with a side-swept fringe
      shell((x, y, z) => z > line(y), 1.12);
      shell((x, y, z) => z > 0.275, 1.22);                                             // extra volume on top
      p.b.rbox(0.012, -0.112, 0.258, 0.215, 0.085, 0.062, 0.1, hc, 0.82);              // fringe, swept slightly to one side
      for (const sx of [-1, 1]) p.b.box(0.13 * sx, -0.045, 0.165, 0.024, 0.045, 0.085, hc, 0.7);                       // sideburns
    }
    else if (hair !== 'bald') {
      if (hair === 'afro') blob(0.19, [1, 1, 0.95], [0, 0.02, 0.24], 5, 0.1);
      else blob(0.145, [1, 1.04, hatted ? 0.72 : 0.82], [0, 0.028, 0.215]);
      if (hair === 'long') p.b.box(0, 0.1, -0.1, 0.25, 0.09, 0.34, hc, 1.05);
      if (hair === 'bun') blob(0.065, [1, 1, 1], [0, 0.09, 0.36], 7);
      if (hair === 'ponytail') { blob(0.05, [1, 1, 1], [0, 0.16, 0.26], 7); p.b.box(0, 0.19, 0.02, 0.07, 0.06, 0.24, hc, 1.6); }
      if (hair === 'spiky') for (let k = 0; k < 6; k++) p.b.cyl(r.uniform(-0.08, 0.08), r.uniform(-0.06, 0.08), 0.28, 0.04, 0.09, hc, 4, 0.004);
    }
    if (hat === 'cap' || hat === 'police') {
      const c = p.mi(hat === 'police' ? '#1a2540' : (o.hatColor ?? '#c23b3b'));
      p.b.cyl(0, 0.01, 0.245, 0.15, 0.085, c, 8, 0.135);
      p.b.box(0, -0.17, 0.245, 0.2, 0.14, 0.018, hat === 'police' ? p.mi('#0e1220', { gloss: 0.7 }) : c);
      if (hat === 'police') p.b.box(0, -0.143, 0.275, 0.04, 0.012, 0.04, p.mi('#e8c84a', { gloss: 0.8 }));
    } else if (hat === 'beanie') blob(0.15, [1, 1.03, 0.8], [0, 0.015, 0.25], 9, 0.02, p.mi(o.hatColor ?? '#b0506a'));
    else if (hat === 'helmet' || hat === 'helmetArmy') {
      const c = p.mi(hat === 'helmet' ? (o.hatColor ?? '#f2c62e') : '#4a5636', { gloss: hat === 'helmet' ? 0.5 : 0 });
      blob(0.165, [1, 1.06, 0.78], [0, 0.005, 0.25], 9, 0, c);
      p.b.cyl(0, -0.02, 0.235, 0.185, 0.02, c, 10);
    } else if (hat === 'straw') {
      const c = p.mi('#dcc27a');
      p.b.cyl(0, 0, 0.25, 0.3, 0.018, c, 12); p.b.cyl(0, 0, 0.26, 0.15, 0.1, c, 10, 0.12);
    }
    p.into(head, `${name}_head`);

    // ---- limbs
    const sleeveU = sleeves === 'none' ? skin : shirt, sleeveL = sleeves === 'long' ? shirt : skin;
    const legC = legSkin ? skin : pants;
    const limb = (parent, rTop, rBot, len, color, extra) => {
      const q = new Parts();
      q.b.cyl(0, 0, -len, rBot, len, q.mi(color), 6, rTop);
      extra?.(q);
      return q.into(parent, '');
    };
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      const sh = (j[`shoulder${s}`] = group([(0.2 * bw + 0.055) * sx, 0, 0.5], spine));
      limb(sh, 0.062, 0.05, 0.29, sleeveU, q => { const g = icoGeom(0.068, { scale: [1, 1, 0.9] }); q.b.geom(g, q.mi(sleeveU)); });
      const el = (j[`elbow${s}`] = group([0, 0, -0.29], sh));
      limb(el, 0.048, 0.038, 0.27, sleeveL);
      const hand = (j[`hand${s}`] = group([0, 0, -0.29], el));
      limb(hand, 0.03, 0.03, 0.001, skin, q => { q.b.box(0, 0, -0.1, 0.035, 0.075, 0.11, q.mi(skin), 1.25); q.b.box(0.028 * sx, -0.03, -0.06, 0.02, 0.03, 0.05, q.mi(skin)); });
      const hp = (j[`hip${s}`] = group([0.095 * bw * sx, 0, 0], hips));
      limb(hp, 0.09 * Math.sqrt(bw), 0.065, 0.45, legC);
      const kn = (j[`knee${s}`] = group([0, 0, -0.45], hp));
      limb(kn, 0.062, 0.045, 0.42, legC);
      const ft = (j[`foot${s}`] = group([0, 0, -0.42], kn));
      limb(ft, 0.05, 0.05, 0.001, shoes, q => {
        const m = q.mi(shoes), sole = q.mi('#2a2a2e');
        q.b.out([0, -0.05, -0.03]).loft(m, [[[-0.06, 0.08, -0.07], [0.06, 0.08, -0.07], [0.065, -0.19, -0.07], [-0.065, -0.19, -0.07]],
          [[-0.055, 0.075, 0.02], [0.055, 0.075, 0.02], [0.05, -0.06, 0.02], [-0.05, -0.06, 0.02]]]);
        q.b.out(null).box(0, -0.055, -0.092, 0.135, 0.28, 0.024, sole);
      });
    }
    // phone prop (same as Survivor so phoneCall() works)
    this.phoneMat = mat(`${name}_phone`, '#111216', { emit: '#9fd3ff', gloss: 0.8 });
    const pb = new Buf(); pb.box(0, 0, -0.075, 0.08, 0.015, 0.15, 0);
    const ph = (j.phone = pb.mesh([this.phoneMat]));
    ph.position.set(0, -0.05, -0.06); ph.scale.setScalar(0.001);
    j.handR.add(ph);
    j.shoulderL.rotation.set(0, 0, -6 * D); j.shoulderR.rotation.set(0, 0, 6 * D);
    j.elbowL.rotation.set(-10 * D, 0, 0); j.elbowR.rotation.set(-10 * D, 0, 0);
    root.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  }

  /** Seeded random citizen. Pass outfit/hair/etc. in `o` to pin any attribute. */
  static random(name, seed = 0, o = {}) {
    const r = new Rand(seed * 7 + 11);
    const outfit = o.outfit ?? r.choice(['casual', 'casual', 'casual', 'hoodie', 'hoodie', 'suit', 'dress', 'dress', 'casual']);
    const fem = outfit === 'dress' || r.random() < 0.4;
    return new Person(name, {
      outfit, seed, skin: r.choice(P.SKIN), hairColor: r.choice(HAIR_COLORS),
      hair: fem ? r.choice(['long', 'bun', 'ponytail', 'long', 'afro']) : r.choice(['short', 'short', 'spiky', 'bald', 'afro', 'short']),
      hat: r.random() < 0.12 && outfit !== 'suit' ? r.choice(['cap', 'beanie']) : undefined,
      height: r.uniform(0.9, 1.04) * (fem ? 0.95 : 1), build: r.uniform(0.9, 1.12), glasses: r.random() < 0.15,
      beard: !fem && r.random() < 0.2, backpack: r.random() < 0.15 ? r.choice(['#2fb3a0', '#c23b3b', '#3a3d44']) : false, ...o,
    });
  }
}

/** n random people standing in a rectangle. opts.idle = [f0, f1] gives them breathing; opts.facing 'random' | degrees. */
export function crowd(n, { x = [-5, 5], y = [-5, 5], z = 0 } = {}, { seed = 0, idle = null, facing = 'random', outfit, minDist = 0.9 } = {}) {
  const r = new Rand(seed + 500), out = [], pts = [];
  for (let i = 0; i < n; i++) {
    let px, py, tries = 0;
    do { px = r.uniform(x[0], x[1]); py = r.uniform(y[0], y[1]); } while (tries++ < 30 && pts.some(q => Math.hypot(q[0] - px, q[1] - py) < minDist));
    pts.push([px, py]);
    const p = Person.random(`crowd${seed}_${i}`, seed * 100 + i, { loc: [px, py, z], facing: facing === 'random' ? r.uniform(0, 360) : facing, outfit });
    p.poseStand(1);
    if (idle) p.idle(idle[0], idle[1], { seed: i });
    out.push(p);
  }
  return out;
}
