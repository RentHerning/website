import { html, raw } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { listingCard } from '../partials/listing-card.mjs';
import {
  imageUrl,
  srcset,
  photos,
  floorPlans,
  locationLabel,
  availableNow,
  moveInCost,
  roomsCount,
  floorLabel,
  FEATURE_ICONS,
} from '../lib/listing.mjs';

/** Landlord text → paragraphs; single line breaks are kept. */
function descriptionHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => html`<p>${p.split('\n').map((line, i) => (i ? [raw('<br>'), line] : line))}</p>`);
}

function gallery(ctx, l) {
  const { t } = ctx;
  // Photos first, floor plans last.
  const images = [...photos(l), ...floorPlans(l)];
  if (images.length === 0) return '';
  const total = images.length;
  return html`<section class="gallery" aria-label="${t('listing.gallery')}" data-gallery>
  <ul class="gallery__track" data-track>
    ${images.map(
      (img, i) => html`<li class="gallery__item${i === 0 ? ' gallery__item--hero' : ''}${i > 4 ? ' gallery__item--extra' : ''}">
      <a href="${imageUrl(img.url, { w: 1600 })}" data-index="${i}" aria-label="${img.floorPlan ? t('listing.floorPlan') : t('listings.photo', { n: i + 1, total })}">
        <img src="${imageUrl(img.url, { w: i === 0 ? 1200 : 600, h: i === 0 ? 900 : 450 })}"
          srcset="${srcset(img.url, i === 0 ? [600, 900, 1200, 1600] : [400, 600, 900], 0.75)}"
          sizes="${i === 0 ? '(min-width: 64em) 60vw, 100vw' : '(min-width: 64em) 20vw, 100vw'}"
          width="1200" height="900" alt="" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async"
          ${i === 0 ? raw('fetchpriority="high"') : ''}>
        ${img.floorPlan ? html`<span class="gallery__tag">${t('listing.floorPlan')}</span>` : ''}
      </a>
    </li>`,
    )}
  </ul>
  <p class="gallery__counter" aria-hidden="true" data-counter>1 / ${total}</p>
  ${total > 1 ? html`<button type="button" class="gallery__all button button--light" data-open-gallery>${icon('images')} ${t('listing.showAll', { n: total })}</button>` : ''}
  <dialog class="lightbox" data-lightbox aria-label="${t('listing.gallery')}">
    <div class="lightbox__bar">
      <p class="lightbox__count" data-lightbox-count></p>
      <button type="button" class="lightbox__btn" data-close aria-label="${t('listing.close')}">${icon('x')}</button>
    </div>
    <figure class="lightbox__stage">
      <img data-lightbox-img alt="">
    </figure>
    <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--prev" data-prev aria-label="${t('listing.prev')}">${icon('chevron-left')}</button>
    <button type="button" class="lightbox__btn lightbox__nav lightbox__nav--next" data-next aria-label="${t('listing.next')}">${icon('chevron-right')}</button>
  </dialog>
  <script type="application/json" data-gallery-images>${raw(
    JSON.stringify(
      images.map((img, i) => ({
        src: imageUrl(img.url, { w: 1600 }),
        label: img.floorPlan ? t('listing.floorPlan') : t('listings.photo', { n: i + 1, total }),
      })),
    ).replace(/</g, '\\u003c'),
  )}</script>
</section>`;
}

function factsTable(ctx, l) {
  const { t, fmt } = ctx;
  const rows = [
    [t('listing.type'), t(`category.${l.category}`)],
    [t('listing.sizeLabel'), t('listings.size', { n: fmt.number(l.size) })],
    [t('listing.roomsLabel'), roomsCount(l)],
    [t('listing.floor'), floorLabel(ctx, l.floor)],
    [t('listing.available'), availableNow(l) ? t('listing.asap') : fmt.date(l.availableFrom)],
    [t('listing.period'), l.rentalPeriod ? t('listing.months', { n: l.rentalPeriod }) : t('listing.unlimited')],
    [t('listing.energy'), l.energyRating],
  ].filter(([, v]) => v != null && v !== '');
  return html`<dl class="facts">
    ${rows.map(([k, v]) => html`<div class="facts__row"><dt>${k}</dt><dd>${v}</dd></div>`)}
  </dl>`;
}

function economyCard(ctx, l) {
  const { t, fmt } = ctx;
  const rows = [
    [t('listing.rent'), l.rent],
    [t('listing.extraCosts'), l.extraCosts],
    [t('listing.deposit'), l.deposit],
    [t('listing.prepaid'), l.prepaidRent],
  ].filter(([, v]) => v > 0);
  return html`<aside class="economy" aria-labelledby="economy-title">
  <h2 class="economy__title" id="economy-title">${t('listing.economy')}</h2>
  <p class="economy__price"><strong>${fmt.number(l.rent)}</strong> ${t('listings.perMonth')}</p>
  <dl class="economy__rows">
    ${rows.map(([k, v]) => html`<div><dt>${k}</dt><dd>${fmt.kr(v)}</dd></div>`)}
    <div class="economy__total"><dt>${t('listing.moveIn')}</dt><dd>${fmt.kr(moveInCost(l))}</dd></div>
  </dl>
  <p class="economy__note">${t('listing.moveInNote')}</p>
  <a class="button button--lg button--block" href="${l.url}" rel="noopener" data-contact>${t('listing.contact')} ${icon('external-link')}</a>
  <p class="economy__note">${t('listing.contactNote')}</p>
</aside>`;
}

