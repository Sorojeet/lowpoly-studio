// PS3-PACK SHOWCASE — one shot per asset family. Also the reference for how to use each module.
//   node tools/render.mjs showcase/ps3-pack s01_people --still 60
//   node tools/render.mjs showcase/ps3-pack all
import { stage, D, mat, emit, box, Buf } from '../../../studio/core.js';
import * as S from '../../../studio/stage.js';
import * as Lt from '../../../studio/lighting.js';
import * as Look from '../../../studio/look.js';
import * as P from '../../../assets/palette.js';
import { Person, crowd, OUTFITS } from '../../../assets/characters/person.js';
import * as V from '../../../assets/vehicles.js';
import * as Bd from '../../../assets/buildings.js';
import * as N from '../../../assets/nature.js';
import * as St from '../../../assets/street.js';
import * as In from '../../../assets/interior.js';
import * as sky from '../../../assets/sky.js';

const DUR = { s01_people: 5, s02_vehicles: 5, s03_street: 6, s04_nature: 6, s05_interior: 5, s06_wasteland: 6 };
export function setTiming() {}
export const frames = shot => Math.round(DUR[shot] * S.FPS);

function floor(color = '#8f9499', size = 400, z = 0) {
  const b = new Buf(); b.box(0, 0, z - 1, size, size, 1, 0);
  const g = b.mesh([mat('floor', color)], 'Floor'); g.castShadow = false; stage.scene.add(g);
}

function s01_people(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 9); Lt.fog(40, 400);
  Look.enable('ps3');
  floor('#9a9da3');
  const kinds = Object.keys(OUTFITS), hairs = ['short', 'long', 'bald', 'short', 'bun', 'ponytail', 'long', 'spiky', 'afro'];
  kinds.forEach((k, i) => {
    const row = i < 4 ? 0 : 1, col = row ? i - 4 : i;
    const x = (col - (row ? 2 : 1.5)) * 0.95, y = row * 1.5 - 0.4;
    const p = new Person(`p_${k}`, { outfit: k, hair: hairs[i], skin: P.SKIN[i % 4], loc: [x, y, row * 0.45], seed: i, glasses: i === 2, beard: i === 8, height: 0.97 + (i % 3) * 0.03 });
    p.poseStand(1); p.idle(1, n, { seed: i });
    if (i === 0) p.wave(15);
    if (i === 1) p.phoneCall(30);
    if (i === 3) p.point(50, { yaw: 30 });
    if (i === 6) p.talk(10, n);
    if (i === 8) p.cheer(40, n);
  });
  box([7, 1.6, 0.45], [0, 1.1, 0], mat('riser', '#7d8087'), { origin: 'bottom' });
  const { cam, tgt } = S.camera([1.5, -8.6, 1.5], [0, 0.3, 1.2], 40);
  S.move(cam, [[1, [-1.6, -8.8, 1.5]], [n, [1.6, -8.2, 1.8]]]);
}

function s02_vehicles(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 24); Lt.fog(60, 500);
  Look.enable('ps3');
  floor('#6a6c72');
  sky.clouds(10, { seed: 2, height: 150, spread: 700 });
  const kinds = ['sportscar', 'sedan', 'hatchback', 'taxi', 'suv', 'pickup', 'police', 'van', 'ambulance'];
  kinds.forEach((k, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    const v = V.vehicle(k, [(col - 1) * 3.3, row * 6.6 - 6, 0], 14, { seed: i + 2, lightsOn: i % 2 === 0, name: `v${i}` });
    V.beacon(v, 1, n);
  });
  V.vehicle('bus', [-8.2, 9, 0], 14, { color: '#e0a02a', name: 'bus' });
  V.vehicle('truck', [8.2, 8, 0], 14, { color: '#2f6fb0', name: 'truck' });
  V.vehicle('sedan', [7.2, -6.5, 0], -35, { rust: 0.9, name: 'wreck', seed: 5 });
  V.motorcycle('bike', [-6.3, -6.5, 0], 35);
  const h = V.helicopter('heli', [-3, 20, 9], 200); V.spin(h, 1, n);
  S.move(h, [[1, [-7, 24, 10]], [n, [3, 18, 11.5]]]);
  const jet = V.airliner('jet', [30, 160, 60], 250);
  S.move(jet, [[1, [60, 190, 62]], [n, [-10, 165, 70]]], 'LINEAR');
  const { cam, tgt } = S.camera([6, -24, 9], [0, 3.5, 1.5], 30);
  S.move(cam, [[1, [-7, -25, 9]], [n, [7, -23, 7]]]);
}

