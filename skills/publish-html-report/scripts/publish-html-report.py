#!/usr/bin/env python3
import html
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

REPORT_DIR = Path(os.environ.get("HTML_REPORT_DIR", "/srv/html-reports"))
BASE_URL = os.environ.get("HTML_REPORT_BASE_URL", "http://192.168.68.111:8080").rstrip("/")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: publish-html-report.py /path/to/report.html")

    source = Path(sys.argv[1]).expanduser().resolve()
    if not source.is_file() or source.suffix.lower() not in {".html", ".htm"}:
        raise SystemExit("Source must be an existing .html or .htm file")
    if source.name.lower() == "index.html":
        raise SystemExit("A report cannot be named index.html")
    if not REPORT_DIR.is_dir() or not os.access(REPORT_DIR, os.W_OK):
        raise SystemExit(f"Report directory is not writable: {REPORT_DIR}")

    destination = REPORT_DIR / source.name
    same_file = destination.exists() and source == destination.resolve()
    if not same_file:
        if destination.exists():
            stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
            destination = REPORT_DIR / f"{source.stem}-{stamp}{source.suffix}"
            counter = 2
            while destination.exists():
                destination = REPORT_DIR / f"{source.stem}-{stamp}-{counter}{source.suffix}"
                counter += 1
        shutil.copy2(source, destination)
        destination.chmod(0o644)

    reports = sorted(
        (path for path in REPORT_DIR.iterdir()
         if path.is_file() and path.suffix.lower() in {".html", ".htm"} and path.name.lower() != "index.html"),
        key=lambda path: (path.stat().st_mtime, path.name.lower()),
        reverse=True,
    )
    links = "\n".join(
        f'<li><a href="{html.escape(quote(path.name, safe=""), quote=True)}">{html.escape(path.name)}</a></li>'
        for path in reports
    ) or "<li>No reports published yet</li>"
    page = (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<title>HTML reports</title><h1>HTML reports</h1><ul>'
        f"{links}</ul></html>\n"
    )

    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=REPORT_DIR, prefix=".index-", suffix=".tmp", delete=False
    ) as index_file:
        index_file.write(page)
        index_path = Path(index_file.name)
    index_path.chmod(0o644)
    index_path.replace(REPORT_DIR / "index.html")

    print(f"Report: {BASE_URL}/{quote(destination.name, safe='')}")
    print(f"Index:  {BASE_URL}/")


if __name__ == "__main__":
    main()
