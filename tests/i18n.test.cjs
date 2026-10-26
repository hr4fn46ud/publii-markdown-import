'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const i18n = require('../markdown-importer/options/i18n.js');
const bundled = require('../markdown-importer/options/locales.bundle.js');
const core = require('../markdown-importer/options/core.js');

test('locale tags accept regional variants and underscores', () => {
    assert.equal(i18n.canonicalLocale(' de_DE '), 'de-DE');
    assert.equal(i18n.canonicalLocale('en_gb'), 'en-GB');
    assert.equal(i18n.canonicalLocale('not a locale'), 'en');
});
test('the Publii interface locale is used instead of website or browser settings', () => {
    assert.equal(i18n.readPubliiLocale({ $i18n: { locale: 'de-DE' }, $store: { state: { language: 'fr' } } }), 'de-DE');
    assert.equal(i18n.readPubliiLocale(null), 'en');
});
test('regional German resolves to German and keeps the region for date formatting', () => {
    const t = i18n.createTranslator('de_AT');
    assert.equal(t.language, 'de'); assert.equal(t.locale, 'de-AT');
    assert.equal(t.t('ui.import'), 'Als Entwürfe importieren');
});
test('unsupported languages fall back to English', () => {
    const t = i18n.createTranslator('fr-FR');
    assert.equal(t.language, 'en'); assert.equal(t.locale, 'en');
    assert.equal(t.t('ui.import'), 'Import as drafts');
    assert.equal(i18n.createTranslator('__proto__').language, 'en');
});
test('missing translated keys fall back individually to English', () => {
    const catalog = { en: bundled.en, fr: { direction: 'ltr', messages: { 'ui.import': 'Importer' } } };
    const t = i18n.createTranslator('fr-FR', catalog);
    assert.equal(t.t('ui.import'), 'Importer');
    assert.equal(t.t('status.ready'), 'Ready');
    assert.equal(t.t('unknown.key'), 'unknown.key');
});
test('parameters are inserted without interpreting user content', () => {
    const t = i18n.createTranslator('de');
    assert.equal(t.t('ui.importFile', { filename: '<img src=x>' }), '<img src=x> importieren');
    assert.equal(t.t('status.imported', { id: 42 }), 'Importiert · ID 42');
});
test('changing language retranslates existing errors', () => {
    let error;
    try { core.parse('not markdown', 'example.txt'); } catch (e) { error = e; }
    assert.ok(error instanceof i18n.LocalizedError);
    assert.equal(error.message, 'Not a Markdown file.');
    const t = i18n.createTranslator('de');
    assert.equal(t.formatError(error), 'Keine Markdown-Datei.');
    t.setLocale('en-GB');
    assert.equal(t.formatError(error), 'Not a Markdown file.');
});
test('parser warning keys support translation without modifying Markdown', () => {
    const source = '# Café\n\n![Photo](local.png)';
    const entry = core.parse(source, 'cafe.md');
    assert.deepEqual(entry.warningKeys, ['warning.localPaths']);
    assert.equal(entry.body, source);
    assert.match(i18n.createTranslator('de').t(entry.warningKeys[0]), /Lokale Bild/);
});
test('date display follows the effective language', () => {
    const timestamp = Date.UTC(2026, 9, 26, 12);
    const en = i18n.createTranslator('en-US').formatDate(timestamp);
    const de = i18n.createTranslator('de-DE').formatDate(timestamp);
    assert.match(en, /Oct/); assert.match(de, /26\.10\.2026/);
});
test('language direction is declared by a separately supplied catalog', () => {
    const catalog = { en: bundled.en, ar: { direction: 'rtl', messages: {} } };
    const t = i18n.createTranslator('ar', catalog);
    assert.equal(t.direction, 'rtl');
    assert.equal(t.t('status.ready'), 'Ready');
});
test('checked-in browser bundle matches the independent translation files', () => {
    const dir = path.join(__dirname, '../markdown-importer/options/locales');
    const names = fs.readdirSync(dir).filter(n => n.endsWith('.json'));
    assert.deepEqual(Object.keys(bundled).sort(), names.map(n => n.slice(0, -5)).sort());
    for (const name of names) assert.deepEqual(bundled[name.slice(0, -5)], JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
});
