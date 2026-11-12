// KAI — the last human. Low-poly character with a joint hierarchy and reusable motions:
// walk, look, phone call, shout, sit, stand (motions live in rig.js and are shared with Person).
//
//   const kai = new Survivor('Kai', { loc: [0, 0, 0], facing: 0 });   // facing deg, 0 = toward -Y
//   kai.walk([[0, 0], [0, -10]], 1, 200);
//   kai.look(60, { yaw: -40 });
//
// A second survivor is just new Survivor('Mira', { hoodie: '#4f7fd9', skin: P.SKIN[2] }).
import { D, mat, box, ico, group } from '../../studio/core.js';
import { Rig } from './rig.js';
import * as P from '../palette.js';

export class Survivor extends Rig {
  constructor(name = 'Kai', { loc = [0, 0, 0], facing = 0, skin = P.SKIN[0], hoodie = P.HOODIE, pants = P.JEANS,
    shoes = P.SHOES, hair = P.HAIR, bag = P.BAG, scale = 1, backpack = true } = {}) {
    super();
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
}
