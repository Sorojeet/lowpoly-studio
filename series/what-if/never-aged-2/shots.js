// WHAT IF HUMANS NEVER AGED AGAIN? PART 2 — THE PRICE OF IMMORTALITY (three.js)
//   node tools/render.mjs what-if/never-aged-2 sh02_pullback --still 120
//   node tools/render.mjs what-if/never-aged-2 all          (sh19_end is a black card made in build.py)
// Same city (seed, lots, central tower, giant screen) and same cast as Part 1.
import { THREE, stage, D, mat, emit, box, Buf, group, Rand, lin, EM } from '../../../studio/core.js';
import * as S from '../../../studio/stage.js';
import * as Lt from '../../../studio/lighting.js';
import * as Look from '../../../studio/look.js';
import * as P from '../../../assets/palette.js';
import { Person } from '../../../assets/characters/person.js';
import { youth, scientist, official } from '../../../assets/characters/cast.js';
import * as In from '../../../assets/interior.js';
import * as Scr from '../../../assets/screens.js';
import * as Cam from '../../../studio/camfx.js';
import * as Fx from '../../../assets/fx.js';
import { mass } from '../../../assets/crowd.js';
import { City } from '../../../assets/city.js';
import { megacity, megatower } from '../../../assets/megacity.js';
import * as Bd from '../../../assets/buildings.js';
import * as St from '../../../assets/street.js';
import * as V from '../../../assets/vehicles.js';
import * as Med from '../../../assets/medical.js';
import * as Mk from '../../../assets/market.js';
import * as Lab from '../../../assets/lab.js';
import { drone } from '../../../assets/drone.js';

let TIMING = {};
export function setTiming(t) { TIMING = t; }
export const frames = shot => Math.round(TIMING[shot].dur * S.FPS);
const sec = s => 1 + Math.round(s * S.FPS);
/** [startFrame, endFrame] of a spoken cue inside this shot. */
const cue = (shot, id) => { const c = TIMING[shot].cues.find(c => c[0] === id); return [sec(c[1]), sec(c[1] + TIMING.cues[id])]; };

function indoors(look = 'ps3', over = {}, amb = 0.18) {
  S.reset(); Lt.apply('night');
  const L = stage.light.L; L.sunI = 0; L.sky = amb; L.hor = lin('#8fa0b8'); L.zen = lin('#b9c6d6');
  Look.enable(look, { fill: 0, rim: 0, ...over });
}

// ============================================================== the city (identical to Part 1)
const CITY_SEED = 11, CT = [25, 75], HOME_ID = '0,0,0';
const LOW = { '0,0,1': 20, '0,0,2': 22, '0,0,3': 16, '0,1,0': 14, '0,1,1': 18, '0,1,2': 10, '0,1,3': 2, '1,0,0': 15, '1,0,2': 17, '1,1,0': 19, '1,1,2': 2, '1,1,1': 12 };
const STREET = { x: [18.7, 31.3], y: [-90, 62] };
const ALERT = Scr.alertDraw({ lines: ['POPULATION', 'LIMIT', 'REACHED'] });

function town(preset, focus, { radius = 90, shadow = 80, lit = 1.8, towers = 120, fog = [140, 1000], keepOut = [] } = {}) {
  S.reset(); Lt.apply(preset); Lt.shadow(focus, shadow); Lt.fog(...fog);
  const city = new City({ seed: CITY_SEED, n: 6 }).build({ focus, detailRadius: radius, heights: LOW, litFraction: 0.5 });
  city.allLights(lit);
  const mega = megacity(city, { n: towers, seed: 4, exclude: [HOME_ID, ...Object.keys(LOW)], keepOut: [[-9, -9, 62], ...keepOut], lit: Math.max(0.2, lit) });
  const central = megatower('central', [CT[0], CT[1] + 1, 0], { w: 20, d: 22, h: 300, seed: 9, setback: false, lit: Math.max(0.2, lit) });
  const news = Scr.screen('news', [CT[0], 64.5, 17], 0, { w: 13, h: 7.3, draw: Scr.staticDraw({ level: 0.3 }), live: true, glow: 0.9 });
  return { city, mega, central, news };
}
const giantScreen = (o = {}) => Scr.screen('giant', [CT[0], 64.3, 172], 0, { w: 19.4, h: 38, px: 640, glow: 1.9, fog: false, bezel: 0.6, depth: 0.5, draw: ALERT, live: true, ...o });
const drabHaze = () => Fx.haze('smog', { n: 16, area: [-260, 300, -200, 320], z: [35, 150], color: '#b9a488', opacity: 0.13, seed: 2 });

function rooftop(n) {
  const T = town('dusk', [-9, -9], { radius: 55, shadow: 30, lit: 1.9, towers: 250, fog: [120, 800] });
  Look.enable('ps3_night', { exposure: 1.2, bloom: 0.5 });
  const lot = T.city.lot(HOME_ID), z0 = lot.top + 0.4, hw = lot.w * 0.96 / 2, hd = lot.d * 0.96 / 2;
  const b = new Buf();
  for (const sy of [-1, 1]) b.box(lot.x, lot.y + sy * (hd - 0.15), z0, hw * 2, 0.3, 1.1, 0);
  for (const sx of [-1, 1]) b.box(lot.x + sx * (hw - 0.15), lot.y, z0, 0.3, hd * 2, 1.1, 0);
  b.box(lot.x, lot.y, z0, hw * 2 - 0.6, hd * 2 - 0.6, 0.04, 1);
  b.box(lot.x - hw + 2.0, lot.y - hd + 2.2, z0, 2.4, 2.6, 2.5, 2); b.box(lot.x - hw + 2.0, lot.y - hd + 3.52, z0, 0.9, 0.05, 2.0, 3);
  for (const [x, y] of [[hw - 1.8, hd - 1.6], [hw - 1.8, hd - 3.6], [-hw + 1.6, hd - 1.6]]) { b.box(lot.x + x, lot.y + y, z0, 1.4, 1.2, 0.9, 3); b.cyl(lot.x + x, lot.y + y, z0 + 0.9, 0.4, 0.08, 4, 8); }
  b.cyl(lot.x + hw - 1.2, lot.y - hd + 1.2, z0, 0.07, 6, 4, 5, 0.03);
  stage.scene.add(b.mesh([mat('parapet', '#8f8a82'), mat('gravel', '#6f6c66'), mat('hut', '#9a958c'), mat('ac', '#b4b9be'), mat('acd', '#4a4d55')], 'Roof'));
  const pos = [lot.x + 0.3, lot.y + 0.4, z0 + 0.04];
  const hero = youth('Youth', { loc: pos, facing: 180 }); hero.poseStand(1); hero.idle(1, n, { amount: 0.8 });
  const screen = giantScreen();
  const red = new THREE.PointLight('#ff2a1a', 12, 30, 1.2); red.position.set(pos[0] + 1.6, pos[1] + 4, pos[2] + 3.6); stage.scene.add(red);
  return { ...T, lot, z0, pos, hero, screen, red };
}

/** Everyone in the streets, standing still and staring up at the screens. */
function silentCrowds({ drab = 0.45, n = 1 } = {}) {
  const o = { pose: 'stand', motion: 'idle', facing: 180, faceJitter: 12, drab, kids: 0.2, shadows: false, minDist: 0.5, speed: 0.4 };
  mass('streetA', { n: 4200 * n, area: { x: [18.7, 31.3], y: [-140, 62] }, seed: 21, ...o });
  mass('streetB', { n: 1500 * n, area: { x: [-140, 18.7], y: [19, 31] }, seed: 22, ...o });
  mass('streetC', { n: 1500 * n, area: { x: [-140, 18.7], y: [-31, -19] }, seed: 23, ...o });
  mass('streetD', { n: 1800 * n, area: { x: [-31.3, -18.7], y: [-140, 100] }, seed: 24, ...o });
  mass('streetE', { n: 1500 * n, area: { x: [31.3, 160], y: [19, 31] }, seed: 25, ...o });
  mass('streetF', { n: 1500 * n, area: { x: [31.3, 160], y: [-31, -19] }, seed: 26, ...o });
}

