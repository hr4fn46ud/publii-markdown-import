(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./locales.bundle.js'));
    } else {
        root.MarkdownImporterI18n = factory(root.MarkdownImporterLocales);
    }
}(typeof globalThis === 'object' ? globalThis : this, function (bundledLocales) {
    'use strict';
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

    function canonicalLocale(value) {
        if (typeof value !== 'string' || !value.trim()) return 'en';
        try { return Intl.getCanonicalLocales(value.trim().replace(/_/g, '-'))[0] || 'en'; }
        catch (_) { return 'en'; }
    }

    function readPubliiLocale(vm) {
        // Publii's Vue I18n locale is authoritative; do not use the website language.
        try { return typeof vm?.$i18n?.locale === 'string' ? vm.$i18n.locale : 'en'; }
        catch (_) { return 'en'; }
    }

    function createTranslator(requestedLocale = 'en', catalog = bundledLocales) {
        const api = {
            locale: 'en', language: 'en', direction: 'ltr',
            setLocale(value) {
                const requested = canonicalLocale(value);
                const tag = requested.toLowerCase();
                const base = tag.split('-')[0];
                api.language = own(catalog, tag) ? tag : own(catalog, base) ? base : 'en';
                api.locale = api.language === tag || api.language === base ? requested : 'en';
                api.direction = catalog[api.language]?.direction === 'rtl' ? 'rtl' : 'ltr';
                return api;
            },
            t(key, params = {}) {
                const translated = catalog[api.language]?.messages;
                const fallback = catalog.en?.messages;
                const value = own(translated, key) && typeof translated[key] === 'string' && translated[key]
                    ? translated[key] : own(fallback, key) ? fallback[key] : key;
                return String(value).replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, name) =>
                    own(params, name) ? String(params[name]) : placeholder);
            },
            formatError(error) {
                if (error && typeof error.translationKey === 'string') {
                    return api.t(error.translationKey, error.translationParams);
                }
                return error?.message || String(error);
            },
            formatDate(timestamp) {
                return new Intl.DateTimeFormat(api.locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(timestamp);
            }
        };
        return api.setLocale(requestedLocale);
    }

    const english = createTranslator('en');
    class LocalizedError extends Error {
        constructor(translationKey, translationParams = {}) {
            super(english.t(translationKey, translationParams));
            this.name = 'LocalizedError';
            this.translationKey = translationKey;
            this.translationParams = translationParams;
        }
    }
    return { canonicalLocale, readPubliiLocale, createTranslator, LocalizedError };
}));
