# Verification: Markdown Importer 1.0.0

Verification date: October 25, 2026.

## Passed

- 26 automated tests covering the parser, metadata handling, and import session.
- Actual Publii 0.48.1 post class from the installed application, using its own Node runtime and native SQLite library: saved and loaded posts in a temporary website; checked Markdown editor assignment, preserved source, Unicode, dates, tags, description, duplicate skipping, and Publii's slug suffix when skipping is disabled.
- Chromium interface test with a simulated Publii connection: bridge detection, multiple-file selection, source preview, draft import, results, duplicates, invalid UTF-8, malformed YAML, safe display of HTML/script text, and disabled importing outside Publii.
- Interface screenshots at wide and narrow viewport sizes.
- Deterministic plugin and source archives, required files, one top-level plugin directory, ZIP integrity, and SHA-256 checksums.
- Installation ZIP extracted with Publii 0.48.1's actual ZIP helper and recognized by the actual plugin loader as Markdown Importer with a custom settings interface.
- Author-supplied screenshots from the running Publii application show Markdown Importer 1.0.0 installed, the options interface open, selected Markdown files marked ready for import, a completed import reporting 20 drafts imported and zero skipped, and Publii's post list displaying 20 drafts and zero published posts. These original PNG files are preserved in submission/screenshots without modifying their bytes.
- The author-supplied PNG files contain 5669 pixels/metre resolution metadata in both axes, the standard integer PNG representation of nominal 144 dpi (approximately 143.993 dpi).

## Verification limits

- The browser interface test uses a simulated Vue store and communication bridge.
- The native backend test uses the real Publii post class and SQLite library; message delivery is connected directly by the test.
- Screenshot evidence covers installation, opening the interface, selecting files, and a successful batch import confirmed by both the importer and Publii's post list. It does not independently inspect every post's contents or demonstrate a subsequent editor save operation. The host application's version is not visible in the supplied screenshots.
- No independent Windows or Linux verification.
- Automated tests did not modify production websites. The supplied screenshots document the author's own application session.

## Reference

Installed version: Publii 0.48.1.

Public source additionally reviewed: GetPublii/Publii, commit 2f2475c4df98941b1c3646698562cd112abe1019.

Bundled YAML parser: js-yaml 4.1.1 (MIT).
