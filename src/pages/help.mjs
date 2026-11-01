import { html, raw } from '../lib/html.mjs';
import { icon } from '../lib/icons.mjs';
import { FLOWS, SEEKER } from '../help/flows.mjs';

const L = (ctx, obj) => (obj == null ? '' : typeof obj === 'string' ? obj : obj[ctx.lang] ?? obj.da);

function emergencyCard(ctx, { compact = false } = {}) {
  const { t, site } = ctx;
  const phone = site.contact.emergencyPhone;
  return html`<div class="emergency${compact ? ' emergency--compact' : ''}">
  <p class="emergency__title">${icon('siren')} ${t('help.emergencyTitle')}</p>
  <p>${t('help.emergencyBody')}</p>
  ${phone
    ? html`<a class="button button--danger button--lg button--block" href="tel:${phone.replace(/\s/g, '')}">${icon('phone')} ${phone}</a>`
    : html`<p class="emergency__phone placeholder">${icon('phone')} ${t('help.phoneMissing')}</p>`}
  ${compact ? '' : html`<p class="emergency__small">${t('help.urgentExamples')}</p>`}
  <p class="emergency__small"><strong>${t('help.fire')}</strong></p>
</div>`;
}

function field(ctx, f, flowId) {
  const id = `${flowId}-${f.name}`;
  const label = L(ctx, f.label);
  const hint = f.hint ? html`<span class="field__hint" id="${id}-hint">${L(ctx, f.hint)}</span>` : '';
  const describedBy = f.hint ? raw(` aria-describedby="${id}-hint"`) : '';
  const req = f.required ? raw(' required') : '';

  if (f.type === 'choice' || f.type === 'radio') {
    const many = f.type === 'choice';
    return html`<div class="field" role="radiogroup" aria-labelledby="${id}-label"${describedBy}>
    <span class="field__label" id="${id}-label">${label}</span>
    ${hint}
    <div class="${many ? 'choice-grid' : 'radio-list'}">
      ${f.options.map(
        (o) => html`<label class="${many ? 'choice' : 'radio'}">
        <input type="radio" name="${f.name}" value="${o.value}" data-label="${L(ctx, o.label)}"${req}>
        ${many && o.icon ? html`<span class="choice__icon">${icon(o.icon)}</span>` : html`<span class="radio__dot" aria-hidden="true"></span>`}
        <span class="choice__text">${L(ctx, o.label)}</span>
      </label>`,
      )}
    </div>
  </div>`;
  }

  if (f.type === 'checkbox') {
    return html`<div class="field">
    <label class="check" for="${id}">
      <input type="checkbox" id="${id}" name="${f.name}" value="ja"${req}${describedBy}>
      <span class="check__box" aria-hidden="true"></span>
      <span class="field__label">${label}</span>
    </label>
    ${hint}
  </div>`;
  }

  const common = raw(
    `id="${id}" name="${f.name}"${f.required ? ' required' : ''}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ''}${f.inputmode ? ` inputmode="${f.inputmode}"` : ''}${f.check ? ` data-check="${f.check}"` : ''}`,
  );
  const placeholder = f.placeholder ? raw(` placeholder="${L(ctx, f.placeholder).replace(/"/g, '&quot;')}"`) : '';
  const control =
    f.type === 'textarea'
      ? html`<textarea ${common} rows="${f.rows ?? 4}"${placeholder}${describedBy}></textarea>`
      : html`<input type="${f.type}" ${common}${placeholder}${describedBy}${f.value ? raw(` value="${f.value}"`) : ''}>`;
  return html`<div class="field">
    <label class="field__label" for="${id}">${label}</label>
    ${hint}
    ${control}
    ${f.check ? html`<p class="field__note" data-note-for="${f.name}" aria-live="polite" hidden></p>` : ''}
  </div>`;
}

