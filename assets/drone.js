// DRONES — police / surveillance quadcopters with spinning rotors, blinking lights and a searchlight beam.
//   const d = drone('d1', [x, y, z], heading, { beam: true });  d.fly([[x,y,z], ...], f0, f1);  d.bob(f0, f1)
import { THREE, stage, D, Buf, mat, group, emit, EM } from '../studio/core.js';

export function drone(name = 'drone', loc = [0, 0, 10], heading = 0, { size = 1, beam = true, beamColor = '#e8f4ff', pitch = -55, police = true } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D; root.scale.setScalar(size);
  const body = new Buf(), dark = mat('drone_body', '#22262c', { gloss: 0.5 }), white = mat('drone_white', '#d9dde0');
  body.box(0, 0, -0.08, 0.5, 0.7, 0.16, 0); body.box(0, -0.1, 0.06, 0.38, 0.4, 0.06, 1); body.box(0, -0.37, -0.12, 0.16, 0.08, 0.1, 0);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { body.tube([0.15 * sx, 0.15 * sy, 0], [0.55 * sx, 0.55 * sy, 0.05], 0.035, 0, 5); body.cyl(0.55 * sx, 0.55 * sy, -0.02, 0.06, 0.12, 0, 6); }
  root.add(body.mesh([dark, white]));
  const blade = mat('drone_blur', '#b9c0c7', { opacity: 0.45 }), rotors = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const rb = new Buf(); rb.box(0, 0, 0, 0.62, 0.05, 0.01, 0); rb.box(0, 0, 0, 0.05, 0.62, 0.01, 0);
    const m = rb.mesh([blade]); m.castShadow = false; const g = group([0.55 * sx, 0.55 * sy, 0.11], root); g.add(m); rotors.push(g);
  }
  const red = mat(`${name}_red`, '#ff2a2a', { emit: '#ff2a2a', emission: 6 }), blue = mat(`${name}_blue`, '#2a5aff', { emit: '#2a5aff', emission: 6 });
  const lb = new Buf(); lb.box(-0.2, -0.36, 0.02, 0.12, 0.05, 0.05, 0); lb.box(0.2, -0.36, 0.02, 0.12, 0.05, 0.05, 1);
  root.add(lb.mesh(police ? [red, blue] : [red, red]));
  const out = Object.assign(root, { rotors, red, blue });
  if (beam) {
    const pivot = group([0, -0.38, -0.14], root); pivot.rotation.x = pitch * D;
    const spot = new THREE.SpotLight(beamColor, 220, 45, 13 * D, 0.5, 1.3); spot.position.set(0, 0, 0); spot.castShadow = false;
    const tgt = new THREE.Object3D(); tgt.position.set(0, -1, 0); pivot.add(spot, tgt); spot.target = tgt;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 18, 18, 1, true), new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    cone.rotation.x = Math.PI / 2; cone.position.y = -9; cone.renderOrder = 4; pivot.add(cone);
    const lens = new Buf(); lens.cyl(0, 0, 0, 0.07, 0.05, 0, 8); const lm = lens.mesh([mat('drone_lens', '#ffffff', { emission: 8 })]); lm.rotation.x = Math.PI / 2; pivot.add(lm);
    Object.assign(out, { spot, cone, pivot });
  }
  stage.A.hooks.push(f => {
    rotors.forEach((r, i) => { r.rotation.z = f * (i % 2 ? 1.3 : -1.3); });
    const k = Math.floor(f / 5) % 2; red.emissiveIntensity = (k ? 7 : 0.4) * EM; blue.emissiveIntensity = (k ? 0.4 : 7) * EM;
  });
  out.fly = (path, f0, f1) => path.forEach((p, i) => stage.A.key(root, 'position', Math.round(f0 + (f1 - f0) * i / Math.max(1, path.length - 1)), p));
  out.bob = (f0, f1, amp = 0.12, seed = 0) => { const base = root.position.clone(); stage.A.hooks.push(f => { if (f < f0 || f > f1) return; root.position.z += Math.sin(f / 9 + seed) * amp * 0.1; root.rotation.y = Math.sin(f / 13 + seed) * 0.05; }); };
  return out;
}
