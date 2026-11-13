// WHAT IF HUMANS NEVER AGED AGAIN? — all shots (three.js).
//   node tools/render.mjs what-if/never-aged s02_mirror --still 120
//   node tools/render.mjs what-if/never-aged all
import { THREE, stage, D, mat, emit, box, Buf, group, Rand, lin } from '../../../studio/core.js';
import * as S from '../../../studio/stage.js';
import * as Lt from '../../../studio/lighting.js';
import * as Look from '../../../studio/look.js';
import * as P from '../../../assets/palette.js';
import { Person, crowd } from '../../../assets/characters/person.js';
import { elder, youth } from '../../../assets/characters/cast.js';
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
import * as sky from '../../../assets/sky.js';
import * as props from '../../../assets/props.js';
import * as Med from '../../../assets/medical.js';
import * as Mk from '../../../assets/market.js';

const LEAD = 0.25;
let TIMING = {};
export function setTiming(t) { TIMING = t; }
const EXTRA = { s00_cast: 3, s00_heads: 3, s00_pose: 3 };
export const frames = shot => Math.round((TIMING[shot]?.dur ?? EXTRA[shot]) * S.FPS);
const at = sec => 1 + Math.round((sec + LEAD) * S.FPS);

function floor(color = '#8f9499', size = 400, z = 0) {
  const b = new Buf(); b.box(0, 0, z - 1, size, size, 1, 0);
  const g = b.mesh([mat('floor', color)], 'Floor'); g.castShadow = false; stage.scene.add(g); return g;
}

// character sheet (not part of the film)
function s00_cast(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 5); Lt.fog(40, 400);
  Look.enable('ps3');
  floor('#7f858c');
  const a = elder('Elder', { loc: [-0.55, 0, 0], facing: 12 }); a.poseStand(1);
  const b = youth('Youth', { loc: [0.55, 0, 0], facing: -12 }); b.poseStand(1);
  const a2 = elder('Elder2', { loc: [-1.45, 3, -1.7], facing: 10 }); a2.poseStand(1); a2.j.root.scale.setScalar(3.4);
  const b2 = youth('Youth2', { loc: [1.45, 3, -2.2], facing: -10 }); b2.poseStand(1); b2.j.root.scale.setScalar(3.4);
  S.camera([0, -8, 2.3], [0, 0, 2.3], 50);
}

function s00_heads(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 3); Lt.fog(40, 400);
  Look.enable('ps3');
  floor('#7f858c');
  [0, 50, 180].forEach((f, i) => {
    const b = youth('Y' + i, { loc: [(i - 1) * 0.62, 0, 0], facing: f }); b.poseStand(1);
    const a = elder('E' + i, { loc: [(i - 1) * 0.72, 1.6, 0.62], facing: f }); a.poseStand(1);
  });
  S.camera([0, -5.2, 1.95], [0, 0.4, 1.95], 62);
}

/** Indoor lighting: no sun, a little cool ambient; the room's own lamps do the work. */
function indoors(look = 'ps3', over = {}, amb = 0.18) {
  S.reset(); Lt.apply('night');
  const L = stage.light.L; L.sunI = 0; L.sky = amb; L.hor = lin('#8fa0b8'); L.zen = lin('#b9c6d6');
  Look.enable(look, { fill: 0, rim: 0, ...over });
}

// ============================================================== SCENE 1 — THE DISCOVERY
function bathroom(n, stopAt) {
  indoors('ps3', { bloom: 0.22, bloomThreshold: 2.4, vignette: 0.55, exposure: 1.0, shadows: '#1f3a4a', tint: 0.3 }, 0.2);
  const room = In.hall('bath', [0, 0, 0], { w: 3.0, d: 2.6, h: 2.5, wall: '#9fb3b2', floor: '#6f8088', floor2: '#5d6d75', tile: 0.4, dado: '#6f9a9a', closed: true, lights: [0, 0] });
  In.vanity('vanity', [0, 1.02, 0], 0);
  const mir = In.mirror('mirror', [0, 1.24, 1.62], 0, { w: 0.95, h: 1.0 });
  const lamp = In.wallLamp('lamp', [0, 1.26, 2.3], 0, { power: 3.2 }); emit(lamp.glow, 2.2);
  const clock = In.wallClock('clock', [0.98, 1.29, 1.85], 0, { time: [6, 12] }); In.runClock(clock, 1, n, { stopAt });
  In.towel('towel', [-1.48, 0.5, 1.25], 90);
  const b = new Buf(); b.box(-0.95, 1.2, 1.3, 0.5, 0.14, 0.03, 0); for (const [x, c] of [[-1.1, 1], [-0.97, 2], [-0.84, 1]]) b.cyl(x, 1.2, 1.33, 0.035, 0.14, c, 6);
  stage.scene.add(b.mesh([mat('shelf', '#e9e4d8'), mat('bottleA', '#5a9fb0'), mat('bottleB', '#e0b23c')]));
  const fillL = new THREE.PointLight('#9fc4ff', 1.6, 6, 1.5); fillL.position.set(-1.0, -0.9, 2.2); stage.scene.add(fillL);
  const man = elder('Elder', { loc: [0, 0.42, 0], facing: 180 });
  man.poseStand(1); man.idle(1, n, { amount: 0.6, arms: false });
  return { man, mir, clock, lamp };
}

