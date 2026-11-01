#!/usr/bin/env node
// Fetches Rent Herning's active listings from Boligportal and writes data/listings.json.
//
// Boligportal renders its pages from a JSON "store" embedded in the HTML
// (<script id="store" type="application/json">). The company page holds every
// listing's facts and images; each listing page adds the full description.
// We read that JSON rather than the visible page, so layout changes on
// Boligportal don't break the job.
//
// Usage:
//   node scripts/scrape.mjs                 fetch over HTTP (default)
//   SCRAPE_BROWSER=1 node scripts/scrape.mjs   fetch with Playwright (fallback if plain HTTP is blocked)
//   node scripts/scrape.mjs --company-file page.html [--descriptions-file d.json]
//                                           build from saved HTML (offline, for tests/seeding)
//
// Exit codes: 0 = ok (file written or unchanged), 1 = failed (existing file left untouched).
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data/listings.json');
const ORIGIN = process.env.BP_ORIGIN ?? 'https://www.boligportal.dk';
const COMPANY_PATH = '/cp/rentherning/';
const DELAY_MS = 1200; // be polite: one request at a time
const USER_AGENT =
  'Mozilla/5.0 (compatible; RentHerningSite/1.0; +https://github.com/RentHerning/website) AppleWebKit/537.36 (KHTML, like Gecko)';

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};

// ---------------------------------------------------------------- parsing

export function parseStore(html) {
  const match = html.match(/<script id="store" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No embedded store JSON found on the page');
  return JSON.parse(match[1]);
}

const CATEGORY = {
  rental_apartment: 'apartment',
  rental_house: 'house',
  rental_townhouse: 'townhouse',
  rental_room: 'room',
};

/** Boligportal listing → the shape the site uses. Only fields we show are kept. */
export function normalise(raw, description = null) {
  const images = (raw.images ?? []).map((img) => ({ url: img.url, floorPlan: Boolean(img.is_floor_plan) }));
  const features = Object.fromEntries(
    Object.entries(raw.features ?? {}).filter(([, v]) => v === true || v === false),
  );
  return {
    id: raw.id,
    url: new URL(raw.url, ORIGIN).href,
    title: raw.title?.trim() ?? '',
    category: CATEGORY[raw.category] ?? 'other',
    street: raw.street_name ?? null,
    area: raw.city_area ?? null,
    city: raw.city ?? 'Herning',
    postalCode: raw.postal_code ?? null,
    location: raw.location ? { lat: raw.location.lat, lng: raw.location.lng } : null,
    rooms: raw.rooms,
    size: raw.size_m2,
    rent: raw.monthly_rent,
    extraCosts: raw.monthly_rent_extra_costs || 0,
    deposit: raw.deposit || 0,
    prepaidRent: raw.prepaid_rent || 0,
    availableFrom: raw.available_from ?? null,
    rentalPeriod: raw.rental_period ?? 0, // months, 0 = unlimited
    floor: raw.floor ?? null,
    energyRating: raw.energy_rating ?? null,
    features,
    images,
    hasVideo: Boolean(raw.has_video),
    description: (description ?? raw.description ?? '').replace(/\r\n/g, '\n').trim(),
    advertisedAt: raw.advertised_date ?? raw.created ?? null,
  };
}

// ---------------------------------------------------------------- fetching

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makeFetcher() {
  if (process.env.SCRAPE_BROWSER) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ locale: 'da-DK' });
    return {
      async get(path) {
        const res = await page.goto(new URL(path, ORIGIN).href, { waitUntil: 'domcontentloaded' });
        if (!res || !res.ok()) throw new Error(`HTTP ${res?.status()} for ${path}`);
        return page.content();
      },
      close: () => browser.close(),
    };
  }
  return {
    async get(path) {
      const res = await fetch(new URL(path, ORIGIN), {
        headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'da-DK,da;q=0.9', Accept: 'text/html' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
      return res.text();
    },
    close: async () => {},
  };
}

async function fetchListings() {
  const fetcher = await makeFetcher();
  try {
    const raws = [];
    let offset = 0;
    let total = Infinity;
    // The company page shows up to 21 listings; page through with ?offset= if there are more.
    while (raws.length < total) {
      const store = parseStore(await fetcher.get(`${COMPANY_PATH}${offset ? `?offset=${offset}` : ''}`));
      const props = store.props.page_props;
      total = props.result_count;
      const fresh = props.listings.filter((l) => !raws.some((r) => r.id === l.id));
      if (fresh.length === 0) break;
      raws.push(...fresh);
      offset += props.limit;
      if (raws.length < total) await sleep(DELAY_MS);
    }
    if (raws.length !== total) console.warn(`Expected ${total} listings, got ${raws.length}`);

    const listings = [];
    for (const raw of raws) {
      await sleep(DELAY_MS);
      let description = null;
      try {
        description = parseStore(await fetcher.get(raw.url)).props.page_props.ad.description;
      } catch (err) {
        console.warn(`No description for ${raw.id}: ${err.message}`);
      }
      listings.push(normalise(raw, description));
    }
    return { listings, total };
  } finally {
    await fetcher.close();
  }
}

async function listingsFromFiles(companyFile, descriptionsFile) {
  const props = parseStore(await readFile(companyFile, 'utf8')).props.page_props;
  const descriptions = descriptionsFile ? JSON.parse(await readFile(descriptionsFile, 'utf8')) : {};
  return { listings: props.listings.map((raw) => normalise(raw, descriptions[raw.id])), total: props.result_count };
}

// ---------------------------------------------------------------- main

async function main() {
  const companyFile = argValue('--company-file');
  const { listings, total } = companyFile
    ? await listingsFromFiles(companyFile, argValue('--descriptions-file'))
    : await fetchListings();

  // Guard against wiping the site when Boligportal returns something unexpected.
  if (total > 0 && listings.length === 0) throw new Error('Parsed 0 listings although the page reports some');

  listings.sort((a, b) => String(b.advertisedAt).localeCompare(String(a.advertisedAt)));

  const previous = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : null;
  if (previous && JSON.stringify(previous.listings) === JSON.stringify(listings)) {
    console.log(`No changes (${listings.length} listings).`);
    return;
  }

  const before = new Set((previous?.listings ?? []).map((l) => l.id));
  const after = new Set(listings.map((l) => l.id));
  const added = [...after].filter((id) => !before.has(id));
  const removed = [...before].filter((id) => !after.has(id));

  const data = {
    source: `${ORIGIN}${COMPANY_PATH}`,
    fetchedAt: new Date().toISOString(),
    count: listings.length,
    listings,
  };
  await writeFile(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${listings.length} listings (added ${added.join(', ') || 'none'}; removed ${removed.join(', ') || 'none'}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`Scrape failed: ${err.message}`);
    process.exitCode = 1;
  });
}
