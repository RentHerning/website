// Static site build: renders every page per language to dist/, compiles SCSS,
// bundles the browser JS and copies public files and fonts.
//
//   node build/build.mjs            production build (SITE_BASE=/website/ for GitHub Pages)
//   node build/build.mjs --dev      unminified, used by build/dev.mjs
import { mkdir, rm, writeFile, cp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const dev = process.argv.includes('--dev');

// Fresh imports on every build so the dev watcher picks up template changes.
const stamp = Date.now();
const load = (rel) => import(`${pathToFileURL(join(ROOT, rel)).href}?t=${stamp}`);

const FONTS = [
  ['montserrat', 'montserrat-latin-500-normal.woff2'],
  ['montserrat', 'montserrat-latin-600-normal.woff2'],
  ['montserrat', 'montserrat-latin-700-normal.woff2'],
  ['fira-sans', 'fira-sans-latin-400-normal.woff2'],
  ['fira-sans', 'fira-sans-latin-400-italic.woff2'],
  ['fira-sans', 'fira-sans-latin-500-normal.woff2'],
  ['fira-sans', 'fira-sans-latin-600-normal.woff2'],
];

export async function build() {
  const started = performance.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, 'assets/fonts'), { recursive: true });

  // Static files and fonts.
  if (existsSync(join(ROOT, 'public'))) await cp(join(ROOT, 'public'), DIST, { recursive: true });
  for (const [pkg, file] of FONTS) {
    await cp(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file), join(DIST, 'assets/fonts', file));
  }

  // Styles.
  const css = sass.compile(join(ROOT, 'src/scss/main.scss'), {
    style: dev ? 'expanded' : 'compressed',
    loadPaths: [join(ROOT, 'node_modules')],
  }).css;
  await writeFile(join(DIST, 'assets/main.css'), css);

  // Scripts. Every file in src/js/entries becomes a page script; shared code is split out.
  const { readdir } = await import('node:fs/promises');
  const entryDir = join(ROOT, 'src/js/entries');
  const entries = (await readdir(entryDir)).filter((f) => f.endsWith('.js')).map((f) => join(entryDir, f));
  await esbuild.build({
    entryPoints: entries,
    outdir: join(DIST, 'assets'),
    bundle: true,
    splitting: true,
    format: 'esm',
    target: ['es2020'],
    minify: !dev,
    sourcemap: dev,
    chunkNames: 'chunks/[name]-[hash]',
    logLevel: 'warning',
  });

  // Cache-busting version for CSS/JS URLs.
  const version = createHash('sha1').update(css).update(String(stamp)).digest('hex').slice(0, 8);

  // Pages.
  const { site } = await load('src/lib/site.mjs');
  const { translator, formatters } = await load('src/lib/i18n.mjs');
  const { routePath } = await load('src/routes.mjs');
  const { pages, notFound } = await load('src/pages/index.mjs');
  const { layout } = await load('src/partials/layout.mjs');
  const data = await loadData();

  const makeCtx = (lang, pageId, params, currentPath) => {
    const url = (path) => `${site.base}${path}`;
    const alternates = Object.fromEntries(
      site.languages.map((l) => [l, currentPath == null ? url(routePath('home', l)) : url(routePath(pageId, l, params))]),
    );
    return {
      lang,
      site,
      data,
      pageId,
      t: translator(lang),
      fmt: formatters(lang),
      link: (id, p = {}) => url(routePath(id, lang, p)),
      asset: (path) => `${url(path)}${/\.(css|js)$/.test(path) ? `?v=${version}` : ''}`,
      absolute: (path) => new URL(path, site.origin).href,
      currentUrl: currentPath == null ? url('404.html') : url(currentPath),
      alternates,
    };
  };

  let count = 0;
  for (const page of pages) {
    const paramList = page.entries ? page.entries(data) : [{}];
    for (const lang of site.languages) {
      for (const params of paramList) {
        const path = routePath(page.id, lang, params);
        const ctx = makeCtx(lang, page.id, params, path);
        const result = page.render(ctx, params);
        await writePage(join(path, 'index.html'), layout(ctx, result, result.body));
        count += 1;
      }
    }
  }
  const ctx404 = makeCtx(site.defaultLanguage, 'notFound', {}, null);
  const r404 = notFound.render(ctx404);
  await writePage('404.html', layout(ctx404, r404, r404.body));

  // Machine-readable copy of the listings for client scripts (3D pins etc.).
  await mkdir(join(DIST, 'data'), { recursive: true });
  await writeFile(join(DIST, 'data/listings.json'), JSON.stringify(data.listings));
  await writeFile(join(DIST, '.nojekyll'), '');

  const ms = Math.round(performance.now() - started);
  console.log(`Built ${count + 1} pages to dist/ in ${ms} ms (base ${site.base})`);
}

async function writePage(rel, content) {
  const file = join(DIST, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, String(content));
}

async function loadData() {
  const file = join(ROOT, 'data/listings.json');
  if (!existsSync(file)) return { listings: [], fetchedAt: null };
  const json = JSON.parse(await readFile(file, 'utf8'));
  return { listings: json.listings ?? [], fetchedAt: json.fetchedAt ?? null };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