function s01_eyes(n) {
  const { man } = bathroom(n, null);
  man.rot('head', 1, -2, 0, 0);
  man.eyes.blink(22); man.eyes.widen(40, 1.25, 14); man.eyes.gaze(36, 0, -0.2, 8);
  const { cam, tgt, lens } = S.camera([0.02, 1.12, 1.72], [0, 0.29, 1.722], 64);
  stage.A.key(lens, 'lens', 1, 58); stage.A.key(lens, 'lens', n, 76);
  S.move(cam, [[1, [0.04, 1.14, 1.73]], [n, [0.0, 1.0, 1.722]]]);
  Cam.handheld(1, n, { amp: 0.25 });
  Look.fade(1, 10);
}

function s02_mirror(n) {
  const stop = at(6.4);
  const { man, mir, lamp } = bathroom(n, stop);
  man.rot('head', 1, -2, 0, 0);
  man.touchFace(at(0.6), { side: 'R', dur: 26 });
  man.age.fade(at(3.0), at(6.6)); man.darkenHair(at(3.4), at(7.4));
  man.eyes.blink(at(2.6)); man.eyes.widen(at(3.4), 1.3, 20); man.eyes.blink(at(6.9));
  // posture straightens as the years fall away
  stage.A.key(man.j.spine, 'rotation', at(3.0)); man.rot('head', at(3.0), -2, 0, 0);
  emit(lamp.glow, 2.2, at(2.8)); emit(lamp.glow, 3.4, at(4.4)); emit(lamp.glow, 2.2, at(7));
  const { cam, tgt, lens } = S.camera([0.55, -0.95, 1.72], [0.02, 1.28, 1.6], 40);
  S.move(cam, [[1, [0.66, -1.05, 1.78]], [n, [0.5, -0.45, 1.76]]]);
  S.move(tgt, [[1, [0.02, 1.28, 1.56]], [n, [0.2, 1.28, 1.7]]]);
  stage.A.key(lens, 'lens', 1, 36); stage.A.key(lens, 'lens', n, 58);
  Cam.handheld(1, n, { amp: 0.2 });
}

function s00_pose(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 5); Look.enable('ps3'); floor('#7f858c');
  const P_ = [[[-90, 0, 0], [0, 0, 0]], [[0, 90, 0], [0, 0, 0]], [[0, 0, 90], [0, 0, 0]], [[-58, 0, -14], [-128, 0, -26]], [[-58, 0, 14], [-128, 0, 26]], [[-40, 30, 0], [-130, 0, 0]], [[-40, -30, 0], [-130, 0, 0]], [[-60, 0, 0], [-120, 40, 0]]];
  P_.forEach(([sh, el], i) => { const p = youth('P' + i, { loc: [(i % 4 - 1.5) * 1.0, 0, i < 4 ? 0 : 2.0], facing: 0 }); p.poseStand(1); p.rot('shoulderR', 1, ...sh); p.rot('elbowR', 1, ...el); });
  box([5, 1, 2.0], [0, 0.6, 0], mat('riser', '#666a70'), { origin: 'bottom' });
  S.camera([0, -9, 2], [0, 0, 2], 50);
}
// ============================================================== THE CITY (same place before / ten years after)
const CITY_SEED = 11, CT = [25, 75], HOME_ID = '0,0,0';
// lots kept low so the street and the rooftop have a clear view of the central tower
const LOW = { '0,0,1': 20, '0,0,2': 22, '0,0,3': 16, '0,1,0': 14, '0,1,1': 18, '0,1,2': 10, '0,1,3': 2, '1,0,0': 15, '1,0,2': 17, '1,1,0': 19, '1,1,2': 2, '1,1,1': 12 };
const NEWS = Scr.newsDraw({ headline: 'HUMAN AGING HAS STOPPED', ticker: 'SCIENTISTS HAVE NO EXPLANATION   •   WORLD LEADERS CALL IT A MIRACLE   •   CELEBRATIONS IN EVERY CITY   •' });

