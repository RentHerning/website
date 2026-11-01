import { html, raw } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { brandLockup } from './header.mjs';

export function footer(ctx) {
  const { t, site } = ctx;
  const year = new Date().getFullYear();
  const { emergencyPhone, email } = site.contact;

  return html`<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__about">
      ${brandLockup(ctx, { inverse: true })}
      <p>${t('footer.tagline')}</p>
    </div>
    <div>
      <h2 class="site-footer__heading">${t('footer.homes')}</h2>
      <ul class="site-footer__links">
        <li><a href="${ctx.link('listings')}">${t('footer.allListings')}</a></li>
        <li><a href="${site.boligportal.companyPage}" rel="noopener">${t('footer.onBoligportal')}${raw('&nbsp;')}${icon('external-link', { className: 'icon--sm' })}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="site-footer__heading">${t('footer.help')}</h2>
      <ul class="site-footer__links">
        <li><a href="${ctx.link('help')}#akut">${t('footer.emergency')}</a></li>
        <li><a href="${ctx.link('help')}">${t('footer.contactUs')}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="site-footer__heading">${t('footer.documents')}</h2>
      <ul class="site-footer__links">
        <li><a href="${site.documents.houseRules}">${t('footer.houseRules')}</a></li>
        <li><a href="${site.documents.privacy}">${t('footer.privacy')}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="site-footer__heading">${t('footer.contact')}</h2>
      <ul class="site-footer__links site-footer__contact">
        <li>${icon('phone')} ${emergencyPhone ? html`<a href="tel:${emergencyPhone.replace(/\s/g, '')}">${emergencyPhone}</a>` : html`<span class="placeholder">${t('footer.phoneMissing')}</span>`}</li>
        <li>${icon('mail')} ${email ? html`<a href="mailto:${email}">${email}</a>` : html`<span class="placeholder">${t('footer.emailMissing')}</span>`}</li>
      </ul>
    </div>
  </div>
  <div class="container site-footer__bottom">
    <p>© ${year} ${site.name}. ${t('footer.rights')}</p>
    <p>${t('footer.listingsSource')}</p>
  </div>
</footer>`;
}
