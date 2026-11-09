// KAI — the last human. Low-poly character with a joint hierarchy and reusable motions:
// walk, look, phone call, shout, sit, stand.
//
//   const kai = new Survivor('Kai', { loc: [0, 0, 0], facing: 0 });   // facing deg, 0 = toward -Y
//   kai.walk([[0, 0], [0, -10]], 1, 200);
//   kai.look(60, { yaw: -40 });
//
// A second survivor is just new Survivor('Mira', { hoodie: '#4f7fd9', skin: P.SKIN[2] }).
import { stage, D, mat, emit, box, ico, group, lerp } from '../../studio/core.js';
import * as P from '../palette.js';

export class Survivor {
  constructor(name = 'Kai', { loc = [0, 0, 0], facing = 0, skin = P.SKIN[0], hoodie = P.HOODIE, pants = P.JEANS,
    shoes = P.SHOES, hair = P.HAIR, bag = P.BAG, scale = 1, backpack = true } = {}) {
    this.name = name;
    const m = (k, c, o) => mat(`${name}_${k}`, c, o);
    const ms = m('skin', skin), mh = m('hoodie', hoodie), mp = m('pants', pants), mo = m('shoes', shoes), mha = m('hair', hair), mb = m('bag', bag);
    const eye = m('eye', '#151518');
    const j = (this.j = {});
    const root = (j.root = group(loc, null, name));
    root.rotation.z = facing * D;
    root.scale.setScalar(scale);
    const hips = (j.hips = group([0, 0, 0.95], root));
    box([0.36, 0.22, 0.2], [0, 0, 0.02], mp, { parent: hips });
    const spine = (j.spine = group([0, 0, 0.08], hips));
    box([0.44, 0.26, 0.56], [0, 0, 0], mh, { origin: 'bottom', taper: 0.92, parent: spine });
    box([0.34, 0.12, 0.12], [0, 0.12, 0.55], mh, { taper: 0.8, parent: spine });
    if (backpack) box([0.38, 0.2, 0.44], [0, 0.22, 0.24], mb, { origin: 'bottom', taper: 0.95, parent: spine });
    const head = (j.head = group([0, 0, 0.6], spine));
    box([0.12, 0.12, 0.08], [0, 0, 0], ms, { origin: 'bottom', parent: head });
    ico(0.14, [0, 0, 0.17], ms, { scale: [1, 1.05, 1.15], seed: 3, parent: head });
    ico(0.15, [0, 0.025, 0.22], mha, { scale: [1.02, 1.05, 0.8], jitter: 0.06, seed: 5, parent: head });
    for (const sx of [-1, 1]) box([0.03, 0.01, 0.04], [0.05 * sx, -0.145, 0.18], eye, { parent: head });
    box([0.04, 0.04, 0.05], [0, -0.155, 0.14], ms, { taper: 0.6, parent: head });
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      const sh = (j[`shoulder${s}`] = group([0.27 * sx, 0, 0.5], spine));
      box([0.12, 0.13, 0.3], [0, 0, 0], mh, { origin: 'top', parent: sh });
      const el = (j[`elbow${s}`] = group([0, 0, -0.29], sh));
      box([0.11, 0.12, 0.27], [0, 0, 0], mh, { origin: 'top', taper: 0.9, parent: el });
      const hand = (j[`hand${s}`] = group([0, 0, -0.29], el));
      ico(0.06, [0, 0, -0.02], ms, { scale: [0.9, 1, 1.2], parent: hand });
      const hp = (j[`hip${s}`] = group([0.1 * sx, 0, 0], hips));
      box([0.16, 0.18, 0.46], [0, 0, 0], mp, { origin: 'top', taper: 0.95, parent: hp });
      const kn = (j[`knee${s}`] = group([0, 0, -0.45], hp));
      box([0.14, 0.15, 0.42], [0, 0, 0], mp, { origin: 'top', taper: 0.9, parent: kn });
      const ft = (j[`foot${s}`] = group([0, 0, -0.42], kn));
      box([0.14, 0.27, 0.09], [0, -0.05, -0.04], mo, { parent: ft });
    }
    this.phoneMat = mat('phone', '#111216', { emit: '#9fd3ff' });
    const ph = (j.phone = box([0.08, 0.015, 0.15], [0, -0.05, -0.06], this.phoneMat, { parent: j.handR }));
    ph.scale.setScalar(0.001);
    j.shoulderL.rotation.set(0, 0, -6 * D); j.shoulderR.rotation.set(0, 0, 6 * D);
    j.elbowL.rotation.set(-10 * D, 0, 0); j.elbowR.rotation.set(-10 * D, 0, 0);
  }

  // ------------------------------------------------------------ helpers
  rot(joint, f, x = 0, y = 0, z = 0, interp = 'BEZIER') { stage.A.key(this.j[joint], 'rotation', f, [x * D, y * D, z * D], interp); }
  hold(joint, f) { stage.A.key(this.j[joint], 'rotation', f); }
  place(f, x, y, facing = null, z = 0) {
    stage.A.key(this.j.root, 'position', f, [x, y, z], 'LINEAR');
    if (facing !== null) stage.A.key(this.j.root, 'rotation', f, [0, 0, facing * D]);
  }

  // ------------------------------------------------------------ motions
  poseStand(f) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot(`hip${s}`, f); this.rot(`knee${s}`, f); this.rot(`foot${s}`, f);
      this.rot(`shoulder${s}`, f, 0, 0, -6 * sx); this.rot(`elbow${s}`, f, -10);
    }
    this.rot('spine', f); this.rot('head', f);
    stage.A.key(this.j.hips, 'position', f, [0, 0, 0.95]);
  }

  /** Walk along polyline [[x,y],...] from frame start to end; stride sets cadence so feet don't slide. */
  walk(path, start, end, { stride = 0.72, z = 0, facePath = true, armSwing = 28 } = {}) {
    const segs = []; let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push([a, b, d, total]); total += d;
    }
    const frames = end - start, steps = Math.max(1, total / stride), cycle = frames / steps * 2;
    for (let f = start; f <= end; f += 2) {
      const s = (f - start) / frames * total;
      let x, y, ang = null;
      for (let k = 0; k < segs.length; k++) {
        const [a, b, d, s0] = segs[k];
        if (s <= s0 + d || k === segs.length - 1) {
          const u = d === 0 ? 0 : Math.min(1, (s - s0) / d);
          x = lerp(a[0], b[0], u); y = lerp(a[1], b[1], u);
          if (facePath) ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / D + 90;
          break;
        }
      }
      this.place(f, x, y, ang, z);
      const ph = 2 * Math.PI * (f - start) / cycle;
      for (const [s_, sign] of [['L', 1], ['R', -1]]) {
        const sw = Math.sin(ph) * sign;
        this.rot(`hip${s_}`, f, -26 * sw, 0, 0, 'LINEAR');
        this.rot(`knee${s_}`, f, 6 + 40 * Math.max(0, Math.cos(ph) * sign), 0, 0, 'LINEAR');
        this.rot(`foot${s_}`, f, -8 * sw, 0, 0, 'LINEAR');
        this.rot(`shoulder${s_}`, f, armSwing * sw, 0, -6 * sign, 'LINEAR');
        this.rot(`elbow${s_}`, f, -18 - 10 * Math.max(0, -sw), 0, 0, 'LINEAR');
      }
      stage.A.key(this.j.hips, 'position', f, [0, 0, 0.95 + 0.03 * Math.abs(Math.cos(ph))], 'LINEAR');
      this.rot('spine', f, -3, 0, 4 * Math.sin(ph), 'LINEAR');
    }
  }

  /** Turn head (yaw + = left) over `dur` frames, holding the previous pose until `frame`. */
  look(frame, { yaw = 0, pitch = 0, dur = 12 } = {}) { this.hold('head', frame); this.rot('head', frame + dur, pitch, 0, yaw); }

  phoneCall(frame, dur = 15) {
    this.hold('shoulderR', frame); this.hold('elbowR', frame);
    const ph = this.j.phone;
    stage.A.key(ph, 'scale', frame, [0.001, 0.001, 0.001]);
    this.rot('shoulderR', frame + dur, -35, 0, 25);
    this.rot('elbowR', frame + dur, -140);
    stage.A.key(ph, 'scale', frame + 4, [1, 1, 1]);
    emit(this.phoneMat, 0, frame); emit(this.phoneMat, 3, frame + 4);
  }

  shout(frame, dur = 10) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.hold(`shoulder${s}`, frame);
      this.rot(`shoulder${s}`, frame + dur, -60, 0, -35 * sx);
      this.rot(`elbow${s}`, frame + dur, -60);
    }
    this.hold('head', frame); this.rot('head', frame + dur, -18);
  }

  /** Seated on a ledge edge, legs dangling forward. */
  sit(f, ledgeH = 0) {
    stage.A.key(this.j.hips, 'position', f, [0, 0, 0.12 + ledgeH]);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot(`hip${s}`, f, -88, 0, -4 * sx);
      this.rot(`knee${s}`, f, 80 + 6 * sx);
      this.rot(`shoulder${s}`, f, -30, 0, -12 * sx);
      this.rot(`elbow${s}`, f, -40);
    }
    this.rot('spine', f, 8);
  }
}