function town(preset, focus, era, { radius = 90, shadow = 80, lit = 0, litFraction = 0.5, towers = 90, fog = [140, 1000], keepOut = [] } = {}) {
  S.reset(); Lt.apply(preset); Lt.shadow(focus, shadow); Lt.fog(...fog);
  const city = new City({ seed: CITY_SEED, n: 6 }).build({ focus, detailRadius: radius, heights: LOW, litFraction });
  city.allLights(lit);
  let central, mega = null;
  if (era === 'before') central = Bd.office('central', [CT[0], CT[1], 0], 0, { w: 14, d: 20, floors: 16, seed: 2, color: '#c7ccd3' });
  else {
    mega = megacity(city, { n: towers, seed: 4, exclude: [HOME_ID, ...Object.keys(LOW)], keepOut: [[-9, -9, 62], ...keepOut], lit: Math.max(0.2, lit) });
    central = megatower('central', [CT[0], CT[1] + 1, 0], { w: 20, d: 22, h: 300, seed: 9, setback: false, lit: Math.max(0.2, lit) });
  }
  const news = Scr.screen('news', [CT[0], 64.5, 17], 0, { w: 13, h: 7.3, draw: NEWS, live: true, glow: 1.7 });
  if (era !== 'before') { news.drawFn = Scr.staticDraw({ level: 0.3 }); news.glow = 0.9; }
  return { city, mega, central, news };
}
const STREET = { x: [18.7, 31.3], y: [-90, 62] };

function party(n, keepOut = []) {
  const o = { pose: 'cheer', motion: 'cheer', facing: 180, faceJitter: 70, kids: 0.1, keepOut };
  mass('party', { n: 1500, area: STREET, seed: 2, ...o });
  mass('partyW', { n: 450, area: { x: [-45, 18], y: [19, 31] }, seed: 3, ...o, facing: -90 });
  mass('partyE', { n: 450, area: { x: [32, 95], y: [19, 31] }, seed: 4, ...o, facing: 90 });
  Fx.confetti('confetti', { n: 1100, box: { x: [16, 34], y: [-75, 62], z: [1, 38] }, size: 0.22 });
}

// ============================================================== SCENE 2 — THE CELEBRATION
function s03_aerial(n) {
  town('day', [25, 0], 'before', { radius: 130, shadow: 220, fog: [320, 1700] });
  Look.enable('ps3', { saturation: 1.25 });
  sky.clouds(10, { seed: 2, height: 230, spread: 800 });
  party(n);
  const { cam, tgt } = S.camera([150, -210, 190], [25, 30, 20], 30);
  S.move(cam, [[1, [70, -340, 230]], [n, [28.5, -78, 24]]]);
  S.move(tgt, [[1, [25, 10, 30]], [n, [25, 10, 4]]]);
  Look.fade(1, 6);
}

function s04_hospital(n) {
  indoors('ps3_cold', { exposure: 0.92, bloom: 0.25 }, 0.3);
  In.hall('ward', [0, 0, 0], { w: 10, d: 7.4, h: 3.1, wall: '#dfe9ea', floor: '#c4d0d3', floor2: '#b3c1c5', dado: '#9fc9c6', lights: [2, 2], power: 4.5 });
  Med.hospitalBed('bed1', [-2.6, 2.4, 0], 0); Med.hospitalBed('bed2', [2.9, 2.4, 0], 0, { blanket: '#7a9fc9' });
  Med.ivStand('iv', [-3.5, 3.1, 0]); Med.monitor('mon', [-1.5, 3.2, 0], 0); Med.cabinet('cab', [0.6, 3.4, 0], 0); Med.cabinet('cab2', [4.4, 3.4, 0], 0);
  const man = elder('Elder', { loc: [-2.08, 2.0, 0], facing: 90, wrinkles: false });
  man.hairMat.color.set('#8a8078'); man.poseStand(1); man.sit(1, 0.7); man.rot('head', 1, 0, 0, -20);
  const dA = new Person('docA', { outfit: 'doctor', hair: 'bun', hairColor: '#4a3324', skin: P.SKIN[2], loc: [-0.75, 1.55, 0], facing: -70, height: 0.95 });
  dA.poseStand(1); dA.idle(1, n, { arms: false }); dA.carry(1); dA.rot('head', 1, 14, 0, 0); dA.look(at(0.9), { yaw: -30, pitch: 0, dur: 10 });
  const cb = new Buf(); cb.box(0, -0.1, -0.12, 0.24, 0.02, 0.32, 0); const clip = cb.mesh([mat('clipboard', '#f4f1e8')]); clip.rotation.x = -60 * D; dA.j.handR.add(clip);
  const dB = new Person('docB', { outfit: 'doctor', hair: 'short', hairColor: '#2a1f1a', skin: P.SKIN[1], glasses: true, loc: [0.55, 1.2, 0], facing: -120 });
  dB.poseStand(1); dB.idle(1, n, { arms: false, seed: 2 }); dB.scratchHead(at(0.1), { n: 6 });
  const dC = new Person('docC', { outfit: 'doctor', hair: 'short', hairColor: '#8d8d92', skin: P.SKIN[0], beard: true, loc: [-0.35, 2.75, 0], facing: -140, height: 1.02 });
  dC.poseStand(1); dC.idle(1, n, { arms: false, seed: 4 }); dC.shrug(at(0.7), { hold: 30 });
  const { cam, tgt } = S.camera([1.4, -3.9, 1.5], [-0.75, 1.9, 1.2], 27);
  S.move(cam, [[1, [1.6, -4.0, 1.45]], [n, [0.3, -3.2, 1.55]]]);
  Cam.handheld(1, n, { amp: 0.35 });
}

