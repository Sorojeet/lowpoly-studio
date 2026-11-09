// LAST HUMAN — Episode 1 "Day 1": all shots (three.js).
//
//   node tools/render.mjs last-human/ep01 s02_door              # render shot -> build/.../shots/s02_door.mp4
//   node tools/render.mjs last-human/ep01 s02_door --still 120   # one full-size test frame
//   open http://localhost:8080/player.html?ep=last-human/ep01&shot=s02_door&ui=1   (npm run preview)
import { stage, D, mat, emit, box, join } from '../../../studio/core.js';
import * as S from '../../../studio/stage.js';
import * as Lt from '../../../studio/lighting.js';
import * as P from '../../../assets/palette.js';
import { City, HOME, LIGHT_TOWER } from '../../../assets/city.js';
import { Survivor } from '../../../assets/characters/survivor.js';
import * as props from '../../../assets/props.js';
import * as power from '../../../assets/power.js';
import * as sky from '../../../assets/sky.js';

const SEED = 7;     // the series city — keep fixed across episodes
const LEAD = 0.25;  // seconds of silence before narration in each shot
let TIMING = {};
export function setTiming(t) { TIMING = t; }
export const frames = shot => Math.round(TIMING[shot].dur * S.FPS);
/** frame number `sec` seconds after narration starts */
const at = (shot, sec) => 1 + Math.round((sec + LEAD) * S.FPS);

function world(preset, focus, { radius = 90, lit = 0, shadow = 60, ...kw } = {}) {
  S.reset();
  Lt.apply(preset);
  Lt.shadow(focus, shadow);
  const city = new City({ seed: SEED, n: 6 }).build({ focus, detailRadius: radius, ...kw });
  city.allLights(lit);
  return city;
}

const homeLot = city => city.lot(HOME);

/** Kai's apartment door on the south face of his building. */
function entrance(lot) {
  const x = lot.x, yf = lot.y - lot.d / 2;
  const dark = mat('door_dark', '#1a1c22'), fr = mat('door_frame', '#5a4a3c'), awn = mat('awning', '#2f6f73');
  box([2.2, 0.4, 2.6], [x, yf - 0.05, 0.18], dark, { origin: 'bottom' });
  box([2.8, 0.5, 0.25], [x, yf - 0.1, 2.8], fr, { origin: 'bottom' });
  for (const sx of [-1.25, 1.25]) box([0.3, 0.5, 2.8], [x + sx, yf - 0.1, 0.18], fr, { origin: 'bottom' });
  box([4.0, 1.8, 0.18], [x, yf - 0.9, 3.4], awn, { origin: 'bottom', taper: 0.97 });
  box([3.2, 1.0, 0.18], [x, yf - 0.6, 0.18], mat('step', '#bdb6aa'), { origin: 'bottom' });
  box([0.8, 0.05, 0.3], [x + 1.9, yf - 0.06, 2.3], mat('door_sign', '#e6e2d8', { emission: 0.6, emit: '#fff4d0' }));
  return [x, yf];
}

const scatterCars = (pts, seed = 0, kw = {}) => pts.map(([x, y, h], k) => props.car(`car${seed}_${k}`, [x, y, 0], h, { seed: seed * 31 + k, ...kw }));

// ============================================================== shots
function s01_aerial(n) {
  world('dawn', [0, -40], { radius: 70, lit: 1.6, litFraction: 0.12, shadow: 330 });
  sky.clouds(14, { seed: 4, height: 170, color: '#ffd9c4' });
  props.flock(9, [[-80, -150, 60], [0, -120, 70], [90, -60, 85]], 1, n, { seed: 1, spread: 5 });
  scatterCars([[25, -40, 3], [21, -70, 178], [-25, -10, 92], [75, 22, 88], [29, 30, 2]], 1);
  const { cam, tgt } = S.camera([70, -300, 150], [0, 0, 15], 28);
  S.move(cam, [[1, [70, -300, 150]], [n, [40, -195, 92]]]);
  S.move(tgt, [[1, [0, 0, 15]], [n, [5, -20, 4]]]);
}

