// Hjælp & kontakt: turns each flow into a one-question-at-a-time wizard.
// Without JavaScript every form is simply shown in full and still works.
//
// URLs: /hjaelp/#vicevaert opens a flow directly (the home-page tiles use this).
// Pre-fill (e.g. from Rita): /hjaelp/?flow=vicevaert&kategori=vvs&besked=Hanen+drypper
const root = document.querySelector('[data-help]');

if (root) {
  root.classList.add('is-enhanced');
  const lang = document.documentElement.lang === 'en' ? 'en-GB' : 'da-DK';
  const chooser = root.querySelector('[data-chooser]');
  const flows = new Map([...root.querySelectorAll('[data-flow]')].map((el) => [el.id, setupFlow(el)]));

  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    const active = flows.get(id);
    chooser.hidden = Boolean(active);
    for (const [key, flow] of flows) flow.el.hidden = key !== id;
    if (active) {
      active.reset();
      active.el.querySelector('h2').focus({ preventScroll: true });
      root.scrollIntoView({ block: 'start' });
    }
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) {
      e.preventDefault();
      if (location.hash) history.pushState(null, '', location.pathname + location.search);
      route();
      chooser.querySelector('a')?.focus({ preventScroll: true });
    }
  });
  window.addEventListener('hashchange', route);

  // Pre-fill from the query string, then open the flow.
  const params = new URLSearchParams(location.search);
  const pre = params.get('flow');
  if (pre && flows.has(pre)) {
    const form = flows.get(pre).form;
    for (const [name, value] of params) {
      if (name === 'flow') continue;
      const inputs = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
      inputs.forEach((input) => {
        if (input.type === 'radio') input.checked = input.value === value;
        else input.value = value;
      });
    }
    if (location.hash !== `#${pre}`) history.replaceState(null, '', `${location.pathname}${location.search}#${pre}`);
  }
  route();

  // ---------------------------------------------------------------------------
  function setupFlow(el) {
    const form = el.querySelector('[data-form]');
    const steps = [...form.querySelectorAll('[data-step]')];
    const progress = form.querySelector('[data-progress]');
    const progressText = form.querySelector('[data-progress-text]');
    const bar = form.querySelector('[data-progress-bar]');
    const prev = form.querySelector('[data-prev]');
    const next = form.querySelector('[data-next]');
    const submit = form.querySelector('[data-submit]');
    const error = form.querySelector('[data-error]');
    const done = el.querySelector('[data-done]');
    const summary = form.querySelector('[data-summary]');
    let index = 0;

    progress.hidden = false;

    function show(i, { focus = true } = {}) {
      index = i;
      steps.forEach((s, k) => (s.hidden = k !== i));
      const last = i === steps.length - 1;
      prev.hidden = i === 0;
      next.hidden = last;
      submit.hidden = !last;
      progressText.textContent = progressText.dataset.template.replace('{n}', i + 1).replace('{total}', steps.length);
      bar.style.width = `${((i + 1) / steps.length) * 100}%`;
      if (last) buildSummary();
      if (focus) steps[i].querySelector('legend').focus({ preventScroll: true });
    }

    function valid() {
      const fields = [...steps[index].querySelectorAll('input, textarea, select')];
      for (const f of fields) {
        if (!f.checkValidity()) {
          f.reportValidity();
          return false;
        }
      }
      return true;
    }

    function buildSummary() {
      summary.replaceChildren();
      steps.slice(0, -1).forEach((step, k) => {
        for (const fieldEl of step.querySelectorAll('.field')) {
          // For the big choice buttons the step's question reads better than "Choose the best match".
          const label = fieldEl.querySelector('.choice-grid')
            ? step.querySelector('legend').firstChild.textContent.trim()
            : fieldEl.querySelector('.field__label')?.textContent.trim();
          const checked = fieldEl.querySelector('input[type=radio]:checked');
          const input = fieldEl.querySelector('input:not([type=radio]), textarea');
          let value = checked ? checked.dataset.label : input?.value.trim();
          if (!value) continue;
          if (input?.type === 'date') value = new Date(value).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
          const row = document.createElement('div');
          const dt = document.createElement('dt');
          const dd = document.createElement('dd');
          dt.textContent = label;
          dd.textContent = value;
          const edit = document.createElement('button');
          edit.type = 'button';
          edit.className = 'summary__edit';
          edit.textContent = root.dataset.edit;
          edit.addEventListener('click', () => show(k));
          row.append(dt, dd, edit);
          summary.append(row);
        }
      });
    }

    next.addEventListener('click', () => valid() && show(index + 1));
    prev.addEventListener('click', () => show(index - 1));
    // Enter in a single-line field goes to the next step instead of submitting.
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.matches('input:not([type=radio])') && index < steps.length - 1) {
        e.preventDefault();
        if (valid()) show(index + 1);
      }
    });
    // A step that is just one big choice moves on by itself.
    form.addEventListener('change', (e) => {
      const step = steps[index];
      if (e.target.type === 'radio' && step.querySelectorAll('.field').length === 1 && step.querySelector('.choice-grid')) {
        setTimeout(() => show(index + 1), 220);
      }
      if (e.target.dataset.check) checkDate(e.target);
    });

    function checkDate(input) {
      const note = form.querySelector(`[data-note-for="${input.name}"]`);
      const value = input.value ? new Date(input.value) : null;
      let text = '';
      if (value && input.dataset.check === 'within14') {
        const days = (Date.now() - value.getTime()) / 86_400_000;
        if (days > 14) text = root.dataset.within14Late;
      }
      if (input.dataset.check === 'notice') {
        const now = new Date();
        const earliest = new Date(now.getFullYear(), now.getMonth() + 4, 1);
        const date = earliest.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
        text = root.dataset.noticeEarliest.replace('{date}', date);
        if (value && value < earliest) text += ` ${root.dataset.noticeEarly}`;
        if (!input.min) input.min = new Date().toISOString().slice(0, 10);
      }
      note.textContent = text;
      note.hidden = !text;
    }
    form.querySelectorAll('[data-check="notice"]').forEach(checkDate);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!valid()) return;
      error.hidden = true;
      const endpoint = form.dataset.endpoint;
      if (form.elements._gotcha?.value) return; // bot
      if (endpoint) {
        const label = submit.innerHTML;
        submit.disabled = true;
        submit.textContent = submit.dataset.sending;
        try {
          const res = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch {
          error.hidden = false;
          submit.disabled = false;
          submit.innerHTML = label;
          return;
        }
        submit.disabled = false;
        submit.innerHTML = label;
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    return {
      el,
      form,
      reset() {
        form.hidden = false;
        done.hidden = true;
        error.hidden = true;
        show(0, { focus: false });
      },
    };
  }
}