function s05_news(n) {
  town('afternoon', [25, 6], 'before', { radius: 80, shadow: 60, fog: [200, 1300] });
  Look.enable('ps3', { saturation: 1.22 });
  sky.clouds(8, { seed: 5, height: 230, spread: 700 });
  party(n, [[25, 2.5, 5.2]]);
  const hero = youth('Youth', { loc: [25.5, 0.6, 0], facing: 180 }); hero.poseStand(1); hero.cheer(1, n);
  [[22.2, 1.6, 3], [26.4, 2.2, 8], [23.3, 5.4, 12], [27.6, 4.6, 17], [21.3, 4.4, 21], [25.6, 5.6, 26], [28.6, 1.4, 31], [24.0, 3.4, 37], [20.6, 0.6, 41]].forEach(([x, y, sd], i) => {
    const p = Person.random(`fan${i}`, sd, { loc: [x, y, 0], facing: 180 + (i % 3 - 1) * 12 }); p.poseStand(1);
    if (i % 4 === 1) { p.idle(1, n, { seed: i }); p.wave(4 + i, { n: 8 }); } else p.cheer(1 + i % 5, n);
  });
  const { cam, tgt, lens } = S.camera([26.4, -4.6, 1.7], [25, 64.5, 13], 26);
  const k = Math.round(n * 0.62);
  S.move(cam, [[1, [26.6, -4.8, 1.65]], [k, [25, 22, 15.5]], [n, [25, 26, 16.2]]]);
  S.move(tgt, [[1, [25, 40, 9]], [k, [25, 64.5, 17]], [n, [25, 64.5, 17]]]);
  stage.A.key(lens, 'lens', 1, 24); stage.A.key(lens, 'lens', k, 54); stage.A.key(lens, 'lens', n, 60);
}

// ============================================================== SCENE 3 — THE FIRST PROBLEM
function s06_timelapse(n) {
  const { city, mega, central } = town('day', [0, 0], 'after', { radius: 60, shadow: 330, lit: 0.01, towers: 120, fog: [300, 1700], keepOut: [[-230, -300, 110]] });
  Look.enable('ps3', { saturation: 1.2 });
  mega.rise(8, n - 14, 0.4); central.rise(Math.round(n * 0.3), n - 10);
  const win = mat('mega_win_on');
  ['day', 'dusk', 'night', 'dawn'].forEach((_, i) => 0);
  const seq = [['day', 0.01], ['dusk', 1.0], ['night', 1.9], ['dawn', 0.7]];
  for (let i = 0, f = 1; f <= n + 9; i++, f += 9) { const [name, lv] = seq[i % 4]; Lt.apply(name, f); city.allLights(lv, f); emit(win, lv, f); }
  Look.set('saturation', 1.2, 1); Look.set('saturation', 0.72, n); Look.set('contrast', 1.12, 1); Look.set('contrast', 1.2, n);
  Look.set('vignette', 0.38, 1); Look.set('vignette', 0.55, n);
  const { cam, tgt } = S.camera([-250, -400, 215], [20, 40, 60], 28);
  S.move(cam, [[1, [-255, -400, 200]], [n, [-215, -345, 190]]], 'LINEAR');
  S.move(tgt, [[1, [20, 40, 40]], [n, [20, 40, 105]]], 'LINEAR');
}

function drab(n) { Fx.haze('smog', { n: 16, area: [-260, 300, -200, 320], z: [35, 150], color: '#b9a488', opacity: 0.13, seed: 2 }); }

