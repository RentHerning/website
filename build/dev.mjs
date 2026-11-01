// Local development: build, serve dist/ on http://localhost:5173 and rebuild on changes.
// The browser reloads itself after each rebuild (a small polling snippet is injected).
import { createServer } from 'node:http';
import { existsSync, watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 5173);
let version = 0;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.map': 'application/json',
};

const RELOAD = `<script>(()=>{let v;setInterval(async()=>{try{const n=await (await fetch('/__version')).text();if(v&&n!==v)location.reload();v=n}catch{}},800)})()</script>`;

function rebuild() {
  return new Promise((resolve) => {
    // A child process gives every rebuild fresh module state.
    const child = spawn(process.execPath, [join(ROOT, 'build/build.mjs'), '--dev'], { stdio: 'inherit', env: { ...process.env, SITE_BASE: '/' } });
    child.on('exit', () => {
      version += 1;
      resolve();
    });
  });
}

let timer;
for (const dir of ['src', 'public', 'data'].filter((d) => existsSync(join(ROOT, d)))) {
  watch(join(ROOT, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 120);
  });
}

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/__version') return res.end(String(version));
  let file = normalize(join(DIST, url));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(DIST, '404.html');
    res.statusCode = 404;
  }
  try {
    let body = await readFile(file);
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    if (type.startsWith('text/html')) body = body.toString().replace('</body>', `${RELOAD}</body>`);
    res.setHeader('Content-Type', type);
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, async () => {
  await rebuild();
  console.log(`Dev server on http://localhost:${PORT}`);
});
