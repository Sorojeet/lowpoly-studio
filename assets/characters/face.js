// FACE DETAIL — close-up eyes and age lines for any Person / Survivor (same head joint).
//
//   const eyes = addEyes(p, { iris: '#5a7f9a' });   // whites, iris, pupil, lids -> readable in extreme close-ups
//   eyes.blink(40);  eyes.widen(60, 1.35);  eyes.gaze(30, 0.4, 0);  eyes.glint('#ff2a1a', 4, 90)   // screen reflected in the eye
//   const age = addWrinkles(p, skin);               // forehead lines, crow's feet, eye bags, smile lines
//   age.fade(60, 150)                               // wrinkles melt away between two frames (age.set(0..1, frame))
import { THREE, stage, D, Buf, mat, group, emit } from '../../studio/core.js';

const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

export function addEyes(p, { iris = '#5a7f9a', skin = '#e0ac86', size = 1 } = {}) {
  const head = p.j.head, name = p.name, out = { eyes: [], lids: [], irises: [] };
  const white = mat(`${name}_eyeW`, '#f4f1ea'), ir = mat(`${name}_iris`, iris), pu = mat(`${name}_pupil`, '#0c0c10');
  const hl = mat(`${name}_eyeHi`, '#ffffff', { emission: 1.5 }), lidM = mat(`${name}_lid`, shade(skin, 0.9));
  out.glintMat = mat(`${name}_glint`, '#0c0c10', { emission: 0 });
  for (const sx of [-1, 1]) {
    const g = group([0.05 * sx, -0.1345, 0.185], head, `${name}_eye${sx}`);
    g.scale.setScalar(size);
    let b = new Buf(); b.box(0, 0, -0.017, 0.046, 0.008, 0.034, 0);
    g.add(b.mesh([white]));
    const ig = group([0, -0.005, 0], g);
    b = new Buf(); b.cyl(0, 0, 0, 0.0135, 0.004, 0, 8); b.cyl(0, 0, 0.004, 0.0065, 0.002, 1, 6);
    b.box(0.0045, 0.0045, 0.006, 0.003, 0.003, 0.001, 2);                // highlight
    b.box(-0.004, 0.001, 0.0062, 0.0045, 0.0075, 0.0006, 3);            // reflection (off until glint())
    const im = b.mesh([ir, pu, hl, out.glintMat]); im.rotation.x = 90 * D; ig.add(im);
    const lid = group([0, -0.006, 0.022], g);
    b = new Buf(); b.box(0, 0, -0.03, 0.056, 0.012, 0.03, 0);
    lid.add(b.mesh([lidM]));
    lid.scale.z = 0.2;
    for (const m of [...g.children, im, ...lid.children]) m.castShadow = false;
    out.eyes.push(g); out.lids.push(lid); out.irises.push(ig);
  }
  const A = () => stage.A;
  /** Quick blink at frame f. */
  out.blink = f => { for (const l of out.lids) { A().key(l, 'scale', f, [1, 1, 0.2]); A().key(l, 'scale', f + 2, [1, 1, 1.45]); A().key(l, 'scale', f + 4, [1, 1, 1.45]); A().key(l, 'scale', f + 7, [1, 1, 0.2]); } };
  /** Open the eyes wider (k > 1) or narrow them (k < 1) over dur frames. */
  out.widen = (f, k = 1.3, dur = 8) => { for (const e of out.eyes) { A().key(e, 'scale', f); A().key(e, 'scale', f + dur, [size, size, size * k]); } if (k > 1) for (const l of out.lids) { A().key(l, 'scale', f, [1, 1, 0.2]); A().key(l, 'scale', f + dur, [1, 1, 0.06]); } };
  /** Look direction: x, z in -1..1 (iris travel inside the eye). */
  out.gaze = (f, x = 0, z = 0, dur = 6) => { for (const i of out.irises) { A().key(i, 'position', f); A().key(i, 'position', f + dur, [0.012 * x, -0.005, 0.009 * z]); } };
  /** A glowing reflection in both eyes (a screen, a fire): colour + strength at frame. */
  out.glint = (color, strength, f) => { out.glintMat.emissive.set(color); emit(out.glintMat, strength, f); };
  return out;
}

export function addWrinkles(p, skin = '#e0ac86') {
  const m = mat(`${p.name}_wrinkle`, shade(skin, 0.58), { opacity: 0.999 });
  const b = new Buf(), T = (a, c, r = 0.0026) => b.tube(a, c, r, 0, 4);
  for (const [z, w, y] of [[0.238, 0.062, -0.133], [0.258, 0.056, -0.128], [0.278, 0.046, -0.12]]) {   // forehead
    T([-w, y + 0.006, z - 0.003], [-w * 0.35, y, z + 0.002]); T([-w * 0.35, y, z + 0.002], [w * 0.35, y, z + 0.002]); T([w * 0.35, y, z + 0.002], [w, y + 0.006, z - 0.003]);
  }
  for (const sx of [-1, 1]) {
    T([0.03 * sx, -0.137, 0.158], [0.07 * sx, -0.134, 0.156]);                       // eye bags
    T([0.036 * sx, -0.136, 0.149], [0.066 * sx, -0.133, 0.148], 0.003);
    for (const dz of [0.012, 0, -0.012]) T([0.082 * sx, -0.122, 0.185 + dz * 0.4], [0.1 * sx, -0.105, 0.185 + dz * 1.5], 0.003);   // crow's feet
    T([0.026 * sx, -0.139, 0.125], [0.05 * sx, -0.132, 0.085]); T([0.05 * sx, -0.132, 0.085], [0.052 * sx, -0.128, 0.06]);       // smile lines
    T([0.012 * sx, -0.143, 0.215], [0.014 * sx, -0.141, 0.232], 0.003);              // frown lines
  }
  const mesh = b.mesh([m], `${p.name}_wrinkles`); mesh.castShadow = false;
  p.j.head.add(mesh);
  const out = { mesh, mat: m };
  out.set = (v, f) => { if (f === undefined) { m.opacity = v; mesh.visible = v > 0.01; } else stage.A.key(m, 'opacity', f, v); };
  out.fade = (f0, f1) => { out.set(1, f0); out.set(0, f1); stage.A.hooks.push(() => { mesh.visible = m.opacity > 0.01; }); };
  return out;
}
