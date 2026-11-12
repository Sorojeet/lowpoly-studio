// WHAT IF — "What if the Sun disappeared?" (standalone, PS3 look)
//   python3 tools/tts.py series/what-if/sun-vanished/script.json build/what-if/sun-vanished/audio
//   node tools/render.mjs what-if/sun-vanished s02_dark --still 170
//   node tools/render.mjs what-if/sun-vanished all && python3 series/what-if/sun-vanished/build.py
import { THREE, stage, D, mat, emit, box, cylinder, Buf } from '../../../studio/core.js';
import * as S from '../../../studio/stage.js';
import * as Lt from '../../../studio/lighting.js';
import * as Look from '../../../studio/look.js';
import * as P from '../../../assets/palette.js';
import { Person } from '../../../assets/characters/person.js';
import * as V from '../../../assets/vehicles.js';
import * as Bd from '../../../assets/buildings.js';
import * as N from '../../../assets/nature.js';
import * as St from '../../../assets/street.js';
import * as In from '../../../assets/interior.js';
import * as Sp from '../../../assets/space.js';
import * as W from '../../../assets/weather.js';
import * as sky from '../../../assets/sky.js';
import * as props from '../../../assets/props.js';

const LEAD = 0.25;
let TIMING = {};
export function setTiming(t) { TIMING = t; }
export const frames = shot => Math.round(TIMING[shot].dur * S.FPS);
const at = sec => 1 + Math.round((sec + LEAD) * S.FPS);   // frame `sec` seconds into the narration

/** Apply a lighting preset (+ overrides) and optionally keyframe it. */
function setLight(preset, f, over = {}) {
  Lt.apply(preset); const L = stage.light.L; Object.assign(L, over);
  if (f !== undefined) for (const k of Object.keys(L)) stage.A.key(L, k, f);
}
const sunDir = (azim, elev, dist) => [Math.sin(azim * D) * Math.cos(elev * D) * dist, -Math.cos(azim * D) * Math.cos(elev * D) * dist, Math.sin(elev * D) * dist];
function ground(color, size = 900, z = 0) {
  const b = new Buf(); b.box(0, 0, z - 1, size, size, 1, 0);
  const g = b.mesh([mat(`ground_${color}`, color)], 'Ground'); g.castShadow = false; stage.scene.add(g); return g;
}
function ambient(color, intensity) { const a = new THREE.AmbientLight(color, intensity); stage.scene.add(a); return a; }

/** The street used in s02 (day -> dark) and s05 (frozen). Road along X; returns lamps, buildings. */
function street({ snowy = false } = {}) {
  ground(snowy ? '#dfe7f0' : '#5d7f4c');
  Bd.road('main', [-110, 0], [110, 0], { width: 9, color: snowy ? '#aab4c0' : P.ASPHALT, lanes: !snowy });
  if (!snowy) Bd.crossing('zebra', [6, 0], 0, { width: 9 });
  const buildings = [];
  for (const [sy, hd, seed] of [[1, 0, 3], [-1, 180, 8]]) {
    Bd.slab(`walk${seed}`, [0, sy * 7.2, 0], [220, 5], snowy ? '#eef2f7' : P.SIDEWALK);
    buildings.push(...Bd.streetRow(`row${seed}`, [sy > 0 ? -70 : 70, sy * 9.8, 0.18], { n: 13, seed, heading: hd, lit: 0, kinds: ['shop', 'apartment', 'shop', 'house', 'shop'] }).buildings);
  }
  const lamps = [];
  for (let i = -5; i <= 5; i++) {
    lamps.push(St.lampPost(`lp${i}`, [i * 12 + 2, 5.3, 0.18], 0, { on: false, light: Math.abs(i) < 3 }));
    lamps.push(St.lampPost(`lq${i}`, [i * 12 - 4, -5.3, 0.18], 180, { on: false, light: false }));
    N.tree(`tr${i}`, [i * 12 + 7, 5.6, 0.18], { kind: snowy ? 'dead' : (i % 2 ? 'oak' : 'autumn'), seed: i + 5, size: 0.8 });
    N.tree(`ts${i}`, [i * 12 + 1, -5.6, 0.18], { kind: snowy ? 'dead' : 'oak', seed: i + 25, size: 0.75 });
  }
  St.busStop('bs', [-6, 6.6, 0.18], 0); St.hydrant('hy', [5.6, 5.4, 0.18]); St.trashCan('tc', [-1.5, 5.6, 0.18]);
  St.mailbox('mb', [9, 5.6, 0.18]); St.phoneBooth('pb', [15, 6.4, 0.18], 0); St.sign('sg', [8.6, -5.2, 0.18], 180, { kind: 'stop' });
  return { lamps, buildings };
}
function lampsOn(lamps, f, { stagger = 2, fraction = 1, flicker = false } = {}) {
  lamps.forEach((l, i) => {
    if ((i * 37 % 100) / 100 >= fraction) return;
    const t = f + (i * 7 % 9) * stagger;
    emit(l.bulb, 0, t - 1, 'CONSTANT'); emit(l.bulb, 9, t, 'CONSTANT');
    if (flicker && i % 3 === 0) { emit(l.bulb, 1, t + 3, 'CONSTANT'); emit(l.bulb, 9, t + 6, 'CONSTANT'); }
    if (l.light) { stage.A.key(l.light, 'intensity', t - 1, 0, 'CONSTANT'); stage.A.key(l.light, 'intensity', t, 170, 'CONSTANT'); }
  });
}
function snowCap(v) {
  const sp = v.spec, L = sp.L, c1 = sp.cab[1], c2 = sp.cab[sp.cab.length - 2], m = mat('snowcap', '#f4f8fc');
  box([c1[4] * 2 + 0.1, (c2[0] - c1[0]) * L + 0.2, 0.14], [0, (c1[0] + c2[0]) / 2 * L, c1[3] + 0.04], m, { origin: 'bottom', parent: v, taper: 0.9 });
  box([sp.W * 0.86, Math.abs(sp.body[0][0] - c1[0]) * L * 0.8, 0.09], [0, (sp.body[0][0] + c1[0]) / 2 * L, sp.body[1][3]], m, { origin: 'bottom', parent: v, taper: 0.9 });
}

