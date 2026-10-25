/* global MarkdownImporterCore */
'use strict';
(() => {
    const core = MarkdownImporterCore;
    const $ = id => document.getElementById(id);
    let context, session, rows = [], busy = false;
    const message = (text, error = false) => {
        $('message').textContent = text;
        $('message').classList.toggle('error', error);
    };
    function contextFromParent() {
        if (window.parent === window) throw new Error('Open this plugin inside Publii under Tools & Plugins.');
        const p = window.parent;
        const app = p.document.querySelector('#app');
        const vm = app && app.__vue__;
        const api = p.mainProcessAPI;
        const store = vm && vm.$store;
        if (!api || !store?.state?.currentSite?.config?.name ||
            !['send', 'receiveOnce', 'invoke'].every(k => typeof api[k] === 'function')) {
            throw new Error('The Publii connection is unavailable. Publii 0.48.1 or later is required.');
        }
        return { api, store };
    }
    function updateButtons() {
        $('import').disabled = !context || busy || session?.uncertain || !rows.some(r => r.entry && r.selected && !r.imported);
        ['files', 'strip', 'skip', 'clear', 'author'].forEach(id => $(id).disabled = busy || (id === 'author' && !context));
        for (const cb of document.querySelectorAll('tbody input')) cb.disabled = busy || cb.dataset.done === 'yes';
    }
    function render() {
        $('entries').replaceChildren();
        for (const row of rows) {
            const tr = document.createElement('tr');
            const select = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = row.selected && !row.imported;
            cb.disabled = !row.entry || row.imported || busy;
            cb.dataset.done = !row.entry || row.imported ? 'yes' : 'no';
            cb.setAttribute('aria-label', 'Import ' + row.filename);
            cb.addEventListener('change', () => { row.selected = cb.checked; updateButtons(); });
            select.append(cb);
            const titleCell = document.createElement('td');
            const title = document.createElement('button');
            title.className = 'entry-title';
            title.textContent = row.entry?.title || row.filename;
            title.addEventListener('click', () => {
                $('source').textContent = row.entry?.body || row.error;
                $('preview').open = true;
            });
            const file = document.createElement('div');
            file.className = 'filename'; file.textContent = row.filename;
            titleCell.append(title, file);
            const info = document.createElement('td');
            info.textContent = row.entry ? row.entry.tags.join(', ') || '—' : '';
            if (row.entry?.timestamp != null) {
                const date = document.createElement('div'); date.className = 'warning';
                date.textContent = 'Date: ' + new Date(row.entry.timestamp).toLocaleString('en-US');
                info.append(date);
            }
            for (const warning of row.entry?.warnings || []) {
                const p = document.createElement('p'); p.className = 'warning'; p.textContent = warning; info.append(p);
            }
            const status = document.createElement('td');
            status.textContent = row.error || row.status || 'Ready';
            if (row.error) status.className = 'error';
            tr.append(select, titleCell, info, status); $('entries').append(tr);
        }
        $('count').textContent = rows.length + ' file(s) · ' + rows.filter(r => r.entry && !r.imported).length + ' ready';
        updateButtons();
    }
    async function addFiles(files) {
        if (busy) return;
        busy = true; updateButtons();
        try {
            const list = Array.from(files);
            if (list.length + rows.length > core.MAX_FILES) throw new Error('Maximum 500 files per import list.');
            for (const file of list) {
                if (rows.some(r => r.filename === file.name && r.size === file.size && r.modified === file.lastModified)) continue;
                const row = { filename: file.name, size: file.size, modified: file.lastModified, selected: true };
                try {
                    if (file.size > core.MAX_BYTES) throw new Error('The file exceeds 10 MiB.');
                    if (!/\.(md|markdown|mdown)$/i.test(file.name)) throw new Error('Not a Markdown file.');
                    // Decode strictly; silently replacing bytes could corrupt the original text.
                    row.raw = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
                    row.entry = core.parse(row.raw, file.name, { stripHeading: $('strip').checked });
                } catch (e) { row.error = e.message; row.selected = false; }
                rows.push(row);
            }
            message('Files checked. Review your selection and start the import.');
        } catch (e) { message(e.message, true); }
        finally { busy = false; $('files').value = ''; render(); }
    }
    $('files').addEventListener('change', e => addFiles(e.target.files));
    for (const type of ['dragenter', 'dragover']) $('drop').addEventListener(type, e => {
        e.preventDefault(); if (!busy) $('drop').classList.add('over');
    });
    for (const type of ['dragleave', 'drop']) $('drop').addEventListener(type, e => {
        e.preventDefault(); $('drop').classList.remove('over');
        if (type === 'drop' && !busy) addFiles(e.dataTransfer.files);
    });
    // Prevent Electron from navigating to a dropped document outside the drop area.
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
    $('strip').addEventListener('change', () => {
        for (const row of rows) if (row.entry && !row.imported) {
            row.entry = core.parse(row.raw, row.filename, { stripHeading: $('strip').checked });
        }
        render();
    });
    $('clear').addEventListener('click', () => {
        if (busy) return;
        rows = []; $('source').textContent = 'Click a file in the list.';
        message('List cleared. Previously imported posts are preserved.'); render();
    });
    $('import').addEventListener('click', async () => {
        if (busy || !context || session.uncertain) return;
        busy = true; updateButtons();
        let imported = 0, skipped = 0;
        message('Import in progress. Keep this view open until it finishes.');
        const selected = rows.filter(r => r.entry && r.selected && !r.imported);
        try {
            await session.run(selected.map(r => r.entry), Number($('author').value), $('skip').checked, result => {
                const row = rows.find(r => r.entry === result.entry);
                if (result.status === 'imported') {
                    row.imported = true; row.selected = false; row.status = 'Imported · ID ' + result.id; imported++;
                } else { row.status = 'Skipped · ' + result.message; skipped++; }
                render();
            });
            message(imported + ' draft(s) imported, ' + skipped + ' skipped. Posts are available in the post list.');
        } catch (e) {
            message(imported + ' imported. ' + e.message, true);
        } finally { busy = false; render(); }
    });
    try {
        context = contextFromParent();
        const authors = context.store.state.currentSite.authors;
        if (!Array.isArray(authors) || !authors.length) throw new Error('No authors are available. Create an author in Publii first.');
        for (const author of authors) {
            const opt = document.createElement('option'); opt.value = author.id; opt.textContent = author.name; $('author').append(opt);
        }
        session = new core.ImportSession(context.api, context.store);
        $('connection').textContent = 'Website: ' + context.store.state.currentSite.config.name;
    } catch (e) {
        context = null; $('connection').textContent = e.message; $('connection').className = 'error';
    }
    render();
})();
