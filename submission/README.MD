# Marketplace submission materials

## Plugin

| Property | Value |
| --- | --- |
| Name | Markdown Importer |
| Version | 1.0.0 |
| Author | Oliver Pifferi |
| License | MIT |
| Minimum supported Publii version | 0.48.1 |

## Short description

Markdown Importer brings standard Markdown files into your website as editable draft posts. Select multiple files, review the detected titles and optional YAML metadata, choose an author, and import the content directly into the Markdown editor.

## Features

- Import multiple .md, .markdown, and .mdown files through file selection or drag-and-drop.
- Read optional YAML metadata for titles, URL slugs, dates, descriptions, and tags.
- Preserve Markdown source for further editing.
- Preview source text and choose an existing author.
- Skip existing URL slugs and display validation warnings and import results.
- Process files locally with bundled scripts and styles, without runtime CDN dependencies.

## Download, documentation, and support

- [Project and full documentation](https://github.com/hr4fn46ud/publii-markdown-import)
- [Installable plugin ZIP](https://github.com/hr4fn46ud/publii-markdown-import/releases/download/v1.0.0/Markdown-Importer-1.0.0.zip)
- [Release and checksums](https://github.com/hr4fn46ud/publii-markdown-import/releases/tag/v1.0.0)
- [Support and bug reports](https://github.com/hr4fn46ud/publii-markdown-import/issues)
- [MIT license](https://github.com/hr4fn46ud/publii-markdown-import/blob/main/LICENSE)

## Icon

[icon.svg](icon.svg) is an unchanged copy of the plugin's original thumbnail.svg. It has a 120 × 120 SVG view box and uses the same artwork displayed in Publii's plugin manager.

## Original application screenshots

| File | Contents | Pixel dimensions | Resolution |
| --- | --- | --- | --- |
| [01-options.png](screenshots/01-options.png) | Plugin options open inside Publii | 2506 × 1618 | Nominal 144 dpi |
| [02-file-selection.png](screenshots/02-file-selection.png) | Selected Markdown files ready for import | 2518 × 1598 | Nominal 144 dpi |
| [03-installed-plugin.png](screenshots/03-installed-plugin.png) | Installed plugin tile showing version 1.0.0 | 694 × 642 | Nominal 144 dpi |
| [04-import-completed.png](screenshots/04-import-completed.png) | Completed import: 20 drafts imported, zero skipped | 2518 × 1518 | Nominal 144 dpi |
| [05-imported-drafts.png](screenshots/05-imported-drafts.png) | Publii post list showing the resulting 20 drafts | 2508 × 1614 | Nominal 144 dpi |

These PNG screenshots were provided by the author from the running application. They are copied without resizing, recompression, or metadata changes. All five contain a PNG pHYs chunk with 5669 pixels/metre in each axis, the standard integer representation of nominal 144 dpi (approximately 143.993 dpi).

The options screenshot is the primary marketplace screenshot. The other four are supporting material, including evidence of a successful import.

## Compatibility and limitations

The current interface is German; the documentation is English. Local images, attachments, and featured images are not copied. Imports create draft posts and do not overwrite existing posts. The plugin uses Publii's internal save communication channel; future application changes may require compatibility updates.

Automated core tests, browser interface tests, and native backend/package checks have passed. The supplied application screenshots document installation, file selection, a completed import of 20 draft posts with zero skipped files, and the resulting drafts in Publii's post list. This supports successful operation in the running application. The screenshots do not independently verify every imported post's contents or subsequent editor save operations.

## Submission reference

[Official extension submission guidelines](https://getpublii.com/de/foerdere-deine-erweiterungen/)

These materials prepare the submission; they do not constitute approval by the Publii team. No submission email has been sent.