// ============================================================== 1. a normal sunny day
function s01_park(n) {
  S.reset(); setLight('day', undefined, { azim: 192, elev: 27, sun: [1.0, 0.9, 0.74] });
  Lt.shadow([0, 2], 34); Lt.fog(90, 1100);
  Look.enable('ps3', { saturation: 1.22, bloom: 0.5, bloomThreshold: 2.0 });
  const land = N.terrain('land', { size: 600, res: 70, height: 14, seed: 6, flat: [[0, 5, 42, 0]], edgeRise: 30 });
  Sp.sun('sun', sunDir(192, 27, 1500), 70, { strength: 16 });
  sky.clouds(9, { seed: 4, height: 210, spread: 900 });
  Bd.slab('path', [0, 10, 0], [3.4, 90], '#d8c9a8', 0.05);
  const keepOut = [[0, -5, 5], [0, 5, 5], [0, 15, 5], [0, 25, 5], [0, 35, 5], [-5, 3, 3]];
  N.forest('trees', { n: 36, area: [-44, 44, -6, 70], land, kinds: ['oak', 'oak', 'birch', 'autumn'], seed: 3, keepOut, size: [0.9, 1.5] });
  N.grassField('grass', { n: 6000, area: [-22, 22, -16, 26], land, keepOut: [[0, -5, 2], [0, 0, 2], [0, 5, 2], [0, 10, 2], [0, 15, 2], [0, 20, 2]] });
  N.flowers('fl', { n: 320, area: [-18, 18, -12, 24], land, keepOut });
  for (let i = 0; i < 5; i++) N.bush(`b${i}`, [(i % 2 ? 1 : -1) * (4 + i), 2 + i * 5, 0], { seed: i });
  props.bench('bench', [-3.1, 3.5, 0], -90);
  St.lampPost('lp1', [2.4, 9, 0], -90, { on: false, style: 'classic', height: 3.6 }); St.lampPost('lp2', [-2.4, 22, 0], 90, { on: false, style: 'classic', height: 3.6 });
  St.trashCan('tc', [-2.6, 6, 0]);
  const a = new Person('mum', { outfit: 'dress', hair: 'long', skin: P.SKIN[1], shirt: '#e8c84a', loc: [0.5, 14, 0] });
  const k = new Person('kid', { outfit: 'casual', hair: 'short', skin: P.SKIN[1], shirt: '#d94f3d', height: 0.6, loc: [-0.4, 14, 0] });
  a.walk([[0.6, 15], [0.5, 8.5]], 1, n, { stride: 0.62 }); k.run([[-0.5, 16.5], [-0.6, 6]], 1, n, { stride: 0.75 });
  const j = new Person('jogger', { outfit: 'hoodie', hair: 'ponytail', skin: P.SKIN[2], shirt: '#2fb3a0', loc: [1.0, -4, 0] });
  j.run([[1.1, -7], [0.9, 12]], 1, n);
  const s = new Person('reader', { outfit: 'casual', hair: 'short', glasses: true, skin: P.SKIN[0], shirt: '#3f7fbf', loc: [-3.0, 3.5, 0], facing: -90 });
  s.sit(1, 0.45); s.phoneCall(20);
  const w = new Person('walker', { outfit: 'suit', hair: 'short', skin: P.SKIN[3], loc: [-0.9, 30, 0] }); w.walk([[-0.9, 34], [-0.8, 24]], 1, n);
  props.flock(7, [[-60, 60, 28], [0, 40, 34], [70, 80, 42]], 1, n + 30, { seed: 2, spread: 5 });
  const { cam, tgt } = S.camera([2.2, -9, 1.5], [0, 14, 6.5], 24);
  S.move(cam, [[1, [2.6, -10.5, 1.3]], [n, [1.6, -7.5, 1.7]]]);
  S.move(tgt, [[1, [0, 14, 5.5]], [n, [-1.5, 14, 8.5]]]);
}

