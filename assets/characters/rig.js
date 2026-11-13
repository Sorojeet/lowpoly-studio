// Shared humanoid rig + motion library. Any character that builds the joints
//   root > hips > spine > head, shoulderL/R > elbowL/R > handL/R, hipL/R > kneeL/R > footL/R
// into this.j gets every motion below (Survivor and Person both do).
//
//   p.walk(path, f0, f1)   p.run(path, f0, f1)   p.idle(f0, f1)     p.look(f, {yaw, pitch})
//   p.wave(f)  p.point(f, {yaw})  p.cheer(f0, f1)  p.talk(f0, f1)   p.shout(f)  p.phoneCall(f)
//   p.sit(f, seatH)  p.crouch(f)  p.collapse(f)  p.poseStand(f)
import { stage, D, emit, lerp } from '../../studio/core.js';

export class Rig {
  constructor() { this.j = {}; this.H = 0.95; }   // H = hip height when standing

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
    stage.A.key(this.j.hips, 'position', f, [0, 0, this.H]);
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
      stage.A.key(this.j.hips, 'position', f, [0, 0, this.H + 0.03 * Math.abs(Math.cos(ph))], 'LINEAR');
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
    stage.A.key(this.j.hips, 'position', f, [0, 0, this.H - 0.83 + ledgeH]);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot(`hip${s}`, f, -88, 0, -4 * sx);
      this.rot(`knee${s}`, f, 80 + 6 * sx);
      this.rot(`shoulder${s}`, f, -30, 0, -12 * sx);
      this.rot(`elbow${s}`, f, -40);
    }
    this.rot('spine', f, 8);
  }

  // ------------------------------------------------------------ extra motions (PS3 pack)
  /** Subtle breathing + weight shift so a standing character never looks frozen. */
  idle(start, end, { amount = 1, seed = 0, arms = true } = {}) {
    const ph = seed * 1.7;
    for (let f = start; f <= end; f += 6) {
      const t = f / 30 * 2 * Math.PI;
      this.rot('spine', f, 1.2 * amount * Math.sin(t / 3.2 + ph), 0, 1.5 * amount * Math.sin(t / 5.5 + ph), 'LINEAR');
      stage.A.key(this.j.hips, 'position', f, [0.012 * amount * Math.sin(t / 5.5 + ph), 0, this.H + 0.006 * amount * Math.sin(t / 3.2 + ph)], 'LINEAR');
      if (arms) for (const [s, sx] of [['L', 1], ['R', -1]]) this.rot(`shoulder${s}`, f, 2 * amount * Math.sin(t / 3.2 + ph + sx), 0, -6 * sx - 1.5 * amount * Math.sin(t / 3.2 + ph), 'LINEAR');
    }
  }

  /** Run along a polyline (longer stride, forward lean, pumping arms). */
  run(path, start, end, { stride = 1.5, z = 0 } = {}) {
    const segs = []; let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push([a, b, d, total]); total += d;
    }
    const frames = end - start, steps = Math.max(1, total / stride), cycle = frames / steps * 2;
    for (let f = start; f <= end; f += 1) {
      const s = (f - start) / frames * total;
      let x, y, ang = null;
      for (let k = 0; k < segs.length; k++) {
        const [a, b, d, s0] = segs[k];
        if (s <= s0 + d || k === segs.length - 1) {
          const u = d === 0 ? 0 : Math.min(1, (s - s0) / d);
          x = lerp(a[0], b[0], u); y = lerp(a[1], b[1], u);
          ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / D + 90;
          break;
        }
      }
      this.place(f, x, y, ang, z);
      const ph = 2 * Math.PI * (f - start) / cycle;
      for (const [s_, sign] of [['L', 1], ['R', -1]]) {
        const sw = Math.sin(ph) * sign, lift = Math.max(0, Math.cos(ph) * sign);
        this.rot(`hip${s_}`, f, -42 * sw - 8, 0, 0, 'LINEAR');
        this.rot(`knee${s_}`, f, 18 + 85 * lift, 0, 0, 'LINEAR');
        this.rot(`foot${s_}`, f, -14 * sw, 0, 0, 'LINEAR');
        this.rot(`shoulder${s_}`, f, 50 * sw, 0, -8 * sign, 'LINEAR');
        this.rot(`elbow${s_}`, f, -85, 0, 0, 'LINEAR');
      }
      stage.A.key(this.j.hips, 'position', f, [0, 0, this.H - 0.03 + 0.07 * Math.abs(Math.cos(ph))], 'LINEAR');
      this.rot('spine', f, -14, 0, 7 * Math.sin(ph), 'LINEAR');
      this.rot('head', f, 8, 0, 0, 'LINEAR');
    }
  }

  /** Raise an arm and wave `n` times. */
  wave(frame, { side = 'R', n = 3, dur = 10 } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, -20, 0, -150 * sx);
    this.rot(`elbow${side}`, frame + dur, -30);
    for (let k = 0; k < n * 2; k++) this.rot(`elbow${side}`, frame + dur + 6 * (k + 1), -30, 0, (k % 2 ? 22 : -22) * sx, 'BEZIER');
    const e = frame + dur + 6 * (n * 2 + 1);
    this.rot(`shoulder${side}`, e + dur, 0, 0, -6 * sx); this.rot(`elbow${side}`, e + dur, -10);
    return e + dur;
  }

  /** Point with the right arm; yaw is degrees left (+) / right (-) of where the body faces. */
  point(frame, { side = 'R', yaw = 0, pitch = 0, dur = 9 } = {}) {
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, -88 - pitch, 0, yaw);
    this.rot(`elbow${side}`, frame + dur, -4);
    this.look(frame, { yaw: yaw * 0.6, pitch: -pitch * 0.5, dur });
  }

  /** Both arms up, bouncing. */
  cheer(start, end) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) { this.hold(`shoulder${s}`, start); this.hold(`elbow${s}`, start); }
    stage.A.key(this.j.hips, 'position', start);
    for (let f = start + 8, k = 0; f <= end; f += 7, k++) {
      const up = k % 2 === 0;
      for (const [s, sx] of [['L', 1], ['R', -1]]) {
        this.rot(`shoulder${s}`, f, -10, 0, (up ? -165 : -140) * sx);
        this.rot(`elbow${s}`, f, up ? -15 : -50);
        this.rot(`knee${s}`, f, up ? 0 : 22); this.rot(`hip${s}`, f, up ? 0 : -12);
      }
      stage.A.key(this.j.hips, 'position', f, [0, 0, this.H + (up ? 0.1 : -0.03)]);
    }
  }

  /** Conversational hand gestures + small nods. */
  talk(start, end, { seed = 0, side = 'R' } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, start); this.hold(`elbow${side}`, start); this.hold('head', start);
    for (let f = start + 8, k = seed; f <= end; f += 9, k++) {
      const a = (k * 37) % 5;
      this.rot(`shoulder${side}`, f, -22 - a * 5, 0, (-12 - a * 4) * sx);
      this.rot(`elbow${side}`, f, -70 - a * 9, 0, (a - 2) * 6);
      this.rot('head', f, (a - 2) * 3, 0, (a % 2 ? 6 : -5));
    }
  }

  /** Squat down (inspecting something on the ground). */
  crouch(f, depth = 1) {
    stage.A.key(this.j.hips, 'position', f, [0, 0.08 * depth, this.H - 0.48 * depth]);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot(`hip${s}`, f, -105 * depth, 0, -8 * sx);
      this.rot(`knee${s}`, f, 135 * depth);
      this.rot(`foot${s}`, f, -28 * depth);
      this.rot(`shoulder${s}`, f, -45 * depth, 0, -8 * sx);
      this.rot(`elbow${s}`, f, -35 * depth);
    }
    this.rot('spine', f, -22 * depth);
    this.rot('head', f, -10 * depth);
  }

  /** Fall over backwards and lie on the ground (holds current pose until `frame`). */
  collapse(frame, dur = 16) {
    const r = this.j.root;
    stage.A.key(r, 'rotation', frame); stage.A.key(this.j.hips, 'position', frame);
    for (const k of ['hipL', 'hipR', 'kneeL', 'kneeR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'spine']) this.hold(k, frame);
    stage.A.key(r, 'rotation', frame + dur, [-88 * D, r.rotation.y, r.rotation.z]);
    stage.A.key(this.j.hips, 'position', frame + dur, [0, 0, this.H]);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot(`hip${s}`, frame + dur, -4, 0, -10 * sx); this.rot(`knee${s}`, frame + dur, 8 + 10 * sx);
      this.rot(`shoulder${s}`, frame + dur, 0, 0, -55 * sx); this.rot(`elbow${s}`, frame + dur, -25);
    }
    stage.A.key(r, 'position', frame, undefined, 'BEZIER');
    const p = r.position;
    stage.A.key(r, 'position', frame + dur, [p.x, p.y, p.z + 0.14]);
  }

  // ------------------------------------------------------------ more motions (What If pack)
  /** Raise a hand to the cheek and hold it there (looking in a mirror, disbelief). */
  touchFace(frame, { side = 'R', dur = 20 } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, -54, 0, -14 * sx);
    this.rot(`elbow${side}`, frame + dur, -128, 0, -26 * sx);
  }
  /** Lower an arm back to the side. */
  armDown(frame, { side = 'R', dur = 14 } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, 0, 0, -6 * sx); this.rot(`elbow${side}`, frame + dur, -10);
  }
  /** Palms-up "no idea" shrug, held for `hold` frames. */
  shrug(frame, { dur = 8, hold = 14 } = {}) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.hold(`shoulder${s}`, frame); this.hold(`elbow${s}`, frame);
      for (const f of [frame + dur, frame + dur + hold]) { this.rot(`shoulder${s}`, f, -12, -20 * sx, 0); this.rot(`elbow${s}`, f, -100, 0, 28 * sx); }
      this.rot(`shoulder${s}`, frame + dur * 2 + hold, 0, 0, -6 * sx); this.rot(`elbow${s}`, frame + dur * 2 + hold, -10);
    }
    this.hold('head', frame); this.rot('head', frame + dur, 0, 0, 0, 'BEZIER'); this.rot('head', frame + dur + 4, 4, 8, 0);
  }
  /** Scratch the back of the head. */
  scratchHead(frame, { side = 'R', n = 4, dur = 10 } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, -150, 0, -20 * sx);
    for (let k = 0; k <= n * 2; k++) this.rot(`elbow${side}`, frame + dur + k * 4, k % 2 ? -118 : -134);
  }
  /** Shove / grab with both arms, leaning in (crowd pushing, tug-of-war). */
  shove(start, end, { period = 9, lean = 14, seed = 0 } = {}) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) { this.hold(`shoulder${s}`, start); this.hold(`elbow${s}`, start); }
    this.hold('spine', start);
    for (let f = start + 6, k = seed; f <= end; f += period, k++) {
      const out = k % 2 === 0;
      for (const [s, sx] of [['L', 1], ['R', -1]]) { this.rot(`shoulder${s}`, f, out ? -82 : -62, 0, 8 * sx); this.rot(`elbow${s}`, f, out ? -18 : -70); }
      this.rot('spine', f, out ? -lean : -lean * 0.4, 0, out ? 5 : -5);
      this.rot('head', f, out ? 6 : 0);
    }
  }
  /** Reach up/forward with one arm (to a shelf) and hold. */
  reach(frame, { side = 'R', pitch = 120, dur = 12 } = {}) {
    const sx = side === 'L' ? 1 : -1;
    this.hold(`shoulder${side}`, frame); this.hold(`elbow${side}`, frame);
    this.rot(`shoulder${side}`, frame + dur, -pitch, 0, 6 * sx); this.rot(`elbow${side}`, frame + dur, -12);
  }
  /** Hold something in both hands in front of the chest (a box, a clipboard). */
  carry(f) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) { this.rot(`shoulder${s}`, f, -32, 0, -10 * sx); this.rot(`elbow${s}`, f, -78, 0, -18 * sx); }
  }
}
