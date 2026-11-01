// Home page: decide whether to show the live 3D city or the still image,
// then load three.js lazily so the hero text never waits for it.
//
// Rule: phones and small tablets (narrower than 64em ≈ 1024 px, where the hero
// stacks) always get the still image. three.js and the model are never
// downloaded there. Add ?3d to the URL to force the live scene for testing.
const host = document.querySelector('[data-city]');

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

if (host) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 63.99em)').matches;
  const nav = navigator;
  // ?3d forces the live scene (useful for testing on slow machines).
  const force = new URLSearchParams(location.search).has('3d');
  const weak =
    !force &&
    (nav.connection?.saveData === true ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2));

  if (!webglAvailable() || weak || (mobile && !force)) {
    host.classList.add('is-static');
  } else {
    const go = () =>
      import('../city/index.js')
        .then((m) => m.mount(host, { reducedMotion, mobile }))
        .catch((err) => {
          console.warn('3D city failed, showing the still image instead.', err);
          host.classList.add('is-static');
        });
    // Wait for the page to settle so the 3D never competes with the hero text.
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 });
    else setTimeout(go, 300);
  }
}