// ============================================================== 2. eight minutes later: the switch
function s02_dark(n) {
  S.reset();
  const fD = at(5.45);
  setLight('afternoon', 1, { azim: 90, elev: 21 }); setLight('afternoon', fD, { azim: 90, elev: 21 }); setLight('sunless', fD + 3, { azim: 90, elev: 40, sunI: 0.6, sky: 0.9 });
  Lt.shadow([0, 0], 42); Lt.fog(70, 700);
  Look.enable('ps3', { bloom: 0.45, bloomThreshold: 2.0 });
  for (const [k, a, b] of [['bloomThreshold', 2.0, 1.0], ['bloom', 0.45, 0.6], ['exposure', 1.1, 1.5], ['vignette', 0.38, 0.5], ['tint', 0.22, 0.3], ['fill', 0.55, 0.25]]) { Look.set(k, a, fD); Look.set(k, b, fD + 3); }
  Look.set('shadows', '#2b4a66', fD); Look.set('shadows', '#1b2a6b', fD + 3);
  const { lamps, buildings } = street();
  const sun = Sp.sun('sun', sunDir(90, 21, 1500), 85, { strength: 16 }); Sp.vanish(sun, fD, 2);
  const stars = sky.stars(700, { seed: 3 }); stars.forEach(s => { stage.A.key(s.material, 'opacity', fD, 0, 'LINEAR'); stage.A.key(s.material, 'opacity', fD + 20, 1); });
  lampsOn(lamps, fD + 22, { flicker: true });
  buildings.forEach((b, i) => { const t = fD + 20 + (i * 11 % 17) * 2; emit(b.windows, 0, t - 1, 'CONSTANT'); emit(b.windows, i % 4 ? 2.4 : 0, t, 'CONSTANT'); if (b.front) { emit(b.front, 0.15, t - 1, 'CONSTANT'); emit(b.front, 3, t, 'CONSTANT'); } });
  const taxi = V.vehicle('taxi', [0, 0, 0], 0, { lightsOn: true, name: 'taxi' }); V.drive(taxi, [[-58, -2.2], [-2, -2.2]], 1, fD + 16, { easeIn: false });
  V.vehicle('hatchback', [-10, 3.4, 0], 90, { seed: 3, name: 'p1' }); V.vehicle('suv', [22, -3.4, 0], -90, { seed: 6, name: 'p2' }); V.vehicle('sedan', [30, 3.4, 0], 90, { seed: 9, name: 'p3' });
  const stopAndLook = (p, path, yaw) => { p.walk(path, 1, fD + 5, { z: 0.18 }); p.poseStand(fD + 11); p.look(fD + 12, { pitch: -28, yaw, dur: 10 }); };
  stopAndLook(Person.random('wA', 3, { loc: [-14, 6.9, 0.18] }), [[-16, 6.9], [-9, 6.9]], -50);
  stopAndLook(Person.random('wB', 9, { loc: [4, 7.8, 0.18], outfit: 'suit' }), [[5, 7.6], [-3, 7.4]], 60);
  stopAndLook(Person.random('wC', 14, { loc: [-12, -6.6, 0.18], outfit: 'dress' }), [[-11, -6.8], [-17, -6.6]], 40);
  stopAndLook(Person.random('wD', 21, { loc: [-22, 6.2, 0.18], outfit: 'hoodie' }), [[-21, 6.3], [-15.5, 6.0]], -30);
  const cop = new Person('cop', { outfit: 'police', loc: [-5.5, 5.4, 0.18], facing: 80 }); cop.poseStand(1); cop.idle(1, fD); cop.poseStand(fD + 6); cop.point(fD + 8, { yaw: 10, pitch: 35 });
  const { cam, tgt } = S.camera([-30, -1, 1.7], [10, 0, 7], 24);
  S.move(cam, [[1, [-33, -1.2, 1.5]], [n, [-27.5, -0.6, 1.9]]]);
  S.move(tgt, [[1, [10, 0.5, 8.5]], [fD, [10, 0.5, 8]], [n, [10, 1.5, 10]]]);
}

