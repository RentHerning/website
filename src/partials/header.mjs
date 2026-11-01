import { html, raw, cx } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { logoSvg } from './logo-svg.mjs';

export function brandLockup(ctx, { inverse = false } = {}) {
  return html`<a class="${cx('brand', inverse && 'brand--inverse')}" href="${ctx.link('home')}" aria-label="${ctx.t('a11y.home')}">
    ${raw(logoSvg({ withWordmark: false, className: 'brand__mark', title: '' }).replace('role="img" aria-label=""', 'aria-hidden="true"'))}
    <span class="brand__word" aria-hidden="true">Herning</span>
  </a>`;
}

export function header(ctx) {
  const { t, lang, pageId } = ctx;
  const other = lang === 'da' ? 'en' : 'da';
  const items = [
    { id: 'listings', label: t('nav.listings'), href: ctx.link('listings') },
    { id: 'help', label: t('nav.help'), href: ctx.link('help') },
    { id: 'about', label: t('nav.about'), href: `${ctx.link('home')}#om-os` },
  ];
  const isCurrent = (id) => pageId === id || (id === 'listings' && pageId === 'listing');

  return html`<header class="site-header" data-header>
  <div class="site-header__inner container">
    ${brandLockup(ctx)}
    <nav class="site-nav" id="site-nav" aria-label="${t('a11y.mainNav')}" data-nav>
      <ul class="site-nav__list">
        ${items.map(
          (item) => html`<li><a class="site-nav__link" href="${item.href}"${isCurrent(item.id) ? raw(' aria-current="page"') : ''}>${item.label}</a></li>`,
        )}
      </ul>
      <a class="lang-switch" href="${ctx.alternates[other]}" hreflang="${other}" lang="${other}" aria-label="${t('lang.switchLabel')}">
        ${icon('globe')}<span class="lang-switch__long">${t('lang.switchTo')}</span><span class="lang-switch__short">${t('lang.switchShort')}</span>
      </a>
    </nav>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-toggle
      data-label-open="${t('a11y.menuOpen')}" data-label-close="${t('a11y.menuClose')}">
      <span class="menu-toggle__icon menu-toggle__icon--open">${icon('menu')}</span>
      <span class="menu-toggle__icon menu-toggle__icon--close">${icon('x')}</span>
      <span class="visually-hidden" data-menu-label>${t('a11y.menuOpen')}</span>
    </button>
  </div>
</header>`;
}
