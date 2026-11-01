import { html } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { listingCard } from '../partials/listing-card.mjs';

const CATEGORY_ORDER = ['apartment', 'house', 'townhouse', 'room', 'other'];

export default {
  id: 'listings',
  render(ctx) {
    const { t, fmt, data, site } = ctx;
    const { listings, fetchedAt } = data;
    const counts = listings.reduce((acc, l) => ({ ...acc, [l.category]: (acc[l.category] ?? 0) + 1 }), {});
    const categories = CATEGORY_ORDER.filter((c) => counts[c]);
    const countText = listings.length === 1 ? t('listings.countOne') : t('listings.count', { n: listings.length });

    return {
      title: t('listings.title'),
      description: t('listings.lead'),
      bodyClass: 'page-listings',
      body: html`<section class="page-head">
  <div class="container">
    <h1>${t('listings.title')}</h1>
    <p class="lead">${t('listings.lead')}</p>
  </div>
</section>
<section class="section section--tight listings" data-listings>
  <div class="container">
    ${listings.length === 0
      ? html`<div class="empty-state">
      ${icon('house')}
      <h2>${t('listings.emptyTitle')}</h2>
      <p>${t('listings.emptyBody')}</p>
      <a class="button" href="${site.boligportal.companyPage}" rel="noopener">${t('footer.onBoligportal')} ${icon('external-link')}</a>
    </div>`
      : html`<div class="listings__toolbar">
      <p class="listings__count" aria-live="polite" data-count data-template-one="${t('listings.countOne')}" data-template="${t('listings.count')}">${countText}</p>
      ${categories.length > 1
        ? html`<div class="chips" role="group" aria-label="${t('listings.filterLabel')}" data-filter hidden>
        <button type="button" class="chip" aria-pressed="true" data-value="all">${t('listings.all')} <span class="chip__n">${listings.length}</span></button>
        ${categories.map(
          (c) => html`<button type="button" class="chip" aria-pressed="false" data-value="${c}">${t(`category.${c}Plural`)} <span class="chip__n">${counts[c]}</span></button>`,
        )}
      </div>`
        : ''}
      <label class="select" data-sort hidden>
        <span class="select__label">${t('listings.sortLabel')}</span>
        <select>
          <option value="newest">${t('listings.sortNewest')}</option>
          <option value="price">${t('listings.sortPriceLow')}</option>
          <option value="size">${t('listings.sortSizeLarge')}</option>
        </select>
        ${icon('chevron-down')}
      </label>
    </div>
    <div class="listing-grid" data-grid>
      ${listings.map((l, i) => listingCard(ctx, l, { headingLevel: 2, eager: i < 3 }))}
    </div>
    <p class="listings__empty-filter" data-empty-filter hidden>${t('listings.emptyFilter')}</p>`}
    ${fetchedAt ? html`<p class="listings__updated">${t('listings.updated', { date: fmt.date(fetchedAt) })}</p>` : ''}
  </div>
</section>`,
      scripts: ['assets/listings.js'],
    };
  },
};

