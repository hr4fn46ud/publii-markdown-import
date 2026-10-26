# Translating Markdown Importer

Markdown Importer follows **Publii's application interface language**. It does not use the website's content language or the browser language to select translations.

## Included languages and fallback

- English: options/locales/en.json — reference and fallback language.
- German: options/locales/de.json — complete German translation.

A region-specific Publii locale first uses an exact catalog if available, then its base language. For example, de-DE and de-AT use de.json. Underscores are accepted, so de_DE works as well.

Unsupported languages use English. If a supported language is only partially translated, missing message keys fall back individually to English.

The language is read from Publii's Vue I18n locale ($i18n.locale). If Publii changes that setting while the plugin view is open, labels, errors, warnings, results, accessibility labels, and dates update without reimporting content or changing the selection.

## Translation files

The authoritative files are in:

~~~text
markdown-importer/options/locales/
  en.json
  de.json
~~~

Each JSON file is independent:

~~~json
{
  "language": "fr",
  "name": "Français",
  "direction": "ltr",
  "messages": {
    "ui.import": "Importer comme brouillons",
    "status.ready": "Prêt"
  }
}
~~~

This is an example of a partial translation, not a bundled French translation. Every omitted message would use the English reference text.

Use a lowercase language tag for the filename and language field: fr.json with language fr, or pt-br.json with language pt-br. Use direction rtl for a right-to-left language; otherwise use ltr. The name field identifies the language for maintainers and may use its native spelling.

## Add or update a language

1. Copy en.json to the desired language file, or edit an existing file.
2. Set language to match the filename and set the language name.
3. Translate values inside messages. Do not rename message keys.
4. Keep every placeholder unchanged, such as {filename}, {imported}, {field}, and {version}. You can move placeholders within a sentence.
5. If a translation is not ready, omit that message key to use English. Do not leave empty values.
6. Validate and regenerate the local browser bundle:

~~~sh
python3 build.py --locales-only
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
~~~

7. Build an installable package:

~~~sh
python3 build.py
~~~

8. Commit the JSON file and regenerated options/locales.bundle.js together when submitting a translation.

No changes to ui.js, core.js, or i18n.js are needed to add a language. The build discovers valid JSON files automatically. Python is only required when changing translations or building packages, not when using the installed plugin.

## Validation

The build rejects invalid JSON, duplicate keys, mismatched language identifiers, invalid directions, non-string/empty messages, unknown message keys, and changed or missing placeholders.

Partial translations are supported deliberately. English must remain present as the non-empty fallback catalog. To verify that the checked-in browser bundle matches the source files, run:

~~~sh
python3 build.py --check-locales
~~~

The generated bundle includes all catalogs inside the plugin. There are no runtime downloads, CDN requests, or file-fetch permissions required for translations. Do not edit locales.bundle.js manually.

## Scope and limits

- Translation changes interface text only. Markdown source, titles, tags, authors, and filenames supplied by the user are never translated.
- Dates follow the effective locale, including supported regional variants.
- Native file-picker labels follow the operating system's language.
- Detailed YAML parser diagnostics and unexpected operating-system/host errors may retain the language of the component producing them. Plugin-owned error messages are translated.
- The plugin name and description in plugin.json remain English: Publii reads these manifest fields as static strings rather than requesting a localized description.
- Documentation, source comments, and the reference language remain English.
- Original screenshots from version 1.0.0 are retained as historical application evidence; current browser previews are labeled separately.

## License

Translations are part of this project and are distributed under the MIT License.
