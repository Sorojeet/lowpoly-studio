// CAST — fixed, named characters that must look identical in every scene and every video.
// Never change colours / proportions here: continuity. Add new named characters below.
//
//   const old = elder('Elder', { loc, facing });     // old.age.fade(f0, f1) melts his wrinkles, old.eyes.blink(f)
//   const hero = youth('Youth', { loc, facing });    // red jacket; hero.eyes.widen(f)
import { Person } from './person.js';
import { addEyes, addWrinkles } from './face.js';
import { stage, lin, Buf, mat } from '../../studio/core.js';

export const ELDER = { skin: '#d9a585', hair: '#e9e9ee', shirt: '#6f7f5a', pants: '#6b5a48', iris: '#6f8fa8' };
export const SCIENTIST = { skin: '#e3b392', hair: '#eeeef2', iris: '#5a7f9a' };
export const OFFICIAL = { skin: '#d6a07c', hair: '#6a6a70', suit: '#24272e', tie: '#8a1c1c' };
export const YOUTH = { skin: '#e0ac86', hair: '#4a3324', shirt: '#c8402f', pants: '#2b2d33', iris: '#6a4a2e' };

/** The 70-year-old man: bald on top, white side hair and beard, olive cardigan. */
export function elder(name = 'Elder', o = {}) {
  const p = new Person(name, { outfit: 'casual', sleeves: 'long', hair: 'balding', hairColor: ELDER.hair, skin: ELDER.skin,
    shirt: ELDER.shirt, pants: ELDER.pants, shoes: '#4a3a30', height: 0.95, build: 1.04, ...o });
  // white hair around the sides and back
  const P2 = p.j.head.children[0], hm = Array.isArray(P2.material) ? P2.material.find(m => m.name.includes(ELDER.hair)) : P2.material;
  p.hairMat = hm;
  const fb = new Buf();                                   // moustache + short chin beard
  fb.box(0, -0.135, 0.084, 0.1, 0.02, 0.022, 0, 0.8); fb.box(0, -0.1, 0.0, 0.11, 0.07, 0.05, 0, 1.25);
  for (const sx of [-1, 1]) fb.box(0.062 * sx, -0.128, 0.05, 0.022, 0.02, 0.05, 0);
  const fm = fb.mesh([hm]); fm.castShadow = false; p.j.head.add(fm);
  p.eyes = addEyes(p, { iris: ELDER.iris, skin: ELDER.skin });
  p.age = o.wrinkles === false ? null : addWrinkles(p, ELDER.skin);
  /** Hair and beard darken from white to grey-brown between two frames (he gets younger). */
  p.darkenHair = (f0, f1, to = '#8a8078') => { stage.A.key(hm, 'color', f0); stage.A.key(hm, 'color', f1, lin(to)); };
  return p;
}

/** The young man we follow: red jacket, dark trousers, short dark hair. */
export function youth(name = 'Youth', o = {}) {
  const p = new Person(name, { outfit: 'casual', sleeves: 'long', hair: 'neat', hairColor: YOUTH.hair, skin: YOUTH.skin,
    shirt: YOUTH.shirt, pants: YOUTH.pants, shoes: '#f2f2f2', height: 1.0, build: 0.98, ...o });
  p.eyes = addEyes(p, { iris: YOUTH.iris, skin: YOUTH.skin });
  return p;
}

/** The elderly scientist (Part 2 on): tall, thin, full white swept hair, glasses, white moustache, lab coat. Stays old. */
export function scientist(name = 'Scientist', o = {}) {
  const p = new Person(name, { outfit: 'doctor', hair: 'neat', hairColor: SCIENTIST.hair, skin: SCIENTIST.skin,
    shirt: '#f2f3f4', pants: '#4a4f57', shoes: '#2a2620', height: 1.03, build: 0.9, ...o });
  const P2 = p.j.head.children[0], hm = Array.isArray(P2.material) ? P2.material.find(m => m.name.includes(SCIENTIST.hair)) : P2.material;
  const fb = new Buf(); fb.box(0, -0.137, 0.088, 0.11, 0.022, 0.026, 0, 0.75);
  for (const sx of [-1, 1]) fb.box(0.05 * sx, -0.136, 0.072, 0.026, 0.02, 0.03, 0);
  for (const sx of [-1, 1]) {                                     // thin wire-rim glasses (eyes stay visible)
    const x = 0.05 * sx;
    fb.box(x, -0.158, 0.207, 0.066, 0.006, 0.007, 1); fb.box(x, -0.158, 0.162, 0.066, 0.006, 0.006, 1);
    for (const e of [-1, 1]) fb.box(x + e * 0.033, -0.158, 0.162, 0.006, 0.006, 0.051, 1);
    fb.box(0.085 * sx, -0.09, 0.2, 0.006, 0.13, 0.006, 1);
  }
  fb.box(0, -0.158, 0.19, 0.034, 0.006, 0.006, 1);
  const fm = fb.mesh([hm, mat('glassRim', '#2a2d33', { gloss: 0.6 })]); fm.castShadow = false; p.j.head.add(fm);
  p.eyes = addEyes(p, { iris: SCIENTIST.iris, skin: SCIENTIST.skin, size: 0.95 });
  p.age = addWrinkles(p, SCIENTIST.skin);
  return p;
}

/** The government official on the broadcasts: grey hair, dark suit, red tie. */
export function official(name = 'Official', o = {}) {
  const p = new Person(name, { outfit: 'suit', hair: 'neat', hairColor: OFFICIAL.hair, skin: OFFICIAL.skin, shirt: OFFICIAL.suit, pants: OFFICIAL.suit, height: 1.0, build: 1.05, ...o });
  p.eyes = addEyes(p, { iris: '#3a3d44', skin: OFFICIAL.skin, size: 0.9 });
  return p;
}