// ============================================================== 3. the Moon goes dark
function s03_moon(n) {
  S.reset();
  const fM = at(0.9), fS = at(4.2);
  const moonlit = { azim: 200, elev: 34, sunI: 1.8, sky: 1.0 };
  setLight('night', 1, moonlit); setLight('night', fM, moonlit); setLight('sunless', fM + 12, { azim: 200, elev: 34, sunI: 1.1, sky: 1.0, hor: [0.03, 0.045, 0.12] });
  Lt.shadow([0, 0], 30); Lt.fog(120, 1600);
  Look.enable('ps3_night', { exposure: 1.6, rim: 0.5 });
  const land = N.terrain('hill', { size: 500, res: 60, height: 16, seed: 9, flat: [[0, 0, 14, 5]], edgeRise: 10 });
  const z = 5;
  const moon = sky.moon(sunDir(200, 30, 1300), 105);
  emit(moon.material, 2.6, fM); emit(moon.material, 0.1, fM + 12);
  sky.stars(500, { seed: 2, brightness: 0.9 });
  const more = [...sky.stars(1500, { seed: 7 }), ...sky.stars(900, { seed: 11, minElev: 20 })];
  more.forEach(s => { stage.A.key(s.material, 'opacity', fS, 0, 'LINEAR'); stage.A.key(s.material, 'opacity', fS + 40, 1); });
  N.forest('trees', { n: 60, area: [-90, 90, 14, 160], land, kinds: ['pine', 'oak'], seed: 5, size: [1, 1.7] });
  N.grassField('g', { n: 3500, area: [-14, 14, -10, 14], land });
  const lamp = St.lampPost('lp', [-2.9, -0.6, z], -70, { on: true, light: true, style: 'classic', height: 3.2 });
  props.bench('bench', [2.6, 2.4, z], 160);
  const ps = [['dad', 'casual', 'short', 0, -0.9, 1.0, 1, '#3f7fbf'], ['mum', 'hoodie', 'bun', 1, 0.2, 1.2, 0.95, '#b0506a'], ['kid', 'casual', 'spiky', 1, 0.95, 0.7, 0.6, '#f2c14e']].map(([nm, of, hr, sk, x, y, h, c], i) => {
    const p = new Person(nm, { outfit: of, hair: hr, skin: P.SKIN[sk], shirt: c, height: h, loc: [x, y, z], facing: 172 + i * 8 });
    p.poseStand(1); p.idle(1, n, { seed: i }); p.look(1, { pitch: -30, dur: 1 }); return p;
  });
  ps[2].point(fM + 14, { yaw: 12, pitch: 38 });
  ps[1].look(at(4.4), { pitch: -34, yaw: -35, dur: 22 }); ps[0].look(at(4.8), { pitch: -34, yaw: 40, dur: 22 });
  const { cam, tgt } = S.camera([0.6, -3.5, z + 1.1], [1.5, 30, z + 17], 22);
  S.move(cam, [[1, [0.7, -3.0, z + 1.0]], [n, [0.1, -4.2, z + 1.2]]]);
  S.move(tgt, [[1, [2, 30, z + 16]], [n, [1, 30, z + 19]]]);
}

