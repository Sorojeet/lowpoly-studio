// FX — confetti, drifting haze / smog layers, floating dust.
//
//   confetti('party', { n: 900, box: { x: [15, 35], y: [-60, 30], z: [2, 30] } });            // falls and tumbles for the whole shot
//   haze('smog', { n: 14, area: [-300, 300, -300, 300], z: [40, 120], color: '#c9b79a', opacity: 0.16 });   // big soft sheets that drift
import { THREE, stage, Rand, mat } from '../studio/core.js';

export function confetti(name = 'confetti', { n = 600, box = { x: [-10, 10], y: [-10, 10], z: [0, 20] }, seed = 0, size = 0.16, fall = 1.6,
  colors = ['#ff4d4d', '#ffd24a', '#4dc3ff', '#6be07a', '#ff7ad1', '#ffffff', '#ff9a3c'] } = {}) {
  const r = new Rand(seed + 40), g = new THREE.PlaneGeometry(size, size * 0.6);
  const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xffffff });
  m.color.setScalar(1.5);
  const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.name = name;
  const c = new THREE.Color(), ps = [];
  for (let i = 0; i < n; i++) {
    ps.push({ x: r.uniform(...box.x), y: r.uniform(...box.y), z: r.uniform(...box.z), ph: r.uniform(0, 6.28), sp: r.uniform(0.6, 1.4), ax: r.uniform(2, 7), ay: r.uniform(2, 7) });
    im.setColorAt(i, c.set(r.choice(colors)));
  }
  stage.scene.add(im);
  const o = new THREE.Object3D(), H = box.z[1] - box.z[0];
  stage.A.hooks.push(f => {
    const t = f / 30;
    ps.forEach((p, i) => {
      const z = box.z[0] + ((((p.z - box.z[0] - t * fall * p.sp) % H) + H) % H);
      o.position.set(p.x + 0.5 * Math.sin(t * 1.3 + p.ph), p.y + 0.5 * Math.cos(t * 1.1 + p.ph), z);
      o.rotation.set(t * p.ax + p.ph, t * p.ay, p.ph); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return im;
}

export function haze(name = 'haze', { n = 12, area = [-200, 200, -200, 200], z = [30, 90], size = [120, 260], color = '#c9b79a', opacity = 0.14, seed = 0, drift = [0.6, 0.2] } = {}) {
  const r = new Rand(seed + 70), out = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * r.uniform(0.6, 1.2), depthWrite: false, side: THREE.DoubleSide, fog: false });
    const s = r.uniform(...size), p = new THREE.Mesh(new THREE.CircleGeometry(s / 2, 9), m);
    p.scale.y = r.uniform(0.35, 0.7);
    const x0 = r.uniform(area[0], area[1]), y0 = r.uniform(area[2], area[3]), sp = r.uniform(0.5, 1.5);
    p.position.set(x0, y0, r.uniform(...z)); p.rotation.z = r.uniform(0, 3.14); p.renderOrder = 5;
    stage.scene.add(p); out.push(p);
    stage.A.hooks.push(f => { p.position.x = x0 + drift[0] * sp * f / 30; p.position.y = y0 + drift[1] * sp * f / 30; });
  }
  return out;
}
