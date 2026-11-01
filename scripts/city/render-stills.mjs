#!/usr/bin/env node
// Renders the still image of the city (public/city/still.webp). It is what
// phones, small tablets and weak devices see, and it shows on desktop while
// three.js loads.
//
// Needs a built site served locally and Playwright:
//   npm run build && npx http-server dist -p 5180 &   (any static server)
//   npm install --no-save playwright && npx playwright install chromium
//   node scripts/city/render-stills.mjs http://localhost:5180/
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const base = process.argv[2] ?? 'http://localhost:5180/';
const { chromium } = await import('playwright');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
// Reduced motion → the scene renders its final, un-rotated frame immediately.
await page.emulateMedia({ reducedMotion: 'reduce' });
await mkdir(join(ROOT, 'public/city'), { recursive: true });

{
  await page.goto(`${base}?3d`);
  await page.waitForSelector('[data-city].is-ready', { timeout: 30_000 });
  // Only the city: transparent background, no pins, labels or hero text, no fade mask.
  await page.addStyleTag({
    content: `html, body, .hero { background: transparent !important; }
      .city-overlay, .city-credit, .hero__scene-fallback { display: none !important; }
      .hero__inner, .site-header { visibility: hidden !important; }
      .hero__scene { mask-image: none !important; }`,
  });
  await page.waitForTimeout(500);
  const png = await page.locator('[data-city]').screenshot({ omitBackground: true });
  // Re-encode as WebP (keeps transparency, ~10× smaller) using the browser's own encoder.
  const dataUrl = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d').drawImage(img, 0, 0);
    return canvas.toDataURL('image/webp', 0.82);
  }, png.toString('base64'));
  const file = join(ROOT, 'public/city/still.webp');
  await writeFile(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log(`Wrote ${file} (${Math.round((dataUrl.length * 0.75) / 1024)} KB)`);
}
await browser.close();