function s07_crowded(n) {
  const { news } = town('afternoon', [25, -2], 'after', { radius: 80, shadow: 70, lit: 0.5, fog: [50, 560] });
  Look.enable('ps3_dusty', { saturation: 0.7, exposure: 1.05 });
  drab(n);
  const o = { pose: 'stand', motion: 'flow', drab: 0.55, kids: 0.3, minDist: 0.5 };
  mass('jam', { n: 2600, area: STREET, seed: 6, flow: [0, -0.22], facing: 0, faceJitter: 18, keepOut: [[25, -3.5, 4.2]], ...o });
  mass('jamW', { n: 650, area: { x: [-45, 18], y: [19, 31] }, seed: 7, flow: [0.2, 0], facing: 90, ...o });
  mass('jamE', { n: 650, area: { x: [32, 95], y: [19, 31] }, seed: 8, flow: [-0.2, 0], facing: -90, ...o });
  const walk = (p, x, y, d = 2.0) => { p.walk([[x, y], [x, y - d]], 1, n, { stride: 0.45, armSwing: 12 }); };
  const hero = youth('Youth', { loc: [24.1, -2.4, 0] }); walk(hero, 24.1, -2.4); hero.look(at(2.2), { yaw: 35, pitch: -8, dur: 24 });
  const old = elder('Elder', { loc: [26.2, -1.2, 0], wrinkles: false }); old.hairMat.color.set('#8a8078'); walk(old, 26.2, -1.2, 1.7);
  const mum = new Person('mum', { outfit: 'dress', hair: 'long', hairColor: '#4a3324', skin: P.SKIN[3], shirt: '#5a7f9a', loc: [22.5, -4.2, 0], height: 0.94 }); walk(mum, 22.5, -4.2, 1.8);
  [[21.9, -4.7, 0.52, '#e0b23c'], [23.1, -4.8, 0.62, '#7ab0c9'], [27.3, -3.6, 0.56, '#c96a8a'], [25.3, -5.4, 0.47, '#8cbf5f']].forEach(([x, y, h, c], i) => {
    const kid = new Person(`kid${i}`, { outfit: i % 2 ? 'dress' : 'casual', shirt: c, hair: i % 2 ? 'ponytail' : 'short', hairColor: HAIRK[i], skin: P.SKIN[i], loc: [x, y, 0], height: h, build: 1.15 }); walk(kid, x, y, 1.7);
  });
  [[27.6, -1.8, 51], [28.4, -4.4, 57], [21.2, -1.6, 63], [20.4, -3.4, 67], [29.2, -0.6, 71], [23.6, 0.2, 77]].forEach(([x, y, sd], i) => { const p = Person.random(`w${i}`, sd, { loc: [x, y, 0] }); walk(p, x, y, 1.6 + (i % 3) * 0.2); });
  const { cam, tgt, lens } = S.camera([25.4, -8.6, 1.6], [25, 10, 2], 28);
  S.move(cam, [[1, [25.5, -8.8, 1.55]], [n, [25.2, -13.5, 9.5]]]);
  S.move(tgt, [[1, [25, 6, 2.4]], [n, [25, 34, 9]]]);
  stage.A.key(lens, 'lens', 1, 30); stage.A.key(lens, 'lens', n, 24);
  Cam.handheld(1, n, { amp: 0.3 });
}
const HAIRK = ['#2a1f1a', '#8a5a2e', '#4a3324', '#c9a25a'];

