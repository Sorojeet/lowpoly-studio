// CROWDS — thousands of simple instanced people for streets, plazas and aerial shots.
// (Use Person for anyone near the camera; use this for the mass behind them.)
//
//   const m = mass('party', { n: 1500, area: { x: [18, 32], y: [-80, 30] }, seed: 2, pose: 'cheer', motion: 'cheer' });
//   mass('jam', { n: 3000, area, pose: 'stand', motion: 'flow', flow: [0, 0.35], kids: 0.25, drab: 0.6 });
//   pose: stand | cheer | mixed     motion: still | idle | cheer | flow (shuffle along `flow` m/s, wraps inside the area) | push (surge to +Y)
//   kids: share of children   drab: 0..1 washes the clothes out   keepOut: [[x, y, r], ...]   minDist: spacing
import { THREE, stage, Rand, Buf, mat } from '../studio/core.js';
import * as P from './palette.js';

const SHIRTS = ['#3f7fbf', '#c94f4f', '#e8e4da', '#4f9d8f', '#f2c14e', '#7a5fb0', '#e8743b', '#4a5568', '#7a9a5a', '#b0506a', '#2f6fb0', '#d9d2c4', '#5a6b7a'];
const PANTS = ['#34506e', '#2b2d33', '#6b5a48', '#3a4a5e', '#4a4d55'];
const HAIRS = ['#2a1f1a', '#4a3324', '#8a5a2e', '#c9a25a', '#1a1a1e', '#8d8d92', '#a8452e'];

function parts(pose) {
  const cloth = new Buf(), legs = new Buf(), skin = new Buf(), hair = new Buf();
  for (const sx of [-1, 1]) { legs.box(0.095 * sx, 0, 0.06, 0.14, 0.15, 0.86, 0, 0.8); legs.box(0.095 * sx, -0.03, 0, 0.13, 0.26, 0.07, 0); }
  cloth.box(0, 0, 0.88, 0.36, 0.2, 0.3, 0, 1.0); cloth.box(0, 0, 1.18, 0.36, 0.2, 0.3, 0, 1.12);
  for (const sx of [-1, 1]) {
    if (pose === 'cheer') { cloth.tube([0.23 * sx, 0, 1.44], [0.34 * sx, -0.04, 1.78], 0.055, 0, 4); cloth.tube([0.34 * sx, -0.04, 1.78], [0.3 * sx, -0.06, 2.08], 0.045, 0, 4); skin.box(0.3 * sx, -0.06, 2.06, 0.07, 0.07, 0.11, 0); }
    else { cloth.tube([0.24 * sx, 0, 1.46], [0.27 * sx, 0, 0.98], 0.055, 0, 4); skin.box(0.27 * sx, 0, 0.86, 0.07, 0.07, 0.12, 0); }
  }
  skin.cyl(0, 0, 1.48, 0.05, 0.08, 0, 5); skin.box(0, -0.005, 1.54, 0.2, 0.22, 0.24, 0, 0.9);
  hair.box(0, 0.02, 1.7, 0.225, 0.235, 0.1, 0, 0.85); hair.box(0, 0.105, 1.58, 0.21, 0.05, 0.14, 0);
  return [cloth, legs, skin, hair].map(b => b.build());
}

