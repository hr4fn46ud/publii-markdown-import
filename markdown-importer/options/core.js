(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory(require('./vendor/js-yaml.min.js'), require('./i18n.js'));
    } else {
        root.MarkdownImporterCore = factory(root.jsyaml, root.MarkdownImporterI18n);
    }
}(typeof globalThis === 'object' ? globalThis : this, function (yaml, i18n) {
    'use strict';
    const { LocalizedError } = i18n;
    const english = i18n.createTranslator('en');
    const MAX_BYTES = 10 * 1024 * 1024;
    const MAX_FILES = 500;
    const known = new Set(['title', 'slug', 'date', 'published', 'description', 'excerpt',
        'tags', 'categories', 'author', 'draft', 'status', 'template', 'layout', 'image', 'featured_image']);

    function scalar(value, name, fallback = '') {
        if (value == null) return fallback;
        if (!['string', 'number', 'boolean'].includes(typeof value)) {
            throw new LocalizedError('error.scalar', { field: name });
        }
        return String(value).trim();
    }

    function list(value, name) {
        if (value == null) return [];
        const values = Array.isArray(value) ? value : scalar(value, name).split(',');
        if (values.length > 100) throw new LocalizedError('error.tooManyValues', { field: name });
        return values.map(v => scalar(v, name)).filter(Boolean);
    }

    function parse(source, filename, options = {}) {
        if (!/\.(md|markdown|mdown)$/i.test(filename)) throw new LocalizedError('error.notMarkdown');
        if (typeof source !== 'string' || new TextEncoder().encode(source).length > MAX_BYTES) {
            throw new LocalizedError('error.fileTooLarge');
        }
        let body = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
        if (body.includes('\u0000')) throw new LocalizedError('error.binary');
        let metadata = Object.create(null);
        const warnings = [];
        const warningKeys = [];
        const warn = key => { warningKeys.push(key); warnings.push(english.t(key)); };
        if (/^---[ \t]*\n/.test(body)) {
            const opening = body.indexOf('\n') + 1;
            const tail = body.slice(opening);
            const closing = /^(?:---|\.\.\.)[ \t]*(?:\n|$)/m.exec(tail);
            if (!closing) throw new LocalizedError('error.frontMatterUnclosed');
            const header = tail.slice(0, closing.index);
            if (header.length > 65536) throw new LocalizedError('error.frontMatterTooLarge');
            try {
                metadata = yaml.load(header, { schema: yaml.JSON_SCHEMA }) || Object.create(null);
            } catch (e) {
                throw new LocalizedError('error.invalidYaml', { detail: e.reason || e.message });
            }
            if (typeof metadata !== 'object' || Array.isArray(metadata)) {
                throw new LocalizedError('error.frontMatterMapping');
            }
            body = tail.slice(closing.index + closing[0].length);
        }
        const own = key => Object.hasOwn(metadata, key) ? metadata[key] : undefined;
        // Only an opening H1 is eligible; headings in fenced code are never titles.
        const heading = /^(?:[ \t]*\n)*(?: {0,3}# [ \t]*(.+?)[ \t]*#*[ \t]*(?:\n|$)|([^\n]+)\n {0,3}=+[ \t]*(?:\n|$))/.exec(body);
        const base = filename.replace(/\\/g, '/').split('/').pop().replace(/\.(md|markdown|mdown)$/i, '');
        const title = scalar(own('title'), 'title') || (heading && (heading[1] || heading[2]).trim()) || base.replace(/[-_]+/g, ' ');
        if (!title.trim()) throw new LocalizedError('error.noTitle');
        if (options.stripHeading && heading && (!own('title') || title === (heading[1] || heading[2]).trim())) {
            body = body.slice(heading[0].length).replace(/^\n/, '');
        }
        const dateValue = own('date') ?? own('published');
        let timestamp = null;
        if (dateValue != null && typeof dateValue !== 'boolean') {
            const date = scalar(dateValue, 'date');
            // Require ISO dates; reject ambiguous locale-specific values.
            if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(date)) {
                throw new LocalizedError('error.isoDate');
            }
            timestamp = Date.parse(date);
            const [year, month, day] = date.slice(0, 10).split('-').map(Number);
            const calendar = new Date(Date.UTC(year, month - 1, day));
            if (!Number.isFinite(timestamp) || calendar.getUTCFullYear() !== year ||
                calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
                throw new LocalizedError('error.invalidDate');
            }
        }
        const tags = [...new Set([...list(own('tags'), 'tags'), ...list(own('categories'), 'categories')])];
        const description = scalar(own('description') ?? own('excerpt'), 'description');
        if (Object.keys(metadata).some(key => !known.has(key))) warn('warning.unknownMetadata');
        if (own('author') != null) warn('warning.author');
        if (['status', 'draft'].some(k => own(k) != null)) warn('warning.status');
        if (own('template') != null || own('layout') != null) warn('warning.template');
        if (own('image') != null || own('featured_image') != null) warn('warning.featuredImage');
        if (/(?:!\[[^\]]*\]\(\s*<?(?!https?:|data:|\/\/|#)[^)\s]+|\]:\s*<?(?!https?:|data:|\/\/|#)[^\s]+)/i.test(body) ||
            /(?:src|href)\s*=\s*["'](?!https?:|data:|\/\/|#)[^"']+/i.test(body)) {
            warn('warning.localPaths');
        }
        return { filename, title, slug: scalar(own('slug'), 'slug'), body, tags, description, timestamp, warnings, warningKeys };
    }

    function payload(entry, site, author, themeSettings, now = Date.now()) {
        if (!site || !Number.isInteger(Number(author)) || Number(author) <= 0) throw new LocalizedError('error.websiteOrAuthor');
        const view = {};
        for (const field of themeSettings?.postConfig || []) {
            if (field.name && field.type !== 'separator') {
                Object.defineProperty(view, field.name, { enumerable: true, value: { type: field.type || 'select', value: field.value ?? '' } });
            }
        }
        return {
            site, id: 0, title: entry.title, slug: entry.slug, text: entry.body,
            author: Number(author), status: 'draft', creationDate: entry.timestamp ?? now,
            modificationDate: now, template: '', tags: entry.tags,
            featuredImage: '', featuredImageFilename: '', featuredImageData: false,
            additionalData: { editor: 'markdown', metaTitle: '', metaDesc: entry.description,
                metaRobots: 'index, follow', canonicalUrl: '', mainTag: '' },
            postViewSettings: view
        };
    }

    class ImportSession {
        constructor(api, store, timeout = 30000) {
            this.api = api;
            this.store = store;
            this.timeout = timeout;
            this.busy = false;
            this.uncertain = false;
            this.done = new Set();
        }
        request(data) {
            return new Promise((resolve, reject) => {
                let finished = false;
                const timer = setTimeout(() => {
                    finished = true;
                    this.uncertain = true;
                    reject(new LocalizedError('error.timeout'));
                }, this.timeout);
                this.api.receiveOnce('app-post-saved', response => {
                    if (finished) return;
                    finished = true;
                    clearTimeout(timer);
                    resolve(response);
                });
                try { this.api.send('app-post-save', data); }
                catch (e) {
                    // The bridge might have dispatched before throwing: do not retry.
                    finished = true;
                    clearTimeout(timer);
                    this.uncertain = true;
                    reject(e);
                }
            });
        }
        async run(entries, author, skipExisting = true, onResult = () => {}) {
            if (this.busy || this.uncertain) throw new LocalizedError('error.sessionUnavailable');
            const site = this.store.state.currentSite;
            const siteName = site.config.name;
            if (!site.authors.some(a => Number(a.id) === Number(author))) throw new LocalizedError('error.authorUnavailable');
            this.busy = true;
            const results = [];
            try {
                const slugs = new Set((site.posts || []).map(p => p.slug.toLowerCase()));
                for (const entry of entries) {
                    if (this.store.state.currentSite.config.name !== siteName) throw new LocalizedError('error.websiteChanged');
                    if (this.done.has(entry)) continue;
                    const slug = await this.api.invoke('app-main-process-create-slug', entry.slug || entry.title);
                    if (!slug || typeof slug !== 'string') throw new LocalizedError('error.slugFailed');
                    entry.slug = slug;
                    if (skipExisting && slugs.has(slug.toLowerCase())) {
                        const result = { entry, status: 'skipped', message: english.t('status.slugExists'), messageKey: 'status.slugExists' };
                        results.push(result); onResult(result); continue;
                    }
                    const data = payload(entry, siteName, author, site.themeSettings);
                    const response = await this.request(data);
                    if (!response || !response.postID || !Array.isArray(response.posts)) {
                        this.uncertain = true;
                        throw new LocalizedError('error.saveUnconfirmed');
                    }
                    this.done.add(entry);
                    slugs.add(slug.toLowerCase());
                    response.posts.forEach(p => slugs.add(p.slug.toLowerCase()));
                    this.store.commit('refreshAfterPostUpdate', response);
                    const result = { entry, status: 'imported', id: response.postID };
                    results.push(result); onResult(result);
                }
                return results;
            } finally { this.busy = false; }
        }
    }

    return { parse, payload, ImportSession, MAX_BYTES, MAX_FILES };
}));