function s02_door(n) {
  const city = world('morning', [-9, -25], { radius: 60, shadow: 45 });
  const [x, yf] = entrance(homeLot(city));
  Lt.shadow([x, yf - 4], 30);
  const kai = new Survivor('Kai', { loc: [x, yf + 0.3, 0.18], facing: 0 });
  kai.poseStand(1);
  const walkEnd = at('s02_door', 2.0);
  kai.walk([[x, yf + 0.3], [x, yf - 2.6]], 12, walkEnd, { z: 0.18 });
  kai.poseStand(walkEnd + 4);
  kai.look(walkEnd + 10, { yaw: 55 });                     // "No traffic."
  kai.look(at('s02_door', 4.3), { yaw: -50 });             // "No voices."
  kai.look(at('s02_door', 6.4), { pitch: -12 });           // "...holding its breath." looks up
  scatterCars([[x - 7, yf - 11, 2], [x + 14, yf - 13.5, 179]], 2);
  props.bench('bench', [x - 4.5, yf - 2.0, 0.18], 0);
  props.flock(4, [[x + 30, yf - 30, 18], [x - 10, yf - 8, 14], [x - 40, yf + 10, 25]], 30, 200, { seed: 3, spread: 2 });
  const { cam, tgt } = S.camera([x + 2.2, yf - 8.5, 1.0], [x, yf - 1, 1.5], 38);
  S.move(cam, [[1, [x + 3.2, yf - 10.5, 1.3]], [n, [x + 1.8, yf - 7.8, 1.45]]]);
  S.move(tgt, [[1, [x, yf - 1, 1.7]], [n, [x, yf - 2.6, 1.55]]]);
}

function s03_cars(n) {
  const rx = City.road(0), ry = City.road(-1);   // intersection (25,-25)
  world('morning', [rx, ry - 8], { radius: 60, shadow: 40 });
  const cyc = [[1, 'red'], [at('s03_cars', 3.6), 'green'], [at('s03_cars', 5.6), 'amber'], [at('s03_cars', 6.6), 'red']];
  props.trafficLight('tl', [rx - 8.0, ry - 8.5, 0.18], 90, cyc);
  props.trafficLight('tl2', [rx + 8.0, ry + 8.5, 0.18], -90, cyc);
  scatterCars([[rx - 3, ry - 14, 8], [rx + 3.5, ry - 4, 200], [rx - 2.5, ry + 9, 172],
    [rx + 13, ry - 2.5, 95], [rx - 16, ry + 3, -80], [rx - 3.5, ry + 22, 182]], 3);
  props.car('open', [rx + 4.5, ry - 15, 0], 8, { color: '#2f6fb0', doorOpen: 55 });
  props.flock(3, [[rx + 2, ry - 4, 1.9], [rx + 2.2, ry - 4.3, 1.9]], 1, n, { seed: 5, spread: 0.6, flapPeriod: 40 });
  const { cam, tgt } = S.camera([rx - 1, ry - 24, 2.0], [rx - 6, ry - 8.5, 3.6], 30);
  S.move(cam, [[1, [rx - 2.5, ry - 25, 1.8]], [n, [rx + 2.0, ry - 22.5, 2.6]]]);
  S.move(tgt, [[1, [rx - 6.5, ry - 8.5, 4.2]], [n, [rx - 3, ry - 6, 3.0]]]);
}

function s04_walk(n) {
  const rx = City.road(0);
  world('day', [rx, -72], { radius: 60, shadow: 40 });
  const kai = new Survivor('Kai', { loc: [rx, -60, 0], facing: 0 });
  const stop = at('s04_walk', 3.0);
  kai.walk([[rx, -62], [rx + 0.4, -71]], 1, stop);
  kai.poseStand(stop + 3);
  kai.shout(stop + 4);
  kai.poseStand(at('s04_walk', 4.0));
  kai.phoneCall(at('s04_walk', 4.2));
  kai.look(at('s04_walk', 6.0), { yaw: -8, pitch: 10 });
  scatterCars([[rx + 4, -95, 182], [rx - 4.5, -88, 2], [rx + 4.5, -55, 178], [rx - 5, -112, 0]], 4);
  props.flock(6, [[rx - 40, -40, 30], [rx, -70, 22], [rx + 50, -100, 35]], at('s04_walk', 1.0), n, { seed: 6, spread: 4 });
  const { cam, tgt } = S.camera([rx + 1.5, -66, 1.6], [rx, -62, 1.4], 35);
  S.move(cam, [[1, [rx + 1.6, -67.5, 1.7]], [stop, [rx + 1.3, -76.5, 1.55]], [n, [rx + 0.9, -74.3, 1.62]]]);
  S.move(tgt, [[1, [rx, -62, 1.3]], [stop, [rx + 0.3, -71, 1.35]], [n, [rx + 0.4, -71, 1.6]]]);
}

