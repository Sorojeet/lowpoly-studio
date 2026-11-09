// Keyframe animation with Blender-like semantics:
//   A.key(obj, prop, frame[, value][, interp])  -- sets value (if given) then keys the CURRENT value.
// interp of a key applies to the segment after it: 'BEZIER' (ease in/out), 'LINEAR', 'CONSTANT'.
const ease = t => t * t * (3 - 2 * t);

class Track {
  constructor(acc) { this.k = []; this.acc = acc; }
  add(f, v, interp) {
    this.k = this.k.filter(k => Math.abs(k.f - f) > 0.01);
    this.k.push({ f, v: Array.isArray(v) ? v.slice() : v, i: interp });
    this.k.sort((a, b) => a.f - b.f);
  }
  eval(f) {
    const k = this.k, last = k.length - 1;
    if (f <= k[0].f) return k[0].v;
    if (f >= k[last].f) return k[last].v;
    let i = 0;
    while (k[i + 1].f < f) i++;
    const a = k[i], b = k[i + 1];
    if (a.i === 'CONSTANT') return f >= b.f ? b.v : a.v;
    let t = (f - a.f) / (b.f - a.f);
    if (a.i !== 'LINEAR') t = ease(t);
    return Array.isArray(a.v) ? a.v.map((x, j) => x + (b.v[j] - x) * t) : a.v + (b.v - a.v) * t;
  }
}

function accessor(obj, prop) {
  const v = obj[prop];
  if (v && (v.isVector3 || v.isEuler)) return { get: () => [v.x, v.y, v.z], set: a => v.set(a[0], a[1], a[2]) };
  if (v && v.isColor) return { get: () => [v.r, v.g, v.b], set: a => v.setRGB(a[0], a[1], a[2]) };
  if (Array.isArray(v)) return { get: () => obj[prop].slice(), set: a => { obj[prop] = a.slice(); } };
  return { get: () => obj[prop], set: x => { obj[prop] = x; } };
}

let uid = 0;
export class Animator {
  constructor() { this.tracks = new Map(); this.hooks = []; }
  key(obj, prop, frame, value, interp = 'BEZIER') {
    const acc = accessor(obj, prop);
    if (value !== undefined) acc.set(value);
    if (obj.__aid === undefined) Object.defineProperty(obj, '__aid', { value: ++uid, enumerable: false });
    const id = obj.__aid + ':' + prop;
    let tr = this.tracks.get(id);
    if (!tr) this.tracks.set(id, (tr = new Track(acc)));
    tr.add(frame, acc.get(), interp);
  }
  update(f) {
    for (const tr of this.tracks.values()) tr.acc.set(tr.eval(f));
    for (const h of this.hooks) h(f);
  }
}
