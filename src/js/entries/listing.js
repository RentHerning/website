// Listing detail page: photo viewer, click-to-load map, mobile contact bar.

// ---- Photo viewer -------------------------------------------------------
const gallery = document.querySelector('[data-gallery]');
if (gallery) {
  const images = JSON.parse(gallery.querySelector('[data-gallery-images]').textContent);
  const dialog = gallery.querySelector('[data-lightbox]');
  const img = dialog.querySelector('[data-lightbox-img]');
  const countEl = dialog.querySelector('[data-lightbox-count]');
  const track = gallery.querySelector('[data-track]');
  const counter = gallery.querySelector('[data-counter]');
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + images.length) % images.length;
    img.src = images[index].src;
    img.alt = images[index].label;
    countEl.textContent = `${index + 1} / ${images.length}`;
    // Preload the neighbours so arrows feel instant.
    [index - 1, index + 1].forEach((n) => {
      const pre = new Image();
      pre.src = images[(n + images.length) % images.length].src;
    });
  };

  const open = (i, from) => {
    opener = from;
    show(i);
    dialog.showModal();
    document.documentElement.classList.add('no-scroll');
  };
  const close = () => dialog.close();

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('no-scroll');
    opener?.focus();
  });

  gallery.addEventListener('click', (e) => {
    const link = e.target.closest('[data-index]');
    if (link) {
      e.preventDefault();
      open(Number(link.dataset.index), link);
    } else if (e.target.closest('[data-open-gallery]')) {
      open(0, e.target.closest('button'));
    }
  });
  dialog.querySelector('[data-close]').addEventListener('click', close);
  dialog.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.classList.contains('lightbox__stage')) close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });

  // Swipe on touch screens.
  let startX = null;
  dialog.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
  });
  dialog.addEventListener('pointerup', (e) => {
    if (startX == null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });

  // Mobile carousel counter ("3 / 15") follows the scroll position.
  if (track && counter) {
    track.addEventListener(
      'scroll',
      () => {
        const i = Math.round(track.scrollLeft / track.clientWidth);
        counter.textContent = `${Math.min(i + 1, images.length)} / ${images.length}`;
      },
      { passive: true },
    );
  }
}

// ---- Map (loads OpenStreetMap only when asked) --------------------------
document.querySelector('[data-load-map]')?.addEventListener('click', (e) => {
  const map = e.target.closest('[data-map]');
  const iframe = document.createElement('iframe');
  iframe.src = map.dataset.src;
  iframe.title = 'OpenStreetMap';
  iframe.loading = 'lazy';
  iframe.referrerPolicy = 'no-referrer';
  map.replaceChildren(iframe);
  map.classList.add('is-loaded');
});

// ---- Mobile contact bar: hide while the costs card is on screen ---------
const bar = document.querySelector('[data-contact-bar]');
const cardButton = document.querySelector('[data-contact]');
if (bar && cardButton && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting)).observe(cardButton);
}
