// Mounts the 3D model of central Herning in the home-page hero.
import { createStage } from './stage.js';
import { loadHerning, herningPins } from './herning.js';

export async function mount(host, { reducedMotion, mobile }) {
  const cfg = host.dataset;
  const [listings, model] = await Promise.all([
    fetch(cfg.listingsUrl)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    loadHerning(cfg.modelUrl),
  ]);
  const fmt = new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'da-DK');

  const stage = createStage(host, { reducedMotion, mobile });
  stage.setContent(model);
  stage.setPins(
    herningPins(listings, model).map((p) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      href: cfg.listingHref.replace('__ID__', p.listing.id),
      price: `${fmt.format(p.listing.rent)} ${cfg.perMonth}`,
      label: [p.listing.street, p.listing.area || p.listing.city].filter(Boolean).join(', '),
    })),
  );
  host.classList.add('is-ready');
  stage.start();
}
