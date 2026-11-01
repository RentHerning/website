// Site-wide settings. Values that are not known yet are marked TODO and shown
// as clearly labelled placeholders on the site.

export const site = {
  name: 'Rent Herning',
  // Base path the site is served from. GitHub Pages serves this repo from
  // /website/, the real domain will serve it from /. Set with SITE_BASE.
  base: normaliseBase(process.env.SITE_BASE ?? '/'),
  // Absolute origin, used for canonical and Open Graph URLs.
  origin: process.env.SITE_ORIGIN ?? 'https://rentherning.dk',
  // Demo deployments set SITE_NOINDEX=1 so search engines skip them.
  noindex: process.env.SITE_NOINDEX === '1',
  languages: ['da', 'en'],
  defaultLanguage: 'da',

  contact: {
    // TODO: the CEO provides these. Until then the site shows a placeholder.
    emergencyPhone: null,
    email: null,
    // Form endpoint for the guided help flow (e.g. a Formspree form URL).
    formEndpoint: process.env.FORM_ENDPOINT || null,
  },

  documents: {
    houseRules: 'https://rentherning.dk/Rent_Herning_Husorden.pdf',
    privacy: 'https://rentherning.dk/Rent_Herning_GDRP.pdf',
  },

  boligportal: {
    origin: 'https://www.boligportal.dk',
    companyPage: 'https://www.boligportal.dk/cp/rentherning/',
  },
};

function normaliseBase(base) {
  let b = base.trim();
  if (!b.startsWith('/')) b = `/${b}`;
  if (!b.endsWith('/')) b = `${b}/`;
  return b;
}
