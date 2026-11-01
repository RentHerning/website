// Inline SVG icons from lucide-static (ISC licence), read at build time.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { raw } from './html.mjs';

const require = createRequire(import.meta.url);
const ICON_DIR = join(dirname(require.resolve('lucide-static/package.json')), 'icons');
const cache = new Map();

/**
 * icon('house') → inline <svg>. Decorative by default (aria-hidden);
 * pass { label } to make it announce as an image.
 */
export function icon(name, { label, size, className = '' } = {}) {
  if (!cache.has(name)) {
    const file = readFileSync(join(ICON_DIR, `${name}.svg`), 'utf8');
    const body = file.replace(/<!--.*?-->/s, '').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
    cache.set(name, body.replace(/\s*\n\s*/g, ''));
  }
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  const dims = size ? ` width="${size}" height="${size}"` : '';
  return raw(
    `<svg class="icon icon-${name} ${className}"${dims} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${cache.get(name)}</svg>`,
  );
}