// ============================================================== 4. Earth leaves its orbit
function s04_orbit(n) {
  S.reset(); Lt.apply('space'); Lt.fog(1e5, 1e6);
  Look.enable('ps3_night', { rim: 0, fill: 0, vignette: 0.42, grain: 0.03, exposure: 1.0, bloom: 0.35, bloomRadius: 0.45, bloomThreshold: 1.6, tint: 0.12 });
  const fV = at(1.0), R = 105, w = 0.0085, th0 = -w * (fV - 1) - 0.1;
  sky.stars(1600, { seed: 4, minElev: -88, brightness: 0.85 });
  const sun = Sp.sun('sun', [0, 0, 0], 24, { strength: 9, light: 5 }); Sp.vanish(sun, fV, 2);
  const amb = ambient('#7f9cff', 0.0); stage.A.key(amb, 'intensity', fV, 0, 'LINEAR'); stage.A.key(amb, 'intensity', fV + 20, 0.9);
  const earth = Sp.planet('earth', [R, 0, 0], 11, { lights: true }); Sp.spinPlanet(earth, 1, n, 0.12);
  emit(earth.lights, 0, fV); emit(earth.lights, 7, fV + 24);
  const moon = Sp.planet('moon', [R + 20, 0, 0], 2.4, { kind: 'moon', seed: 3, detail: 2 });
  const ring = Sp.orbitRing('ring', [0, 0, 0], R, { dashes: 110 });
  stage.A.key(ring.material, 'opacity', fV + 4, 0.55, 'LINEAR'); stage.A.key(ring.material, 'opacity', fV + 40, 0.12);
  const thV = th0 + w * (fV - 1), pV = [R * Math.cos(thV), R * Math.sin(thV), 0], vel = [-R * w * Math.sin(thV), R * w * Math.cos(thV)];
  const posAt = f => f <= fV ? [R * Math.cos(th0 + w * (f - 1)), R * Math.sin(th0 + w * (f - 1)), 0] : [pV[0] + vel[0] * (f - fV), pV[1] + vel[1] * (f - fV), 0];
  for (let f = 1; f <= n + 2; f += 2) {
    const p = posAt(f), a = f * 0.05;
    stage.A.key(earth, 'position', f, p, 'LINEAR');
    stage.A.key(moon, 'position', f, [p[0] + 20 * Math.cos(a), p[1] + 20 * Math.sin(a), 2 * Math.sin(a)], 'LINEAR');
  }
  const end = posAt(n + 260), line = Sp.pathLine('escape', pV, end, { dash: 5, width: 1.1 });
  stage.A.key(line.material, 'opacity', fV + 30, 0, 'LINEAR'); stage.A.key(line.material, 'opacity', fV + 60, 0.85);
  const { cam, tgt } = S.camera([150, -150, 150], [70, 10, 0], 32);
  S.move(cam, [[1, [120, -165, 150]], [n, [170, -95, 120]]]);
  S.move(tgt, [[1, [62, -5, 0]], [fV, [66, 5, 0]], [n, [posAt(n)[0] * 0.8 + 8, posAt(n)[1] * 0.75, 0]]]);
}

// ============================================================== 5. one week: everything freezes
function s05_week(n) {
  S.reset(); setLight('sunless', undefined, { azim: 60, elev: 50, sunI: 0.5 });
  Lt.shadow([0, 0], 40); Lt.fog(25, 260);
  Look.enable('ps3_night', { exposure: 1.35, saturation: 0.9, tint: 0.34, shadows: '#20387a' });
  const { lamps, buildings } = street({ snowy: true });
  lampsOn(lamps, -20, { fraction: 0.55 });
  for (let f = 20; f < n; f += 23) { const l = lamps[2]; emit(l.bulb, 0.5, f, 'CONSTANT'); emit(l.bulb, 9, f + 4, 'CONSTANT'); }
  buildings.forEach((b, i) => { emit(b.windows, i % 4 === 0 ? 1.6 : 0); if (b.front) emit(b.front, i % 5 === 0 ? 2 : 0); });
  sky.stars(900, { seed: 5 });
  W.snow({ n: 3200, area: [-22, 22, -22, 22], top: 16, follow: true, size: 0.11 });
  [['sedan', -9, 3.4, 90, 2], ['suv', 6, -3.4, -90, 6], ['hatchback', 15, 3.4, 90, 4], ['van', -22, -3.4, -90, 8], ['pickup', 28, 3.5, 90, 5]].forEach(([k, x, y, h, sd], i) => snowCap(V.vehicle(k, [x, y, 0], h, { seed: sd, name: `fz${i}` })));
  for (let i = 0; i < 16; i++) { const g = N.rock(`drift${i}`, [-34 + i * 4.6 + (i % 3), (i % 2 ? 1 : -1) * (4.9 + (i % 3) * 0.3), 0.05], { size: 0.9 + (i % 3) * 0.3, seed: i, color: '#eef3f9' }); g.scale.z = 0.45; }
  const coat = (nm, x, c, sk) => new Person(nm, { outfit: 'hoodie', hat: 'beanie', hatColor: c, shirt: c, hair: 'short', skin: P.SKIN[sk], loc: [x, 6.6, 0.18], backpack: '#3a3d44' });
  const a = coat('a', -8, '#b0506a', 1), b = coat('b', -9, '#4a5568', 0);
  a.walk([[-13.5, 5.9], [-8.5, 6.0]], 1, n, { z: 0.18, stride: 0.5, armSwing: 8 }); b.walk([[-14.6, 6.7], [-9.8, 6.8]], 1, n, { z: 0.18, stride: 0.5, armSwing: 8 });
  const amb = V.vehicle('ambulance', [0, 0, 0], 0, { lightsOn: true, name: 'amb' }); V.drive(amb, [[46, 2.2], [8, 2.2]], 1, n); V.beacon(amb, 1, n, 10);
  const { cam, tgt } = S.camera([-16, -3, 1.8], [4, 5, 3.5], 24);
  S.move(cam, [[1, [-18.5, -3.4, 1.6]], [n, [-14.5, -2.6, 2.0]]]);
  S.move(tgt, [[1, [4, 5.5, 4.2]], [n, [6, 5, 3.6]]]);
}

