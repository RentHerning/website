import da from '../i18n/da.mjs';
import en from '../i18n/en.mjs';

const dictionaries = { da, en };

/** Returns t('nav.listings') for the given language, falling back to Danish. */
export function translator(lang) {
  const dict = dictionaries[lang];
  return function t(key, vars = {}) {
    const lookup = (d) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), d);
    let value = lookup(dict) ?? lookup(dictionaries.da);
    if (value == null) throw new Error(`Missing translation: ${key}`);
    if (typeof value === 'string') {
      value = value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : `{${name}}`));
    }
    return value;
  };
}

const locales = { da: 'da-DK', en: 'en-GB' };

export function formatters(lang) {
  const locale = locales[lang];
  const number = new Intl.NumberFormat(locale);
  return {
    kr: (n) => `${number.format(Math.round(n))} kr.`,
    number: (n) => number.format(n),
    date: (iso) =>
      new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)),
  };
}