function s03_street(n) {
  S.reset(); Lt.apply('dusk'); Lt.shadow([0, -4], 40); Lt.fog(50, 420);
  Look.enable('ps3_night', { exposure: 1.05, tint: 0.16 });
  floor('#5d7f4c', 900);
  sky.clouds(12, { seed: 6, height: 140, spread: 600, color: '#ffb48a' });
  Bd.road('main', [-80, 0], [80, 0], { width: 9 });
  Bd.crossing('zebra', [3, 0], 0, { width: 9 });
  for (const [sy, hd, seed] of [[1, 0, 3], [-1, 180, 8]]) {
    Bd.slab(`walk${seed}`, [0, sy * 7.2, 0], [160, 5], P.SIDEWALK);
    const row = Bd.streetRow(`row${seed}`, [sy > 0 ? -42 : 42, sy * 9.8, 0.18], { n: 9, seed, heading: hd, lit: 1.6, kinds: ['shop', 'apartment', 'shop', 'house', 'shop'] });
    row.buildings.forEach(b => { if (b.front) emit(b.front, 3); });
  }
  for (let i = -3; i <= 3; i++) {
    St.lampPost(`lp${i}`, [i * 12 + 2, 5.3, 0.18], 0, { light: Math.abs(i) < 2 });
    St.lampPost(`lq${i}`, [i * 12 - 4, -5.3, 0.18], 180, { light: false });
    N.tree(`tr${i}`, [i * 12 + 7, 5.6, 0.18], { kind: i % 2 ? 'oak' : 'autumn', seed: i + 5, size: 0.8 });
  }
  St.busStop('bs', [-6, 6.6, 0.18], 0); St.hydrant('hy', [5.6, 5.4, 0.18]); St.trashCan('tc', [-1.5, 5.6, 0.18]);
  St.mailbox('mb', [9, 5.6, 0.18]); St.vendingMachine('vm', [-10.5, 8.6, 0.18], 0); St.phoneBooth('pb', [13, 6.2, 0.18], 0);
  St.sign('sg', [4.6, -5.2, 0.18], 180, { kind: 'stop' }); St.bench?.('x');
  St.billboard('ad', [-22, 26, 14], 10, { lit: 1.6, color: '#3f6fd0' });
  const taxi = V.vehicle('taxi', [0, 0, 0], 0, { lightsOn: true, name: 'taxi' });
  V.drive(taxi, [[-12, -2.2], [60, -2.2]], 1, n);
  const pol = V.vehicle('police', [0, 0, 0], 0, { lightsOn: true, name: 'pol' });
  V.drive(pol, [[60, 2.2], [-30, 2.2]], 1, n); V.beacon(pol, 1, n);
  V.vehicle('hatchback', [-14, 3.4, 0], 90, { seed: 3, name: 'parked1' }); V.vehicle('suv', [16, -3.4, 0], -90, { seed: 6, name: 'parked2' });
  const a = Person.random('walkerA', 3, { loc: [-9, 6.9, 0.18] }); a.walk([[-9, 6.9], [2, 6.9]], 1, n, { z: 0.18 });
  const b = Person.random('walkerB', 9, { loc: [10, 7.8, 0.18], outfit: 'suit' }); b.walk([[10, 7.8], [1, 7.6]], 1, n, { z: 0.18 });
  const c = new Person('cop', { outfit: 'police', loc: [4.2, 5.2, 0.18], facing: 20 }); c.poseStand(1); c.idle(1, n); c.point(60, { yaw: -40 });
  crowd(4, { x: [-7.5, -4.5], y: [6.3, 7.3], z: 0.18 }, { seed: 4, idle: [1, n], facing: 0 });
  const { cam, tgt } = S.camera([0, 0, 2], [3, 6, 3.5], 26);
  S.move(cam, [[1, [-9, -9.5, 2.0]], [n, [-3, -8.5, 2.6]]]);
  S.move(tgt, [[1, [1, 6, 4.4]], [n, [4, 6, 3.8]]]);
}

