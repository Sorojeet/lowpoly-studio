// Procedural low-poly city (seeded -> the same city in every episode).
//
//   const city = new City({ seed: 7, n: 6 }).build({ focus: [0, 0], detailRadius: 120 });
//
// Grid: blocks every PITCH metres, roads between them; road centre lines at City.road(k).
// Windows are grouped into `rings` (distance bands from the centre), one emissive material
// per ring, so whole districts switch on/off with city.setRing(k, strength, frame).
import { THREE, stage, Rand, Buf, mat, emit, join, hypot } from '../studio/core.js';
import * as P from './palette.js';
import * as props from './props.js';

export const BLOCK = 36, ROAD = 14, PITCH = BLOCK + ROAD, FLOOR = 3.3;
// Series landmarks (block i, block j, lot) -> floors. Never change: continuity across episodes.
export const HOME = [0, 0, 0];          // Kai's apartment tower
export const LIGHT_TOWER = [-1, -4, 3]; // where the light switches on (Ep1 cliffhanger)
export const LANDMARKS = { [HOME]: 38, [LIGHT_TOWER]: 44 };

export class City {
  constructor({ seed = 7, n = 6, rings = 6, downtown = 1 } = {}) {
    Object.assign(this, { seed, n, rings, downtown, lots: [], parks: [], winMats: [], lampMats: [] });
  }

  static road(k) { return (k + 0.5) * PITCH; }
  lot(id) { return this.lots.find(l => l.id === String(id)); }