// ============================================================== SCENE 4 — THE COLLAPSE
function s08_market(n) {
  indoors('ps3_dusty', { exposure: 0.95, bloom: 0.4, saturation: 0.78, vignette: 0.6 }, 0.24);
  const m = In.hall('market', [0, 0, 0], { w: 17, d: 27, h: 3.5, wall: '#a9ada6', floor: '#9c9f98', floor2: '#8b8e87', tile: 1, lights: [2, 4], power: 10, lightColor: '#e6f0ff', dado: null });
  const r = new Rand(5);
  for (const [i, x] of [-6.3, -2.3, 2.3, 6.3].entries()) for (let j = 0; j < 6; j++)
    Mk.shelf(`sh${i}_${j}`, [x, -9.6 + j * 3.75, 0], 90, { w: 3.6, stock: (i === 2 && j === 1) ? 0.05 : r.random() < 0.3 ? 0.03 : 0.006, seed: i * 10 + j, accent: i % 2 ? '#2f6fb0' : '#c8402f' });
  Mk.litter('mess', { n: 110, area: [-1.5, 1.5, -12, 11], seed: 3 }); Mk.litter('mess2', { n: 60, area: [-8, 8, 11.6, 13], seed: 4 });
  Mk.cart('cartA', [-0.9, -2.2, 0], 30, { tipped: true }); Mk.cart('cartB', [1.1, 6.8, 0], -20);
  // flickering tubes
  for (let f = 1; f <= n; f += 3) { const v = r.random() < 0.25 ? r.uniform(0.3, 2) : 5; emit(m.strips, v, f, 'CONSTANT'); stage.A.key(m.lamps[1], 'intensity', f, 7 * v / 5, 'CONSTANT'); stage.A.key(m.lamps[2], 'intensity', f, 7 * (r.random() < 0.2 ? 0.2 : 1), 'CONSTANT'); }
  // two people wrestling over the last box of food
  const cr = St.crate('lastbox', [0.2, 2.3, 0.95], 0, { size: 0.38, color: '#c9a25a' });
  for (let f = 1; f <= n; f += 9) stage.A.key(cr, 'position', f, [0.2 + ((f / 9) % 2 ? 0.16 : -0.16), 2.3, 0.95]);
  const a = Person.random('grabA', 12, { loc: [-0.42, 2.3, 0], facing: 90, outfit: 'hoodie' }); a.poseStand(1); a.shove(1, n, { seed: 0 });
  const b = Person.random('grabB', 29, { loc: [0.82, 2.3, 0], facing: -90, outfit: 'casual' }); b.poseStand(1); b.shove(1, n, { seed: 1 });
  const c = Person.random('runC', 33, { loc: [0.2, 10, 0] }); c.run([[0.4, 11], [0.3, 3.6]], 1, n - 8); 
  const d = Person.random('reachD', 44, { loc: [1.35, -3.3, 0], facing: 90, outfit: 'dress' }); d.poseStand(1); d.idle(1, n, { arms: false }); d.reach(6, { pitch: 105 }); d.look(at(1.5), { yaw: 70, dur: 8 });
  const e = Person.random('sitE', 58, { loc: [-1.45, -6.4, 0], facing: -90, outfit: 'suit' }); e.poseStand(1); e.crouch(1, 1); e.rot('head', 1, 20, 0, 0);
  const g = Person.random('cartG', 61, { loc: [-7.5, 12, 0] }); g.run([[-7.5, 12.2], [7.5, 12.2]], Math.round(n * 0.25), Math.round(n * 0.8));
  const { cam, tgt } = S.camera([0.3, -12.2, 1.5], [0, 4, 1.3], 24);
  S.move(cam, [[1, [0.35, -12.4, 1.5]], [n, [-0.25, -4.6, 1.45]]], 'LINEAR');
  S.move(tgt, [[1, [0.1, 2, 0.95]], [n, [0.25, 4, 1.0]]]);
  m.lamps[0].intensity = 0; m.lamps[5].intensity = 0;
  Cam.handheld(1, n, { amp: 2.0, speed: 1.3 });
}

function s09_barricade(n) {
  town('dusk', [25, 9], 'after', { radius: 70, shadow: 55, lit: 1.8, fog: [45, 440] });
  Look.enable('ps3_night', { exposure: 1.2, saturation: 0.95 });
  for (let i = 0; i < 6; i++) St.barrier(`jb${i}`, [19.6 + i * 2.2, 12.2, 0], (i % 2 ? 4 : -3));
  for (let i = 0; i < 4; i++) St.barrier(`sb${i}`, [20.5 + i * 3, 10.6, 0], (i % 2 ? -8 : 6), { kind: 'striped' });
  for (const [x, y] of [[19.2, 9.4], [22.4, 9.2], [27.8, 9.3], [31, 9.6]]) St.cone(`cone${x}`, [x, y, 0]);
  [[20.3, 9.6], [22.9, 9.9], [25.1, 9.5], [27.4, 9.9], [29.9, 9.6]].forEach(([x, y], i) => {
    const c = new Person(`cop${i}`, { outfit: 'police', skin: P.SKIN[i % 4], loc: [x, y, 0], facing: 180 + (i - 2) * 6, height: 1.0 + (i % 2) * 0.03 });
    c.poseStand(1); c.idle(1, n, { seed: i, arms: i !== 2 }); if (i === 2) c.reach(8, { pitch: 80, side: 'L' });
  });
  const pol = V.vehicle('police', [20.4, 6.4, 0], 80, { lightsOn: true, name: 'pol' }); V.beacon(pol, 1, n, 6);
  const strobe = [['#ff2a2a', 0], ['#2a5aff', 1]].map(([c, k]) => { const L = new THREE.PointLight(c, 0, 26, 1.4); L.position.set(20.4 + k * 0.6, 6.4, 2.2); stage.scene.add(L); return L; });
  stage.A.hooks.push(f => strobe.forEach((L, k) => { L.intensity = (Math.floor(f / 6) + k) % 2 ? 60 : 2; }));
  V.vehicle('sedan', [28.6, 3.4, 0], 200, { rust: 0.75, seed: 3, name: 'wreck1' }); V.vehicle('van', [29.4, -5.5, 0], 170, { rust: 0.6, seed: 5, name: 'wreck2' });
  V.vehicle('bus', [21.6, -15, 0], 8, { rust: 0.5, color: '#b08a3a', name: 'wreck3' }); V.vehicle('hatchback', [25.2, -6, 0], 120, { rust: 0.85, seed: 8, name: 'wreck4' });
  St.debris('deb', { n: 80, area: [18.8, 31.2, -12, 11.4], seed: 2 });
  for (const [x, y, i] of [[31.0, 7.2, 0], [30.9, -1.5, 1]]) { St.barrel(`bf${i}`, [x, y, 0], 0, { color: '#4a4036', fire: true }); const L = new THREE.PointLight('#ff8a3a', 30, 16, 1.6); L.position.set(x, y, 1.5); stage.scene.add(L); for (let f = 1; f <= n; f += 3) stage.A.key(L, 'intensity', f, 22 + 16 * Math.abs(Math.sin(f * 1.7 + i)), 'LINEAR'); }
  const mob = mass('mob', { n: 1700, area: { x: [18.7, 31.3], y: [14.2, 62] }, seed: 9, pose: 'mixed', motion: 'push', flow: [0, 0], facing: 0, faceJitter: 14, drab: 0.5, kids: 0.2, minDist: 0.5 });
  [[19.6, 3], [21.5, 9], [23.4, 14], [25.4, 22], [27.3, 27], [29.3, 35], [30.8, 39]].forEach(([x, sd], i) => { const p = Person.random(`front${i}`, sd, { loc: [x, 13.25, 0], facing: (i - 3) * 5 }); p.poseStand(1); if (i % 3 === 1) p.shout(4 + i * 3); else p.shove(1 + i, n, { seed: i, lean: 10 }); });
  const { cam, tgt } = S.camera([22.9, 1.2, 1.3], [24, 14, 2.4], 24);
  S.move(cam, [[1, [22.9, 1.0, 1.3]], [n, [29.4, 4.6, 1.9]]], 'LINEAR');
  S.move(tgt, [[1, [23, 13, 2.2]], [n, [25.5, 20, 6]]]);
  Cam.handheld(1, n, { amp: 1.0 });
}