function flowSection(ctx, flow) {
  const { t, site } = ctx;
  const endpoint = site.contact.formEndpoint;
  const total = flow.steps.length + 1;
  return html`<section class="flow${flow.urgent ? ' flow--urgent' : ''}" id="${flow.id}" data-flow="${flow.id}" aria-labelledby="${flow.id}-title">
  <a class="flow__back" href="#" data-back>${icon('arrow-left')} ${t('help.back')}</a>
  <header class="flow__head">
    <span class="flow__icon">${icon(flow.icon)}</span>
    <h2 id="${flow.id}-title" tabindex="-1">${L(ctx, flow.title)}</h2>
  </header>
  ${flow.intro ? html`<p class="flow__intro">${L(ctx, flow.intro)}</p>` : ''}
  ${flow.callFirst ? emergencyCard(ctx) : ''}
  <form class="flow__form" data-form method="post" action="${endpoint ?? '#'}" data-endpoint="${endpoint ?? ''}">
    <input type="hidden" name="henvendelse" value="${L(ctx, flow.title)}">
    <input type="hidden" name="_subject" value="Rent Herning: ${L(ctx, flow.subject)}">
    <input type="hidden" name="sprog" value="${ctx.lang}">
    <label class="visually-hidden" aria-hidden="true">Website <input type="text" name="_gotcha" tabindex="-1" autocomplete="off"></label>
    <p class="flow__rita" data-rita-note hidden>${icon('sparkles')} ${t('help.ritaDraft')}</p>
    <div class="flow__progress" data-progress hidden>
      <p data-progress-text data-template="${t('help.step')}"></p>
      <div class="flow__bar"><span data-progress-bar></span></div>
    </div>
    ${flow.steps.map(
      (step, i) => html`<fieldset class="flow__step" data-step="${i}">
      <legend tabindex="-1">${L(ctx, step.title)} <span class="visually-hidden">(${t('help.step', { n: i + 1, total })})</span></legend>
      ${step.fields.map((f) => field(ctx, f, flow.id))}
    </fieldset>`,
    )}
    <fieldset class="flow__step flow__review" data-step="review" hidden>
      <legend tabindex="-1">${t('help.review')}</legend>
      <p class="muted">${t('help.reviewLead')}</p>
      <dl class="summary" data-summary></dl>
    </fieldset>
    <p class="flow__consent">${icon('shield-check')} ${t('help.consent')} <a href="${site.documents.privacy}">${t('help.privacy')}</a>.</p>
    <p class="flow__error" data-error role="alert" hidden>${icon('triangle-alert')} ${t('help.error')}</p>
    <div class="flow__nav">
      <button type="button" class="button button--ghost" data-prev hidden>${icon('arrow-left')} ${t('help.prev')}</button>
      <button type="button" class="button" data-next hidden>${t('help.next')} ${icon('arrow-right')}</button>
      <button type="submit" class="button${flow.urgent ? ' button--danger' : ''}" data-submit data-sending="${t('help.sending')}">${t('help.send')} ${icon('arrow-right')}</button>
    </div>
  </form>
  <div class="flow__done" data-done hidden tabindex="-1">
    ${icon('circle-check')}
    <h3>${t('help.doneTitle')}</h3>
    <p>${t('help.doneBody')}</p>
    ${endpoint ? '' : html`<p class="flow__demo">${icon('info')} ${t('help.doneDemo')}</p>`}
    <a class="button button--ghost" href="#" data-back>${t('help.again')}</a>
  </div>
</section>`;
}

export default {
  id: 'help',
  render(ctx) {
    const { t, site } = ctx;
    return {
      title: t('help.title'),
      description: t('help.lead'),
      bodyClass: 'page-help',
      scripts: ['assets/help.js'],
      body: html`<section class="page-head">
  <div class="container">
    <h1>${t('help.title')}</h1>
    <p class="lead">${t('help.lead')}</p>
  </div>
</section>
<section class="section section--tight help" data-help
  data-edit="${t('help.edit')}" data-within14-late="${t('help.within14Late')}"
  data-notice-earliest="${t('help.noticeEarliest')}" data-notice-early="${t('help.noticeEarly')}">
  <div class="container help__layout">
    <div class="help__main">
      <nav class="chooser" aria-label="${t('help.choose')}" data-chooser>
        <h2 class="chooser__title">${t('help.choose')}</h2>
        <ul class="chooser__list">
          ${FLOWS.map(
            (f) => html`<li><a class="choice-tile${f.urgent ? ' choice-tile--urgent' : ''}" href="#${f.id}">
            <span class="choice-tile__icon">${icon(f.icon)}</span>
            <span class="choice-tile__text"><strong>${L(ctx, f.title)}</strong><span>${L(ctx, f.summary)}</span></span>
            ${icon('chevron-right', { className: 'choice-tile__arrow' })}
          </a></li>`,
          )}
          <li><a class="choice-tile choice-tile--seeker" href="${ctx.link('listings')}">
            <span class="choice-tile__icon">${icon(SEEKER.icon)}</span>
            <span class="choice-tile__text"><strong>${L(ctx, SEEKER.title)}</strong><span>${L(ctx, SEEKER.summary)}</span></span>
            ${icon('chevron-right', { className: 'choice-tile__arrow' })}
          </a></li>
        </ul>
      </nav>
      ${FLOWS.map((f) => flowSection(ctx, f))}
    </div>
    <aside class="help__aside">
      ${emergencyCard(ctx, { compact: true })}
      <div class="aside-card">
        <h2>${t('help.asideSeekerTitle')}</h2>
        <p>${t('help.asideSeekerBody')}</p>
        <a href="${ctx.link('listings')}">${t('help.seekerCta')} ${icon('arrow-right', { className: 'icon--sm' })}</a>
      </div>
      <div class="aside-card">
        <h2>${t('help.asideDocs')}</h2>
        <ul>
          <li><a href="${site.documents.houseRules}">${t('footer.houseRules')}</a></li>
          <li><a href="${site.documents.privacy}">${t('footer.privacy')}</a></li>
        </ul>
      </div>
    </aside>
  </div>
</section>`,
    };
  },
};
