import { html } from '../lib/html.mjs';

export default {
  id: 'home',
  render(ctx) {
    return {
      bodyClass: 'page-home',
      body: html`<section class="section container">
  <h1>${ctx.t('home.title')}</h1>
</section>`,
    };
  },
};
