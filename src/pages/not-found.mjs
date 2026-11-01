import { html } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';

// Rendered once as /404.html (GitHub Pages serves it for unknown URLs).
export default {
  id: 'notFound',
  render(ctx) {
    const { t } = ctx;
    return {
      title: t('notFound.title'),
      noindex: true,
      body: html`<section class="section container not-found">
  <p class="eyebrow">404</p>
  <h1>${t('notFound.title')}</h1>
  <p class="lead">${t('notFound.body')}</p>
  <div class="button-row">
    <a class="button" href="${ctx.link('listings')}">${t('notFound.listings')} ${icon('arrow-right')}</a>
    <a class="button button--ghost" href="${ctx.link('home')}">${t('notFound.back')}</a>
  </div>
</section>`,
    };
  },
};