function s05_power(n) {
  S.reset(); Lt.apply('afternoon');
  const loc = [60, 470, 0];
  Lt.shadow([70, 440], 110);
  new City({ seed: SEED, n: 6 }).build({ focus: [400, 400], detailRadius: 1, trees: false, lamps: false }).allLights(0);
  box([900, 900, 0.4], [60, 560, -0.2], mat('field', P.GRASS));
  const h = power.plant('Plant', loc);
  emit(h.windows, 2.5);
  const stop = at('s05_power', 7.0);
  h.towerTops.forEach((top, i) => power.smoke(`steam${i}`, top, 1, n, { rate: 7, rise: 0.16, size: 3.5, seed: 10 + i, stopFrame: stop }));
  power.smoke('stackfume', h.stackTop, 1, n, { rate: 9, rise: 0.2, size: 1.4, seed: 20, color: '#cfcfcf', stopFrame: stop });
  const pts = [[60, 420], [75, 370], [90, 320]];
  pts.forEach((p, k) => power.pylon(`py${k}`, [...p, 0], Math.atan2(-50, 15) / D));
  power.powerLine('lines', pts);
  join(Array.from({ length: 16 }, (_, k) => props.tree(`pt${k}`, [loc[0] - 70 + k * 9, loc[1] - 45 + (k % 3) * 4, 0],
    { seed: k, size: 1.6, kind: k % 2 ? 'pine' : 'round' })), 'PlantTrees');
  props.flock(7, [[150, 380, 40], [60, 450, 55], [-50, 520, 60]], 1, n, { seed: 8, spread: 6 });
  // warning: beacon blinks; plant windows flicker, then die
  for (let f = 1; f < n; f += 14) { emit(h.beacon, 7, f, 'CONSTANT'); emit(h.beacon, 0, f + 7, 'CONSTANT'); }
  let k = 0;
  for (let f = stop - 30; f < stop + 10; f += 5, k++) emit(h.windows, k % 2 === 0 ? 0.3 : 2.2, f);
  emit(h.windows, 0, stop + 12);
  const { cam, tgt } = S.camera([140, 385, 10], [50, 480, 22], 28);
  S.move(cam, [[1, [145, 375, 8]], [n, [118, 402, 13]]]);
  S.move(tgt, [[1, [48, 478, 24]], [n, [45, 482, 30]]]);
}

function s06_blackout(n) {
  const city = world('dusk', [0, 0], { radius: 80, lit: 4.0, litFraction: 0.7, shadow: 330 });
  Lt.apply('dusk', 1);
  Lt.apply('night', n);
  sky.stars(300, { seed: 2, brightness: 0.9 });
  const start = at('s06_blackout', 2.3), step = (n - 25 - start) / city.rings;
  for (let k = 0; k < city.rings; k++) {          // outer districts fail first
    const ring = city.rings - 1 - k, f = Math.floor(start + k * step);
    city.setRing(ring, 4.0, f);
    city.setRing(ring, 0.6, f + 2);
    city.setRing(ring, 3.0, f + 4);               // flicker
    city.setRing(ring, 0.0, f + 7);
  }
  const { cam, tgt } = S.camera([-190, -250, 120], [0, 0, 10], 26);
  S.move(cam, [[1, [-190, -250, 120]], [n, [-165, -228, 104]]]);
  S.move(tgt, [[1, [0, 0, 14]], [n, [5, 5, 10]]]);
}

