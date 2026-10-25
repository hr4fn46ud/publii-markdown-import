'use strict';
// Run using Publii's bundled Node runtime (ELECTRON_RUN_AS_NODE=1).
// This uses the installed backend and native SQLite without touching user sites.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const asar = process.env.PUBLII_ASAR || '/Applications/Publii.app/Contents/Resources/app.asar';
const Post = require(path.join(asar, 'back-end/post.js'));
const Database = require(path.join(asar, 'node_modules/better-sqlite3'));
const createSlug = require(path.join(asar, 'back-end/helpers/slug.js'));
const ZipHelper = require(path.join(asar, 'back-end/helpers/zip.helper.js'));
const Plugins = require(path.join(asar, 'back-end/plugins.js'));
const core = require('../markdown-importer/options/core.js');
const manifest = require('../markdown-importer/plugin.json');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-importer-integration-'));
const siteDir = path.join(root, 'test', 'input');
fs.mkdirSync(siteDir, { recursive: true });
const db = new Database(path.join(siteDir, 'db.sqlite'));
db.exec(fs.readFileSync(path.join(asar, 'back-end/sql/1.0.0.sql'), 'utf8'));
db.exec("INSERT INTO authors VALUES(1, 'Test Author', 'test', '', '{}', '{}')");
const app = {
    sitesDir: root, appDir: root, sites: { test: { advanced: { urls: { cleanUrls: true, authorsPrefix: 'authors', tagsPrefix: 'tags' } } } },
    getDbForSite: () => db
};
(async () => {
    const pluginZip = path.join(__dirname, '../dist/Markdown-Importer-' + manifest.version + '.zip');
    assert.ok(fs.existsSync(pluginZip), 'Build the plugin ZIP with python3 build.py first.');
    ZipHelper.extractZipSafely(pluginZip, path.join(root, 'plugins'));
    const installed = new Plugins(root, root).loadPlugins();
    assert.equal(installed.length, 1);
    assert.equal(installed[0].name, 'Markdown Importer');
    assert.equal(installed[0].directory, 'markdown-importer');
    assert.equal(installed[0].hasSettings, true);
    let listener, saves = 0;
    const authors = [{ id: 1, name: 'Test Author' }];
    const store = {
        state: { currentSite: { config: { name: 'test' }, posts: [], authors, themeSettings: { postConfig: [] } } },
        commit(name, data) { assert.equal(name, 'refreshAfterPostUpdate'); this.state.currentSite.posts = data.posts; this.state.currentSite.authors = data.authors; }
    };
    const api = {
        async invoke(command, text) { assert.equal(command, 'app-main-process-create-slug'); return createSlug(text); },
        receiveOnce(channel, callback) { assert.equal(channel, 'app-post-saved'); listener = callback; },
        send(channel, data) {
            assert.equal(channel, 'app-post-save');
            const saved = new Post(app, data).save(); saves++;
            const callback = listener; listener = null;
            callback(saved);
        }
    };
    const session = new core.ImportSession(api, store);
    const entries = [
        core.parse('---\ntitle: "Café with Publii"\ndate: 2026-10-25\ntags: [IT, Publii]\ndescription: Test description\n---\n# Hello\n\n**Markdown** is preserved.\n', 'first.md'),
        core.parse('# Another post\n\nUnicode characters: äöüß.', 'second.md')
    ];
    await session.run(entries, 1);
    assert.equal(saves, 2);
    const posts = db.prepare('SELECT * FROM posts ORDER BY id').all();
    assert.equal(posts.length, 2);
    assert.equal(posts[0].text, entries[0].body);
    assert.equal(posts[0].title, 'Café with Publii');
    assert.equal(posts[0].slug, 'cafe-with-publii');
    assert.equal(posts[0].status, 'draft');
    assert.equal(posts[0].created_at, Date.parse('2026-10-25'));
    const loaded = new Post(app, { site: 'test', id: posts[0].id }).load();
    assert.equal(loaded.additionalData.editor, 'markdown');
    assert.equal(loaded.additionalData.metaDesc, 'Test description');
    assert.deepEqual(loaded.tags.map(t => t.name).sort(), ['IT', 'Publii']);
    const duplicate = core.parse('---\ntitle: Café with Publii\n---\nDifferent text', 'duplicate.md');
    const results = await session.run([duplicate], 1);
    assert.equal(results[0].status, 'skipped');
    assert.equal(db.prepare('SELECT count(*) AS n FROM posts').get().n, 2);
    // With duplicate skipping disabled, Publii's backend supplies the suffix.
    await session.run([duplicate], 1, false);
    assert.equal(db.prepare('SELECT slug FROM posts ORDER BY id DESC LIMIT 1').get().slug, 'cafe-with-publii-2');
    console.log('PASS: actual Publii ZIP extractor + plugin discovery; actual backend + native SQLite: save, load, Markdown editor, Unicode, dates, tags, description, duplicate handling.');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => {
    db.close();
    fs.rmSync(root, { recursive: true, force: true });
});
