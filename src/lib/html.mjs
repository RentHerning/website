// Tiny HTML templating: tagged template literals with automatic escaping.
// html`<p>${userText}</p>` escapes userText; nested html`` and raw() pass through.

class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const raw = (value) => new SafeHtml(String(value ?? ''));

function render(value) {
  if (value == null || value === false || value === true) return '';
  if (Array.isArray(value)) return value.map(render).join('');
  if (value instanceof SafeHtml) return value.value;
  return escape(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) out += render(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Join class names, skipping falsy entries. */
export const cx = (...names) => names.filter(Boolean).join(' ');
