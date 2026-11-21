"""Check translation validation without requiring third-party Python packages."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("plugin_build", Path(__file__).resolve().parents[1] / "build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class LocaleValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.write("en", {"greeting": "Hello {name}", "ready": "Ready"})

    def tearDown(self):
        self.temp.cleanup()

    def write(self, code, messages, **extra):
        value = {"language": code, "name": code, "direction": "ltr", "messages": messages, **extra}
        (self.root / (code + ".json")).write_text(json.dumps(value), encoding="utf-8")

    def test_partial_translation_is_allowed(self):
        self.write("de", {"greeting": "Hallo {name}"})
        self.assertEqual(build.load_locales(self.root)["de"]["messages"], {"greeting": "Hallo {name}"})

    def test_changed_placeholder_is_rejected(self):
        self.write("de", {"greeting": "Hallo {person}"})
        with self.assertRaisesRegex(ValueError, "placeholders"):
            build.load_locales(self.root)

    def test_unknown_key_is_rejected(self):
        self.write("de", {"typo": "Text"})
        with self.assertRaisesRegex(ValueError, "unknown translation keys"):
            build.load_locales(self.root)

    def test_duplicate_json_key_is_rejected(self):
        (self.root / "de.json").write_text('{"language":"de","language":"fr"}')
        with self.assertRaisesRegex(ValueError, "Duplicate JSON key"):
            build.load_locales(self.root)

    def test_non_string_message_is_rejected(self):
        self.write("de", {"ready": {"nested": "value"}})
        with self.assertRaisesRegex(ValueError, "non-empty strings"):
            build.load_locales(self.root)

    def test_locale_metadata_is_validated(self):
        self.write("de", {}, language="fr")
        with self.assertRaisesRegex(ValueError, "language must match"):
            build.load_locales(self.root)
        self.write("de", {}, direction="invalid")
        with self.assertRaisesRegex(ValueError, "direction"):
            build.load_locales(self.root)

    def test_english_fallback_is_required(self):
        (self.root / "en.json").unlink()
        self.write("de", {})
        with self.assertRaisesRegex(ValueError, "fallback catalog"):
            build.load_locales(self.root)


class VersionConsistencyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        plugin = self.root / "markdown-importer"
        (plugin / "options").mkdir(parents=True)
        (plugin / "plugin.json").write_text('{"version": "9.9.9"}', encoding="utf-8")
        (plugin / "options" / "ui.js").write_text("const VERSION = '9.9.9';\n", encoding="utf-8")
        (plugin / "options" / "index.html").write_text(
            "<footer>Markdown Importer 9.9.9 · for Publii</footer>", encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def stamp(self, filename, text):
        (self.root / "markdown-importer" / "options" / filename).write_text(text, encoding="utf-8")

    def test_consistent_versions_pass(self):
        self.assertEqual(build.check_versions(self.root), "9.9.9")

    def test_ui_version_drift_is_rejected(self):
        self.stamp("ui.js", "const VERSION = '1.2.3';\n")
        with self.assertRaisesRegex(ValueError, "ui.js VERSION"):
            build.check_versions(self.root)

    def test_footer_version_drift_is_rejected(self):
        self.stamp("index.html", "<footer>Markdown Importer 1.2.3 · for Publii</footer>")
        with self.assertRaisesRegex(ValueError, "index.html footer version"):
            build.check_versions(self.root)

    def test_missing_version_stamp_is_rejected(self):
        self.stamp("ui.js", "// no version constant\n")
        with self.assertRaisesRegex(ValueError, "VERSION constant not found"):
            build.check_versions(self.root)


if __name__ == "__main__":
    unittest.main()
