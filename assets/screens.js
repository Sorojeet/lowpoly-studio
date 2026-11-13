// SCREENS — glowing video walls / TVs / billboards with real text and graphics (drawn on a 2D canvas).
//
//   const tv = screen('news', [x, y, z], heading, { w: 12, h: 6.75, draw: newsDraw({ headline: 'HUMAN AGING HAS STOPPED' }), live: true });
//   tv.power.v = 0;  stage.A.key(tv.power, 'v', 40, 1);        // switch on at frame 40 (flicker(tv, 40) for a harsh start)
//   const wall = screen('alert', loc, 0, { w: 40, h: 60, draw: alertDraw({ lines: ['POPULATION', 'LIMIT', 'REACHED'] }), live: true });
//   texture: feed = liveFeed(...).texture shows another camera's view (a broadcast);  matte: true = printed sign (lit by the scene, no glow)
//   draw(ctx, W, H, frame) -> paint anything; live: true redraws every frame (tickers, pulsing).  origin = centre of the screen, faces -Y.
import { THREE, stage, D, Buf, mat, group, Rand } from '../studio/core.js';

const font = new FontFace('Poppins', 'url(/assets/fonts/Poppins-Bold.ttf)');
await font.load(); document.fonts.add(font);

export function screen(name, loc, heading = 0, { w = 8, h = 4.5, px = 768, glow = 2.6, frame = '#15171c', depth = 0.35, bezel = 0.25, draw = null, live = false, fog = true, legs = 0, texture = null, matte = false } = {}) {
  const root = group(loc, null, name); root.rotation.z = heading * D;
  const b = new Buf(); b.box(0, depth / 2 + 0.02, -h / 2 - bezel, w + bezel * 2, depth, h + bezel * 2, 0);
  if (legs) for (const sx of [-1, 1]) b.box(sx * w * 0.32, depth / 2 + 0.02, -h / 2 - bezel - legs, 0.5, 0.5, legs, 0);
  root.add(b.mesh([mat(`${name}_frame`, frame)], `${name}_frame`));
  const cv = document.createElement('canvas'); cv.width = px; cv.height = Math.round(px * h / w);
  const ctx = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = matte ? new THREE.MeshLambertMaterial({ map: texture || tex }) : new THREE.MeshBasicMaterial({ map: texture || tex, fog });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2), m);
  pl.position.y = -0.01; root.add(pl);
  const out = Object.assign(root, { power: { v: 1 }, glow, canvas: cv, ctx, tex, mat: m, w, h });
  out.redraw = f => { if (out.drawFn) { out.drawFn(ctx, cv.width, cv.height, f || 1); tex.needsUpdate = true; } };
  out.drawFn = draw; out.redraw(1);
  stage.A.hooks.push(f => { if (!matte) m.color.setScalar(out.glow * Math.max(0, out.power.v)); if (live) out.redraw(f); });
  return out;
}

/** Harsh switch-on: a few flashes, then steady. */
export function flicker(scr, f, { to = 1 } = {}) {
  const A = stage.A; let k = f;
  A.key(scr.power, 'v', f - 1, 0, 'CONSTANT');
  for (const [d, v] of [[0, 0.9], [2, 0.05], [4, 0.6], [5, 0.0], [8, 1.2], [10, 0.4], [12, to]]) A.key(scr.power, 'v', f + d, v, 'CONSTANT');
}

const fit = (ctx, text, maxW, size) => { do { ctx.font = `${size}px Poppins`; size -= 2; } while (ctx.measureText(text).width > maxW && size > 8); };

