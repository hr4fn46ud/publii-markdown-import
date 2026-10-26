#!/usr/bin/env python3
"""Build deterministic installable and source archives using only the standard library."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
PLUGIN = ROOT / "markdown-importer"
DIST = ROOT / "dist"
VERSION = json.loads((PLUGIN / "plugin.json").read_text())["version"]

def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def load_locales(directory):
    catalog = {}
    for source in sorted(directory.glob("*.json")):
        data = json.loads(source.read_text(encoding="utf-8"), object_pairs_hook=reject_duplicate_keys)
        code = source.stem
        if not re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})*", code):
            raise ValueError(f"Invalid locale filename: {source.name}")
        if not isinstance(data, dict) or data.get("language") != code:
            raise ValueError(f"{source.name}: language must match the filename")
        if not isinstance(data.get("name"), str) or not data["name"].strip():
            raise ValueError(f"{source.name}: name must be a non-empty string")
        if data.get("direction", "ltr") not in ("ltr", "rtl"):
            raise ValueError(f"{source.name}: direction must be ltr or rtl")
        if not isinstance(data.get("messages"), dict):
            raise ValueError(f"{source.name}: messages must be an object")
        if not all(isinstance(k, str) and isinstance(v, str) and v.strip()
                   for k, v in data["messages"].items()):
            raise ValueError(f"{source.name}: message values must be non-empty strings")
        catalog[code] = data
    if "en" not in catalog or not catalog["en"]["messages"]:
        raise ValueError("A non-empty en.json fallback catalog is required")
    reference = catalog["en"]["messages"]
    placeholder = re.compile(r"\{([a-zA-Z][a-zA-Z0-9_]*)\}")
    for code, data in catalog.items():
        unknown = set(data["messages"]) - set(reference)
        if unknown:
            raise ValueError(f"{code}: unknown translation keys: {', '.join(sorted(unknown))}")
        for key, value in data["messages"].items():
            if set(placeholder.findall(value)) != set(placeholder.findall(reference[key])):
                raise ValueError(f"{code}: placeholders do not match English for {key}")
    return catalog


def locale_bundle(catalog):
    data = json.dumps(catalog, ensure_ascii=False, indent=2, sort_keys=True)
    return ("/* Generated from options/locales/*.json by build.py. Edit the JSON files instead. */\n"
            "(function (root, data) {\n"
            "    if (typeof module === 'object' && module.exports) module.exports = data;\n"
            "    else root.MarkdownImporterLocales = data;\n"
            "}(typeof globalThis === 'object' ? globalThis : this, " + data + "));\n")


def compile_locales(check_only=False):
    catalog = load_locales(PLUGIN / "options" / "locales")
    target = PLUGIN / "options" / "locales.bundle.js"
    content = locale_bundle(catalog)
    if check_only:
        if not target.exists() or target.read_text(encoding="utf-8") != content:
            raise ValueError("Locale bundle is stale. Run python3 build.py --locales-only.")
    else:
        target.write_text(content, encoding="utf-8")
    print("Validated locale catalogs: " + ", ".join(catalog))
    return catalog


def pack(target, entries):
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for source, name in sorted(entries, key=lambda pair: pair[1]):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 25, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, source.read_bytes())
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        assert not any(".." in Path(n).parts or n.startswith("/") for n in archive.namelist())

def main():
    compile_locales()
    DIST.mkdir(exist_ok=True)
    for name in ("README.MD", "LICENSE"):
        (PLUGIN / name).write_bytes((ROOT / name).read_bytes())
    install = DIST / f"Markdown-Importer-{VERSION}.zip"
    pack(install, [(p, p.relative_to(ROOT).as_posix()) for p in PLUGIN.rglob("*") if p.is_file()])
    with zipfile.ZipFile(install) as archive:
        assert {Path(n).parts[0] for n in archive.namelist()} == {"markdown-importer"}
        for required in ("plugin.json", "main.js", "thumbnail.svg", "LICENSE", "options/index.html"):
            assert "markdown-importer/" + required in archive.namelist()
    source = DIST / f"Markdown-Importer-{VERSION}-Source.zip"
    entries = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        parts = p.relative_to(ROOT).parts
        if any(s in ("dist", "node_modules", ".git", "__pycache__") for s in parts) or p.name == ".DS_Store":
            continue
        entries.append((p, "Markdown-Importer-Source/" + p.relative_to(ROOT).as_posix()))
    pack(source, entries)
    lines = [hashlib.sha256(p.read_bytes()).hexdigest() + "  " + p.name for p in (install, source)]
    (DIST / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n")
    for p in (install, source):
        print(f"{p.name}: {p.stat().st_size:,} bytes; ZIP integrity OK")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locales-only", action="store_true", help="Validate and regenerate bundled translations only")
    parser.add_argument("--check-locales", action="store_true", help="Validate translations and check for a stale bundle")
    args = parser.parse_args()
    if args.check_locales:
        compile_locales(check_only=True)
    elif args.locales_only:
        compile_locales()
    else:
        main()
