// Mounts the 3D city in the home-page hero and wires the A/B switch.
import { createStage } from './stage.js';
import { buildTown, townPins } from './town.js';
import { loadHerning, herningPins } from './herning.js';

const STORAGE_KEY = 'rh-city-version';

export async function mount(host, { reducedMotion, mobile }) {
  const cfg = host.dataset;
  const listings = await fetch(cfg.listingsUrl)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  const fmt = new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'da-DK');
  const toPin = (p) => ({
    x: p.x,
    y: p.y,
    z: p.z,
    href: cfg.listingHref.replace('__ID__', p.listing.id),
    price: `${fmt.format(p.listing.rent)} ${cfg.perMonth}`,
    label: [p.listing.street, p.listing.area || p.listing.city].filter(Boolean).join(', '),
  });

  const stage = createStage(host, { reducedMotion, mobile });
  const switcher = host.parentElement.querySelector('[data-city-switch]');
  const credit = host.parentElement.querySelector('[data-city-credit]');
  let herning = null; // cached model

  async function show(version) {
    if (version === 'b') {
      try {
        herning ??= await loadHerning(cfg.modelUrl);
        stage.setContent(herning);
        stage.setPins(herningPins(listings, herning).map(toPin));
      } catch (err) {
        console.warn('Real-Herning model unavailable, showing the stylised town.', err);
        switcher?.querySelector('[data-version="b"]')?.setAttribute('disabled', '');
        return show('a');
      }
    } else {
      const town = buildTown();
      stage.setContent(town);
      stage.setPins(townPins(listings, town.half).map(toPin));
    }
    host.dataset.version = version;
    if (credit) credit.hidden = version !== 'b';
    switcher?.querySelectorAll('[data-version]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.version === version)));
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch {
      /* private mode */
    }
  }

  const requested = new URLSearchParams(location.search).get('city');
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
  await show(requested === 'a' || requested === 'b' ? requested : saved ?? cfg.defaultVersion ?? 'a');
  host.classList.add('is-ready');
  stage.start();

  if (switcher) {
    switcher.hidden = false;
    switcher.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-version]');
      if (btn && btn.getAttribute('aria-pressed') !== 'true') show(btn.dataset.version);
    });
  }
}