function s04_nature(n) {
  S.reset(); Lt.apply('morning'); Lt.shadow([0, 0], 60); Lt.fog(120, 1500);
  Look.enable('ps3', { saturation: 1.22 });
  const land = N.terrain('land', { size: 700, res: 90, height: 34, seed: 4, sea: 3, flat: [[0, -75, 45, 0.5], [0, 2, 20, 4.6]], edgeRise: 60 });
  const lake = N.water('lake', [0, 0, 3], { size: 1600, res: 40 }); N.waves(lake);
  N.mountains('range', { radius: 800, n: 16, height: 300, arc: [20, 160] });
  sky.clouds(12, { seed: 9, height: 190, spread: 800 });
  const keepOut = [[0, 0, 11], [0, -60, 40]];
  N.forest('woods', { n: 170, area: [-150, 150, -40, 200], land, kinds: ['pine', 'pine', 'oak', 'birch'], seed: 2, minZ: 4.2, keepOut });
  N.forest('near', { n: 14, area: [-22, 22, 4, 26], land, kinds: ['oak', 'birch', 'autumn'], seed: 7, minZ: 4.2, keepOut: [[0, 0, 9]] });
  N.rocks('rocks', { n: 40, area: [-40, 40, -30, 30], land, seed: 3, minZ: 3.2, keepOut: [[0, 0, 5]] });
  N.grassField('grass', { n: 5000, area: [-24, 24, -18, 24], land, minZ: 4.2, keepOut: [[0, 0.5, 1.6]] });
  N.flowers('fl', { n: 260, area: [-20, 20, -14, 20], land, minZ: 4.2, keepOut: [[0, 0, 2]] });
  for (let i = 0; i < 6; i++) N.bush(`bush${i}`, [-9 + i * 3.7, 9 + (i % 2) * 3, land.heightAt(-9 + i * 3.7, 9 + (i % 2) * 3)], { seed: i, berries: i % 2 ? '#c8201e' : null });
  const z = land.heightAt(0, 0);
  const fire = St.campfire('fire', [0, 0.5, z]); St.flicker(fire, 1, n);
  St.tent('tent', [-4.2, 3.6, z], -35); St.tent('tent2', [4.6, 3.8, z], 40, { color: '#3f8f6f' });
  St.crate('crate', [2.2, 1.9, z], 20, { size: 0.6 });
  const p1 = new Person('camper1', { outfit: 'hoodie', hair: 'long', loc: [-1.5, 0.2, z], facing: -70, skin: P.SKIN[1] }); p1.sit(1, 0.3); p1.talk(10, n);
  box([0.9, 0.4, 0.3], [-1.6, 0.25, z], mat('log', '#6b4a33'), { origin: 'bottom' });
  const p2 = new Person('camper2', { outfit: 'farmer', hair: 'short', loc: [1.6, 1.6, z], facing: 130, skin: P.SKIN[2], beard: true }); p2.poseStand(1); p2.idle(1, n); p2.wave(50);
  const { cam, tgt } = S.camera([0, 0, 2], [0, 2, z + 2.4], 26);
  S.move(cam, [[1, [7, -15, z + 2.2]], [n, [-3, -12.5, z + 3.0]]]);
  S.move(tgt, [[1, [0, 3, z + 3.2]], [n, [0, 2, z + 2.6]]]);
}

function s05_interior(n) {
  S.reset(); Lt.apply('night'); Lt.shadow([0, 0], 8); Lt.fog(60, 400);
  Look.enable('ps3_night', { exposure: 1.2, vignette: 0.5, fill: 0.1, rim: 0.2 });
  floor('#1c1f26', 400, -0.2);
  const r = In.room('room', [0, -1, 0], { w: 7, d: 8, h: 2.8 });
  In.rug('rug', [-0.6, 0.2, 0], 0); In.sofa('sofa', [-0.6, 1.9, 0], 0);
  In.table('coffee', [-0.6, 0.3, 0], 0, { w: 1.1, d: 0.6, h: 0.42 });
  const tv = In.tv('tv', [-3.1, -0.2, 0], 90);
  In.bookshelf('shelf', [2.4, 2.8, 0], 0, { seed: 2 }); In.floorLamp('fl', [-2.9, 2.5, 0]);
  In.plant('plant', [1.3, 2.6, 0], { seed: 1 }); In.desk('desk', [2.9, -0.2, 0], -90); In.chair('chair', [2.1, -0.2, 0], 90, { seat: '#3f6272' });
  for (let f = 1; f < n; f += 9) emit(tv.screen, 3 + (f * 7 % 5), f, 'LINEAR');
  const p = new Person('viewer', { outfit: 'casual', hair: 'ponytail', loc: [-0.9, 1.75, 0], facing: 60, skin: P.SKIN[3], shirt: '#e8c84a' }); p.sit(1, 0.42); p.look(40, { yaw: -30 });
  const q = new Person('worker', { outfit: 'hoodie', hair: 'short', glasses: true, loc: [2.1, -0.15, 0], facing: -90, skin: P.SKIN[2] }); q.sit(1, 0.45);
  for (const s of 'LR') { q.rot(`shoulder${s}`, 1, -50, 0, 0); q.rot(`elbow${s}`, 1, -50); }
  const { cam, tgt } = S.camera([0, -4.6, 1.8], [0, 1.6, 1.1], 20);
  S.move(cam, [[1, [-1.0, -4.8, 1.7]], [n, [0.8, -4.3, 1.9]]]);
}