export function mass(name = 'mass', { n = 500, area = { x: [-10, 10], y: [-10, 10] }, z = 0, seed = 0, pose = 'stand', motion = 'idle', flow = [0, 0.3], facing = null, faceJitter = 25,
  kids = 0.08, drab = 0, minDist = 0.55, keepOut = [], shadows = true, speed = 1 } = {}) {
  const r = new Rand(seed + 900), white = mat('mass_white', '#ffffff');
  const drabC = new THREE.Color('#7d7a74'), col = new THREE.Color();
  // scatter on a jittered grid so dense crowds do not overlap
  const W = area.x[1] - area.x[0], H = area.y[1] - area.y[0];
  const cell = Math.max(minDist, Math.sqrt(W * H / n)), pts = [];
  for (let gx = area.x[0] + cell / 2; gx < area.x[1]; gx += cell) for (let gy = area.y[0] + cell / 2; gy < area.y[1]; gy += cell) {
    const x = gx + r.uniform(-0.35, 0.35) * cell, y = gy + r.uniform(-0.35, 0.35) * cell;
    if (keepOut.some(k => Math.hypot(k[0] - x, k[1] - y) < k[2])) continue;
    pts.push([x, y]);
  }
  for (let i = pts.length - 1; i > 0; i--) { const j = r.randrange(i + 1); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  pts.length = Math.min(pts.length, n);
  const people = pts.map(([x, y], i) => {
    const kid = r.random() < kids;
    return { x, y, s: kid ? r.uniform(0.5, 0.72) : r.uniform(0.92, 1.06), w: kid ? 1.1 : r.uniform(0.9, 1.15), ph: r.uniform(0, 6.28), sp: r.uniform(0.8, 1.25),
      yaw: (facing === null ? r.uniform(0, 360) : facing + r.uniform(-faceJitter, faceJitter)) * Math.PI / 180,
      cheer: pose === 'cheer' ? r.random() < 0.8 : pose === 'mixed' ? r.random() < 0.45 : false,
      shirt: r.choice(SHIRTS), pants: r.choice(PANTS), skin: r.choice(P.SKIN), hair: r.choice(HAIRS) };
  });
  const sets = [];
  for (const cheer of [false, true]) {
    const list = people.filter(p => p.cheer === cheer);
    if (!list.length) continue;
    const ims = parts(cheer ? 'cheer' : 'stand').map((g, k) => {
      const im = new THREE.InstancedMesh(g, white, list.length);
      im.castShadow = shadows && k < 2; im.receiveShadow = true; im.frustumCulled = false; im.name = `${name}_${cheer ? 'c' : 's'}${k}`;
      list.forEach((p, i) => { col.set([p.shirt, p.pants, p.skin, p.hair][k]); if (k < 2 && drab) col.lerp(drabC, drab); im.setColorAt(i, col); });
      stage.scene.add(im);
      return im;
    });
    sets.push({ list, ims });
  }
  const o = new THREE.Object3D(), st = { energy: 1, people, sets };
  const upd = f => {
    const t = f / 30 * speed;
    for (const { list, ims } of sets) {
      list.forEach((p, i) => {
        let x = p.x, y = p.y, zz = z, yaw = p.yaw, tilt = 0;
        if (motion === 'cheer') { zz += (p.cheer ? 0.16 : 0.05) * Math.abs(Math.sin(t * 4.2 * p.sp + p.ph)) * st.energy; yaw += 0.15 * Math.sin(t * 1.3 + p.ph); }
        else if (motion === 'idle') { yaw += 0.12 * Math.sin(t * 0.9 * p.sp + p.ph); tilt = 0.02 * Math.sin(t * 1.4 + p.ph); }
        else if (motion === 'flow' || motion === 'push') {
          x += flow[0] * t * p.sp; y += flow[1] * t * p.sp;
          x = area.x[0] + ((((x - area.x[0]) % W) + W) % W); y = area.y[0] + ((((y - area.y[0]) % H) + H) % H);
          zz += 0.025 * Math.abs(Math.sin(t * 3.4 * p.sp + p.ph)); tilt = 0.035 * Math.sin(t * 3.4 * p.sp + p.ph);
          if (motion === 'push') { y += 0.18 * Math.sin(t * 1.7 + p.x * 0.4) * st.energy; tilt += 0.06 * Math.sin(t * 1.7 + p.x * 0.4); }
        }
        o.position.set(x, y, zz); o.rotation.set(0, tilt, yaw); o.scale.set(p.s * p.w, p.s * p.w, p.s); o.updateMatrix();
        for (const im of ims) im.setMatrixAt(i, o.matrix);
      });
      for (const im of ims) im.instanceMatrix.needsUpdate = true;
    }
  };
  upd(1);
  if (motion !== 'still') stage.A.hooks.push(upd);
  return st;
}