function mapBlock(ctx, l) {
  if (!l.location) return '';
  const { t } = ctx;
  const { lat, lng } = l.location;
  const d = 0.006;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d * 1.6},${lat - d},${lng + d * 1.6},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  return html`<section class="listing-section" aria-labelledby="map-title">
  <h2 id="map-title">${t('listing.location')}</h2>
  <p class="muted">${locationLabel(l)}${l.postalCode ? `, ${l.postalCode}` : ''}. ${t('listing.locationNote')}</p>
  <div class="map" data-map data-src="${embed}">
    <div class="map__placeholder">
      ${icon('map-pin')}
      <button type="button" class="button button--ghost" data-load-map>${t('listing.showMap')}</button>
      <p>${t('listing.mapPrivacy')}</p>
    </div>
  </div>
  <p><a href="${link}" rel="noopener">${t('listing.openMap')} ${icon('external-link', { className: 'icon--sm' })}</a></p>
</section>`;
}

export default {
  id: 'listing',
  entries: (data) => data.listings.map((l) => ({ id: l.id })),
  render(ctx, { id }) {
    const { t, fmt, data, lang } = ctx;
    const l = data.listings.find((x) => x.id === id);
    const features = Object.entries(l.features).filter(([k, v]) => v && FEATURE_ICONS[k]);
    const others = data.listings.filter((x) => x.id !== id).slice(0, 3);
    const where = locationLabel(l);
    const cover = photos(l)[0] ?? l.images[0];

    return {
      title: `${t(`category.${l.category}`)}, ${where}`,
      description: `${t(`category.${l.category}`)} · ${t('listings.size', { n: l.size })} · ${t('listings.rooms', { n: roomsCount(l) })} · ${fmt.kr(l.rent)} ${t('listings.perMonthLong')} · ${where}`,
      image: cover ? imageUrl(cover.url, { w: 1200, h: 630 }) : null,
      bodyClass: 'page-listing',
      scripts: ['assets/listing.js'],
      body: html`<div class="container listing-top">
  <nav class="crumbs" aria-label="${t('listing.breadcrumb')}">
    <a href="${ctx.link('listings')}">${icon('arrow-left')} ${t('listing.back')}</a>
  </nav>
</div>
<div class="container">
  ${gallery(ctx, l)}
</div>
<div class="container listing-layout">
    <header class="listing-head">
      <p class="eyebrow">${t(`category.${l.category}`)} · ${l.postalCode ?? ''} ${l.area || l.city}</p>
      <h1>${where}</h1>
      <ul class="listing-head__facts">
        <li>${icon('ruler-dimension-line')} ${t('listings.size', { n: fmt.number(l.size) })}</li>
        <li>${icon('bed-double')} ${t('listings.roomsLong', { n: roomsCount(l) })}</li>
        <li class="${availableNow(l) ? 'is-now' : ''}">${icon('calendar')} ${availableNow(l) ? t('listings.now') : t('listings.from', { date: fmt.date(l.availableFrom) })}</li>
      </ul>
    </header>
  <div class="listing-main">
    <section class="listing-section" aria-labelledby="facts-title">
      <h2 id="facts-title">${t('listing.facts')}</h2>
      ${factsTable(ctx, l)}
    </section>

    ${l.description
      ? html`<section class="listing-section" aria-labelledby="desc-title">
      <h2 id="desc-title">${t('listing.description')}</h2>
      <p class="listing-title-quote" lang="da">${l.title}</p>
      <div class="prose description" lang="da">${descriptionHtml(l.description)}</div>
      <p class="muted small">${lang === 'da' ? t('listing.descriptionNote') : `${t('listing.descriptionLangNote')} ${t('listing.descriptionNote')}`}</p>
    </section>`
      : ''}

    ${features.length
      ? html`<section class="listing-section" aria-labelledby="feat-title">
      <h2 id="feat-title">${t('listing.features')}</h2>
      <ul class="features">
        ${features.map(([k]) => html`<li>${icon(FEATURE_ICONS[k])} ${t(`feature.${k}`)}</li>`)}
      </ul>
      ${l.hasVideo ? html`<p class="muted small">${icon('video', { className: 'icon--sm' })} ${t('listing.video')}</p>` : ''}
    </section>`
      : ''}

    ${mapBlock(ctx, l)}
  </div>
  <div class="listing-aside">
    ${economyCard(ctx, l)}
  </div>
</div>

<div class="contact-bar" data-contact-bar>
  <p class="contact-bar__price"><strong>${fmt.number(l.rent)}</strong> ${t('listings.perMonth')}</p>
  <a class="button" href="${l.url}" rel="noopener">${t('listing.contact')} ${icon('external-link')}</a>
</div>

${others.length
  ? html`<section class="section section--sand">
  <div class="container">
    <div class="section-head">
      <h2>${t('listing.more')}</h2>
      <a class="button button--ghost" href="${ctx.link('listings')}">${t('listings.seeAll')} ${icon('arrow-right')}</a>
    </div>
    <div class="listing-grid">${others.map((o) => listingCard(ctx, o))}</div>
  </div>
</section>`
  : ''}`,
    };
  },
};
