import { html } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { listingCard } from '../partials/listing-card.mjs';

export const AREAS = ['Herning', 'Snejbjerg', 'Tjørring', 'Lind', 'Hammerum', 'Gjellerup'];

function hero(ctx) {
  const { t, data } = ctx;
  const n = data.listings.length;
  return html`<section class="hero">
  <div class="hero__visual">
    <div class="hero__scene" data-city aria-hidden="true"
      data-listings-url="${ctx.asset('data/listings.json')}"
      data-model-url="${ctx.asset('city/herning.bin')}"
      data-listing-href="${ctx.link('listing', { id: '__ID__' })}"
      data-per-month="${t('listings.perMonth')}">
      <div class="hero__scene-fallback" style="--still: url('${ctx.asset('city/still.webp')}')"></div>
    </div>
    <p class="city-credit">${t('home.cityCredit')} <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a></p>
  </div>
  <div class="container hero__inner">
    <div class="hero__text">
      <p class="eyebrow">${t('home.eyebrow')}</p>
      <h1>${t('home.heading')}</h1>
      <p class="lead">${t('home.lead')}</p>
      <div class="button-row">
        <a class="button button--lg" href="${ctx.link('listings')}">${t('home.ctaListings')}${n ? html` <span class="button__badge">${n}</span>` : ''} ${icon('arrow-right')}</a>
        <a class="button button--lg button--ghost" href="${ctx.link('help')}">${t('home.ctaTenant')}</a>
      </div>
      <dl class="hero__stats">
        <div><dt>${t('home.statListings')}</dt><dd>${n}</dd></div>
        <div><dt>${t('home.statYears')}</dt><dd>10+</dd></div>
        <div><dt>${t('home.statAreas')}</dt><dd>${AREAS.length}</dd></div>
      </dl>
    </div>
  </div>
</section>`;
}

function newest(ctx) {
  const { t, data } = ctx;
  if (data.listings.length === 0) return '';
  return html`<section class="section" aria-labelledby="newest-title">
  <div class="container">
    <div class="section-head">
      <div>
        <h2 id="newest-title">${t('home.newestTitle')}</h2>
        <p>${t('home.newestLead')}</p>
      </div>
      <a class="button button--ghost" href="${ctx.link('listings')}">${t('home.seeAllCount', { n: data.listings.length })} ${icon('arrow-right')}</a>
    </div>
    <div class="listing-grid">${data.listings.slice(0, 3).map((l) => listingCard(ctx, l))}</div>
  </div>
</section>`;
}

function tenantHelp(ctx) {
  const { t } = ctx;
  const help = ctx.link('help');
  const tiles = [
    { href: `${help}#akut`, icon: 'siren', title: t('home.tenantEmergency'), text: t('home.tenantEmergencyText'), urgent: true },
    { href: `${help}#vicevaert`, icon: 'wrench', title: t('home.tenantCaretaker'), text: t('home.tenantCaretakerText') },
    { href: `${help}#flytning`, icon: 'key-round', title: t('home.tenantMoving'), text: t('home.tenantMovingText') },
  ];
  return html`<section class="section section--green tenant" aria-labelledby="tenant-title">
  <div class="container tenant__grid">
    <div class="tenant__intro">
      <p class="eyebrow eyebrow--light">${t('home.tenantEyebrow')}</p>
      <h2 id="tenant-title">${t('home.tenantTitle')}</h2>
      <p>${t('home.tenantLead')}</p>
      <a class="button button--light" href="${help}">${t('home.tenantAll')} ${icon('arrow-right')}</a>
    </div>
    <ul class="tenant__tiles">
      ${tiles.map(
        (tile) => html`<li><a class="tile${tile.urgent ? ' tile--urgent' : ''}" href="${tile.href}">
        <span class="tile__icon">${icon(tile.icon)}</span>
        <span class="tile__text"><strong>${tile.title}</strong><span>${tile.text}</span></span>
        ${icon('chevron-right', { className: 'tile__arrow' })}
      </a></li>`,
      )}
    </ul>
  </div>
</section>`;
}

function about(ctx) {
  const { t, site } = ctx;
  const points = [
    { icon: 'map-pin', title: t('home.aboutPlaceTitle'), text: t('home.aboutPlaceText'), extra: html`<ul class="area-list">${AREAS.map((a) => html`<li>${a}</li>`)}</ul>` },
    { icon: 'building-2', title: t('home.aboutExperienceTitle'), text: t('home.aboutExperienceText') },
    { icon: 'clipboard-check', title: t('home.aboutRulesTitle'), text: t('home.aboutRulesText'), extra: html`<p class="about__links"><a href="${site.documents.houseRules}">${t('home.aboutDocs')}</a> · <a href="${site.documents.privacy}">${t('home.aboutPrivacy')}</a></p>` },
  ];
  return html`<section class="section about" id="om-os" aria-labelledby="about-title">
  <div class="container about__grid">
    <div class="about__intro">
      <p class="eyebrow">${t('home.aboutEyebrow')}</p>
      <h2 id="about-title">${t('home.aboutTitle')}</h2>
      <p class="lead">${t('home.aboutBody')}</p>
    </div>
    <ul class="about__points">
      ${points.map(
        (p) => html`<li>
        <span class="about__icon">${icon(p.icon)}</span>
        <div>
          <h3>${p.title}</h3>
          <p>${p.text}</p>
          ${p.extra ?? ''}
        </div>
      </li>`,
      )}
    </ul>
  </div>
</section>`;
}

export default {
  id: 'home',
  render(ctx) {
    return {
      bodyClass: 'page-home',
      scripts: ['assets/city.js'],
      // The still image is the hero's largest element on phones: let the browser fetch it early.
      head: html`<link rel="preload" as="image" href="${ctx.asset('city/still.webp')}" fetchpriority="high">`,
      body: html`${hero(ctx)}
${newest(ctx)}
${tenantHelp(ctx)}
${about(ctx)}`,
    };
  },
};
