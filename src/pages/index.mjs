// Every page the build renders, for every language.
// A page module: { id, entries?(data) → [params], render(ctx, params) → { body, title, … } }
import home from './home.mjs';
import { listingsPlaceholder, helpPlaceholder } from './placeholder.mjs';

export const pages = [home, listingsPlaceholder, helpPlaceholder];
export { default as notFound } from './not-found.mjs';
