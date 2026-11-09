// Night sky dressing: stars, moon, low clouds.
import { THREE, stage, Rand, mat, ico, join } from '../studio/core.js';

let dot = null;
function dotTexture() {
  if (dot) return dot;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,0.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return (dot = new THREE.CanvasTexture(c));
}

/** Star dome: screen-space dots (two sizes), unaffected by fog or tone mapping. */
export function stars(n = 500, { radius = 1400, seed = 1, brightness = 1, minElev = 4, center = [0, 0] } = {}) {
  const r = new Rand(seed), sets = [[], []];
  for (let i = 0; i < n; i++) {
    const az = r.uniform(0, 2 * Math.PI), el = r.uniform(minElev, 88) * Math.PI / 180, rr = radius * r.uniform(0.95, 1);
    sets[r.random() < 0.25 ? 1 : 0].push(center[0] + rr * Math.cos(el) * Math.cos(az), center[1] + rr * Math.cos(el) * Math.sin(az), rr * Math.sin(el));
  }
  const out = sets.map((pts, k) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.PointsMaterial({ size: k ? 6 : 3.5, sizeAttenuation: false, map: dotTexture(), transparent: true,
      depthWrite: false, fog: false, toneMapped: false, color: new THREE.Color(brightness, brightness, brightness * 1.05) });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    stage.scene.add(p);
    return p;
  });
  return out;
}

export function moon(loc, r = 30) {
  const m = mat('moon', '#dfe6ff', { emission: 2.5, emit: '#e8eeff', fog: false });
  const o = ico(r, loc, m, { subdiv: 2, jitter: 0.02 });
  o.castShadow = false;
  return o;
}

export function clouds(n = 12, { seed = 3, height = 180, spread = 900, color = '#f4f1ec' } = {}) {
  const r = new Rand(seed), m = mat(`cloud_${color}`, color), objs = [];
  for (let i = 0; i < n; i++) {
    const cx = r.uniform(-spread, spread), cy = r.uniform(-spread, spread);
    for (let k = r.randint(3, 5); k > 0; k--)
      objs.push(ico(r.uniform(14, 26), [cx + k * 18, cy + r.uniform(-8, 8), height + r.uniform(-5, 5)], m,
        { jitter: 0.2, scale: [1.4, 1, 0.55], seed: i * 10 + k }));
  }
  const o = join(objs, 'Clouds');
  o.castShadow = false;
  return o;
}
