#!/usr/bin/env python3
"""Verify GitHub Pages TEST bundle builds without modifying production files."""
from pathlib import Path
import subprocess
import sys
from html.parser import HTMLParser

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / "scripts/build-github-pages-test.py")], check=True)
out = root / "dist/github-pages-test"
assert (out / ".nojekyll").is_file()
for file in ("index.html", "shared-data.html", "shared-data-import.html",
             "six-company-price-preview.html", "virtual-trade-simulator.html",
             "pilot-test.html", "six-company-quarterly-financial-template.csv",
             "src/shared-data/shared-importer.mjs",
             "src/simulator/scenario-comparison.mjs"):
    assert (out / file).is_file(), f"Missing bundle asset: {file}"
assert "INVESTLAB TEST Preview" in (out / "index.html").read_text()
assert "gopofxyezhwpfbxebcrxd.supabase.co" in (out / "shared-data.html").read_text()
print("Isolated TEST Pages bundle: OK (no publishing)")
