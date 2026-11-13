// Renderer, scene reset, camera + frame stepping. 1080x1920 portrait, 30 fps.
import { THREE, stage, resetMats, D } from './core.js';
import { Animator } from './anim.js';
import * as Lt from './lighting.js';
import * as Look from './look.js';

export const W = 1080, H = 1920, FPS = 30;

export function init(scale = 1) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(Math.round(W * scale), Math.round(H * scale), false);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.AgXToneMapping;
  r.toneMappingExposure = 1.15;
  document.body.appendChild(r.domElement);
  stage.renderer = r;
  return r;
}

export function reset() {
  Look.dispose();
  if (stage.renderer) stage.renderer.toneMappingExposure = 1.15;
  stage.scene = new THREE.Scene();
  stage.A = new Animator();
  stage.camera = null; stage.pre = [];
  resetMats();
  Lt.setup();
}

const fovFor = lens => 2 * Math.atan(18 / lens) / D;   // Blender 36 mm sensor fitted to the long (vertical) side

/** Camera that always looks at `tgt` (an Object3D you can animate with move()). */
export function camera(loc, target, lens = 35) {
  const cam = new THREE.PerspectiveCamera(fovFor(lens), W / H, 0.1, 6000);
  cam.position.set(...loc);
  stage.scene.add(cam);
  const tgt = new THREE.Object3D();
  tgt.position.set(...target);
  stage.scene.add(tgt);
  const lensState = { lens };
  stage.A.hooks.unshift(() => { cam.fov = fovFor(lensState.lens); cam.updateProjectionMatrix(); cam.lookAt(tgt.position); });
  stage.camera = cam;
  return { cam, tgt, lens: lensState };
}

/** keys: [[frame, [x,y,z]], ...] eased moves. */
export function move(ob, keys, interp = 'BEZIER') { for (const [f, p] of keys) stage.A.key(ob, 'position', f, p, interp); }

export function update(f) { stage.A.update(f); }
export function render() { for (const h of stage.pre || []) h(); if (stage.look) Look.render(); else stage.renderer.render(stage.scene, stage.camera); }
