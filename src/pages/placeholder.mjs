import { html } from '../lib/html.mjs';

// Temporary pages so the navigation works while the real pages are built.
const placeholder = (id, titleKey) => ({
  id,
  render(ctx) {
    return {
      title: ctx.t(titleKey),
      noindex: true,
      body: html`<section class="section container prose">
  <h1>${ctx.t(titleKey)}</h1>
  <p class="placeholder">${ctx.lang === 'da' ? 'Denne side er under opbygning.' : 'This page is being built.'}</p>
</section>`,
    };
  },
});

export const helpPlaceholder = placeholder('help', 'nav.help');
