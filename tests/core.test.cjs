'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../markdown-importer/options/core.js');

test('plain Markdown remains editable and unchanged', () => {
    const p = core.parse('# Hello\n\n**Text** and [Link](https://example.org)\n', 'hello.md');
    assert.equal(p.title, 'Hello');
    assert.equal(p.body, '# Hello\n\n**Text** and [Link](https://example.org)\n');
});
test('YAML handles Unicode, arrays, multiline descriptions and quoted colons', () => {
    const p = core.parse('---\ntitle: "Café: World"\ntags: [IT, "Plan B"]\ncategories:\n  - Publii\ndescription: >\n  A long\n  description.\ndate: 2026-10-25\n---\n# Content', 'a.md');
    assert.equal(p.title, 'Café: World');
    assert.deepEqual(p.tags, ['IT', 'Plan B', 'Publii']);
    assert.equal(p.description, 'A long description.');
    assert.equal(p.timestamp, Date.parse('2026-10-25'));
    assert.equal(p.body, '# Content');
});
test('BOM and Windows line endings', () => {
    assert.equal(core.parse('\uFEFF# Café\r\n\r\nTest\r\n', 'a.MD').body, '# Café\n\nTest\n');
});
test('filename fallback', () => {
    assert.equal(core.parse('Some text', 'My_Post.markdown').title, 'My Post');
});
test('opening Setext H1 recognized', () => {
    const p = core.parse('Title\n=====\n\nText', 'a.md', { stripHeading: true });
    assert.equal(p.title, 'Title'); assert.equal(p.body, 'Text');
});
test('only matching first H1 is optionally removed', () => {
    assert.equal(core.parse('# Title\n\nText', 'a.md', { stripHeading: true }).body, 'Text');
    assert.equal(core.parse('---\ntitle: Another Title\n---\n# Title\n\nText', 'a.md', { stripHeading: true }).body, '# Title\n\nText');
});
test('heading inside fenced code is not a title', () => {
    const fence = String.fromCharCode(96).repeat(3);
    assert.equal(core.parse(fence + '\n# Code\n' + fence, 'fallback.md').title, 'fallback');
});
test('malformed or unterminated YAML is rejected', () => {
    assert.throws(() => core.parse('---\ntitle: [\n---\nText', 'a.md'), /YAML/);
    assert.throws(() => core.parse('---\ntitle: X\nText', 'a.md'), /closing delimiter/);
});
test('duplicate keys rejected', () => {
    assert.throws(() => core.parse('---\ntitle: A\ntitle: B\n---\nText', 'a.md'), /YAML/);
});
test('non-map metadata and nested title rejected', () => {
    assert.throws(() => core.parse('---\n- X\n---\nText', 'a.md'), /mapping/);
    assert.throws(() => core.parse('---\ntitle: {nested: A}\n---\nText', 'a.md'), /scalar value/);
});
test('invalid dates are rejected rather than silently normalized', () => {
    for (const date of ['2026-02-30', '25.10.2026', '2026-13-01']) {
        assert.throws(() => core.parse('---\ndate: ' + date + '\n---\nText', 'a.md'), /date/i);
    }
});
test('offset timestamps preserved', () => {
    assert.equal(core.parse('---\ndate: 2026-10-25T10:30:00+01:00\n---\nText', 'a.md').timestamp, Date.parse('2026-10-25T09:30:00Z'));
});
test('boolean published metadata does not become a date', () => {
    assert.equal(core.parse('---\npublished: true\n---\nText', 'a.md').timestamp, null);
});
test('binary and wrong extensions rejected', () => {
    assert.throws(() => core.parse('abc\0', 'a.md'), /binary/);
    assert.throws(() => core.parse('abc', 'a.txt'), /Markdown/);
});
test('large input rejected', () => {
    assert.throws(() => core.parse('a'.repeat(core.MAX_BYTES + 1), 'a.md'), /10 MiB/);
});
test('unsafe YAML executable types rejected', () => {
    assert.throws(() => core.parse('---\ntitle: !!js/function "function() {}"\n---\nText', 'a.md'), /YAML/);
});
test('prototype fields cannot inject metadata', () => {
    const p = core.parse('---\n__proto__:\n  title: Injected\n---\nText', 'normal.md');
    assert.equal(p.title, 'normal'); assert.equal({}.title, undefined);
});
test('tags deduplicated, numeric tags supported', () => {
    assert.deepEqual(core.parse('---\ntags: [IT, 2026, IT]\ncategories: IT, Test\n---\nText', 'a.md').tags, ['IT', '2026', 'Test']);
});
test('relative media generate warnings, external images do not', () => {
    assert.ok(core.parse('![Photo](images/a.png)', 'a.md').warnings.some(w => w.includes('Local')));
    assert.equal(core.parse('![Photo](https://example.org/a.png)', 'a.md').warnings.length, 0);
    assert.ok(core.parse('[pic]: ./a.png', 'a.md').warnings.some(w => w.includes('Local')));
});
test('draft payload uses Markdown editor and metadata', () => {
    const entry = core.parse('---\nstatus: published\ntags: [Test]\ndescription: Excerpt\n---\n# Title', 'a.md');
    const p = core.payload(entry, 'site', 2, { postConfig: [{ name: 'wide', type: 'checkbox', value: true }] }, 100);
    assert.equal(p.id, 0); assert.equal(p.status, 'draft'); assert.equal(p.additionalData.editor, 'markdown');
    assert.equal(p.additionalData.metaDesc, 'Excerpt'); assert.equal(p.author, 2);
    assert.equal(p.text, '# Title'); assert.equal(p.creationDate, 100);
    assert.deepEqual(p.postViewSettings.wide, { type: 'checkbox', value: true });
});
function fixture({ existing = [], respond = true, invalid = false, delay = 0 } = {}) {
    const requests = [];
    let handler;
    const store = { state: { currentSite: { config: { name: 'site' }, posts: [...existing], authors: [{ id: 1 }], themeSettings: {} } },
        commit(name, result) { assert.equal(name, 'refreshAfterPostUpdate'); this.state.currentSite.posts = result.posts; } };
    const api = {
        async invoke(command, text) { assert.equal(command, 'app-main-process-create-slug'); return text.toLowerCase().replace(/\s+/g, '-'); },
        receiveOnce(channel, callback) { assert.equal(channel, 'app-post-saved'); handler = callback; },
        send(channel, data) {
            assert.equal(channel, 'app-post-save'); assert.ok(handler, 'listener installed before sending');
            requests.push(data);
            if (respond) setTimeout(() => handler(invalid ? false : { postID: requests.length, posts: [...store.state.currentSite.posts, { slug: data.slug }] }), delay);
        }
    };
    return { api, store, requests };
}
test('sequential saving and same-session duplicate protection', async () => {
    const f = fixture(); const s = new core.ImportSession(f.api, f.store);
    const a = core.parse('# A', 'a.md'), b = core.parse('# B', 'b.md');
    assert.equal((await s.run([a, b], 1)).length, 2);
    assert.equal(f.requests.length, 2);
    await s.run([a], 1, false); assert.equal(f.requests.length, 2);
});
test('existing and batch duplicate slugs skipped', async () => {
    const f = fixture({ existing: [{ slug: 'existing' }] }); const s = new core.ImportSession(f.api, f.store);
    const results = await s.run(['Existing', 'New', 'New'].map((title, i) => core.parse('# ' + title, i + '.md')), 1);
    assert.deepEqual(results.map(r => r.status), ['skipped', 'imported', 'skipped']);
    assert.equal(f.requests.length, 1);
});
test('timeout stops batch and blocks further saves', async () => {
    const f = fixture({ respond: false }); const s = new core.ImportSession(f.api, f.store, 10);
    await assert.rejects(s.run([core.parse('# A', 'a.md'), core.parse('# B', 'b.md')], 1), /not responding/);
    assert.equal(f.requests.length, 1); assert.equal(s.uncertain, true);
    await assert.rejects(s.run([core.parse('# C', 'c.md')], 1), /uncertain/);
});
test('unconfirmed save stops batch', async () => {
    const f = fixture({ invalid: true }); const s = new core.ImportSession(f.api, f.store);
    await assert.rejects(s.run([core.parse('# A', 'a.md')], 1), /not confirmed/);
    assert.equal(s.uncertain, true);
});
test('missing author prevents mutation', async () => {
    const f = fixture(); const s = new core.ImportSession(f.api, f.store);
    await assert.rejects(s.run([core.parse('# A', 'a.md')], 999), /author/);
    assert.equal(f.requests.length, 0);
});
test('concurrent imports rejected', async () => {
    const f = fixture({ delay: 20 }); const s = new core.ImportSession(f.api, f.store);
    const first = s.run([core.parse('# A', 'a.md')], 1);
    await assert.rejects(s.run([core.parse('# B', 'b.md')], 1), /running/);
    await first;
});
