// Helpers for presenting a listing from data/listings.json.

/** Boligportal's image server (imgix-style) resizes on the fly: ?w=&h=&fit=crop. */
export function imageUrl(url, { w, h, fit = 'crop' } = {}) {
  const params = new URLSearchParams();
  if (w) params.set('w', w);
  if (h) params.set('h', h);
  if (w && h) params.set('fit', fit);
  params.set('auto', 'compress,format');
  return `${url}?${params.toString().replace(/%2C/g, ',')}`;
}

/** srcset for a fixed aspect ratio (h/w). */
export function srcset(url, widths, ratio) {
  return widths.map((w) => `${imageUrl(url, { w, h: ratio ? Math.round(w * ratio) : undefined })} ${w}w`).join(', ');
}

export const photos = (l) => l.images.filter((img) => !img.floorPlan);
export const floorPlans = (l) => l.images.filter((img) => img.floorPlan);
export const coverImage = (l) => photos(l)[0] ?? l.images[0] ?? null;

/** "H.C. Ørsteds Vej, Herning" or "Lind Hovedgade, Lind". */
export function locationLabel(l) {
  const place = l.area || l.city;
  return [l.street, place].filter(Boolean).join(', ');
}

/** True when the home can be moved into now (no date or a date in the past). */
export function availableNow(l, today = new Date()) {
  return !l.availableFrom || new Date(l.availableFrom) <= today;
}

export function availabilityLabel(ctx, l) {
  return availableNow(l) ? ctx.t('listings.now') : ctx.t('listings.from', { date: ctx.fmt.date(l.availableFrom) });
}

export const moveInCost = (l) => l.rent + (l.extraCosts || 0) + (l.deposit || 0) + (l.prepaidRent || 0);

export const roomsCount = (l) => (Number.isInteger(l.rooms) ? l.rooms : Number(l.rooms).toLocaleString('da-DK'));

export function floorLabel(ctx, floor) {
  if (floor == null) return null;
  return floor === 0 ? ctx.t('listing.groundFloor') : ctx.t('listing.floorN', { n: floor });
}

export const FEATURE_ICONS = {
  balcony: 'sun',
  pet_friendly: 'paw-print',
  parking: 'car-front',
  elevator: 'arrow-up-down',
  furnished: 'sofa',
  dishwasher: 'utensils',
  washing_machine: 'washing-machine',
  dryer: 'wind',
  electric_charging_station: 'plug-zap',
  senior_friendly: 'accessibility',
  student_only: 'graduation-cap',
  shareable: 'users',
};