// ============================================================== SCENE 5 / 6 — THE ROOFTOP
function rooftop(n, { giant = false } = {}) {
  const T = town('dusk', [-9, -9], 'after', { radius: 55, shadow: 30, lit: 1.9, towers: 250, fog: [120, 800] });
  Look.enable('ps3_night', { exposure: 1.2, bloom: 0.5 });
  const lot = T.city.lot(HOME_ID), z0 = lot.top + 0.4, hw = lot.w * 0.96 / 2, hd = lot.d * 0.96 / 2;
  const b = new Buf();
  for (const sy of [-1, 1]) b.box(lot.x, lot.y + sy * (hd - 0.15), z0, hw * 2, 0.3, 1.1, 0);
  for (const sx of [-1, 1]) b.box(lot.x + sx * (hw - 0.15), lot.y, z0, 0.3, hd * 2, 1.1, 0);
  b.box(lot.x, lot.y, z0, hw * 2 - 0.6, hd * 2 - 0.6, 0.04, 1);
  b.box(lot.x - hw + 2.0, lot.y - hd + 2.2, z0, 2.4, 2.6, 2.5, 2); b.box(lot.x - hw + 2.0, lot.y - hd + 3.52, z0, 0.9, 0.05, 2.0, 3);     // stair hut + door
  for (const [x, y] of [[hw - 1.8, hd - 1.6], [hw - 1.8, hd - 3.6], [-hw + 1.6, hd - 1.6]]) { b.box(lot.x + x, lot.y + y, z0, 1.4, 1.2, 0.9, 3); b.cyl(lot.x + x, lot.y + y, z0 + 0.9, 0.4, 0.08, 4, 8); }
  b.cyl(lot.x + hw - 1.2, lot.y - hd + 1.2, z0, 0.07, 6, 4, 5, 0.03);
  stage.scene.add(b.mesh([mat('parapet', '#8f8a82'), mat('gravel', '#6f6c66'), mat('hut', '#9a958c'), mat('ac', '#b4b9be'), mat('acd', '#4a4d55')], 'Roof'));
  const pos = [lot.x + 0.3, lot.y + 0.4, z0 + 0.04];
  const hero = youth('Youth', { loc: pos, facing: 180 }); hero.poseStand(1); hero.idle(1, n, { amount: 0.8 });
  let screen = null;
  if (giant) screen = Scr.screen('giant', [CT[0], 64.3, 172], 0, { w: 19.4, h: 38, px: 640, glow: 1.9, fog: false, bezel: 0.6, depth: 0.5,
    draw: Scr.alertDraw({ lines: ['POPULATION', 'LIMIT', 'REACHED'] }), live: true });
  return { ...T, lot, z0, pos, hero, screen };
}