/** TV news layout: breaking banner, headline, scrolling ticker, an hourglass graphic. */
export function newsDraw({ headline = 'BREAKING NEWS', kicker = 'BREAKING NEWS', sub = '', ticker = '', channel = 'WORLD NEWS', accent = '#d8201c' } = {}) {
  return (c, W, H, f) => {
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0c2a5a'); g.addColorStop(1, '#061226');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.12; c.fillStyle = '#7fb4ff';
    for (let i = 0; i < 9; i++) { const x = ((i * 137 + f * 1.2) % (W + 200)) - 100; c.fillRect(x, 0, 40, H); }
    c.globalAlpha = 1;
    // hourglass, sand frozen mid-fall
    const cx = W * 0.5, cy = H * 0.36, s = H * 0.2;
    c.fillStyle = '#e8f1ff'; c.fillRect(cx - s * 0.8, cy - s * 1.05, s * 1.6, s * 0.14); c.fillRect(cx - s * 0.8, cy + s * 0.91, s * 1.6, s * 0.14);
    c.beginPath(); c.moveTo(cx - s * 0.66, cy - s * 0.9); c.lineTo(cx + s * 0.66, cy - s * 0.9); c.lineTo(cx + s * 0.08, cy); c.lineTo(cx + s * 0.66, cy + s * 0.9); c.lineTo(cx - s * 0.66, cy + s * 0.9); c.lineTo(cx - s * 0.08, cy); c.closePath();
    c.fillStyle = 'rgba(160,200,255,0.35)'; c.fill(); c.lineWidth = s * 0.07; c.strokeStyle = '#e8f1ff'; c.stroke();
    c.fillStyle = '#ffc94a';
    c.beginPath(); c.moveTo(cx - s * 0.4, cy - s * 0.55); c.lineTo(cx + s * 0.4, cy - s * 0.55); c.lineTo(cx, cy - s * 0.04); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(cx - s * 0.5, cy + s * 0.86); c.lineTo(cx + s * 0.5, cy + s * 0.86); c.lineTo(cx, cy + s * 0.45); c.closePath(); c.fill();
    // channel bug
    c.fillStyle = '#ffffff'; c.font = `${H * 0.07}px Poppins`; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(channel, W * 0.035, H * 0.09);
    c.fillStyle = accent; c.beginPath(); c.arc(W * 0.955, H * 0.09, H * 0.025 * (1 + 0.3 * Math.sin(f / 4)), 0, 7); c.fill();
    // lower third
    const y0 = H * 0.6;
    c.fillStyle = accent; c.fillRect(0, y0, W * 0.44, H * 0.1);
    c.fillStyle = '#fff'; fit(c, kicker, W * 0.4, H * 0.075); c.fillText(kicker, W * 0.03, y0 + H * 0.054);
    c.fillStyle = '#f4f6fa'; c.fillRect(0, y0 + H * 0.1, W, H * 0.17);
    c.fillStyle = '#0a1830'; fit(c, headline, W * 0.94, H * 0.13); c.fillText(headline, W * 0.03, y0 + H * 0.19);
    c.fillStyle = '#0a1830'; c.fillRect(0, y0 + H * 0.27, W, H * 0.13);
    c.fillStyle = '#ffd24a'; c.font = `${H * 0.06}px Poppins`;
    const t = (ticker || sub) + '      ', tw = c.measureText(t).width || 1;
    for (let x = -((f * 5) % tw); x < W; x += tw) c.fillText(t, x, y0 + H * 0.337);
  };
}

/** Full-screen state warning: pulsing red field, scan lines, warning triangle, big stacked lines of text. */
export function alertDraw({ lines = ['WARNING'], color = '#c8100c', dark = '#3a0202' } = {}) {
  return (c, W, H, f) => {
    const pulse = 0.82 + 0.18 * Math.sin(f / 5);
    const g = c.createRadialGradient(W / 2, H * 0.45, H * 0.05, W / 2, H * 0.45, H * 0.75); g.addColorStop(0, color); g.addColorStop(1, dark);
    c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalAlpha = pulse; c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalAlpha = 0.22; c.fillStyle = '#000';
    for (let y = (f * 2) % 12; y < H; y += 12) c.fillRect(0, y, W, 4);
    c.globalAlpha = 1;
    c.fillStyle = '#fff'; c.fillRect(0, H * 0.03, W, H * 0.012); c.fillRect(0, H * 0.958, W, H * 0.012);
    // triangle
    const cx = W / 2, ty = H * 0.085, s = W * 0.14;
    c.beginPath(); c.moveTo(cx, ty); c.lineTo(cx + s, ty + s * 1.7); c.lineTo(cx - s, ty + s * 1.7); c.closePath();
    c.lineJoin = 'round'; c.lineWidth = W * 0.035; c.strokeStyle = '#fff'; c.stroke();
    c.fillStyle = '#fff'; c.fillRect(cx - W * 0.02, ty + s * 0.6, W * 0.04, s * 0.62); c.beginPath(); c.arc(cx, ty + s * 1.44, W * 0.026, 0, 7); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const y0 = ty + s * 1.7 + H * 0.06, dy = (H * 0.94 - y0) / lines.length;
    lines.forEach((t, i) => { fit(c, t, W * 0.93, Math.min(dy * 0.95, W * 0.34)); c.fillText(t, cx, y0 + dy * (i + 0.45)); });
  };
}

/** Dead screen: dark glass with drifting static. */
export function staticDraw({ level = 0.25, seed = 1 } = {}) {
  return (c, W, H, f) => {
    const r = new Rand(seed + Math.floor(f / 2));
    c.fillStyle = '#0b0d10'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { const v = Math.floor(r.uniform(30, 150) * level * 4); c.fillStyle = `rgb(${v},${v},${v + 8})`; c.fillRect(r.uniform(0, W), r.uniform(0, H), r.uniform(8, 80), 3); }
  };
}

