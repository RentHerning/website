// URL slugs per language. Danish lives at the root, English under /en/.
// A slug may be a function of the page parameters (e.g. a listing id).
export const routes = {
  home: { da: '', en: '' },
  listings: { da: 'boliger/', en: 'homes/' },
  listing: { da: ({ id }) => `bolig/${id}/`, en: ({ id }) => `homes/${id}/` },
  help: { da: 'hjaelp/', en: 'help/' },
};

export const langPrefix = (lang) => (lang === 'da' ? '' : `${lang}/`);

export function routePath(id, lang, params = {}) {
  const route = routes[id];
  if (!route) throw new Error(`Unknown route: ${id}`);
  const slug = typeof route[lang] === 'function' ? route[lang](params) : route[lang];
  return `${langPrefix(lang)}${slug}`;
}
