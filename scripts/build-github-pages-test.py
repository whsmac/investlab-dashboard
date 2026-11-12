#!/usr/bin/env python3
"""Build an isolated static GitHub Pages TEST preview, without deploying it."""
from pathlib import Path
from html import escape
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist" / "github-pages-test"
PAGES = [
    ("shared-data.html", "공유 데이터 조회 (TEST)"),
    ("shared-data-import.html", "CSV 검증·가져오기 (TEST 전용)"),
    ("six-company-price-preview.html", "6개 기업 주가 분석"),
    ("virtual-trade-simulator.html", "가상매매 시뮬레이터"),
]
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for filename, _ in PAGES:
    source = ROOT / filename
    if not source.is_file():
        sys.exit(f"Missing preview page: {filename}")
    shutil.copy2(source, OUT / filename)
(OUT / ".nojekyll").write_text("", encoding="utf-8")
links = "\n".join(
    f'<li><a href="./{escape(filename)}">{escape(label)}</a></li>'
    for filename, label in PAGES
)
(OUT / "index.html").write_text(
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<title>INVESTLAB TEST Preview</title>'
    '<style>body{font-family:system-ui,sans-serif;max-width:680px;'
    'margin:4rem auto;padding:0 1rem;line-height:1.8}li{margin:.7rem 0}</style>'
    '</head><body><h1>INVESTLAB TEST Preview</h1>'
    '<p>운영 대시보드와 분리된 정적 테스트 화면입니다. '
    'TEST Supabase 외 운영 데이터 연결을 금지합니다.</p>'
    f'<ul>{links}</ul>'
    '<p>테스트 페이지에 비밀번호나 비밀키를 코드로 저장하지 마세요.</p>'
    '</body></html>', encoding="utf-8"
)
print(f"Built {len(PAGES)} static pages in {OUT.relative_to(ROOT)}; no deployment performed")
