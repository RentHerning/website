import { html } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { imageUrl, srcset, coverImage, locationLabel, availabilityLabel, availableNow, roomsCount } from '../lib/listing.mjs';

/**
 * A listing card: photo, price, location, size and rooms.
 * The whole card is one link (the title link is stretched over the card).
 */
export function listingCard(ctx, l, { headingLevel = 3, eager = false } = {}) {
  const { t, fmt } = ctx;
  const cover = coverImage(l);
  const href = ctx.link('listing', { id: l.id });
  const H = `h${headingLevel}`;

  return html`<article class="listing-card" data-listing data-category="${l.category}" data-rent="${l.rent}" data-size="${l.size}" data-date="${l.advertisedAt ?? ''}">
  <div class="listing-card__media">
    ${cover
      ? html`<img src="${imageUrl(cover.url, { w: 640, h: 480 })}" srcset="${srcset(cover.url, [400, 640, 960], 0.75)}"
        sizes="(min-width: 64em) 30vw, (min-width: 36em) 46vw, 92vw" width="640" height="480"
        alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`
      : html`<div class="listing-card__noimg">${icon('house')}</div>`}
    <span class="listing-card__type">${t(`category.${l.category}`)}</span>
    ${l.images.length > 1 ? html`<span class="listing-card__count">${icon('image')} ${l.images.length}</span>` : ''}
  </div>
  <div class="listing-card__body">
    <${H} class="listing-card__title"><a href="${href}">${locationLabel(l)}</a></${H}>
    <p class="listing-card__price"><strong>${fmt.number(l.rent)}</strong> ${t('listings.perMonth')}</p>
    <ul class="listing-card__facts">
      <li>${icon('ruler-dimension-line')} ${t('listings.size', { n: fmt.number(l.size) })}</li>
      <li>${icon('bed-double')} ${t('listings.rooms', { n: roomsCount(l) })}</li>
    </ul>
    <p class="listing-card__avail${availableNow(l) ? ' is-now' : ''}">${icon('calendar')} ${availabilityLabel(ctx, l)}</p>
  </div>
</article>`;
}
