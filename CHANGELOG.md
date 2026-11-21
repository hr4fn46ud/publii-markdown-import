# Changelog

## 1.2.0 — 2026-11-21

- Search dropped folders recursively and import the Markdown files inside them; non-Markdown files inside folders are ignored.
- Fail the build when the version in plugin.json, ui.js, and index.html drift apart; add a --check-versions flag and build tests for it.
- Run the Playwright browser interface tests in GitHub Actions and add an npm run test:browser script.
- Declare the required Node.js version in package.json and cover the version checks in CI.

## 1.1.0 — 2026-10-26

- Follow Publii's active interface language automatically and react to live language changes.
- Include independent English and German JSON catalogs with regional-language and per-message English fallback.
- Localize labels, errors, warnings, import results, accessibility labels, and date formatting while preserving imported content.
- Discover and validate additional translation files during the build; bundle all translations locally without runtime downloads.
- Add a translation guide, locale tests, compiler-validation tests, and English/German browser coverage.

## 1.0.1 — 2026-10-25

- Use English throughout the plugin interface, metadata, validation errors, warnings, and status messages.
- Set the interface language and date display locale to English.
- Translate and rename sample files and test fixtures; retain Unicode input coverage.
- Update documentation, submission materials, and browser previews for the English interface.
- Preserve original version 1.0.0 application screenshots as historical evidence.
- Keep all project source comments in English and retain the MIT license notices.

## 1.0.0 — 2026-10-25

- Import standard Markdown files as editable Publii draft posts.
- Read optional YAML front matter for titles, slugs, dates, descriptions, and tags.
- Select multiple files, preview source, choose an author, and skip existing slugs.
- Preserve Markdown source and stop further writes when a save is not confirmed.
- Include English documentation, examples, automated tests, and reproducible packages.
- Release the project under the MIT License; retain the bundled MIT-licensed js-yaml notice.
