import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseStore, normalise } from '../scripts/scrape.mjs';

const fixture = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('parseStore reads the embedded JSON from a company page', async () => {
  const store = parseStore(await fixture('company-page.html'));
  assert.equal(store.component, 'CompanyPageApp');
  assert.ok(store.props.page_props.listings.length > 0);
});

test('parseStore reads the ad from a listing page', async () => {
  const ad = parseStore(await fixture('listing-page.html')).props.page_props.ad;
  assert.equal(ad.id, 5498482);
  assert.match(ad.description, /H\.C\. Ørstedsvej/);
});

test('parseStore throws on pages without a store', () => {
  assert.throws(() => parseStore('<html><body>blocked</body></html>'), /No embedded store/);
});

test('normalise keeps the fields the site shows', async () => {
  const raw = parseStore(await fixture('company-page.html')).props.page_props.listings[0];
  const l = normalise(raw, 'Beskrivelse');
  assert.equal(l.id, 5498482);
  assert.equal(l.url, 'https://www.boligportal.dk/lejligheder/herning/56m2-2-vaer-id-5498482');
  assert.equal(l.category, 'apartment');
  assert.equal(l.street, 'H.C. Ørsteds Vej');
  assert.equal(l.size, 56);
  assert.equal(l.rent, 5250);
  assert.equal(l.extraCosts, 550);
  assert.equal(l.deposit, 15750);
  assert.equal(l.description, 'Beskrivelse');
  assert.equal(l.features.balcony, true);
  assert.ok(!('dryer' in l.features), 'unknown (null) features are dropped');
  assert.ok(l.images.at(-1).floorPlan, 'floor plan image is flagged');
  assert.ok(!('street_number' in l), 'street numbers are not published');
});
