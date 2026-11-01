export function initHeader() {
  const header = document.querySelector('[data-header]');
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (!header) return;

  // Subtle border once the page has scrolled.
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (!toggle || !nav) return;
  const label = toggle.querySelector('[data-menu-label]');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    label.textContent = open ? toggle.dataset.labelClose : toggle.dataset.labelOpen;
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  // Close after following an in-page link (e.g. #om-os).
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  // Reset when resizing up to the desktop layout.
  window.matchMedia('(min-width: 48em)').addEventListener('change', (e) => e.matches && setOpen(false));
}