function s06_wasteland(n) {
  S.reset(); Lt.apply('afternoon'); Lt.shadow([0, 0], 45); Lt.fog(30, 320);
  Look.enable('ps3_dusty');
  const land = N.terrain('waste', { size: 600, res: 70, height: 9, seed: 11, biome: 'wasteland', flat: [[0, 0, 30, 0]], edgeRise: 30 });
  Bd.road('hw', [0, -120], [0, 160], { width: 10, kerb: false, color: '#4a4a4c' });
  Bd.ruin('r1', [-16, 14, 0], 10, { seed: 2, floors: 4 }); Bd.ruin('r2', [17, 30, 0], -8, { seed: 5, floors: 3, w: 15 });
  Bd.ruin('r3', [-20, 52, 0], 0, { seed: 9, floors: 5, w: 16 }); Bd.ruin('r4', [20, 68, 0], 4, { seed: 12, floors: 4 });
  Bd.gasStation('gas', [22, -6, 0], -90, { color: '#8a6a4a' });
  V.vehicle('sedan', [-2.6, 9, 0], 25, { rust: 0.9, seed: 1, name: 'w1' }); V.vehicle('bus', [3.4, 26, 0], -70, { rust: 0.8, color: '#e0a02a', name: 'w2' });
  V.vehicle('pickup', [-6.5, -3, 0], 160, { rust: 1, seed: 3, name: 'w3' }); V.vehicle('truck', [-3, 50, 0], 8, { rust: 0.85, name: 'w4' });
  St.debris('junk', { n: 110, area: [-12, 12, -10, 40], seed: 2 });
  St.barrier('b1', [2.5, 2, 0], 12); St.barrier('b2', [-2.2, 3.2, 0], -20); St.barrel('fb', [5.4, 3.5, 0], 0, { color: '#5a4a3a', fire: true });
  St.barrel('b3', [6.2, 4.6, 0], 30, { color: '#6b4630', fallen: true });
  const poles = [-20, 10, 40, 70].map((y, i) => St.powerPole(`pp${i}`, [7.5, y, 0], 0)); poles[1].rotation.y = 0.2;
  St.wires('wr', poles.map(p => p.top));
  St.billboard('bb', [-13, 36, 0], 25, { color: '#6b6250', accent: '#a09880', lit: 0 });
  N.forest('dead', { n: 26, area: [-60, 60, -20, 110], land, kinds: ['dead'], seed: 3, keepOut: [[0, 20, 9], [0, 60, 9]] });
  N.rocks('wr', { n: 30, area: [-40, 40, -20, 60], land, seed: 5, color: '#6a6660', keepOut: [[0, 20, 7]] });
  const s = new Person('wanderer', { outfit: 'soldier', hat: 'none', hair: 'short', backpack: '#5a4a3a', beard: true, skin: P.SKIN[0], loc: [0, -4, 0] });
  s.walk([[0.6, -9], [0.2, 1.5]], 1, n, { armSwing: 20 });
  const { cam, tgt } = S.camera([0, -20, 2], [0, 10, 3], 30);
  S.move(cam, [[1, [3.2, -17, 1.2]], [n, [2.4, -8, 1.8]]]);
  S.move(tgt, [[1, [0, 6, 3.4]], [n, [-0.5, 12, 3.2]]]);
}

export const SHOTS = { s01_people, s02_vehicles, s03_street, s04_nature, s05_interior, s06_wasteland };