// ============================================================== SCENE 1 — THE DECISION
function sh01_eyes(n) {
  const { pos, hero, red } = rooftop(n);
  for (let f = 1; f <= n; f += 5) stage.A.key(red, 'intensity', f, 11 + 4 * Math.sin(f / 5), 'LINEAR');
  hero.rot('head', 1, -14, 0, 0); hero.rot('head', n, -24, 0, 0);
  hero.eyes.glint('#ff2a1a', 3.2); hero.eyes.widen(1, 1.5, 1); hero.eyes.gaze(1, 0, 0.2, 1); hero.eyes.gaze(30, 0, 0.75, 20); hero.eyes.blink(56);
  const ez = pos[2] + 1.815, ey = pos[1] + 0.14;
  const { cam, tgt, lens } = S.camera([pos[0] - 0.02, pos[1] + 1.05, ez + 0.24], [pos[0], ey, ez + 0.035], 100);
  S.move(cam, [[1, [pos[0] - 0.02, pos[1] + 1.05, ez + 0.24]], [n, [pos[0] + 0.05, pos[1] + 1.25, ez + 0.3]]]);
  stage.A.key(lens, 'lens', 1, 100); stage.A.key(lens, 'lens', n, 78);
  Cam.handheld(1, n, { amp: 0.35, speed: 1.2 });
}

function sh02_pullback(n) {
  const { pos, hero, screen } = rooftop(n);
  silentCrowds();
  hero.rot('head', 1, -24, 0, 0);
  const c = pos, k = Math.round(n * 0.35);
  const { cam, tgt, lens } = S.camera([c[0] - 0.5, c[1] - 1.5, c[2] + 1.75], [CT[0], 64, 175], 26);
  S.move(cam, [[1, [c[0] - 0.45, c[1] - 1.3, c[2] + 1.75]], [k, [c[0] - 1.2, c[1] - 6, c[2] + 3.5]], [n, [CT[0] + 1, -42, 11]]]);
  S.move(tgt, [[1, [CT[0], 64, 172]], [k, [CT[0] - 2, 64, 150]], [n, [CT[0], 20, 3]]]);
  stage.A.key(lens, 'lens', 1, 26); stage.A.key(lens, 'lens', k, 24); stage.A.key(lens, 'lens', n, 22);
}

