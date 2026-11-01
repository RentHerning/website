# Developing

You need Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173, rebuilds and reloads on save
npm run build      # production build to dist/ (served from /)
npm run build:pages  # same, but for GitHub Pages under /website/
```

## How the site is put together

There is no framework. Each page is a small JavaScript module in `src/pages/` that returns HTML from a tagged template (`html\`…\``, which escapes values automatically). `build/build.mjs` renders every page once per language, wraps it in `src/partials/layout.mjs`, compiles `src/scss/main.scss` and bundles every file in `src/js/entries/` with esbuild. The output in `dist/` is plain static files.

| Where | What |
|---|---|
| `src/routes.mjs` | URL slugs per language (Danish at `/`, English at `/en/`) |
| `src/i18n/da.mjs`, `en.mjs` | All interface text. Add a key to both files |
| `src/lib/site.mjs` | Settings: base path, contact details, document links |
| `src/partials/` | Layout, header, footer, logo |
| `src/scss/base/_tokens.scss` | Colours, type scale, spacing |
| `public/` | Copied as-is into `dist/` |
| `data/listings.json` | Listings fetched from Boligportal |

When the site moves to a PHP host, each page module maps to a PHP template and the partials to includes; the data file and the scripts stay as they are.
