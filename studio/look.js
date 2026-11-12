// PS3-era "look" on top of the flat-shaded style: HDR bloom, a warm/teal colour grade, vignette,
// soft sun fill + rim light, optional ambient occlusion and depth of field.
//
//   S.reset(); Lt.apply('afternoon');
//   Look.enable('ps3');                       // or 'ps3_night', 'ps3_dusty', 'ps3_cold'
//   Look.enable('ps3', { bloom: 0.9, dof: { focus: 12, aperture: 0.6 } });   // per-shot overrides
//   Look.set('vignette', 0.5, frame);         // any grade value can be keyframed
//
// Shots that never call Look.enable() render exactly as before (plain renderer + ffmpeg glow).
import { THREE, stage, lin } from './core.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const LOOKS = {
  // bloom: strength, radius, threshold (threshold is in linear HDR: sunlit white is about 1.7, lamps 2-5)
  // then the grade (display space) and the extra fill / rim lights
  ps3: {
    bloom: 0.35, bloomRadius: 0.7, bloomThreshold: 2.2,
    contrast: 1.12, saturation: 1.16, brightness: 0.0,
    shadows: '#2b4a66', highlights: '#ffd9a8', tint: 0.22,      // teal shadows, warm highlights
    vignette: 0.38, grain: 0.035, aberration: 0.0012, sharpen: 0.25,
    fill: 0.55, rim: 0.9, exposure: 1.1,
  },
  ps3_night: {
    bloom: 0.55, bloomRadius: 0.8, bloomThreshold: 1.1,
    contrast: 1.18, saturation: 1.1, brightness: 0.01,
    shadows: '#1b2a6b', highlights: '#ffc98a', tint: 0.3,
    vignette: 0.5, grain: 0.05, aberration: 0.0015, sharpen: 0.2,
    fill: 0.35, rim: 1.2, exposure: 1.25,
  },
  ps3_dusty: {   // washed-out brown/grey of late-2000s shooters and post-apocalypse games
    bloom: 0.4, bloomRadius: 0.8, bloomThreshold: 2.0,
    contrast: 1.08, saturation: 0.72, brightness: 0.015,
    shadows: '#4a4436', highlights: '#ffe3b0', tint: 0.38,
    vignette: 0.45, grain: 0.06, aberration: 0.0015, sharpen: 0.25,
    fill: 0.5, rim: 0.8, exposure: 1.15,
  },
  ps3_cold: {
    bloom: 0.35, bloomRadius: 0.7, bloomThreshold: 2.2,
    contrast: 1.14, saturation: 0.95, brightness: 0.0,
    shadows: '#22406e', highlights: '#e6f1ff', tint: 0.3,
    vignette: 0.4, grain: 0.04, aberration: 0.0012, sharpen: 0.25,
    fill: 0.5, rim: 1.0, exposure: 1.1,
  },
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, res: { value: new THREE.Vector2(1080, 1920) }, time: { value: 0 },
    contrast: { value: 1 }, saturation: { value: 1 }, brightness: { value: 0 },
    shadows: { value: new THREE.Color() }, highlights: { value: new THREE.Color() }, tint: { value: 0 },
    vignette: { value: 0 }, grain: { value: 0 }, aberration: { value: 0 }, sharpen: { value: 0 }, fade: { value: 1 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 res; uniform float time;
    uniform float contrast, saturation, brightness, tint, vignette, grain, aberration, sharpen, fade;
    uniform vec3 shadows, highlights; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec2 off = d * r2 * aberration * 8.0;
      vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      if (sharpen > 0.0) {
        vec2 px = 1.0 / res;
        vec3 blur = (texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb + texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb +
                     texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb) * 0.25;
        c += (c - blur) * sharpen;
      }
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5 + brightness;
      // split toning: push shadows toward one colour, highlights toward another (keeps mid-tones clean)
      vec3 sh = shadows / max(dot(shadows, vec3(0.2126, 0.7152, 0.0722)), 0.001);
      vec3 hi = highlights / max(dot(highlights, vec3(0.2126, 0.7152, 0.0722)), 0.001);
      float ls = clamp(l, 0.0, 1.0);
      c *= mix(vec3(1.0), sh, tint * (1.0 - smoothstep(0.0, 0.55, ls)));
      c *= mix(vec3(1.0), hi, tint * smoothstep(0.45, 1.0, ls));
      c *= 1.0 - vignette * smoothstep(0.12, 0.62, r2 * 1.35);
      c += (hash(floor(vUv * res) + vec2(mod(time, 97.0) * 13.7, mod(time, 89.0) * 7.3)) - 0.5) * grain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0) * fade, 1.0);
    }`,
};

/** Switch the PS3 look on for the current scene. Call after S.reset() + Lt.apply(). */
export function enable(name = 'ps3', over = {}) {
  const r = stage.renderer, cfg = { ...LOOKS[name], ...over }, size = r.getSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(r, rt);
  const passes = { render: new RenderPass(stage.scene, null) };
  composer.addPass(passes.render);
  passes.bloom = new UnrealBloomPass(size.clone(), cfg.bloom, cfg.bloomRadius, cfg.bloomThreshold);
  composer.addPass(passes.bloom);
  composer.addPass(new OutputPass());
  passes.grade = new ShaderPass(GradeShader);
  passes.grade.uniforms.res.value.copy(size);
  composer.addPass(passes.grade);

  // PS3-style three-point feel: a soft fill from the sky side and a rim light from behind the subject.
  const fill = new THREE.DirectionalLight(0xffffff, 0), rim = new THREE.DirectionalLight(0xffffff, 0);
  stage.scene.add(fill, fill.target, rim, rim.target);

  const g = { ...cfg, shadows: lin(cfg.shadows), highlights: lin(cfg.highlights), fade: 1 };
  if (cfg.dof) { g.focus = cfg.dof.focus ?? 10; g.aperture = cfg.dof.aperture ?? 0.5; }
  stage.look = { name, composer, passes, g, fill, rim, cfg, size };
  r.toneMappingExposure = cfg.exposure;
  stage.A.hooks.push(sync);
  sync(1);
  return stage.look;
}

function sync(f) {
  const lk = stage.look;
  if (!lk) return;
  const { passes, g, fill, rim } = lk, u = passes.grade.uniforms;
  for (const k of ['contrast', 'saturation', 'brightness', 'tint', 'vignette', 'grain', 'aberration', 'sharpen', 'fade']) u[k].value = g[k];
  u.shadows.value.setRGB(...g.shadows); u.highlights.value.setRGB(...g.highlights);
  u.time.value = f || 0;
  passes.bloom.strength = g.bloom; passes.bloom.radius = g.bloomRadius; passes.bloom.threshold = g.bloomThreshold;
  stage.renderer.toneMappingExposure = g.exposure;
  const L = stage.light;
  if (L) {
    const s = L.sun.position.clone().sub(L.sun.target.position).normalize();
    const hor = new THREE.Color(...L.L.hor), zen = new THREE.Color(...L.L.zen);
    // fill: from the opposite horizontal side, sky coloured, no shadows
    fill.position.set(-s.x * 100 + L.focus[0], -s.y * 100 + L.focus[1], 60 + L.focus[2]);
    fill.target.position.set(...L.focus);
    fill.color.copy(zen).lerp(hor, 0.5); fill.intensity = g.fill * L.L.sky;
    // rim: low, from behind (relative to camera) so silhouettes pop
    const cam = stage.camera;
    if (cam) {
      const v = new THREE.Vector3(L.focus[0] - cam.position.x, L.focus[1] - cam.position.y, 0).normalize();
      rim.position.set(L.focus[0] + v.x * 100 + s.x * 40, L.focus[1] + v.y * 100 + s.y * 40, L.focus[2] + 45);
      rim.target.position.set(...L.focus);
      rim.color.copy(L.sun.color).lerp(hor, 0.4); rim.intensity = g.rim * Math.min(1, L.L.sunI / 3 + 0.25);
    }
  }
}

/** Set (or keyframe) one look value: bloom, contrast, saturation, vignette, exposure, fade, focus, aperture, fill, rim ... */
export function set(key, value, frame, interp = 'BEZIER') {
  const g = stage.look.g;
  if (key === 'shadows' || key === 'highlights') value = lin(value);
  if (frame === undefined) { g[key] = value; sync(1); } else stage.A.key(g, key, frame, value, interp);
}

/** Fade from/to black: fade(1, 12) fades in over frames 1-12; fade(n - 12, n, 1, 0) fades out. */
export function fade(f0, f1, from = 0, to = 1) { set('fade', from, f0); set('fade', to, f1); }

export function render() {
  const lk = stage.look, cam = stage.camera;
  if (!lk.lazy) {   // AO / depth of field need the camera, which is created after enable()
    lk.lazy = true;
    const { cfg, size, passes, composer } = lk;
    let at = 1;
    if (cfg.ao) {
      passes.ao = new GTAOPass(stage.scene, cam, size.x, size.y);
      passes.ao.updateGtaoMaterial({ radius: cfg.ao.radius ?? 1.2, distanceExponent: 1, thickness: 1, scale: cfg.ao.strength ?? 1.2, samples: 12 });
      composer.insertPass(passes.ao, at++);
    }
    if (cfg.dof) {
      passes.dof = new BokehPass(stage.scene, cam, { focus: lk.g.focus, aperture: lk.g.aperture * 0.0005, maxblur: cfg.dof.maxblur ?? 0.008 });
      composer.insertPass(passes.dof, at++);
    }
  }
  if (lk.passes.dof) { lk.passes.dof.uniforms.focus.value = lk.g.focus; lk.passes.dof.uniforms.aperture.value = lk.g.aperture * 0.0005; }
  for (const k of ['render', 'ao', 'dof']) if (lk.passes[k]) lk.passes[k].camera = cam;
  lk.composer.render();
}

export function dispose() {
  const lk = stage.look;
  if (!lk) return;
  lk.composer.dispose?.();
  lk.composer.renderTarget1.dispose(); lk.composer.renderTarget2.dispose();
  stage.look = null;
}
