'use strict';
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
    const browser = await chromium.launch({ headless: true, args: ['--allow-file-access-from-files'] });
    try {
        const page = await browser.newPage({ viewport: { width: 1140, height: 1050 }, colorScheme: 'light' });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(pathToFileURL(path.join(__dirname, 'browser-host.html')).href);
        const frame = page.frameLocator('iframe');
        await frame.locator('#connection').filter({ hasText: 'Test-Website' }).waitFor();
        await frame.locator('#files').setInputFiles([
            path.join(__dirname, '../examples/beispiel.md'),
            path.join(__dirname, '../examples/ohne-metadaten.md')
        ]);
        await frame.locator('#count').filter({ hasText: '2 Datei(en)' }).waitFor();
        await frame.locator('.entry-title').first().click();
        assert.ok((await frame.locator('#source').textContent()).includes('**Markdown-Editor**'));
        await frame.locator('#import').click();
        await frame.locator('#message').filter({ hasText: '2 Entwurf/Entwürfe importiert' }).waitFor();
        const requests = await page.evaluate(() => window.testRequests);
        assert.equal(requests.length, 2);
        assert.equal(requests[0].status, 'draft');
        assert.equal(requests[0].additionalData.editor, 'markdown');
        assert.ok(await frame.locator('#import').isDisabled());
        // A fresh file with the same title should be skipped without a save.
        await frame.locator('#files').setInputFiles({ name: 'duplicate.md', mimeType: 'text/markdown', buffer: Buffer.from('# Ein einfacher Beitrag\n\nNoch einmal') });
        await frame.locator('#count').filter({ hasText: '3 Datei(en)' }).waitFor();
        await frame.locator('#import').click();
        await frame.locator('#message').filter({ hasText: '1 übersprungen' }).waitFor();
        assert.equal((await page.evaluate(() => testRequests)).length, 2);
        // Reject invalid UTF-8 and invalid YAML; show raw malicious text safely.
        await frame.locator('#files').setInputFiles([
            { name: 'invalid.md', mimeType: 'text/markdown', buffer: Buffer.from([0xc3, 0x28]) },
            { name: 'broken.md', mimeType: 'text/markdown', buffer: Buffer.from('---\ntitle: [\n---\nText') },
            { name: 'unsafe.md', mimeType: 'text/markdown', buffer: Buffer.from('# <img src=x onerror="parent.testXss=true">\n\n<script>parent.testXss=true</script>') }
        ]);
        await frame.locator('#count').filter({ hasText: '6 Datei(en)' }).waitFor();
        await frame.locator('.entry-title').last().click();
        assert.equal(await page.evaluate(() => testXss), false);
        assert.equal(await frame.locator('#entries img').count(), 0);
        assert.equal(await frame.locator('td.error').count(), 2);
        const evidence = path.join(__dirname, '../verification');
        fs.mkdirSync(evidence, { recursive: true });
        await frame.locator('#clear').click();
        await frame.locator('#files').setInputFiles([
            path.join(__dirname, '../examples/beispiel.md'),
            path.join(__dirname, '../examples/ohne-metadaten.md')
        ]);
        await frame.locator('#count').filter({ hasText: '2 Datei(en)' }).waitFor();
        await page.setViewportSize({ width: 1140, height: 1250 });
        await frame.locator('#preview').evaluate(el => { el.open = false; window.scrollTo(0, 0); });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(evidence, 'markdown-importer-preview.png'), fullPage: true });
        await page.setViewportSize({ width: 700, height: 1050 });
        await page.screenshot({ path: path.join(evidence, 'markdown-importer-narrow.png'), fullPage: true });
        assert.deepEqual(errors, []);
        await page.goto(pathToFileURL(path.join(__dirname, '../markdown-importer/options/index.html')).href);
        await page.locator('#connection.error').waitFor();
        assert.ok(await page.locator('#import').isDisabled());
        console.log('PASS: browser UI: bridge detection, file selection, preview, batch import, duplicates, invalid UTF-8/YAML, XSS, standalone guard. Screenshots saved.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
