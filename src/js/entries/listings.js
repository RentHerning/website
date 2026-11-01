// Ledige boliger: filter by type and sort. Without JS every listing is simply shown.
const root = document.querySelector('[data-listings]');
const grid = root?.querySelector('[data-grid]');

if (grid) {
  const cards = [...grid.querySelectorAll('[data-listing]')];
  const filter = root.querySelector('[data-filter]');
  const sortWrap = root.querySelector('[data-sort]');
  const sortSelect = sortWrap?.querySelector('select');
  const count = root.querySelector('[data-count]');
  const emptyMsg = root.querySelector('[data-empty-filter]');
  const params = new URLSearchParams(location.search);

  let category = params.get('type') ?? 'all';
  let sort = params.get('sort') ?? 'newest';

  const comparators = {
    newest: (a, b) => b.dataset.date.localeCompare(a.dataset.date),
    price: (a, b) => a.dataset.rent - b.dataset.rent,
    size: (a, b) => b.dataset.size - a.dataset.size,
  };

  function render() {
    let visible = 0;
    for (const card of [...cards].sort(comparators[sort] ?? comparators.newest)) {
      const show = category === 'all' || card.dataset.category === category;
      card.hidden = !show;
      if (show) visible += 1;
      grid.append(card); // re-append in sorted order
    }
    filter?.querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === category)));
    if (count) {
      count.textContent = visible === 1 ? count.dataset.templateOne : count.dataset.template.replace('{n}', visible);
    }
    if (emptyMsg) emptyMsg.hidden = visible > 0;

    // Keep the choice in the URL so it survives "back" from a listing.
    const url = new URL(location.href);
    category === 'all' ? url.searchParams.delete('type') : url.searchParams.set('type', category);
    sort === 'newest' ? url.searchParams.delete('sort') : url.searchParams.set('sort', sort);
    history.replaceState(null, '', url);
  }

  if (filter) {
    filter.hidden = false;
    filter.addEventListener('click', (e) => {
      const button = e.target.closest('[data-value]');
      if (!button) return;
      category = button.dataset.value;
      render();
    });
  }
  if (sortWrap && cards.length > 2) {
    sortWrap.hidden = false;
    sortSelect.value = sort;
    sortSelect.addEventListener('change', () => {
      sort = sortSelect.value;
      render();
    });
  }
  render();
}
