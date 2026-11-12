// Time-of-day presets: sun (with shadows) + hemisphere ambient + gradient sky dome + fog.
// apply(preset) sets it; apply(preset, frame) also keyframes it, so a shot can go dusk -> night.
import { THREE, stage, lin, D } from './core.js';

export const PRESETS = {
  //          sun colour, strength, elev, azim, horizon,  zenith,   sky strength
  dawn:      ['#ffb07a', 3.0, 12, 120, '#ffc29a', '#6f8fc9', 0.9],
  morning:   ['#ffe2bf', 4.0, 28, 20, '#e6eef2', '#7ab0e0', 1.0],
  day:       ['#fff3e0', 4.5, 55, 150, '#dff0f7', '#5d9fe0', 1.0],
  afternoon: ['#ffe1b0', 4.0, 30, 230, '#f6e2c5', '#6aa2d8', 1.0],
  dusk:      ['#ff7a4a', 2.6, 4, 250, '#ff9a6a', '#4a4f8f', 0.8],
  night:     ['#9fb6ff', 0.6, 35, 200, '#24305a', '#070a18', 0.5],
  blackout:  ['#8ea4f0', 0.9, 30, 160, '#1c2750', '#04060e', 0.55],
  sunless:   ['#8ea4f0', 0.32, 42, 160, '#0b1026', '#020308', 0.45],   // no Sun at all: starlight only
  space:     ['#fff4e0', 0.0, 0, 90, '#000000', '#000000', 0.0],          // black, no light: use space.sun({ light }) or your own lights
};
export const SUN_K = 1.0, HEMI_K = 2.4;

const SKY_VERT = `varying vec3 vDir;
void main(){ vec4 w = modelMatrix * vec4(position,1.0); vDir = normalize(w.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_FRAG = `uniform vec3 hor; uniform vec3 zen; uniform float k; varying vec3 vDir;
void main(){ float h = clamp(vDir.z / 0.45, 0.0, 1.0); vec3 c = mix(hor, zen, pow(h, 0.8));
  if (vDir.z < 0.0) c = hor * mix(1.0, 0.55, clamp(-vDir.z * 4.0, 0.0, 1.0));
  gl_FragColor = vec4(c * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function setup() {
  const sc = stage.scene;
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  sc.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemi.position.set(0, 0, 1);
  sc.add(hemi);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), new THREE.ShaderMaterial({
    vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { hor: { value: new THREE.Color() }, zen: { value: new THREE.Color() }, k: { value: 1 } },
  }));
  sky.frustumCulled = false; sky.renderOrder = -1;
  sc.add(sky);
  sc.fog = new THREE.Fog(0xffffff, 160, 1300);
  const L = { sun: [1, 1, 1], sunI: 1, elev: 30, azim: 0, hor: [1, 1, 1], zen: [0, 0, 1], sky: 1 };
  stage.light = { sun, hemi, sky, L, focus: [0, 0, 0], size: 300 };
  stage.A.hooks.push(applyState);
}

function applyState() {
  const { sun, hemi, sky, L, focus, size } = stage.light;
  sun.color.setRGB(...L.sun);
  sun.intensity = L.sunI * SUN_K;
  const e = L.elev * D, a = L.azim * D;
  const d = [-Math.sin(a) * Math.cos(e), Math.cos(a) * Math.cos(e), -Math.sin(e)];
  sun.target.position.set(...focus);
  sun.position.set(focus[0] - d[0] * 900, focus[1] - d[1] * 900, focus[2] - d[2] * 900);
  const c = sun.shadow.camera;
  c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 1; c.far = 2400;
  c.updateProjectionMatrix();
  const k = L.sky;
  hemi.color.setRGB(...L.zen.map((z, i) => (z * 0.6 + L.hor[i] * 0.4) * k));
  hemi.groundColor.setRGB(...L.hor.map(h => h * 0.3 * k));
  hemi.intensity = HEMI_K;
  const u = sky.material.uniforms;
  u.hor.value.setRGB(...L.hor); u.zen.value.setRGB(...L.zen); u.k.value = k;
  if (stage.camera) sky.position.copy(stage.camera.position);
  stage.scene.fog.color.setRGB(...L.hor.map(h => h * k));
}

export function apply(name, frame) {
  const p = PRESETS[name], L = stage.light.L;
  Object.assign(L, { sun: lin(p[0]), sunI: p[1], elev: p[2], azim: p[3], hor: lin(p[4]), zen: lin(p[5]), sky: p[6] });
  if (frame !== undefined) for (const k of Object.keys(L)) stage.A.key(L, k, frame);
  applyState();
}

/** Where the sun's shadow map is centred and how far it reaches (metres). Smaller = sharper. */
export function shadow(focus, size) { stage.light.focus = [focus[0], focus[1], focus[2] || 0]; stage.light.size = size; }
export function fog(near, far) { stage.scene.fog.near = near; stage.scene.fog.far = far; }