// ============================================================== 6. one year: frozen oceans
function s06_year(n) {
  S.reset(); setLight('sunless', undefined, { azim: 150, elev: 38, sunI: 0.8, sky: 0.9 });
  Lt.shadow([0, 6], 36); Lt.fog(60, 900);
  Look.enable('ps3_night', { exposure: 1.65, saturation: 0.95, tint: 0.34, shadows: '#1e3a80' });
  const ICE = { sand: '#cfe0ee', grass: ['#e6eef6', '#d6e4f0'], rock: '#9fc0dc', snow: '#f6f9fc', dirt: '#b9d2e6', snowLine: 0.7, water: '#9fc0dc' };
  const land = N.terrain('ice', { size: 900, res: 110, height: 4.5, scale: 0.035, seed: 3, biome: ICE, flat: [[0, 4, 12, 0.6]] });
  N.mountains('bergs', { radius: 620, n: 18, height: 120, color: '#aec6de', seed: 8 });
  sky.stars(2200, { seed: 6 }); sky.stars(1200, { seed: 12, minElev: 25 });
  const boat = V.boat('boat', [3.5, 12, 0.5], 118, { color: '#b84a3a', rust: 0.15 }); boat.rotation.y = 0.16; boat.scale.setScalar(1.5);
  emit(boat.lamp, 0);
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28, g = N.rock(`shard${i}`, [3.5 + Math.cos(a) * (3.2 + (i % 3)), 12 + Math.sin(a) * (5.5 + (i % 2)), 0.5], { size: 0.7 + (i % 4) * 0.25, seed: i + 3, color: '#dcebf7' }); g.scale.z = 1.5; }
  N.rocks('floes', { n: 60, area: [-60, 60, -10, 90], land, seed: 9, size: [0.4, 1.5], color: '#d2e4f2', keepOut: [[3.5, 12, 8], [-2, 0, 5]] });
  const p = new Person('walker', { outfit: 'hoodie', hat: 'beanie', hatColor: '#c94f4f', shirt: '#e8743b', skin: P.SKIN[0], backpack: '#3a3d44', loc: [-3, -2, 0.6] });
  p.walk([[-4.2, -4], [-1.6, 3.2]], 1, n, { z: 0.6, stride: 0.5, armSwing: 6 });
  for (let f = 1; f <= n; f += 2) { p.rot('shoulderR', f, -55, 0, 12, 'LINEAR'); p.rot('elbowR', f, -45, 0, 0, 'LINEAR'); }
  const lm = mat('lantern', '#fff0c0', { emit: '#ffb050', emission: 12 });
  box([0.1, 0.1, 0.16], [0, 0, -0.2], lm, { parent: p.j.handR });
  const pl = new THREE.PointLight('#ffb060', 7, 18, 1.4); pl.position.set(0, 0, -0.2); p.j.handR.add(pl);
  for (let f = 1; f <= n; f += 4) stage.A.key(pl, 'intensity', f, 6 + (f * 13 % 9) * 0.25, 'LINEAR');
  W.snow({ n: 900, area: [-20, 20, -20, 20], top: 14, follow: true, size: 0.09, speed: 0.9, wind: [1.2, 0.3] });
  const { cam, tgt } = S.camera([-6, -11, 2.2], [1.5, 8, 2.6], 24);
  S.move(cam, [[1, [-7.5, -12.5, 1.8]], [n, [-5.2, -9.5, 2.5]]]);
  S.move(tgt, [[1, [1.5, 8, 3.4]], [n, [1.8, 9, 2.8]]]);
}

