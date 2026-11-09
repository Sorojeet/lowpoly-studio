// Headless renderer: loads player.html in Chromium, renders every frame of a shot to JPEG
// (resumable: frames already on disk are skipped), then encodes one mp4 per shot with soft glow.
//
//   node tools/render.mjs last-human/ep01 s02_door               # one shot
//   node tools/render.mjs last-human/ep01 all                    # every shot in the episode
//   node tools/render.mjs last-human/ep01 s02_door --still 120   # single test frame -> build/<ep>/stills
//   options: --res 50 (percent, upscaled on encode)  --force (re-render frames)
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { serve, ROOT } from './serve.mjs';

const require = createRequire(import.meta.url);
function playwright() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

const W = 1080, H = 1920, FPS = 30;
// soft bloom on bright pixels (lit windows, lamps, the light), done in RGB so colours stay true
export const GLOW = "format=gbrp,split[a][b];[b]lutrgb=r='if(gt(val,200),val,0)':g='if(gt(val,200),val,0)':b='if(gt(val,200),val,0)'," +
  'gblur=sigma=18[g];[a][g]blend=all_mode=screen:all_opacity=0.5';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const [ep, which] = args;
const res = +opt('--res', 100), still = opt('--still', null), force = args.includes('--force');
const EP = path.join(ROOT, 'build', ep);

function encode(dir, out) {
  const vf = `scale=${W}:${H}:flags=lanczos,${GLOW},format=yuv420p`;
  const part = out.replace(/\.mp4$/, '.part.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-start_number', '1', '-i', path.join(dir, 'f_%04d.jpg'),
    '-filter_complex', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), part], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
  fs.renameSync(part, out);
}

async function renderShot(browser, port, shot) {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://127.0.0.1:${port}/player.html?ep=${ep}&shot=${shot}&res=${res}`);
  await page.waitForFunction('window.ready || window.loadError', null, { timeout: 300000 });
  const err = await page.evaluate('window.loadError');
  if (err) throw new Error(err);
  const n = await page.evaluate('window.N');
  const grab = async (f, file) => {
    const data = await page.evaluate(f => window.renderFrame(f), f);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(data.split(',')[1], 'base64'));
    fs.renameSync(tmp, file);
  };
  if (still) {
    fs.mkdirSync(path.join(EP, 'stills'), { recursive: true });
    const file = path.join(EP, 'stills', `${shot}_${String(still).padStart(4, '0')}.jpg`);
    await grab(+still, file);
    console.log('still', file);
  } else {
    const dir = path.join(EP, 'frames', shot);
    fs.mkdirSync(dir, { recursive: true });
    const t0 = Date.now(); let done = 0;
    for (let f = 1; f <= n; f++) {
      const file = path.join(dir, `f_${String(f).padStart(4, '0')}.jpg`);
      if (!force && fs.existsSync(file) && fs.statSync(file).size > 0) continue;
      await grab(f, file); done++;
      if (done % 50 === 0) console.log(`  ${shot} ${f}/${n}  ${((Date.now() - t0) / done / 1000).toFixed(2)} s/frame`);
    }
    fs.mkdirSync(path.join(EP, 'shots'), { recursive: true });
    encode(dir, path.join(EP, 'shots', `${shot}.mp4`));
    console.log(`done ${shot} ${n} frames ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  await page.close();
}

const srv = await serve(0);
const port = srv.address().port;
const browser = await playwright().chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  let shots = [which];
  if (which === 'all') {
    const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'series', ep, 'script.json')));
    shots = script.shots.map(s => s.id);
  }
  for (const s of shots) await renderShot(browser, port, s);
} catch (e) { console.error('FAIL', e.message); process.exitCode = 1; }
await browser.close();
srv.close();
