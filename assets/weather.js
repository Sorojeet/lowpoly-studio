// WEATHER — falling snow and rain as cheap point clouds that loop forever.
//   W.snow({ n: 2500, area: [-30, 30, -30, 30], top: 22 });     W.rain({ n: 3000, ... });
// Flakes follow the camera if follow: true (so they are always in front of the lens).
import { THREE, stage, Rand } from '../studio/core.js';

let flake = null;
function tex() {
  if (flake) return flake;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.8)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  return (flake = new THREE.CanvasTexture(c));
}
function fall(name, { n, area, top, bottom, speed, sway, size, color, opacity, seed, wind, follow }) {
  const r = new Rand(seed), base = new Float32Array(n * 3), ph = new Float32Array(n), sp = new Float32Array(n), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { base[i * 3] = r.uniform(area[0], area[1]); base[i * 3 + 1] = r.uniform(area[2], area[3]); base[i * 3 + 2] = r.uniform(0, top - bottom); ph[i] = r.uniform(0, 6.28); sp[i] = r.uniform(0.7, 1.3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ size, map: tex(), transparent: true, opacity, depthWrite: false, color, sizeAttenuation: true, fog: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.name = name; stage.scene.add(p);
  const H = top - bottom, wx = area[1] - area[0], wy = area[3] - area[2];
  stage.A.hooks.push(f => {
    const t = f / 30, cam = follow && stage.camera ? stage.camera.position : null;
    for (let i = 0; i < n; i++) {
      const z = ((base[i * 3 + 2] - speed * sp[i] * t) % H + H) % H;
      let x = base[i * 3] + Math.sin(t * 0.9 + ph[i]) * sway + wind[0] * t, y = base[i * 3 + 1] + Math.cos(t * 0.7 + ph[i]) * sway + wind[1] * t;
      x = ((x - area[0]) % wx + wx) % wx + area[0]; y = ((y - area[2]) % wy + wy) % wy + area[2];
      pos[i * 3] = x + (cam ? cam.x : 0); pos[i * 3 + 1] = y + (cam ? cam.y : 0); pos[i * 3 + 2] = bottom + z;
    }
    g.attributes.position.needsUpdate = true;
  });
  return p;
}
export function snow(o = {}) {
  return fall(o.name ?? 'snow', { n: 2500, area: [-30, 30, -30, 30], top: 22, bottom: 0, speed: 1.6, sway: 0.5, size: 0.16, color: '#ffffff', opacity: 0.9, seed: 1, wind: [0.4, 0], follow: false, ...o });
}
export function rain(o = {}) {
  return fall(o.name ?? 'rain', { n: 3000, area: [-30, 30, -30, 30], top: 22, bottom: 0, speed: 16, sway: 0.02, size: 0.1, color: '#bcd4ee', opacity: 0.6, seed: 2, wind: [1.5, 0], follow: false, ...o });
}
