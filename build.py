#!/usr/bin/env python3
"""Build deterministic installable and source archives using only the standard library."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
PLUGIN = ROOT / "markdown-importer"
DIST = ROOT / "dist"
VERSION = json.loads((PLUGIN / "plugin.json").read_text())["version"]

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
    main()