/** A second camera rendered into a texture every frame (TV broadcast, CCTV). Put the set far away / underground.
 *  const feed = liveFeed([x,y,z] cam, [x,y,z] target, { lens: 40 });  screen(..., { texture: feed.texture }) */
export function liveFeed(pos, target, { w = 640, h = 360, lens = 40 } = {}) {
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const cam = new THREE.PerspectiveCamera(40, w / h, 0.05, 200);
  cam.fov = 2 * Math.atan(12 / lens) / D; cam.up.set(0, 0, 1); cam.position.set(...pos); cam.lookAt(...target); cam.updateProjectionMatrix();
  const r = stage.renderer;
  stage.pre = stage.pre || [];
  stage.pre.push(() => {
    const prevT = r.getRenderTarget(), fg = stage.scene.fog;
    stage.scene.fog = null; r.setRenderTarget(rt); r.render(stage.scene, cam); r.setRenderTarget(prevT); stage.scene.fog = fg;
  });
  return { texture: rt.texture, camera: cam };
}

/** Printed board text: big centred lines on paper/card. */
export function signDraw({ lines = ['SIGN'], bg = '#f4efe2', ink = '#141418', accent = null } = {}) {
  return (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (accent) { c.fillStyle = accent; c.fillRect(0, 0, W, H * 0.05); c.fillRect(0, H * 0.95, W, H * 0.05); }
    c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    const dy = H * 0.86 / lines.length;
    lines.forEach((t, i) => { fit(c, t, W * 0.9, dy * 0.82); c.fillText(t, W / 2, H * 0.07 + dy * (i + 0.5)); });
  };
}

/** Computer terminal: header bar + lines that type themselves in. lines: [{ t, at (frame), color, size, blink }] */
export function terminalDraw({ header = 'TERMINAL', headerColor = '#c8100c', lines = [], bg = '#06090d', grid = true, cps = 40 } = {}) {
  return (c, W, H, f) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    if (grid) { c.strokeStyle = 'rgba(80,140,160,0.08)'; c.lineWidth = 1; for (let y = 0; y < H; y += H / 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
    c.fillStyle = headerColor; c.fillRect(0, 0, W, H * 0.13);
    c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.textAlign = 'left'; fit(c, header, W * 0.9, H * 0.08); c.fillText(header, W * 0.04, H * 0.067);
    let y = H * 0.24;
    for (const l of lines) {
      const size = H * (l.size || 0.075);
      if (f >= l.at) {
        const n = Math.min(l.t.length, Math.floor((f - l.at) / 30 * cps));
        const shown = l.t.slice(0, n), cur = n < l.t.length && Math.floor(f / 4) % 2 ? '_' : '';
        if (!(l.blink && n === l.t.length && Math.floor(f / 9) % 2)) {
          c.fillStyle = l.color || '#7fe0ff'; c.textAlign = l.center ? 'center' : 'left'; fit(c, l.t, W * 0.92, size);
          c.fillText(shown + cur, l.center ? W / 2 : W * 0.04, y);
        }
      }
      y += size * (l.gap || 1.55);
    }
    c.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = (f * 2) % 6; yy < H; yy += 6) c.fillRect(0, yy, W, 2);
  };
}

/** A data screen: scrolling bars + waveform (decoration for lab monitors). */
export function dataDraw({ hue = '#4dc3ff', seed = 1 } = {}) {
  return (c, W, H, f) => {
    const r = new Rand(seed);
    c.fillStyle = '#05090e'; c.fillRect(0, 0, W, H);
    c.fillStyle = hue;
    for (let i = 0; i < 14; i++) { const h = (0.2 + 0.6 * Math.abs(Math.sin(f / 13 + i * 0.7 + r.uniform(0, 6)))) * H * 0.45; c.globalAlpha = 0.75; c.fillRect(W * 0.05 + i * W * 0.064, H * 0.95 - h, W * 0.045, h); }
    c.globalAlpha = 1; c.strokeStyle = '#ffd24a'; c.lineWidth = H * 0.012; c.beginPath();
    for (let x = 0; x < W; x += 4) { const y = H * 0.25 + Math.sin(x / W * 12 + f / 6) * H * 0.08 * Math.sin(x / W * 3 + f / 20); x ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.2)'; for (let yy = 0; yy < H; yy += 5) c.fillRect(0, yy, W, 2);
  };
}