  build({ focus = [0, 0], detailRadius = 110, litFraction = 0.65, windows = true, lamps = true, trees = true, heights = {} } = {}) {
    heights = { ...LANDMARKS, ...heights };
    const r = new Rand(this.seed), n = this.n, reach = (n + 0.5) * PITCH;
    const sc = stage.scene;
    // ground
    const g = new Buf();
    g.box(0, 0, -1, reach * 2 + 400, reach * 2 + 400, 1, 0);
    g.box(0, 0, -1.12, reach * 6, reach * 6, 1, 1);
    const ground = g.mesh([mat('asphalt', P.ASPHALT), mat('grass_far', '#5d7f4c')], 'Ground');
    ground.castShadow = false;
    sc.add(ground);

    const mats = P.BUILDINGS.map((c, i) => mat(`bld${i}`, c));
    const ROOF = mats.push(mat('roof', P.ROOF)) - 1;
    const WALK = mats.push(mat('sidewalk', P.SIDEWALK)) - 1;
    const GRASS = mats.push(mat('grass', P.GRASS)) - 1;
    const LANE = mats.push(mat('lane', P.LANE)) - 1;
    const TANK = mats.push(mat('tank', '#8b6f55')) - 1;
    this.winMats = Array.from({ length: this.rings }, (_, k) => mat(`win_ring${k}`, P.WINDOW_DARK, { emit: P.WINDOW_LIT }));
    const winSets = Array.from({ length: this.rings + 1 }, () => []);   // last = unlit windows
    const city = new Buf();
    const maxD = hypot(reach, reach);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const cx = i * PITCH, cy = j * PITCH;
      city.box(cx, cy, 0, BLOCK, BLOCK, 0.18, WALK);
      if (r.random() < 0.08 && (i || j)) {
        city.box(cx, cy, 0.18, BLOCK - 4, BLOCK - 4, 0.05, GRASS);
        this.parks.push([cx, cy]);
        continue;
      }
      const distC = hypot(cx, cy) / PITCH;
      [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([ox, oy], li) => {
        const id = String([i, j, li]);
        const x = cx + ox, y = cy + oy;
        const w = r.uniform(11, 16), d = r.uniform(11, 16);
        const base = Math.max(2, Math.floor(r.gauss(18 * this.downtown * Math.exp(-distC / 3.2) + 4, 4)));
        const floors = heights[id] ?? Math.min(base, 48);
        const h = floors * FLOOR;
        const ci = r.randrange(P.BUILDINGS.length);
        const style = heights[id] ? (r.random(), 'box') : r.choice(['box', 'box', 'setback', 'taper']);
        const tp = style === 'taper' ? 0.92 : 1;
        city.box(x, y, 0.18, w, d, h, ci, tp);
        let top = 0.18 + h, tw = w * tp, td = d * tp;
        if (style === 'setback' && floors > 8) {
          const sh = r.randint(3, 8) * FLOOR;
          city.box(x, y, top, w * 0.65, d * 0.65, sh, ci);
          top += sh; tw = w * 0.65; td = d * 0.65;
        }
        city.box(x, y, top, tw * 0.96, td * 0.96, 0.4, ROOF);
        if (hypot(cx - focus[0], cy - focus[1]) < detailRadius * 1.6) {
          for (let k = r.randint(0, 3); k > 0; k--)
            city.box(x + r.uniform(-tw / 3, tw / 3), y + r.uniform(-td / 3, td / 3), top + 0.4, 1.6, 1.2, 1.0, ROOF);
          if (r.random() < 0.3) city.cyl(x + tw / 4, y - td / 4, top + 0.4, 1.3, 2.2, TANK);
        }
        const ring = Math.min(this.rings - 1, Math.floor(this.rings * hypot(x, y) / maxD * 1.25));
        const lot = { id, i, j, li, x, y, w, d, h, floors, ring, top, style };
        this.lots.push(lot);
        if (windows) this._windows(winSets, lot, tp, r, litFraction);
      });
    }
    // lane markings
    for (let k = -n - 1; k <= n; k++) {
      const c = (k + 0.5) * PITCH;
      for (let s = -reach; s < reach; s += 6) { city.box(c, s, 0, 0.18, 3.0, 0.03, LANE); city.box(s, c, 0, 3.0, 0.18, 0.03, LANE); }
    }
    this.cityObj = city.mesh(mats, 'City');
    sc.add(this.cityObj);
    if (windows) {
      const geo = new THREE.PlaneGeometry(1.4, 1.7).rotateX(Math.PI / 2);   // faces -Y
      const offM = mat('win_off', P.WINDOW_DARK);
      const o = new THREE.Object3D();
      this.winObjs = winSets.map((set, k) => {
        const im = new THREE.InstancedMesh(geo, k < this.rings ? this.winMats[k] : offM, Math.max(1, set.length));
        set.forEach((p, idx) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, 0, p[3]); o.updateMatrix(); im.setMatrixAt(idx, o.matrix); });
        im.count = set.length;
        im.receiveShadow = true;
        sc.add(im);
        return im;
      });
    }
    if (trees || lamps) this._furniture(focus, detailRadius, r, trees, lamps, maxD);
    return this;
  }

  _windows(sets, lot, tp, r, litFraction) {
    const { x, y, w, d, floors } = lot, H = floors * FLOOR, e = 0.06;
    for (let fl = 0; fl < floors; fl++) {
      const zc = 0.18 + fl * FLOOR + 1.75;
      const t = 1 - (1 - tp) * (zc / H);
      for (const [axis, span, other] of [['x', w, d], ['y', d, w]]) {
        const cols = Math.max(1, Math.floor(span / 3.0));
        for (let c = 0; c < cols; c++) {
          const u = ((c + 0.5) / cols - 0.5) * span * t;
          for (const side of [-1, 1]) {
            const set = r.random() < litFraction ? lot.ring : sets.length - 1;
            const off = side * (other / 2 * t + e);
            if (axis === 'x') sets[set].push([x + u, y + off, zc, side < 0 ? 0 : Math.PI]);
            else sets[set].push([x + off, y + u, zc, side < 0 ? -Math.PI / 2 : Math.PI / 2]);
          }
        }
      }
    }
  }

  _furniture(focus, radius, r, trees, lamps, maxD) {
    const n = this.n, tObjs = [], lObjs = [];
    this.lampMats = Array.from({ length: this.rings }, (_, k) => mat(`lamp_ring${k}`, '#fff1c9', { emit: '#ffcf8a' }));
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const cx = i * PITCH, cy = j * PITCH;
      if (hypot(cx - focus[0], cy - focus[1]) > radius) continue;
      for (let k = -2; k <= 2; k++) {
        for (const [sx, sy, hd] of [[k * 7, -BLOCK / 2 + 1.2, 0], [k * 7, BLOCK / 2 - 1.2, 180], [-BLOCK / 2 + 1.2, k * 7, -90], [BLOCK / 2 - 1.2, k * 7, 90]]) {
          const x = cx + sx, y = cy + sy;
          if (trees && k % 2 === 0 && r.random() < 0.7)
            tObjs.push(props.tree(`tree_${i}_${j}_${k}_${hd}`, [x, y, 0.18], { seed: r.randrange(999), size: r.uniform(0.85, 1.2) }));
          if (lamps && (k === -1 || k === 1)) {
            const ring = Math.min(this.rings - 1, Math.floor(this.rings * hypot(x, y) / maxD * 1.25));
            const l = props.streetLamp(`lamp_${i}_${j}_${k}_${hd}`, [x, y, 0.18], hd, this.lampMats[ring]);
            lObjs.push(...l.children);
          }
        }
      }
    }
    if (tObjs.length) join(tObjs, 'Trees');
    if (lObjs.length) {
      const parents = new Set(lObjs.map(o => o.parent));
      join(lObjs, 'Lamps');
      for (const p of parents) p.removeFromParent();
    }
  }

  setRing(k, strength, frame, lamps = true) {
    emit(this.winMats[k], strength, frame);
    if (lamps && this.lampMats.length) emit(this.lampMats[k], strength * 1.5, frame);
  }
  allLights(strength, frame) { for (let k = 0; k < this.rings; k++) this.setRing(k, strength, frame); }
}