function rooftop(city) {
  const lot = homeLot(city), top = lot.top + 0.4;
  const far = city.lot(LIGHT_TOWER);
  const ex = lot.x, ey = lot.y - lot.d * 0.96 / 2 + 0.25;
  let ux = far.x - ex, uy = far.y - ey;
  const L = Math.hypot(ux, uy); ux /= L; uy /= L;
  box([lot.w * 0.96, 0.3, 0.35], [lot.x, ey - 0.05, top], mat('roof', P.ROOF), { origin: 'bottom' });
  Lt.shadow([ex, ey, top], 30);
  return { lot, far, ex, ey, top, ux, uy };
}

function nightWorld() {
  const city = world('blackout', [0, -60], { radius: 50, lit: 0, shadow: 60 });
  Lt.fog(250, 1600);
  sky.stars(700, { seed: 2, brightness: 1.1 });
  sky.moon([-500, 700, 420], 26);
  return city;
}

function s07_rooftop(n) {
  const city = nightWorld();
  const { ex, ey, top, ux, uy } = rooftop(city);
  const kai = new Survivor('Kai', { loc: [ex, ey, top + 0.35], facing: Math.atan2(uy, ux) / D + 90 });
  kai.sit(1);
  kai.look(at('s07_rooftop', 3.0), { pitch: -25 });   // "Just stars..."
  kai.look(at('s07_rooftop', 6.2), { yaw: 6 });
  const sx = -uy, sy = ux;
  const c0 = [ex - ux * 4.5 + sx * 1.6, ey - uy * 4.5 + sy * 1.6, top + 1.8];
  const c1 = [ex - ux * 6.0 + sx * 2.4, ey - uy * 6.0 + sy * 2.4, top + 3.2];
  const { cam, tgt } = S.camera(c0, [ex, ey, top + 1], 26);
  S.move(cam, [[1, c0], [n, c1]]);
  // dark horizon with Kai -> tilt up to the stars -> settle back on Kai
  const p = (d, z) => [ex + ux * d, ey + uy * d, top + z];
  S.move(tgt, [[1, p(6, 0.6)], [at('s07_rooftop', 2.6), p(8, 1.2)], [at('s07_rooftop', 4.6), p(30, 34)],
    [at('s07_rooftop', 5.8), p(30, 36)], [n - 15, p(7, 0.9)], [n, p(7, 0.9)]]);
}

function s08_light(n) {
  const city = nightWorld();
  const { far, ex, ey, top, ux, uy } = rooftop(city);
  const kai = new Survivor('Kai', { loc: [ex, ey, top + 0.35], facing: Math.atan2(uy, ux) / D + 90 });
  kai.sit(1);
  // one window on the far building's face toward Kai
  const faceY = far.y + far.d / 2 + 0.12, wz = 0.18 + (far.floors - 4) * 3.3 + 0.9;
  const lm = mat('the_light', '#2a3442', { emit: '#ffd27a' });
  box([1.6, 0.1, 1.8], [far.x + 1.5, faceY, wz], lm, { origin: 'bottom' });
  const on = at('s08_light', 3.2);
  emit(lm, 0, on - 1, 'CONSTANT'); emit(lm, 9, on); emit(lm, 2, on + 3); emit(lm, 6, on + 6);
  kai.look(on + 6, { yaw: -4, pitch: 6 });
  // over-the-shoulder, slow push toward the light
  const sx = -uy, sy = ux, lx = far.x + 1.5, ly = faceY, lz = wz + 0.9;
  const c0 = [ex - ux * 2.4 + sx * 0.9, ey - uy * 2.4 + sy * 0.9, top + 1.75];
  const c1 = [ex - ux * 1.2 + sx * 0.7, ey - uy * 1.2 + sy * 0.7, top + 1.6];
  const { cam, tgt, lens } = S.camera(c0, [lx, ly, lz], 40);
  S.move(cam, [[1, c0], [on, c0], [n, c1]]);
  S.move(tgt, [[1, [lx, ly, lz - 10]], [on, [lx, ly, lz - 6]], [n, [lx, ly, lz]]]);
  stage.A.key(lens, 'lens', on, 40);
  stage.A.key(lens, 'lens', n, 62);
}

export const SHOTS = { s01_aerial, s02_door, s03_cars, s04_walk, s05_power, s06_blackout, s07_rooftop, s08_light };
