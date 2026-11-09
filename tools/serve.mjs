// Tiny static server for the repo root (player.html, modules, timing json).
//   node tools/serve.mjs [port]   ->  http://localhost:8080/player.html?ep=last-human/ep01&shot=s01_aerial&ui=1
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.ttf': 'font/ttf' };

export function serve(port = 8080) {
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'player.html';
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.statusCode = 404; return res.end('not found'); }
      res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise(ok => srv.listen(port, '127.0.0.1', () => ok(srv)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.argv[2] || 8080;
  await serve(port);
  console.log(`serving ${ROOT} on http://localhost:${port}/player.html?ep=last-human/ep01&shot=s01_aerial&ui=1`);
}