// ============================================================== 7. survivors underground
function s07_bunker(n) {
  S.reset(); setLight('sunless'); Lt.shadow([0, 0], 10); Lt.fog(60, 400);
  Look.enable('ps3_night', { exposure: 1.25, fill: 0.05, rim: 0.1, tint: 0.14, shadows: '#3a2a50', vignette: 0.55, saturation: 1.15 });
  ground('#0c0d10', 400, -0.2);
  const r = In.room('bunker', [0, -1.5, 0], { w: 8.4, d: 9, h: 3, wall: '#7d8388', floor: '#666a70', window: false, door: false, lightColor: '#ffd9a8' });
  const steel = mat('steel', '#5a6068', { gloss: 0.4 }), soil = mat('soil', '#4a3626');
  // grow racks on the back wall
  [-2.7, 0, 2.7].forEach((x, i) => {
    for (const zz of [0.55, 1.6]) {
      box([2.2, 0.6, 0.16], [x, 2.6, zz], soil, { origin: 'bottom' });
      for (let k = 0; k < 4; k++) In.plant(`pl${i}_${zz}_${k}`, [x - 0.8 + k * 0.53, 2.6, zz + 0.1], { size: 0.42, seed: i * 10 + k, pot: '#4a3626' });
      const gm = mat(`grow${i}_${zz}`, '#ffd0f4', { emit: '#ff5ad0', emission: 7 });
      box([2.0, 0.12, 0.05], [x, 2.55, zz + 0.86], gm, { origin: 'bottom' });
    }
    for (const sx of [-1.08, 1.08]) box([0.06, 0.6, 2.6], [x + sx, 2.6, 0], steel, { origin: 'bottom' });
    const gl = new THREE.PointLight('#ff6ad8', 3.5, 7, 1.6); gl.position.set(x, 2.0, 1.4); stage.scene.add(gl);
  });
  // geothermal pipe glowing with the planet's heat
  cylinder(0.42, 3, 10, [3.55, 0.2, 0], steel);
  const heat = mat('heat', '#ffb070', { emit: '#ff6a1e', emission: 6 });
  for (const zz of [0.5, 1.3, 2.1]) cylinder(0.45, 0.22, 10, [3.55, 0.2, zz], heat);
  const hl = new THREE.PointLight('#ff7a2e', 6, 9, 1.5); hl.position.set(3.0, 0.1, 1.3); stage.scene.add(hl);
  for (let f = 1; f <= n; f += 6) { emit(heat, 5 + (f * 7 % 4), f, 'LINEAR'); }
  In.rug('rug', [-1.0, -0.6, 0], 0, { w: 3.2, d: 2.6, color: '#7a3a34', border: '#c9a870' });
  In.table('tb', [-1.0, -0.6, 0], 0, { round: true, w: 1.5 });
  const seat = (nm, ang, o, talk) => {
    const x = -1.0 + Math.cos(ang * D) * 1.15, y = -0.6 + Math.sin(ang * D) * 1.15, facing = ang - 90 + 180;
    In.chair(`ch_${nm}`, [x, y, 0], facing + 180);
    const p = new Person(nm, { loc: [x, y, 0], facing, ...o }); p.sit(1, 0.45);
    if (talk) p.talk(talk, n, { seed: ang }); else p.look(40, { yaw: 25 });
    return p;
  };
  seat('elder', 90, { outfit: 'casual', hair: 'bald', beard: true, hairColor: '#8d8d92', skin: P.SKIN[0], shirt: '#6b7a5a' }, 8);
  seat('woman', 205, { outfit: 'hoodie', hair: 'bun', skin: P.SKIN[2], shirt: '#b0506a' }, 0);
  seat('man', 330, { outfit: 'worker', hat: 'none', hair: 'short', skin: P.SKIN[1] }, 60);
  const kid = new Person('kid', { outfit: 'casual', hair: 'long', skin: P.SKIN[2], shirt: '#f2c14e', height: 0.6, loc: [1.6, 1.7, 0], facing: 160 });
  kid.poseStand(1); kid.idle(1, n); kid.point(50, { yaw: 0, pitch: 10 });
  const doc = new Person('doc', { outfit: 'doctor', hair: 'ponytail', skin: P.SKIN[3], loc: [2.5, 1.75, 0], facing: 200 }); doc.poseStand(1); doc.idle(1, n, { seed: 3 }); doc.talk(80, n, { seed: 2 });
  In.bed('bunk', [-3.3, 1.2, 0], 0, { w: 1.0, color: '#5a6a8a' }); St.crate('c1', [-3.4, -1.8, 0], 10, { size: 0.8 }); St.crate('c2', [-3.3, -1.8, 0.8], 30, { size: 0.6 }); St.barrel('wb', [3.4, -2.2, 0], 0, { color: '#2f6fb0' });
  const { cam, tgt } = S.camera([0, -5.2, 2.6], [0, 1.6, 0.6], 20);
  S.move(cam, [[1, [-1.3, -5.7, 2.8]], [n, [0.9, -4.5, 2.4]]]);
  S.move(tgt, [[1, [-0.4, 1.4, 0.55]], [n, [0.3, 1.4, 0.7]]]);
}

