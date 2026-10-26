'use strict';
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1140, height: 1050 }, colorScheme: 'light', locale: 'en-US' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(pathToFileURL(path.join(__dirname, 'browser-host.html')).href);
        const frame = page.frameLocator('iframe');
        assert.equal(await frame.locator('html').getAttribute('lang'), 'en-US');
        assert.equal(await frame.locator('#import').textContent(), 'Import as drafts');
        await frame.locator('#connection').filter({ hasText: 'Test Website' }).waitFor();
        await frame.locator('#files').setInputFiles([
            path.join(__dirname, '../examples/example.md'),
            path.join(__dirname, '../examples/without-front-matter.md')
        ]);
        await frame.locator('#count').filter({ hasText: 'Files: 2' }).waitFor();
        await frame.locator('.entry-title').first().click();
        assert.ok((await frame.locator('#source').textContent()).includes('**Markdown editor**'));
        await frame.locator('#import').click();
        await frame.locator('#message').filter({ hasText: 'Imported drafts: 2; skipped: 0' }).waitFor();
        const requests = await page.evaluate(() => window.testRequests);
        assert.equal(requests.length, 2);
        assert.equal(requests[0].status, 'draft');
        assert.equal(requests[0].additionalData.editor, 'markdown');
        assert.ok(await frame.locator('#import').isDisabled());
        const originalSource = await frame.locator('#source').textContent();
        await page.evaluate(() => setTestLocale('de-DE'));
        await frame.locator('#import').filter({ hasText: 'Als Entwürfe importieren' }).waitFor();
        assert.equal(await frame.locator('html').getAttribute('lang'), 'de-DE');
        assert.ok((await frame.locator('#message').textContent()).includes('Importierte Entwürfe: 2'));
        assert.equal(await frame.locator('#source').textContent(), originalSource);
        assert.equal((await page.evaluate(() => testRequests)).length, 2);
        assert.ok((await frame.locator('tbody').textContent()).includes('Importiert · ID'));
        await page.evaluate(() => setTestLocale('en_GB'));
        await frame.locator('#import').filter({ hasText: 'Import as drafts' }).waitFor();
        assert.equal(await frame.locator('html').getAttribute('lang'), 'en-GB');
        // A fresh file with the same title should be skipped without a save.
        await frame.locator('#files').setInputFiles({ name: 'duplicate.md', mimeType: 'text/markdown', buffer: Buffer.from('# A simple post\n\nOnce more') });
        await frame.locator('#count').filter({ hasText: 'Files: 3' }).waitFor();
        await frame.locator('#import').click();
        await frame.locator('#message').filter({ hasText: 'skipped: 1' }).waitFor();
        assert.equal((await page.evaluate(() => testRequests)).length, 2);
        // Reject invalid UTF-8 and invalid YAML; show raw malicious text safely.
        await frame.locator('#files').setInputFiles([
            { name: 'invalid.md', mimeType: 'text/markdown', buffer: Buffer.from([0xc3, 0x28]) },
            { name: 'broken.md', mimeType: 'text/markdown', buffer: Buffer.from('---\ntitle: [\n---\nText') },
            { name: 'unsafe.md', mimeType: 'text/markdown', buffer: Buffer.from('# <img src=x onerror="parent.testXss=true">\n\n<script>parent.testXss=true</script>') }
        ]);
        await frame.locator('#count').filter({ hasText: 'Files: 6' }).waitFor();
        await frame.locator('.entry-title').last().click();
        assert.equal(await page.evaluate(() => testXss), false);
        assert.equal(await frame.locator('#entries img').count(), 0);
        assert.equal(await frame.locator('td.error').count(), 2);
        await page.evaluate(() => setTestLocale('de'));
        await frame.locator('td.error').first().filter({ hasText: 'kein gültiges UTF-8' }).waitFor();
        assert.ok((await frame.locator('td.error').nth(1).textContent()).includes('Ungültiges YAML'));
        assert.equal(await frame.locator('#entries img').count(), 0);
        await page.evaluate(() => setTestLocale('fr_FR'));
        await frame.locator('#import').filter({ hasText: 'Import as drafts' }).waitFor();
        assert.equal(await frame.locator('html').getAttribute('lang'), 'en');
        const evidence = path.join(__dirname, '../verification');
        fs.mkdirSync(evidence, { recursive: true });
        await frame.locator('#clear').click();
        await frame.locator('#files').setInputFiles([
            path.join(__dirname, '../examples/example.md'),
            path.join(__dirname, '../examples/without-front-matter.md')
        ]);
        await frame.locator('#count').filter({ hasText: 'Files: 2' }).waitFor();
        await page.setViewportSize({ width: 1140, height: 1250 });
        await frame.locator('#preview').evaluate(el => { el.open = false; window.scrollTo(0, 0); });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(evidence, 'markdown-importer-preview.png'), fullPage: true });
        await page.setViewportSize({ width: 700, height: 1050 });
        await page.screenshot({ path: path.join(evidence, 'markdown-importer-narrow.png'), fullPage: true });
        await page.setViewportSize({ width: 1140, height: 1250 });
        await page.evaluate(() => setTestLocale('de-DE'));
        await frame.locator('#import').filter({ hasText: 'Als Entwürfe importieren' }).waitFor();
        await frame.locator('#preview').evaluate(el => { el.open = false; window.scrollTo(0, 0); });
        await page.screenshot({ path: path.join(evidence, 'markdown-importer-de.png'), fullPage: true });
        // The Publii locale takes precedence over the browser's English locale on first load too.
        await page.goto(pathToFileURL(path.join(__dirname, 'browser-host.html')).href + '?locale=de_AT');
        const initialGerman = page.frameLocator('iframe');
        await initialGerman.locator('#import').filter({ hasText: 'Als Entwürfe importieren' }).waitFor();
        assert.equal(await initialGerman.locator('html').getAttribute('lang'), 'de-AT');
        await initialGerman.locator('#files').setInputFiles({
            name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('Text')
        });
        await initialGerman.locator('td.error').filter({ hasText: 'Keine Markdown-Datei' }).waitFor();
        assert.deepEqual(errors, []);
        await page.goto(pathToFileURL(path.join(__dirname, '../markdown-importer/options/index.html')).href);
        await page.locator('#connection.error').waitFor();
        assert.ok(await page.locator('#import').isDisabled());
        console.log('PASS: browser UI: English/German detection, live language switching, regional locales, English fallback, translated errors, source preservation, batch import, duplicates, UTF-8/YAML, XSS, standalone guard. Previews saved.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
