// Camera feel: hand-held wobble and impact shakes, added on top of any keyframed camera move.
//
//   const h = Cam.handheld(1, n, { amp: 1 });      // documentary wobble for the whole shot;  stage.A.key(h, 'amp', 60, 2.5) to ramp it
//   Cam.shake(48, { amp: 2, dur: 18 });            // a hit at frame 48 that dies away
//   Cam.roll(6)                                    // dutch tilt in degrees (returns { deg } you can key)
import { stage, D } from './core.js';

export function handheld(f0, f1, { amp = 1, seed = 0, speed = 1 } = {}) {
  const st = { amp };
  stage.A.hooks.push(f => {
    if (f < f0 || f > f1 || !stage.camera) return;
    const t = f / 30 * speed, n = (a, b, c) => Math.sin(t * a + seed) * 0.5 + Math.sin(t * b + seed * 2.3) * 0.3 + Math.sin(t * c + seed * 4.1) * 0.2;
    const cam = stage.camera;
    cam.rotateX(n(5.1, 11.3, 23.0) * 0.006 * st.amp); cam.rotateY(n(4.3, 9.7, 19.0) * 0.006 * st.amp); cam.rotateZ(n(3.1, 7.9, 15.0) * 0.008 * st.amp);
  });
  return st;
}

export function shake(f0, { amp = 1, dur = 15, seed = 0 } = {}) {
  stage.A.hooks.push(f => {
    if (f < f0 || f > f0 + dur || !stage.camera) return;
    const k = (1 - (f - f0) / dur) ** 2 * amp * 0.012, cam = stage.camera;
    cam.rotateX(Math.sin(f * 12.9898 + seed) * k); cam.rotateY(Math.sin(f * 78.233 + seed) * k); cam.rotateZ(Math.sin(f * 37.719 + seed) * k * 0.6);
  });
}

export function roll(deg = 0) {
  const st = { deg };
  stage.A.hooks.push(() => { if (stage.camera) stage.camera.rotateZ(st.deg * D); });
  return st;
}
