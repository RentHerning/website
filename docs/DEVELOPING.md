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

## Listings data

`scripts/scrape.mjs` reads Rent Herning's listings from Boligportal and writes `data/listings.json`. Boligportal builds its pages from a JSON object embedded in the HTML, so the script reads that object instead of the visible page: the company page (`/cp/rentherning/`) gives the facts and images for every listing, and each listing page adds the description. With seven listings that is eight requests, made one at a time with a short pause between them.

```bash
npm run scrape                       # fetch over HTTP
SCRAPE_BROWSER=1 npm run scrape      # same through Playwright, if plain requests get blocked
node scripts/scrape.mjs --company-file saved.html --descriptions-file d.json   # offline
npm test                             # parser tests against saved fixtures
```

The file is only rewritten when a listing actually changed, so the scheduled job doesn't create empty commits. If the page can't be read, the script exits with an error and leaves the existing file alone, so a blocked request never empties the site. Street numbers are deliberately not stored; the site shows the street name and area, as Boligportal's own cards do.

`.github/workflows/update-listings.yml` runs the script every 6 hours (and on demand from the Actions tab). It tries plain HTTP first and falls back to Playwright, validates the result with `scripts/validate-listings.mjs`, and commits `data/listings.json` if it changed.

## 3D city on the home page

The hero shows a low-poly city that slowly turns and can be dragged sideways. There are two versions, switchable in the hero (and with `?city=a` / `?city=b`):

| | A: Stylised town | B: Real Herning |
|---|---|---|
| Source | Generated in the browser from a fixed seed (`src/js/city/town.js`) | OpenStreetMap, pre-built into `public/city/herning.bin` by `scripts/city/build-herning.mjs` |
| Size | No data file | ~0.5–1 MB binary (quantised positions, shared wall vertices) |
| Pins | Listings placed by relative position | Listings at their real location (only those inside the 560 m cut-out) |

Both use one merged mesh and one material (`src/js/city/material.js`). Windows are drawn by the shader on walls, not modelled, and buildings "grow" out of the ground on load. The scene pauses when it's off-screen or the tab is hidden. With *reduce motion* switched on it shows a still frame. On devices without WebGL, with ≤2 CPU cores or ≤2 GB memory, or with data-saver on, it shows a pre-rendered image (`public/city/still-*.webp`) instead. Add `?3d` to the URL to force the live scene.

`.github/workflows/build-city.yml` rebuilds the real-Herning model and both still images whenever the city code changes (or on demand from the Actions tab), and commits them. Map data © OpenStreetMap contributors (ODbL); the credit is shown on the page whenever version B is visible.