// ============================================================== SCENE 2 — THE NEW LAW
const EMBLEM = (c, W, H) => {
  c.fillStyle = '#0f1d3a'; c.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.42, r = H * 0.26;
  c.strokeStyle = '#d9b450'; c.lineWidth = H * 0.018;
  c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
  c.beginPath(); c.ellipse(cx, cy, r * 0.45, r, 0, 0, 7); c.stroke();
  for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(cx - r * Math.sqrt(1 - k * k), cy + k * r); c.lineTo(cx + r * Math.sqrt(1 - k * k), cy + k * r); c.stroke(); }
  for (const sx of [-1, 1]) for (let i = 0; i < 7; i++) {             // laurels
    const a = (200 + i * 20) * Math.PI / 180, x = cx + sx * Math.cos(a) * r * 1.3, y = cy - Math.sin(a) * r * 1.3;
    c.fillStyle = '#d9b450'; c.beginPath(); c.ellipse(x, y, H * 0.045, H * 0.018, sx * (a + 1.2), 0, 7); c.fill();
  }
  c.fillStyle = '#d9b450'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${H * 0.09}px Poppins`; c.fillText('WORLD GOVERNMENT COUNCIL', cx, H * 0.86);
};

/** The broadcast set. Built at `o` (far below the city when it feeds the street screens). */
function studio(o = [0, 0, 0], n = 1, { lights = true } = {}) {
  const [x, y, z] = o, A = (p) => [x + p[0], y + p[1], z + p[2]];
  const b = new Buf();
  b.box(x, y + 3.2, z, 12, 0.3, 5, 0); b.box(x, y, z - 0.1, 12, 9, 0.1, 1); b.box(x, y, z + 5, 12, 9, 0.2, 0);
  for (const sx of [-1, 1]) b.box(x + sx * 6, y, z, 0.3, 9, 5, 0);
  for (const i of [-5, -3, 3, 5]) b.box(x + i, y + 3.0, z, 0.25, 0.2, 5, 2);                   // wall pilasters
  b.box(x, y - 0.2, z, 1.3, 0.7, 1.12, 3); b.box(x, y - 0.2, z + 1.12, 1.4, 0.8, 0.06, 3);    // podium
  b.tube(A([0.18, -0.35, 1.18]), A([0.06, -0.62, 1.42]), 0.012, 4, 5); b.box(x + 0.06, y - 0.62, z + 1.42, 0.035, 0.05, 0.05, 4);
  for (const sx of [-1, 1]) { b.cyl(x + sx * 2.6, y + 2.6, z, 0.035, 3.1, 5, 6); b.box(x + sx * 2.6 + sx * 0.45, y + 2.6, z + 1.7, 0.9, 0.04, 1.4, 6); b.cyl(x + sx * 2.6, y + 2.6, z + 3.1, 0.07, 0.1, 5, 6); }
  stage.scene.add(b.mesh([mat('st_wall', '#1a2238'), mat('st_floor', '#22252b'), mat('st_pil', '#25304d'), mat('st_pod', '#2b3038', { gloss: 0.4 }), mat('st_mic', '#111216'), mat('st_gold', '#c9a33f', { gloss: 0.7 }), mat('st_flag', '#16305e')], 'Studio'));
  Scr.screen('emblem', A([0, 3.02, 3.3]), 0, { w: 3.0, h: 1.9, px: 512, draw: EMBLEM, matte: true, depth: 0.05, bezel: 0.04, frame: '#c9a33f' });
  Scr.screen('podiumSeal', A([0, -0.56, 0.75]), 0, { w: 0.62, h: 0.42, px: 256, draw: EMBLEM, matte: true, depth: 0.02, bezel: 0.02, frame: '#c9a33f' });
  const off = official('Official', { loc: A([0, 0.35, 0]), facing: 0 }); off.poseStand(1); off.idle(1, n, { arms: false, amount: 0.5 });
  for (const [s, sx] of [['L', 1], ['R', -1]]) { off.rot(`shoulder${s}`, 1, -6, 0, -4 * sx); off.rot(`elbow${s}`, 1, -14, 0, 0); }
  const soldiers = [-1.55, 1.55].map((sx, i) => { const p = new Person(`guard${i}`, { outfit: 'soldier', skin: P.SKIN[i + 1], loc: A([sx, 1.6, 0]), facing: 0, height: 1.02 }); p.poseStand(1); p.idle(1, n, { arms: false, amount: 0.25, seed: i }); return p; });
  if (lights) {
    const key = new THREE.SpotLight('#fff1dc', 120, 20, 30 * D, 0.5, 1.4); key.position.set(...A([-2.2, -5, 3.6])); key.target.position.set(...A([0, 0.3, 1.5])); stage.scene.add(key, key.target);
    const fill = new THREE.PointLight('#9fb8ff', 14, 14, 1.4); fill.position.set(...A([3, -4, 2.5])); stage.scene.add(fill);
    const back = new THREE.PointLight('#5f86ff', 22, 10, 1.4); back.position.set(...A([0, 2.6, 4.2])); stage.scene.add(back);
  }
  return { off, soldiers, at: A };
}

function sh03_broadcast(n) {
  indoors('ps3', { exposure: 1.05, bloom: 0.25, vignette: 0.45, saturation: 1.05 }, 0.12);
  const { off, at } = studio([0, 0, 0], n);
  const [a, b] = cue('sh03_broadcast', 'o01');
  off.talk(a, b, { seed: 2 });
  for (const f of [a + 40, a + 110, a + 170]) off.look(f, { yaw: (f % 3 - 1) * 8, pitch: -3, dur: 14 });
  const { cam, tgt, lens } = S.camera(at([0.25, -6.5, 1.62]), at([0, 0.3, 1.5]), 50);
  S.move(cam, [[1, at([0.4, -6.6, 1.62])], [n, at([0.1, -5.6, 1.6])]]);
  S.move(tgt, [[1, at([0, 0.3, 1.45])], [n, at([0, 0.35, 1.58])]]);
  stage.A.key(lens, 'lens', 1, 48); stage.A.key(lens, 'lens', n, 62);
}

function sh04_screens(n) {
  const T = town('dusk', [25, -2], { radius: 80, shadow: 70, lit: 1.6, fog: [60, 600] });
  Look.enable('ps3_night', { exposure: 1.2, bloom: 0.45, saturation: 0.95 });
  const st = studio([0, 0, -600], n);
  st.off.talk(1, n, { seed: 5 });
  const wide = Scr.liveFeed(st.at([0.3, -6.2, 1.6]), st.at([0, 0.3, 1.4]), { w: 640, h: 360, lens: 46 });
  const tall = Scr.liveFeed(st.at([0, -3.1, 1.66]), st.at([0, 0.35, 1.62]), { w: 360, h: 704, lens: 40 });
  T.news.drawFn = null; T.news.mat.map = wide.texture; T.news.glow = 1.5; T.news.mat.needsUpdate = true;
  Scr.screen('giant', [CT[0], 64.3, 172], 0, { w: 19.4, h: 38, glow: 1.6, fog: false, bezel: 0.6, depth: 0.5, texture: tall.texture });
  Scr.screen('sideL', [18.6, 38, 26], -90, { w: 11, h: 6.2, glow: 1.4, texture: wide.texture, depth: 0.3 });
  Scr.screen('sideR', [31.4, 12, 22], 90, { w: 9, h: 5.06, glow: 1.4, texture: wide.texture, depth: 0.3 });
  const o = { pose: 'stand', motion: 'idle', facing: 180, faceJitter: 15, drab: 0.45, kids: 0.2, minDist: 0.52, speed: 0.4 };
  mass('crowd', { n: 2600, area: { x: [18.7, 31.3], y: [-60, 58] }, seed: 31, keepOut: [[25.3, -4.6, 2.6]], ...o });
  mass('crowdW', { n: 700, area: { x: [-45, 18.7], y: [19, 31] }, seed: 32, ...o });
  const hero = youth('Youth', { loc: [25.3, -4.6, 0], facing: 182 }); hero.poseStand(1); hero.idle(1, n); hero.rot('head', 1, -26, 0, 0);
  [[23.6, -3.2, 4], [26.6, -2.6, 9], [24.4, -1.6, 13], [27.2, -4.4, 17], [23.0, -5.0, 22], [25.6, -1.0, 28]].forEach(([x, y, sd], i) => {
    const p = Person.random(`w${i}`, sd, { loc: [x, y, 0], facing: 180 + (i % 3 - 1) * 8 }); p.poseStand(1); p.idle(1, n, { seed: i }); p.rot('head', 1, -20, 0, 0);
  });
  const k = Math.round(n * 0.45);
  const { cam, tgt, lens } = S.camera([25.0, -7.2, 2.3], [25, 40, 14], 30);
  S.move(cam, [[1, [25.1, -7.4, 2.3]], [n, [25.0, -8.4, 3.0]]]);
  S.move(tgt, [[1, [25, 50, 16]], [k, [25, 60, 30]], [n, [25, 64.3, 168]]]);
  stage.A.key(lens, 'lens', 1, 32); stage.A.key(lens, 'lens', k, 30); stage.A.key(lens, 'lens', n, 70);
}

// ============================================================== SCENE 3 — A WORLD WITHOUT TOMORROW
/** Someone lying on their back (head toward +Y), on a surface at height z. */
function lie(p, x, y, z) {
  p.poseStand(1);
  p.j.root.rotation.set(-90 * D, 0, 0); p.j.root.position.set(x, y, z + 0.13);
  for (const [s, sx] of [['L', 1], ['R', -1]]) { p.rot(`shoulder${s}`, 1, 0, 0, -10 * sx); p.rot(`elbow${s}`, 1, -20); }
  p.rot('head', 1, 0, 0, 15);
}

function sh05_apartment(n) {
  indoors('ps3_dusty', { exposure: 1.0, bloom: 0.4, vignette: 0.6, saturation: 0.85 }, 0.14);
  In.hall('flat', [0, 0, 0], { w: 6.2, d: 4.8, h: 3.2, wall: '#a89a84', floor: '#6f5f4c', floor2: '#665746', tile: 0.4, closed: true, lights: [0, 0], trim: '#8a7c66' });
  const bulb = new THREE.PointLight('#ffcf8a', 12, 11, 1.5); bulb.position.set(0, 0.2, 2.85); stage.scene.add(bulb);
  const bb = new Buf(); bb.cyl(0, 0.2, 2.9, 0.05, 0.1, 0, 6); bb.tube([0, 0.2, 3.0], [0, 0.2, 3.2], 0.006, 1, 3);
  stage.scene.add(bb.mesh([mat('bulb', '#fff2d0', { emission: 8 }), mat('cord', '#222')]));
  Scr.screen('win', [0.9, 2.34, 1.7], 0, { w: 1.1, h: 1.1, px: 128, draw: (c, W, H) => { c.fillStyle = '#18233a'; c.fillRect(0, 0, W, H); c.fillStyle = '#ffd58a'; for (let i = 0; i < 30; i++) c.fillRect((i * 37) % W, (i * 53) % H, 6, 8); }, glow: 0.8, depth: 0.05, bezel: 0.05, frame: '#5a4a3a' });
  const S12 = 1.12, LOWER = 0.58, UPPER = 1.59;                      // bunks scaled up to adult size
  const bunk = (nm, loc, hd, bl) => { const o = Lab.bunkBed(nm, loc, hd, bl ? { blanket: bl } : {}); o.scale.setScalar(S12); return o; };
  bunk('bA', [-2.45, 1.15, 0], 0); bunk('bB', [-0.85, 1.15, 0], 0, ['#c96a5a', '#5a7f9a']); bunk('bC', [1.95, 1.75, 0], 90, ['#8cbf5f', '#e0b23c']);
  const mt = new Buf(); for (const [x, y, c] of [[1.1, -1.35, 0], [-0.2, -1.6, 1]]) { mt.box(x, y, 0, 0.85, 1.8, 0.12, 2); mt.box(x, y - 0.3, 0.12, 0.8, 1.0, 0.03, c); }
  stage.scene.add(mt.mesh([mat('mt1', '#7a5fb0'), mat('mt2', '#4f9d8f'), mat('mat', '#e4dfd3')]));
  const cl = new Buf(); cl.tube([-3.1, -2.1, 2.55], [3.1, 2.2, 2.55], 0.006, 0, 3);
  const r = new Rand(3);
  for (let i = 0; i < 9; i++) { const t = 0.08 + i * 0.1, x = -3.1 + 6.2 * t, y = -2.1 + 4.3 * t; cl.rbox(x, y, 2.12, r.uniform(0.25, 0.45), 0.02, r.uniform(0.3, 0.45), 0.6, 1 + (i % 4)); }
  stage.scene.add(cl.mesh([mat('line', '#ddd'), mat('c1', '#c94f4f'), mat('c2', '#3f7fbf'), mat('c3', '#f2c14e'), mat('c4', '#e8e4da')]));
  // sitting on the edges of the lower bunks, feet on the floor
  [[-2.45 + 0.3, 1.0, 90, 41], [-0.85 + 0.3, 0.7, 90, 43], [-0.85 + 0.3, 1.55, 90, 47], [1.95, 1.75 - 0.3, 0, 44]].forEach(([x, y, fc, sd], i) => {
    const p = Person.random(`s${i}`, sd, { loc: [x, y, 0], facing: fc }); p.poseStand(1); p.sit(1, LOWER); p.rot('head', 1, 14 + i * 3, 0, (i - 1.5) * 12); p.idle(1, n, { arms: false, amount: 0.4, seed: i });
  });
  // lying on the upper bunks and the floor mattresses
  lie(Person.random('u1', 42), -2.45, 0.45, UPPER); lie(Person.random('u2', 45), -0.85, 0.45, UPPER); lie(Person.random('f1', 48), 1.1, -2.2, 0.12);
  const kid = Person.random('kid', 51, { loc: [-0.2, -1.4, 0], facing: 30, height: 0.55 }); kid.poseStand(1); kid.sit(1, 0.12 / 0.55);
  const st = Person.random('stand', 52, { loc: [0.5, 0.3, 0], facing: 140 }); st.poseStand(1); st.idle(1, n); st.rot('head', 1, 10, 0, 0);
  const st2 = Person.random('stand2', 53, { loc: [1.9, -0.2, 0], facing: 60, outfit: 'dress' }); st2.poseStand(1); st2.idle(1, n, { seed: 3 }); st2.carry(1);
  const { cam, tgt, lens } = S.camera([2.7, -2.2, 1.8], [-1.0, 1.0, 1.0], 17);
  S.move(cam, [[1, [2.8, -2.15, 1.85]], [n, [2.2, -2.25, 1.75]]], 'LINEAR');
  S.move(tgt, [[1, [-0.8, 1.0, 1.0]], [n, [-1.4, 1.0, 1.05]]], 'LINEAR');
}

function sh06_shelves(n) {
  indoors('ps3_dusty', { exposure: 0.92, bloom: 0.4, saturation: 0.7, vignette: 0.65 }, 0.2);
  const m = In.hall('market', [0, 0, 0], { w: 17, d: 27, h: 3.5, wall: '#a9ada6', floor: '#9c9f98', floor2: '#8b8e87', tile: 1, lights: [2, 4], power: 8, lightColor: '#e6f0ff' });
  for (const [i, x] of [-6.3, -2.3, 2.3, 6.3].entries()) for (let j = 0; j < 6; j++) Mk.shelf(`sh${i}_${j}`, [x, -9.6 + j * 3.75, 0], 90, { w: 3.6, stock: 0, seed: i * 10 + j, accent: i % 2 ? '#2f6fb0' : '#c8402f' });
  Mk.litter('mess', { n: 70, area: [-1.5, 1.5, -12, 11], seed: 8 });
  const r = new Rand(9);
  for (let f = 1; f <= n; f += 3) { const v = r.random() < 0.3 ? r.uniform(0.2, 1.5) : 5; emit(m.strips, v, f, 'CONSTANT'); m.lamps.forEach((L, i) => stage.A.key(L, 'intensity', f, i % 3 === 1 ? 8 * v / 5 : 8, 'CONSTANT')); }
  const { cam, tgt } = S.camera([0.2, -11.5, 0.6], [0, 10, 1.0], 22);
  S.move(cam, [[1, [0.2, -11.6, 0.6]], [n, [0.1, -7.8, 0.75]]], 'LINEAR');
}

function sh07_queue(n) {
  town('afternoon', [25, 20], { radius: 70, shadow: 60, lit: 0.4, fog: [40, 420] });
  Look.enable('ps3_dusty', { saturation: 0.62, exposure: 1.05 });
  drabHaze();
  const truck = V.vehicle('truck', [27.6, 42, 0], 180, { color: '#5a6b44', name: 'ration' });
  const tb = new Buf(); tb.box(25.6, 39.2, 0, 2.6, 0.9, 0.85, 0); for (let i = 0; i < 6; i++) tb.box(24.7 + i * 0.36, 39.2, 0.85, 0.3, 0.3, 0.22, 1);
  stage.scene.add(tb.mesh([mat('tableK', '#7a6a50'), mat('boxK', '#c9a25a')]));
  for (const [x, sd] of [[24.8, 1], [26.4, 2]]) { const p = new Person(`sold${x}`, { outfit: 'soldier', skin: P.SKIN[sd], loc: [x, 40.2, 0], facing: 0 }); p.poseStand(1); p.idle(1, n, { arms: false }); p.carry(1); }
  const g = new Person('guardQ', { outfit: 'soldier', loc: [23.3, 37.5, 0], facing: -40 }); g.poseStand(1); g.idle(1, n);
  const q = [];
  for (let i = 0; i < 26; i++) { const y = 37.8 - i * 0.78, x = 25.5 + Math.sin(i * 0.9) * 0.18; const p = Person.random(`q${i}`, 100 + i, { loc: [x, y, 0], facing: 180 + (i % 3 - 1) * 6 }); p.poseStand(1); p.idle(1, n, { seed: i, amount: 0.7 }); q.push(p); }
  mass('queue', { n: 900, area: { x: [24.9, 26.1], y: [-160, 17.3] }, seed: 41, pose: 'stand', motion: 'idle', facing: 180, faceJitter: 8, drab: 0.5, minDist: 0.55, shadows: false, speed: 0.4 });
  mass('watch', { n: 500, area: { x: [19, 23], y: [-100, 30] }, seed: 42, pose: 'stand', motion: 'idle', facing: 90, faceJitter: 50, drab: 0.55, shadows: false });
  const { cam, tgt, lens } = S.camera([22.6, 39.5, 1.7], [25.6, 10, 1.3], 30);
  S.move(cam, [[1, [22.4, 39.8, 1.75]], [n, [23.0, 38.6, 2.1]]]);
  S.move(tgt, [[1, [25.6, 12, 1.2]], [n, [25.6, 8, 1.1]]]);
}

const sign = (name, loc, heading, lines, w = 2.4, h = 1.2, o = {}) => Scr.screen(name, loc, heading, { w, h, px: 512, draw: Scr.signDraw({ lines, ...o }), matte: true, depth: 0.04, bezel: 0.03, frame: o.frame || '#d9d2c4' });

function sh08_jobs(n) {
  town('afternoon', [25, -60], { radius: 60, shadow: 50, lit: 0.4, fog: [40, 380] });
  Look.enable('ps3_dusty', { saturation: 0.6, exposure: 1.0 });
  Lab.fenceGate('gate', [25, -60, 0], 180, { w: 12.6, h: 2.6, gate: 4 });
  sign('hiring', [25, -59.86, 2.25], 180, ['NOW HIRING', '2 WORKERS'], 2.2, 1.1, { accent: '#c8402f' });
  const guard = new Person('guard', { outfit: 'police', loc: [26.2, -58.6, 0], facing: 180 }); guard.poseStand(1); guard.idle(1, n);
  const r = new Rand(4);
  for (let i = 0; i < 14; i++) {
    const x = 22.2 + (i % 7) * 0.85 + r.uniform(-0.15, 0.15), y = -60.55 - Math.floor(i / 7) * 0.75 - r.uniform(0, 0.2);
    const p = Person.random(`job${i}`, 200 + i, { loc: [x, y, 0], facing: r.uniform(-15, 15), outfit: r.random() < 0.6 ? 'worker' : undefined }); p.poseStand(1);
    if (i < 7) p.shove(1 + i * 2, n, { seed: i, lean: 10, period: 7 + (i % 3) }); else if (i % 3 === 0) p.shout(5 + i * 3); else p.idle(1, n, { seed: i });
  }
  mass('jobsMass', { n: 900, area: { x: [18.7, 31.3], y: [-110, -62.4] }, seed: 51, pose: 'mixed', motion: 'push', facing: 0, faceJitter: 15, drab: 0.5, minDist: 0.5 });
  const { cam, tgt } = S.camera([26.6, -55.4, 1.5], [24.6, -63, 1.4], 22);
  S.move(cam, [[1, [26.8, -55.2, 1.5]], [n, [25.9, -56.6, 1.45]]]);
  Cam.handheld(1, n, { amp: 1.3, speed: 1.2 });
}

// ============================================================== SCENE 4 — THE PROTEST
/** Someone holding a placard up over their head. */
function placard(p, lines, { w = 1.7, h = 0.85, color = '#f4efe2', bob = 0 } = {}) {
  for (const [s, sx] of [['L', 1], ['R', -1]]) { p.rot(`shoulder${s}`, 1, -165, 0, 6 * sx); p.rot(`elbow${s}`, 1, -18, 0, 0); }
  const root = p.j.root, yaw = root.rotation.z;
  const g = group([root.position.x - Math.sin(yaw) * -0.12, root.position.y + Math.cos(yaw) * -0.12 * -1, 0], null, `${p.name}_placard`);
  g.rotation.z = yaw;
  const hz = 2.15 * (p.opts?.height ?? root.scale.z);
  const pb = new Buf(); pb.box(0, 0.02, hz - 0.35, 0.04, 0.04, 0.55, 0); g.add(pb.mesh([mat('pole', '#8a6a48')]));
  const sc = Scr.screen(`${p.name}_sign`, [0, 0, 0], 0, { w, h, px: 512, draw: Scr.signDraw({ lines, bg: color }), matte: true, depth: 0.03, bezel: 0.02, frame: '#c9b08a' });
  g.add(sc); sc.position.set(0, -0.01, hz + h / 2 + 0.1);
  if (bob) for (let f = 1; f < 400; f += 12) stage.A.key(g, 'position', f, [g.position.x, g.position.y, (f / 12) % 2 ? 0.06 : -0.02]);
  return g;
}

function protestSet(n, { night = true } = {}) {
  const T = town('dusk', [25, -10], { radius: 70, shadow: 60, lit: 1.8, fog: [50, 480] });
  Look.enable('ps3_night', { exposure: 1.2, saturation: 1.0, bloom: 0.45 });
  drabHaze();
  return T;
}

function sh09_protest(n) {
  protestSet(n);
  const [a, b] = cue('sh09_protest', 'p01');
  const woman = new Person('Protester', { outfit: 'casual', hair: 'long', hairColor: '#2a1f1a', skin: P.SKIN[2], shirt: '#2f6fb0', pants: '#2b2d33', loc: [25.3, -10, 0], facing: 180, height: 0.95 });
  woman.poseStand(1); woman.idle(1, n, { arms: false });
  placard(woman, ['OUR FUTURE', 'IS NOT YOURS', 'TO CONTROL'], { w: 1.5, h: 0.95 });
  woman.rot('head', a - 4, 0, 0, 0); woman.rot('head', a + 3, -12, 0, 0); woman.rot('head', b - 10, -12, 0, 0); woman.rot('head', b + 4, 0, 0, 0);
  stage.A.key(woman.j.spine, 'rotation', a - 2); woman.rot('spine', a + 4, -8, 0, 0); woman.rot('spine', b, -8, 0, 0); woman.rot('spine', b + 6, 0, 0, 0);
  const hero = youth('Youth', { loc: [24.3, -10.4, 0], facing: 172 }); hero.poseStand(1); hero.idle(1, n); hero.look(a + 6, { yaw: -40, pitch: 0, dur: 10 }); hero.look(b + 10, { yaw: 0, pitch: -8, dur: 14 });
  const signs = [['LET US', 'LIVE'], ['OUR CHILDREN', 'OUR CHOICE'], ['NO MORE', 'LIES']];
  [[23.2, -11.8, 61], [27.0, -11.2, 62], [26.2, -13.6, 63], [22.4, -13.9, 64], [27.8, -14.6, 65], [24.6, -12.6, 66], [21.6, -10.8, 67], [28.6, -9.9, 68]].forEach(([x, y, sd], i) => {
    const p = Person.random(`pr${i}`, sd, { loc: [x, y, 0], facing: 180 + (i % 3 - 1) * 10 }); p.poseStand(1);
    if (i < 3) placard(p, signs[i], { w: 1.2, h: 0.7, color: ['#f2c14e', '#f4efe2', '#e8e4da'][i] }); else if (i % 2) p.cheer(1 + i * 3, n); else { p.idle(1, n, { seed: i }); p.shout(10 + i * 4); }
  });
  mass('protest', { n: 2500, area: { x: [18.7, 31.3], y: [-80, -8.5] }, seed: 61, pose: 'mixed', motion: 'cheer', facing: 180, faceJitter: 25, drab: 0.35, kids: 0.05, minDist: 0.5, keepOut: [[25, -11.5, 3.6]] });
  const ds = [drone('d1', [21, 6, 14], 180, { size: 1.6 }), drone('d2', [28.5, 4, 17], 180, { size: 1.6 }), drone('d3', [25, 12, 20], 180, { size: 1.6 })];
  ds[0].fly([[21, 6, 14], [22.5, -20, 10]], 1, n); ds[1].fly([[28.5, 4, 17], [27.6, -24, 11.5]], 1, n); ds[2].fly([[25, 12, 20], [25, -12, 13]], 1, n);
  const { cam, tgt, lens } = S.camera([25.4, -3.6, 1.7], [24.8, -11, 2.0], 30);
  S.move(cam, [[1, [25.5, -3.4, 1.7]], [n, [25.2, -5.4, 1.75]]]);
  S.move(tgt, [[1, [24.9, -11, 2.0]], [n, [24.9, -11, 2.3]]]);
  stage.A.key(lens, 'lens', 1, 30); stage.A.key(lens, 'lens', n, 34);
  Cam.handheld(1, n, { amp: 0.8 });
}

function riot(name, loc, sd, n, path) {
  const p = new Person(name, { outfit: 'police', hat: 'helmet', hatColor: '#15181e', shirt: '#151a24', pants: '#10141c', skin: P.SKIN[sd % 4], loc, facing: 180, height: 1.02 });
  const sb = new Buf(); sb.box(0, -0.34, -0.5, 0.62, 0.05, 1.05, 0); sb.box(0, -0.37, 0.25, 0.48, 0.01, 0.1, 1);
  const sh = sb.mesh([mat('shield', '#3a4a5e', { opacity: 0.85, gloss: 0.8 }), mat('shieldTxt', '#e8f0ff', { emission: 0.6 })]); p.j.spine.add(sh);
  p.poseStand(1); p.walk(path, 1, n, { stride: 0.55, armSwing: 4 });
  p.rot('shoulderL', 1, -40, 0, 10); p.rot('elbowL', 1, -70, 0, 0);
  return p;
}

function sh10_police(n) {
  protestSet(n);
  const woman = new Person('Protester', { outfit: 'casual', hair: 'long', hairColor: '#2a1f1a', skin: P.SKIN[2], shirt: '#2f6fb0', pants: '#2b2d33', loc: [25.3, -10, 0], facing: 180, height: 0.95 });
  woman.poseStand(1); woman.idle(1, n, { arms: false }); placard(woman, ['OUR FUTURE', 'IS NOT YOURS', 'TO CONTROL'], { w: 1.5, h: 0.95 });
  const hero = youth('Youth', { loc: [24.3, -10.4, 0], facing: 180 }); hero.poseStand(1); hero.idle(1, n);
  [[23.2, -11.8, 61], [27.0, -11.2, 62], [22.4, -13.9, 64], [27.8, -14.6, 65], [21.6, -10.8, 67], [28.6, -9.9, 68], [26.2, -12.4, 69]].forEach(([x, y, sd], i) => { const p = Person.random(`pr${i}`, sd, { loc: [x, y, 0], facing: 180 + (i % 3 - 1) * 10 }); p.poseStand(1); if (i % 2) p.cheer(1 + i * 3, n); else { p.idle(1, n, { seed: i }); p.shout(20 + i * 9); } });
  mass('protest', { n: 2400, area: { x: [18.7, 31.3], y: [-80, -8.5] }, seed: 61, pose: 'mixed', motion: 'cheer', facing: 180, faceJitter: 25, drab: 0.35, kids: 0.05, minDist: 0.5, keepOut: [[25, -11.5, 3.6]] });
  for (let i = 0; i < 11; i++) { const x = 19.6 + i * 1.08; riot(`riot${i}`, [x, 9, 0], i, n, [[x, 9], [x, 2.2]]); }
  for (let i = 0; i < 10; i++) { const x = 20.1 + i * 1.08; riot(`riotB${i}`, [x, 10.4, 0], i + 3, n, [[x, 10.4], [x, 3.6]]); }
  V.vehicle('police', [21.4, 16, 0], 100, { lightsOn: true, name: 'polA' }); const pv = V.vehicle('van', [28.8, 17, 0], 80, { color: '#1f2f4f', name: 'polB' });
  const strobe = [['#ff2a2a', 0], ['#2a5aff', 1]].map(([c, k]) => { const L = new THREE.PointLight(c, 0, 30, 1.4); L.position.set(22 + k * 6, 15, 2.5); stage.scene.add(L); return L; });
  stage.A.hooks.push(f => strobe.forEach((L, k) => { L.intensity = (Math.floor(f / 6) + k) % 2 ? 70 : 3; }));
  const ds = [drone('d1', [22.5, -20, 10], 0, { size: 1.6, pitch: -60 }), drone('d2', [27.6, -24, 11.5], 20, { size: 1.6, pitch: -60 }), drone('d3', [25, -12, 13], 0, { size: 1.6, pitch: -70 }), drone('d4', [20, 0, 15], -20, { size: 1.6 })];
  ds[0].fly([[22.5, -20, 10], [21.5, -9, 9]], 1, n); ds[1].fly([[27.6, -24, 11.5], [28, -14, 10]], 1, n); ds[2].fly([[25, -12, 13], [25, -6, 11]], 1, n); ds[3].fly([[20, 0, 15], [23, 2, 12]], 1, n);
  const { cam, tgt, lens } = S.camera([23.4, -14.6, 1.75], [25, 6, 2.6], 22);
  S.move(cam, [[1, [23.3, -14.8, 1.7]], [n, [23.9, -13.2, 1.9]]]);
  S.move(tgt, [[1, [25, 6, 2.4]], [n, [25, 4, 4.4]]]);
  stage.A.key(lens, 'lens', 1, 22); stage.A.key(lens, 'lens', n, 26);
  Cam.handheld(1, n, { amp: 1.0 });
}

// ============================================================== SCENE 5-7 — THE LAB
// portrait monitors (they fill a 9:16 close-up)
const RESEARCH = Scr.terminalDraw({ header: 'CLASSIFIED RESEARCH', cps: 45, lines: [
  { t: 'FILE 7-B // EYES ONLY', at: 4, color: '#8a98a8', size: 0.035, gap: 2.4 },
  { t: 'CELLULAR AGING:', at: 16, color: '#4dff88', size: 0.05, gap: 1.3 },
  { t: 'PERMANENTLY', at: 28, color: '#4dff88', size: 0.06, gap: 1.25 },
  { t: 'HALTED', at: 36, color: '#4dff88', size: 0.06, gap: 2.6 },
  { t: 'CELL DAMAGE:', at: 58, color: '#ff4d4d', size: 0.06, gap: 1.3 },
  { t: 'CONTINUES', at: 68, color: '#ff4d4d', size: 0.075, blink: true }] });
const RESET = Scr.terminalDraw({ header: 'RESTRICTED // LEVEL 5', headerColor: '#7a0a0a', cps: 55, lines: [
  { t: '> open RESET.dat', at: 4, color: '#8a98a8', size: 0.035, gap: 2.4 },
  { t: 'PROJECT', at: 16, color: '#ffffff', size: 0.08, center: true, gap: 1.15 },
  { t: 'RESET', at: 22, color: '#ffffff', size: 0.1, center: true, gap: 1.9 },
  { t: 'PHASE 02:', at: 36, color: '#ff3b30', size: 0.055, center: true, gap: 1.25 },
  { t: 'ACTIVATED', at: 42, color: '#ff3b30', size: 0.06, center: true, blink: true, gap: 2.0 },
  { t: 'POPULATION CONTROL', at: 58, color: '#ffd24a', size: 0.042, center: true, gap: 1.3 },
  { t: 'PROTOCOL', at: 68, color: '#ffd24a', size: 0.042, center: true, gap: 2.2 },
  { t: 'AUTHORIZED BY', at: 82, color: '#cfd6dd', size: 0.035, center: true, gap: 1.3 },
  { t: 'WORLD GOVERNMENT', at: 88, color: '#cfd6dd', size: 0.04, center: true }] });
/** World position after frame 1 is posed. */
const wp = obj => { stage.A.update(1); stage.scene.updateMatrixWorld(true); return obj.getWorldPosition(new THREE.Vector3()); };

function lab(n, { main = RESEARCH, sitting = true, red = false } = {}) {
  indoors('ps3_cold', { exposure: 1.15, bloom: 0.45, vignette: 0.55, saturation: 0.9 }, 0.16);
  const fw = new Buf(); fw.box(-1.7, -5.1, 0, 8.6, 0.2, 3.2, 0); fw.box(5.0, -5.1, 0, 2.0, 0.2, 3.2, 0); fw.box(3.2, -5.1, 2.4, 1.7, 0.2, 0.8, 0);   // front wall with the doorway
  stage.scene.add(fw.mesh([mat('labFront', '#59636b')]));
  const room = In.hall('lab', [0, 0, 0], { w: 12, d: 10, h: 3.2, wall: '#59636b', floor: '#3e464d', floor2: '#373e44', tile: 1, closed: false, lights: [2, 2], power: 5, lightColor: '#cfe4ff', dado: '#4a535a', trim: '#6f7a83' });
  emit(room.strips, 2.5);
  const desk = Lab.labDesk('desk', [0, 1.4, 0], 0, { w: 2.4, monitors: [Scr.dataDraw({ seed: 2 }), main, Scr.dataDraw({ hue: '#ffd24a', seed: 5 })], portrait: 1 });
  In.chair('chair', [0, 0.72, 0], 180, { color: '#2a2d33' });
  Lab.files('files', [-0.95, 1.25, 0.78]);
  for (let i = 0; i < 5; i++) Lab.serverRack(`rack${i}`, [-5.4, 3.6 - i * 1.05, 0], -90, { seed: i });
  const bench = new Buf(); bench.box(3.6, 3.9, 0, 3.6, 0.8, 0.9, 0); bench.box(3.6, 3.9, 0.9, 3.7, 0.85, 0.05, 1); stage.scene.add(bench.mesh([mat('benchB', '#d9dde0'), mat('benchT', '#2a2d33')]));
  Lab.sampleRack('samples', [2.6, 3.8, 0.95], 0); Lab.sampleRack('samples2', [3.3, 3.85, 0.95], 0, { seed: 3 }); Lab.microscope('scope', [4.4, 3.8, 0.95], 0);
  const door = Lab.slidingDoor('door', [3.2, -4.86, 0], 0, { w: 1.4, h: 2.3 });
  const glow = new THREE.PointLight(red ? '#ff3b30' : '#7fd4ff', red ? 1.3 : 2.0, 4, 1.5); glow.position.set(0, 0.95, 1.35); stage.scene.add(glow);
  const sci = scientist('Scientist', { loc: [0, sitting ? 0.62 : 0.55, 0], facing: 180 });
  sci.poseStand(1); if (sitting) sci.sit(1, 0.47); sci.idle(1, n, { arms: false, amount: 0.5 });
  if (sitting) for (const [s, sx] of [['L', 1], ['R', -1]]) { sci.rot(`shoulder${s}`, 1, -48, 0, -10 * sx); sci.rot(`elbow${s}`, 1, -60, 0, -8 * sx); }
  return { room, desk, sci, door, glow, main: desk.screens[1] };
}

function sh11_lab(n) {
  const { sci } = lab(n);
  sci.rot('head', 1, 8, 0, -6); sci.look(60, { yaw: 4, pitch: 12, dur: 30 }); sci.look(120, { yaw: 0, pitch: 4, dur: 20 });
  const { cam, tgt, lens } = S.camera([-3.4, -3.9, 2.4], [0, 1.1, 1.15], 24);
  S.move(cam, [[1, [-3.6, -4.1, 2.45]], [n, [-1.7, -1.9, 1.95]]]);
  S.move(tgt, [[1, [0, 1.1, 1.1]], [n, [0, 1.3, 1.2]]]);
}

function sh12_monitor(n) {
  const { main, sci } = lab(n);
  sci.j.root.visible = false;                                   // he sits between us and the screen
  const p = wp(main);
  const { cam, tgt, lens } = S.camera([p.x + 0.12, p.y - 1.3, p.z + 0.03], [p.x, p.y, p.z], 38);
  S.move(cam, [[1, [p.x + 0.14, p.y - 1.36, p.z + 0.04]], [n, [p.x + 0.03, p.y - 1.08, p.z + 0.01]]]);
  Cam.handheld(1, n, { amp: 0.15 });
}

function faceShot(n, { red = false, lens0 = 60, lens1 = 82 } = {}) {
  const L = lab(n, { main: red ? RESET : RESEARCH, red });
  const s = L.sci;
  s.eyes.glint(red ? '#ff3b30' : '#7fd4ff', 2.2); s.eyes.gaze(1, 0, 0.1, 1);
  const h = wp(s.j.head);
  const hp = new THREE.Vector3(h.x, h.y + 0.13, h.z + 0.19);     // between the eyes (he faces +Y)
  return { ...L, hp };
}

function sh13_scientist(n) {
  const { sci, hp } = faceShot(n);
  const [a, b] = cue('sh13_scientist', 's01');
  sci.rot('head', 1, 6, 0, 0); sci.rot('head', 14, 2, 0, 0);
  sci.eyes.widen(10, 1.45, 8); sci.eyes.blink(a - 4);
  sci.rot('spine', 8, 8, 0, 0); sci.rot('spine', 16, 2, 0, 0);
  for (let f = a + 6, k = 0; f < b; f += 16, k++) sci.rot('head', f, 2 + (k % 2) * 2, 0, k % 2 ? 4 : -4);
  sci.rot('head', b + 10, -2, 0, 0);
  const { cam, tgt, lens } = S.camera([hp.x + 0.3, hp.y + 1.05, hp.z + 0.04], [hp.x, hp.y, hp.z - 0.06], 40);
  S.move(cam, [[1, [hp.x + 0.34, hp.y + 1.1, hp.z + 0.04]], [n, [hp.x + 0.14, hp.y + 0.92, hp.z + 0.03]]]);
  stage.A.key(lens, 'lens', 1, 40); stage.A.key(lens, 'lens', n, 54);
}

// ============================================================== SCENE 6 — THE FIRST WARNING
function ward(n, { flatAt = null } = {}) {
  indoors('ps3_cold', { exposure: 0.95, bloom: 0.3, vignette: 0.55 }, 0.25);
  In.hall('ward', [0, 0, 0], { w: 7, d: 6, h: 3.0, wall: '#dfe9ea', floor: '#c4d0d3', floor2: '#b3c1c5', dado: '#9fc9c6', lights: [1, 2], power: 5, closed: false });
  Med.hospitalBed('bed', [0, 1.4, 0], 0, { made: true });
  Med.ivStand('iv', [-0.9, 2.1, 0]);
  const mon = Med.monitor('mon', [1.0, 2.0, 0], -25, { draw: Med.ecg({ bpm: 95, panicAt: 1, flatAt }) });
  Med.cabinet('cab', [-2.6, 2.6, 0], 0);
  const pat = Person.random('patient', 77, { loc: [0, 0, 0], outfit: 'casual', shirt: '#9fc4d6' });
  pat.poseStand(1);
  pat.j.root.rotation.set(-90 * D, 0, 0); pat.j.root.position.set(0, 0.42, 0.84);   // lying on the bed, head to +Y, face up
  for (const [s, sx] of [['L', 1], ['R', -1]]) { pat.rot(`shoulder${s}`, 1, 0, 0, -8 * sx); pat.rot(`elbow${s}`, 1, -10); }
  return { pat, mon };
}

function sh14_patient(n) {
  const flat = sec(4.2);
  const { pat, mon } = ward(n, { flatAt: flat });
  // seizure / pain, then still
  for (let f = 1; f < flat; f += 3) { pat.rot('spine', f, (f % 2 ? 6 : -4), 0, (f % 4 ? 3 : -3), 'LINEAR'); pat.rot('head', f, f % 6 ? 10 : -6, 0, f % 4 ? 12 : -10, 'LINEAR'); }
  pat.rot('shoulderR', 1, 0, 0, 8); pat.rot('shoulderR', 20, -40, 0, 30); pat.rot('elbowR', 20, -110); pat.rot('shoulderR', flat - 6, -40, 0, 30); pat.rot('shoulderR', flat + 4, 0, 0, 8); pat.rot('elbowR', flat + 4, -10);
  pat.rot('spine', flat + 2, 0, 0, 0); pat.rot('head', flat + 2, 0, 0, 18);
  const dA = new Person('docA', { outfit: 'doctor', hair: 'short', hairColor: '#2a1f1a', skin: P.SKIN[1], loc: [-1.5, -3.2, 0] });
  dA.run([[-1.5, -3.2], [-0.62, 1.2]], 8, 50, { stride: 1.2 });
  const dB = new Person('docB', { outfit: 'doctor', hair: 'bun', hairColor: '#4a3324', skin: P.SKIN[3], loc: [1.8, -3.0, 0], height: 0.95 });
  dB.run([[1.8, -3.0], [0.75, 1.0]], 18, 58, { stride: 1.1 });
  // CPR: arms locked, pressing down
  dA.poseStand(52); dB.poseStand(60);
  stage.A.key(dA.j.root, 'rotation', 50); stage.A.key(dA.j.root, 'rotation', 56, [0, 0, 90 * D]);
  stage.A.key(dB.j.root, 'rotation', 58); stage.A.key(dB.j.root, 'rotation', 64, [0, 0, -90 * D]);
  const cpr = 60;
  for (const [s, sx] of [['L', 1], ['R', -1]]) { dA.rot(`shoulder${s}`, cpr, -70, 0, -12 * sx); dA.rot(`elbow${s}`, cpr, -6); }
  for (let f = cpr, k = 0; f <= n; f += 6, k++) { dA.rot('spine', f, k % 2 ? 26 : 16, 0, 0, 'LINEAR'); }
  dB.look(62, { yaw: -60, pitch: 10, dur: 8 }); dB.point(70, { side: 'L', yaw: -40 });
  const { cam, tgt, lens } = S.camera([0.5, -1.9, 2.5], [0, 1.2, 0.75], 24);
  S.move(cam, [[1, [0.55, -2.0, 2.55]], [n, [0.3, -1.3, 2.3]]]);
  Cam.handheld(1, n, { amp: 1.1, speed: 1.3 });
}

function sh15_window(n) {
  const { pat } = ward(n, { flatAt: 1 });
  pat.rot('head', 1, 0, 0, 18);
  Lab.glassWall('obs', [0, -3.2, 0], 0, { w: 7, h: 3, win: [3.6, 1.5], sill: 0.9, color: '#c9d3d6' });
  const fl = new Buf(); fl.box(0, -5.6, -0.1, 7, 5, 0.1, 0); stage.scene.add(fl.mesh([mat('obsFloor', '#2f3439')]));
  const dark = new THREE.PointLight('#9fc0dd', 7, 6, 1.5); dark.position.set(1.8, -4.6, 2.4); stage.scene.add(dark);
  const sci = scientist('Scientist', { loc: [0.6, -3.75, 0], facing: 180 }); sci.poseStand(1); sci.idle(1, n, { arms: false, amount: 0.4 });
  sci.rot('head', 1, 6, 0, 0);
  const [a, b] = cue('sh15_window', 'd01');
  const dA = new Person('docA', { outfit: 'doctor', hair: 'short', hairColor: '#2a1f1a', skin: P.SKIN[1], loc: [-0.65, 1.2, 0], facing: 90 });
  dA.poseStand(1); dA.idle(1, n, { arms: false }); dA.rot('spine', 1, 12, 0, 0); dA.rot('spine', a - 8, 12, 0, 0); dA.rot('spine', a + 6, 0, 0, 0);
  stage.A.key(dA.j.root, 'rotation', a - 6); stage.A.key(dA.j.root, 'rotation', a + 10, [0, 0, 160 * D]);
  dA.talk(a + 4, b, { seed: 1 });
  const dB = new Person('docB', { outfit: 'doctor', hair: 'bun', hairColor: '#4a3324', skin: P.SKIN[3], loc: [0.9, 1.1, 0], facing: 120, height: 0.95 }); dB.poseStand(1); dB.idle(1, n);
  dB.rot('head', 1, 18, 0, 0);
  const { cam, tgt, lens } = S.camera([1.6, -5.9, 1.8], [-0.2, 1.2, 1.2], 30);
  S.move(cam, [[1, [1.7, -6.1, 1.82]], [n, [1.3, -5.3, 1.76]]]);
  S.move(tgt, [[1, [-0.2, 1.2, 1.2]], [n, [-0.1, 0.6, 1.4]]]);
  stage.A.key(lens, 'lens', 1, 30); stage.A.key(lens, 'lens', n, 36);
}

// ============================================================== SCENE 7 — PROJECT RESET
function sh16_file(n) {
  const { main, sci } = lab(n, { main: RESET, red: true });
  sci.j.root.visible = false;
  const p = wp(main);
  const { cam } = S.camera([p.x - 0.1, p.y - 1.3, p.z + 0.03], [p.x, p.y, p.z], 38);
  S.move(cam, [[1, [p.x - 0.12, p.y - 1.36, p.z + 0.04]], [n, [p.x, p.y - 1.08, p.z + 0.01]]]);
  Cam.handheld(1, n, { amp: 0.15 });
}

function sh17_whisper(n) {
  const { sci, hp } = faceShot(n, { red: true });
  const [a, b] = cue('sh17_whisper', 's02');
  sci.eyes.widen(4, 1.5, 10); sci.rot('head', 1, 6, 0, 0);
  for (let f = a, k = 0; f < b; f += 12, k++) sci.rot('head', f, 4, 0, k % 2 ? 5 : -5);
  sci.rot('head', b + 6, 2, 0, 0);
  const { cam, tgt, lens } = S.camera([hp.x - 0.25, hp.y + 1.0, hp.z + 0.03], [hp.x, hp.y, hp.z - 0.04], 46);
  S.move(cam, [[1, [hp.x - 0.28, hp.y + 1.04, hp.z + 0.03]], [n, [hp.x - 0.1, hp.y + 0.9, hp.z + 0.02]]]);
  stage.A.key(lens, 'lens', 1, 46); stage.A.key(lens, 'lens', n, 60);
  Cam.handheld(1, n, { amp: 0.4 });
}

function sh18_door(n) {
  const { sci, door, room, glow } = lab(n, { main: RESET, sitting: false, red: true });
  sci.j.root.position.set(1.4, -0.6, 0); sci.j.root.rotation.z = 22 * D;
  const unlock = sec(0.7), o0 = sec(1.4), o1 = sec(2.4);
  door.unlock(unlock); door.open(o0, o1);
  sci.look(unlock + 2, { yaw: -20, pitch: 4, dur: 6 });
  sci.walk([[1.4, -0.6], [0.95, 0.55]], sec(2.6), n, { stride: 0.3, facePath: false, armSwing: 6 });
  stage.A.key(sci.j.root, 'rotation', 1, [0, 0, 22 * D]); stage.A.key(sci.j.root, 'rotation', n, [0, 0, 22 * D]);
  sci.rot('shoulderR', sec(2.6), -30, 0, 20); sci.rot('elbowR', sec(2.6), -60);
  // corridor glare behind the door + the figure
  const cor = new Buf(); cor.box(3.2, -6.6, -0.05, 2.6, 3.0, 0.05, 0); cor.box(3.2, -8.0, 0, 2.6, 0.2, 3, 1); cor.box(1.9, -6.6, 0, 0.1, 3, 3, 0); cor.box(4.5, -6.6, 0, 0.1, 3, 3, 0); stage.scene.add(cor.mesh([mat('corF', '#9aa4ad'), mat('corW', '#ffffff', { emission: 6, emit: '#dfeeff' })]));
  const back = new THREE.PointLight('#e8f4ff', 0, 12, 1.2); back.position.set(3.2, -6.8, 2.2); stage.scene.add(back);
  stage.A.key(back, 'intensity', o0, 0); stage.A.key(back, 'intensity', o1, 60);
  const fig = new Person('Figure', { outfit: 'suit', hair: 'short', loc: [3.2, -5.7, 0], facing: 180, height: 1.04 });
  fig.poseStand(1);
  const black = mat('silhouette', '#030304');
  fig.j.root.traverse(m => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(() => black) : black; });
  // lab lights falter as the door opens
  for (let f = 1; f <= n; f++) if (f > unlock) emit(room.strips, f % 7 === 0 ? 0.4 : 1.6, f, 'CONSTANT');
  const { cam, tgt, lens } = S.camera([-1.5, 2.7, 1.7], [3.1, -5, 1.25], 24);
  S.move(cam, [[1, [-1.6, 2.8, 1.72]], [n, [-0.9, 1.7, 1.6]]]);
  S.move(tgt, [[1, [3.0, -5, 1.25]], [n, [2.6, -4.2, 1.35]]]);
}

export const SHOTS = { sh01_eyes, sh02_pullback, sh03_broadcast, sh04_screens, sh05_apartment, sh06_shelves, sh07_queue, sh08_jobs, sh09_protest, sh10_police,
  sh11_lab, sh12_monitor, sh13_scientist, sh14_patient, sh15_window, sh16_file, sh17_whisper, sh18_door };
