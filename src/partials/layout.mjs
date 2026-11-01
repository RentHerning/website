import { html, raw } from '../lib/html.mjs';
import { header } from './header.mjs';
import { footer } from './footer.mjs';

/**
 * Full HTML document around a page body.
 * page: { title, description, bodyClass, head, scripts, noindex, image }
 */
export function layout(ctx, page, body) {
  const { t, lang, site } = ctx;
  const title = page.title ? `${page.title} · ${site.name}` : `${site.name} · ${t('home.title')}`;
  const description = page.description ?? t('meta.siteDescription');

  return html`<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="theme-color" content="#254031">
  ${page.noindex || site.noindex ? raw('<meta name="robots" content="noindex">') : ''}
  <link rel="canonical" href="${ctx.absolute(ctx.currentUrl)}">
  ${Object.entries(ctx.alternates).map(
    ([l, url]) => html`<link rel="alternate" hreflang="${l}" href="${ctx.absolute(url)}">`,
  )}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${site.name}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:locale" content="${lang === 'da' ? 'da_DK' : 'en_GB'}">
  ${page.image ? html`<meta property="og:image" content="${page.image}">` : ''}
  <link rel="icon" href="${ctx.asset('favicon.svg')}" type="image/svg+xml">
  <link rel="preload" href="${ctx.asset('assets/fonts/fira-sans-latin-400-normal.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${ctx.asset('assets/fonts/montserrat-latin-600-normal.woff2')}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${ctx.asset('assets/main.css')}">
  ${page.head ?? ''}
  <script type="module" src="${ctx.asset('assets/main.js')}"></script>
  ${(page.scripts ?? []).map((src) => html`<script type="module" src="${ctx.asset(src)}"></script>`)}
</head>
<body class="${page.bodyClass ?? ''}">
  <a class="skip-link" href="#main">${t('a11y.skip')}</a>
  ${header(ctx)}
  <main id="main" tabindex="-1">
${body}
  </main>
  ${footer(ctx)}
  ${site.rita.script
    ? html`<script src="${site.rita.script}" defer data-site="${site.base}" data-lang="${lang}"${site.contact.emergencyPhone ? raw(` data-emergency-phone="${site.contact.emergencyPhone}"`) : ''}></script>`
    : ''}
</body>
</html>
`;
}
