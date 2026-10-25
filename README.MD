<img src="https://raw.githubusercontent.com/hr4fn46ud/publii-markdown-import/main/markdown-importer/thumbnail.svg" alt="Markdown Importer logo" width="120" height="120">

# Markdown Importer

[![CI](https://github.com/hr4fn46ud/publii-markdown-import/actions/workflows/ci.yml/badge.svg)](https://github.com/hr4fn46ud/publii-markdown-import/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Import standard Markdown files into **Publii 0.48.1 or later** as editable draft posts. Markdown source is preserved for further editing in Publii's Markdown editor.

The plugin is called **Markdown Importer**. This repository is named **publii-markdown-import**.

## Download

Download **[Markdown-Importer-1.0.0.zip](https://github.com/hr4fn46ud/publii-markdown-import/releases/latest/download/Markdown-Importer-1.0.0.zip)** from the [latest release](https://github.com/hr4fn46ud/publii-markdown-import/releases/latest).

Use the plugin ZIP for installation. The source archive and GitHub's automatically generated source downloads are not plugin installation packages.

## Screenshots

The following screenshots were supplied by the author from the running Publii application. The original PNG files are preserved with their nominal 144 dpi resolution metadata.

![Markdown Importer options in Publii](https://raw.githubusercontent.com/hr4fn46ud/publii-markdown-import/main/submission/screenshots/01-options.png)

<details>
<summary>File selection and installed plugin</summary>

![Markdown files ready for import](https://raw.githubusercontent.com/hr4fn46ud/publii-markdown-import/main/submission/screenshots/02-file-selection.png)

![Markdown Importer installed in Publii](https://raw.githubusercontent.com/hr4fn46ud/publii-markdown-import/main/submission/screenshots/03-installed-plugin.png)

</details>

The [submission materials](https://github.com/hr4fn46ud/publii-markdown-import/tree/main/submission) include the original screenshots, marketplace icon, and a short English description with a feature list.

## Installation

1. Open Publii's application menu, then select **Plugins → Install Plugin**.
2. Select **Markdown-Importer-1.0.0.zip** without extracting it.
3. Open the target website.
4. Find **Markdown Importer** under **Tools & Plugins**, enable it, and open its settings.
5. Select one or more Markdown files, or drag them into the file selection area.
6. Select an existing Publii author and review the detected titles, tags, dates, and warnings.
7. Click a title to preview the Markdown source.
8. Optionally enable removal of the opening main heading when it matches the post title. By default, the heading is preserved.
9. Start the draft import and keep the plugin view open until it finishes.
10. Open the imported posts from Publii's post list, review them, and publish when ready.

**Interface language:** the current plugin interface is German. This documentation describes its controls in English.

No additional runtime installation is required. Node.js and Python are only needed for development and packaging.

## Features

- Multiple-file selection and drag-and-drop for .md, .markdown, and .mdown files.
- UTF-8 with or without a byte-order mark; Windows and Unix line endings.
- Optional YAML front matter.
- Markdown source retained in Publii's Markdown editor.
- Post titles taken from front matter, the opening main heading, or the filename.
- Author selection from existing authors on the target website.
- Tags, publication dates, descriptions, and custom slugs from supported front matter.
- Draft-only imports, regardless of any publication status in the source.
- Existing slugs skipped by default, including duplicates within the same batch.
- Per-file validation and import results.
- Local processing with no plugin network requests or telemetry.

The importer creates new posts. It does not update or overwrite existing posts. When duplicate skipping is disabled, Publii adds a suffix to conflicting slugs.

## Supported front matter

Front matter must appear at the beginning of the file, start with a line containing three hyphens, and end with another three-hyphen line or a line containing three dots.

| Field | Imported value |
| --- | --- |
| title | Post title. Falls back to an opening ATX or Setext level-one heading, then the filename. |
| slug | Requested URL slug, normalized by Publii. Falls back to the title. |
| date | ISO calendar date or ISO timestamp. |
| published | Alternative date field when date is absent. Boolean values are not treated as dates. |
| description | Post meta description. |
| excerpt | Alternative description when description is absent. |
| tags | YAML list or comma-separated string of tag names. |
| categories | Additional tags, merged with tags and deduplicated. |

~~~markdown
---
title: "My first imported post"
slug: my-first-imported-post
date: 2026-10-25T10:00:00+01:00
description: A short description of the post.
tags:
  - Markdown
  - Publii
categories:
  - Tutorials
---

# My first imported post

This **Markdown** remains editable in Publii.

## A section

- First item
- Second item
~~~

A file without front matter works as well:

~~~markdown
# A simple post

The opening heading supplies the title.
~~~

Calendar dates use the YYYY-MM-DD format. For timestamps, include Z or an explicit UTC offset when the time must be unambiguous. A timestamp with a time but no offset uses the system's local timezone. A date-only value is parsed as UTC midnight.

The repository includes [sample files](https://github.com/hr4fn46ud/publii-markdown-import/tree/main/examples).

## Limits and unsupported features

- Maximum 500 files per import list.
- Maximum 10 MiB per file.
- Maximum 64 KiB of YAML front matter.
- Input must be valid UTF-8. Invalid files are marked individually; valid files can still be imported.
- **Local images, attachments, and featured images are not copied.** Relative references remain in the Markdown and must be adjusted in Publii. The importer warns about common relative image and reference paths; this is not a complete Markdown link analysis.
- External image URLs remain unchanged.
- Links to other imported .md files are not rewritten to Publii URLs.
- Posts are supported; hierarchical pages are not.
- No recursive folder import or ZIP import.
- Front-matter author values are replaced by the author selected in the importer.
- Front-matter status and draft values do not control publication. Every imported post is a draft.
- Template, layout, custom fields, and featured-image metadata are not imported.
- TOML and JSON front matter, MDX, Obsidian-specific syntax, and other system-specific extensions are not interpreted.
- The preview shows source text. Rendering support for Markdown extensions is determined by Publii and the active theme.

Each post is saved separately. If an import fails partway through, completed drafts remain available. If Publii does not confirm a save, the importer stops further writes. Check the post list before attempting another import.

## Compatibility and implementation

The custom interface uses Publii's plugin settings mechanism, usePluginSettingsView. Imports use the existing internal app-post-save communication channel and the current website from Publii's Vue store.

Posts are saved through Publii's own post class. The plugin does not directly write SQL or modify the WordPress importer.

**The internal integration may change in future Publii releases.** The reference version and actual backend test target are **Publii 0.48.1 on macOS**. The plugin checks for the required connection before allowing an import. Earlier versions are not advertised as supported.

Public references:

- [Publii plugin developer documentation](https://github.com/GetPublii/Publii/discussions/1359)
- [Publii source code](https://github.com/GetPublii/Publii)
- [Installing Publii plugins](https://getpublii.com/docs/plugins.html)

## Development

### Requirements

- Node.js 18 or later for core tests.
- Python 3.9 or later for packaging.
- Playwright with Chromium for optional browser tests.
- An installed copy of Publii for optional native integration tests.

All plugin runtime files are bundled, including **js-yaml 4.1.1**. No package installation is needed to run the core tests or build the archives.

### Core tests

~~~sh
npm test
~~~

The suite covers Markdown preservation, front matter, Unicode, dates, malformed input, duplicate handling, draft payloads, concurrent imports, and uncertain save outcomes.

### Build packages

~~~sh
python3 build.py
~~~

The build creates:

~~~text
dist/
  Markdown-Importer-1.0.0.zip
  Markdown-Importer-1.0.0-Source.zip
  SHA256SUMS.txt
~~~

The installer has exactly one top-level directory, markdown-importer, and includes the manifest, runtime files, documentation, and license notices. Archives use deterministic metadata and are checked for ZIP integrity.

### Optional browser tests

Install Playwright and its Chromium headless browser:

~~~sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium --only-shell
node tests/browser.test.cjs
~~~

PLAYWRIGHT_MODULE may point to an existing Playwright installation. PLAYWRIGHT_BROWSERS_PATH may specify a browser cache directory.

The browser test uses a simulated Publii store and communication bridge. It checks file selection, source preview, draft imports, duplicate handling, invalid UTF-8 and YAML, safe display of HTML/script text, and the guard against use outside Publii.

### Optional native Publii integration test

Build the plugin first, then run the test using Publii's bundled Node runtime. On macOS with the default installation path:

~~~sh
python3 build.py
ELECTRON_RUN_AS_NODE=1 /Applications/Publii.app/Contents/MacOS/Publii tests/publii-integration.cjs
~~~

Set PUBLII_ASAR if app.asar is installed elsewhere.

The test uses Publii's actual ZIP extractor, plugin loader, post class, and native SQLite library. It creates a temporary test website, verifies the saved posts and duplicate behavior, then removes that temporary website. It does not modify existing websites.

### Verification status

- 26 automated core tests passed.
- Browser interface tests passed.
- Native backend and plugin package checks passed against Publii 0.48.1.
- Author-supplied screenshots show version 1.0.0 installed, the options interface open in Publii, and Markdown files ready for import. They do not establish a completed import or subsequent editing of the resulting drafts; that part of the manual verification remains unconfirmed.
- Windows and Linux have not been independently tested.

See [the test report](https://github.com/hr4fn46ud/publii-markdown-import/blob/main/verification/TEST-REPORT.md) for the recorded scope and limits.

GitHub Actions runs core tests, builds the packages, and uploads the resulting artifacts on pushes and pull requests.

## License

The plugin, documentation, examples, and project code are released under the **[MIT License](LICENSE)**.

The bundled js-yaml parser is also MIT-licensed. Its original copyright and permission notice is preserved in [js-yaml.LICENSE](https://github.com/hr4fn46ud/publii-markdown-import/blob/main/markdown-importer/options/vendor/js-yaml.LICENSE).
