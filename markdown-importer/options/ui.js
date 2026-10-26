/* global MarkdownImporterCore, MarkdownImporterI18n */
'use strict';
(() => {
    const core = MarkdownImporterCore;
    const i18n = MarkdownImporterI18n;
    const { LocalizedError } = i18n;
    const VERSION = '1.1.0';
    const $ = id => document.getElementById(id);
    let vm;
    try { vm = window.parent.document.querySelector('#app')?.__vue__; } catch (_) { /* Use English without host access. */ }
    const translator = i18n.createTranslator(i18n.readPubliiLocale(vm));
    const t = (key, params) => translator.t(key, params);
    let context, session, rows = [], busy = false, connectionError, selectedRow;
    let messageState = { key: 'ui.notStarted', params: {}, error: false };

    function renderMessage() {
        const params = { ...messageState.params };
        if (params.error instanceof Error) params.error = translator.formatError(params.error);
        $('message').textContent = t(messageState.key, params);
        $('message').classList.toggle('error', messageState.error);
    }
    function message(key, params = {}, error = false) {
        messageState = { key, params, error };
        renderMessage();
    }
    function contextFromParent() {
        if (window.parent === window) throw new LocalizedError('error.openInPublii');
        const api = window.parent.mainProcessAPI;
        const store = vm && vm.$store;
        if (!api || !store?.state?.currentSite?.config?.name ||
            !['send', 'receiveOnce', 'invoke'].every(k => typeof api[k] === 'function')) {
            throw new LocalizedError('error.connectionUnavailable');
        }
        return { api, store };
    }
    function updateButtons() {
        $('import').disabled = !context || busy || session?.uncertain || !rows.some(r => r.entry && r.selected && !r.imported);
        ['files', 'strip', 'skip', 'clear', 'author'].forEach(id => $(id).disabled = busy || (id === 'author' && !context));
        for (const cb of document.querySelectorAll('tbody input')) cb.disabled = busy || cb.dataset.done === 'yes';
    }
    function render() {
        document.documentElement.lang = translator.locale;
        document.documentElement.dir = translator.direction;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n, { version: VERSION });
        });
        $('connection').textContent = connectionError ? translator.formatError(connectionError)
            : context ? t('ui.website', { name: context.store.state.currentSite.config.name }) : t('ui.checkingConnection');
        $('connection').classList.toggle('error', Boolean(connectionError));
        $('entries').replaceChildren();
        for (const row of rows) {
            const tr = document.createElement('tr');
            const select = document.createElement('td');
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.checked = row.selected && !row.imported;
            cb.disabled = !row.entry || row.imported || busy;
            cb.dataset.done = !row.entry || row.imported ? 'yes' : 'no';
            cb.setAttribute('aria-label', t('ui.importFile', { filename: row.filename }));
            cb.addEventListener('change', () => { row.selected = cb.checked; updateButtons(); });
            select.append(cb);
            const titleCell = document.createElement('td');
            const title = document.createElement('button');
            title.className = 'entry-title';
            title.textContent = row.entry?.title || row.filename;
            title.addEventListener('click', () => {
                selectedRow = row;
                $('source').textContent = row.entry?.body ?? translator.formatError(row.error);
                $('preview').open = true;
            });
            const file = document.createElement('div');
            file.className = 'filename'; file.textContent = row.filename;
            titleCell.append(title, file);
            const info = document.createElement('td');
            info.textContent = row.entry ? row.entry.tags.join(', ') || '—' : '';
            if (row.entry?.timestamp != null) {
                const date = document.createElement('div'); date.className = 'warning';
                date.textContent = t('ui.date', { date: translator.formatDate(row.entry.timestamp) });
                info.append(date);
            }
            for (const key of row.entry?.warningKeys || []) {
                const p = document.createElement('p'); p.className = 'warning'; p.textContent = t(key); info.append(p);
            }
            const status = document.createElement('td');
            status.textContent = row.error ? translator.formatError(row.error)
                : row.result?.status === 'imported' ? t('status.imported', { id: row.result.id })
                : row.result?.status === 'skipped' ? t('status.skipped', { reason: t(row.result.messageKey) })
                : t('status.ready');
            if (row.error) status.className = 'error';
            tr.append(select, titleCell, info, status); $('entries').append(tr);
        }
        $('count').textContent = rows.length ? t('ui.filesSummary', {
            count: rows.length, ready: rows.filter(r => r.entry && !r.imported).length
        }) : t('ui.noFiles');
        // Localize preview errors, but never translate imported Markdown content.
        $('source').textContent = selectedRow?.entry ? selectedRow.entry.body
            : selectedRow?.error ? translator.formatError(selectedRow.error) : t('ui.previewHint');
        renderMessage();
        updateButtons();
    }
    async function addFiles(files) {
        if (busy) return;
        busy = true; updateButtons();
        try {
            const list = Array.from(files);
            if (list.length + rows.length > core.MAX_FILES) throw new LocalizedError('error.tooManyFiles');
            for (const file of list) {
                if (rows.some(r => r.filename === file.name && r.size === file.size && r.modified === file.lastModified)) continue;
                const row = { filename: file.name, size: file.size, modified: file.lastModified, selected: true };
                try {
                    if (file.size > core.MAX_BYTES) throw new LocalizedError('error.fileTooLarge');
                    if (!/\.(md|markdown|mdown)$/i.test(file.name)) throw new LocalizedError('error.notMarkdown');
                    // Decode strictly so invalid input cannot silently corrupt the original content.
                    const bytes = await file.arrayBuffer();
                    try { row.raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
                    catch (_) { throw new LocalizedError('error.invalidEncoding'); }
                    row.entry = core.parse(row.raw, file.name, { stripHeading: $('strip').checked });
                } catch (e) { row.error = e; row.selected = false; }
                rows.push(row);
            }
            message('ui.filesChecked');
        } catch (e) { message('ui.importFailed', { imported: 0, error: e }, true); }
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
        rows = []; selectedRow = null;
        message('ui.listCleared'); render();
    });
    $('import').addEventListener('click', async () => {
        if (busy || !context || session.uncertain) return;
        busy = true; updateButtons();
        let imported = 0, skipped = 0;
        message('ui.importInProgress');
        const selected = rows.filter(r => r.entry && r.selected && !r.imported);
        try {
            await session.run(selected.map(r => r.entry), Number($('author').value), $('skip').checked, result => {
                const row = rows.find(r => r.entry === result.entry);
                row.result = result;
                if (result.status === 'imported') {
                    row.imported = true; row.selected = false; imported++;
                } else { skipped++; }
                render();
            });
            message('ui.importCompleted', { imported, skipped });
        } catch (e) {
            message('ui.importFailed', { imported, error: e }, true);
        } finally { busy = false; render(); }
    });
    try {
        context = contextFromParent();
        const authors = context.store.state.currentSite.authors;
        if (!Array.isArray(authors) || !authors.length) throw new LocalizedError('error.noAuthors');
        for (const author of authors) {
            const opt = document.createElement('option'); opt.value = author.id; opt.textContent = author.name; $('author').append(opt);
        }
        session = new core.ImportSession(context.api, context.store);
    } catch (e) {
        context = null; connectionError = e;
    }
    if (typeof vm?.$watch === 'function') {
        const unwatch = vm.$watch('$i18n.locale', locale => {
            translator.setLocale(locale);
            render();
        });
        window.addEventListener('pagehide', () => { if (typeof unwatch === 'function') unwatch(); }, { once: true });
    }
    render();
})();
