// Every page the build renders, for every language.
// A page module: { id, entries?(data) → [params], render(ctx, params) → { body, title, … } }
import home from './home.mjs';
import listings from './listings.mjs';
import listing from './listing.mjs';
import help from './help.mjs';

export const pages = [home, listings, listing, help];
export { default as notFound } from './not-found.mjs';