// ============================================================== 8. a tiny warm light in the dark
function s08_drift(n) {
  S.reset(); Lt.apply('space'); Lt.fog(1e5, 1e6);
  Look.enable('ps3_night', { rim: 0, fill: 0, vignette: 0.5, grain: 0.03, exposure: 1.0, bloom: 0.9, bloomThreshold: 0.9, tint: 0.1 });
  sky.stars(2600, { seed: 8, minElev: -88, brightness: 0.9, radius: 1500 });
  ambient('#bcd0ff', 0.3);
  const key = new THREE.DirectionalLight('#dfe8ff', 1.3); key.position.set(-60, -40, 50); stage.scene.add(key);
  const earth = Sp.planet('earth', [0, 0, 0], 7.5, { kind: 'frozen', lights: true, seed: 1 }); Sp.spinPlanet(earth, 1, n, 0.05);
  emit(earth.lights, 9);
  S.move(earth, [[1, [-2, 0, -1]], [n, [3, 6, 1.5]]], 'LINEAR');
  const { cam, tgt } = S.camera([0, -30, 8], [0, 0, 0], 30);
  S.move(cam, [[1, [4, -30, 6]], [n, [-10, -130, 36]]]);
  S.move(tgt, [[1, [0, 0, 0]], [n, [2, 4, 1]]]);
}

// ============================================================== 9. sunrise
function s09_sunrise(n) {
  S.reset();
  const e0 = 2.5, e1 = 15;
  setLight('dawn', 1, { azim: 180, elev: e0, sunI: 1.6, sky: 0.7 }); setLight('morning', n - 30, { azim: 180, elev: e1, sun: [1.0, 0.82, 0.6], hor: [1.0, 0.74, 0.5] });
  Lt.shadow([0, 2], 40); Lt.fog(140, 1900);
  Look.enable('ps3', { saturation: 1.25, bloom: 0.75, bloomThreshold: 1.7, rim: 1.3, fill: 0.7, exposure: 1.15 });
  Look.fade(1, 14);
  const land = N.terrain('land', { size: 700, res: 90, height: 34, seed: 4, sea: 3, flat: [[0, -75, 45, 0.5], [0, 2, 20, 4.6]], edgeRise: 60 });
  const lake = N.water('lake', [0, 0, 3], { size: 1600, res: 40 }); N.waves(lake);
  N.mountains('range', { radius: 800, n: 16, height: 150, arc: [20, 160], color: '#5f6f86' });
  sky.clouds(12, { seed: 9, height: 230, spread: 900, color: '#ffc9a8' });
  const sun = Sp.sun('sun', sunDir(180, e0, 1900), 95, { strength: 18, color: '#ffb060' });
  S.move(sun, [[1, sunDir(180, e0 - 1.5, 1900)], [n - 30, sunDir(180, e1, 1900)]]);
  const z = land.heightAt(0, 0), keepOut = [[0, 0, 8]];
  N.forest('woods', { n: 150, area: [-150, 150, -40, 200], land, kinds: ['pine', 'pine', 'oak', 'birch'], seed: 2, minZ: 4.2, keepOut: [[0, 0, 12], [0, -60, 40], [0, 30, 14], [0, 60, 14]] });
  N.forest('near', { n: 8, area: [-22, -6, 4, 22], land, kinds: ['oak', 'birch'], seed: 7, minZ: 4.2 });
  N.forest('near2', { n: 6, area: [7, 22, 6, 22], land, kinds: ['oak', 'autumn'], seed: 9, minZ: 4.2 });
  N.grassField('grass', { n: 6000, area: [-22, 22, -14, 24], land, minZ: 4.2 });
  N.flowers('fl', { n: 300, area: [-18, 18, -10, 20], land, minZ: 4.2 });
  const a = new Person('parent', { outfit: 'hoodie', hair: 'long', skin: P.SKIN[1], shirt: '#e8743b', loc: [-0.5, 1.5, z], facing: 180 });
  const k = new Person('kid', { outfit: 'casual', hair: 'short', skin: P.SKIN[1], shirt: '#f2c14e', height: 0.6, loc: [0.45, 1.3, z], facing: 180 });
  a.poseStand(1); a.idle(1, n); k.poseStand(1); k.idle(1, n, { seed: 2 });
  k.point(at(1.6), { yaw: 0, pitch: 12 }); k.cheer(at(3.4), n);
  props.flock(9, [[-120, 200, 60], [0, 160, 75], [130, 230, 95]], 1, n + 40, { seed: 4, spread: 7 });
  const { cam, tgt } = S.camera([1.2, -6, z + 1.5], [0, 30, z + 9], 24);
  S.move(cam, [[1, [1.6, -4.6, z + 1.3]], [n, [0.6, -7.5, z + 1.9]]]);
  S.move(tgt, [[1, [0, 30, z + 7]], [n, [0, 30, z + 11]]]);
}

export const SHOTS = { s01_park, s02_dark, s03_moon, s04_orbit, s05_week, s06_year, s07_bunker, s08_drift, s09_sunrise };