function s10_rooftop(n) {
  const { pos, hero } = rooftop(n);
  props.flock(7, [[-120, 40, 150], [-20, 10, 142], [80, -30, 150]], 1, n, { seed: 3, spread: 6 });
  hero.look(at(2.5), { yaw: -22, pitch: 4, dur: 40 }); hero.look(at(5.4), { yaw: 10, pitch: -6, dur: 40 });
  const c = [pos[0], pos[1], pos[2] + 1.5];
  const { cam, tgt, lens } = S.camera([c[0], c[1] - 4, c[2]], c, 22);
  stage.A.hooks.unshift(f => {
    const u = (f - 1) / (n - 1), e = u * u * (3 - 2 * u) * 0.35 + u * 0.65, a = (-112 + 150 * e) * D, r = 4.3 - 0.9 * e;
    cam.position.set(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2] + 1.0 - 0.5 * e);
    tgt.position.set(c[0], c[1], c[2] + 0.75);
  });
  stage.A.key(lens, 'lens', 1, 18); stage.A.key(lens, 'lens', n, 24);
}

function s11_screen(n) {
  const { pos, hero, screen } = rooftop(n, { giant: true });
  const on = 24;
  Scr.flicker(screen, on);
  const red = new THREE.PointLight('#ff2a1a', 0, 40, 1.2); red.position.set(pos[0] + 2.2, pos[1] + 5, pos[2] + 4.5); stage.scene.add(red);
  const wash = new THREE.DirectionalLight('#ff3a2a', 0); wash.position.set(CT[0], 60, 200); wash.target.position.set(...pos); stage.scene.add(wash, wash.target);
  stage.A.hooks.push(() => { red.intensity = 70 * screen.power.v; wash.intensity = 1.6 * screen.power.v; });
  hero.look(on + 3, { yaw: -8, pitch: -24, dur: 9 });
  Look.set('saturation', 1.1, on); Look.set('saturation', 1.25, on + 14);
  const { cam, tgt, lens } = S.camera([pos[0] - 1.3, pos[1] - 2.9, pos[2] + 1.15], [6, 26, pos[2] + 30], 22);
  S.move(cam, [[1, [pos[0] - 1.5, pos[1] - 3.2, pos[2] + 1.1]], [n, [pos[0] - 1.0, pos[1] - 2.3, pos[2] + 1.2]]]);
  S.move(tgt, [[1, [4, 22, pos[2] + 20]], [on + 8, [5, 24, pos[2] + 24]], [n - 14, [CT[0] - 2, 64, 168]], [n, [CT[0] - 2, 64, 169]]]);
  stage.A.key(lens, 'lens', 1, 22); stage.A.key(lens, 'lens', on + 8, 23); stage.A.key(lens, 'lens', n - 14, 50); stage.A.key(lens, 'lens', n, 53);
  Cam.shake(on, { amp: 1.6, dur: 20 }); Cam.handheld(1, n, { amp: 0.3 });
}

function s12_eyes(n) {
  const { pos, hero, screen } = rooftop(n, { giant: true });
  const red = new THREE.PointLight('#ff2a1a', 12, 30, 1.2); red.position.set(pos[0] + 1.6, pos[1] + 4, pos[2] + 3.6); stage.scene.add(red);
  for (let f = 1; f <= n; f += 5) stage.A.key(red, 'intensity', f, 11 + 4 * Math.sin(f / 5), 'LINEAR');
  hero.rot('head', 1, -14, 0, 0);
  hero.eyes.glint('#ff2a1a', 3.2); hero.eyes.gaze(1, 0, 0.2, 1);
  hero.eyes.blink(at(0.2)); hero.eyes.widen(at(0.6), 1.5, 16);
  hero.eyes.gaze(at(1.6), -0.3, 0.15, 4); hero.eyes.gaze(at(2.1), 0.25, 0.25, 4); hero.eyes.gaze(at(2.8), 0, 0.2, 5);
  const ez = pos[2] + 1.815, ey = pos[1] + 0.14;
  const { cam, tgt, lens } = S.camera([pos[0] + 0.05, pos[1] + 1.3, ez + 0.25], [pos[0], ey, ez + 0.035], 70);
  S.move(cam, [[1, [pos[0] + 0.1, pos[1] + 1.35, ez + 0.3]], [n, [pos[0] - 0.02, pos[1] + 1.05, ez + 0.24]]]);
  stage.A.key(lens, 'lens', 1, 62); stage.A.key(lens, 'lens', n, 100);
  Cam.handheld(1, n, { amp: 0.45, speed: 1.4 });
}

export const DEV = { s00_cast, s00_heads, s00_pose };
export const SHOTS = { s03_aerial, s04_hospital, s05_news, s06_timelapse, s07_crowded, s08_market, s09_barricade, s10_rooftop, s11_screen, s12_eyes, s01_eyes, s02_mirror };
