#!/usr/bin/env python3
"""Embed data.json into index.html between /*DATA_START*/ and /*DATA_END*/.

Usage: python3 build.py [data.json] [index.html]
"""
import json, re, sys, os

here = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "data.json")
html_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "index.html")

with open(src, encoding="utf-8") as f:
    data = json.load(f)  # fails loudly on invalid JSON
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

with open(html_path, encoding="utf-8") as f:
    html = f.read()
pat = re.compile(r"/\*DATA_START\*/.*?/\*DATA_END\*/", re.S)
if not pat.search(html):
    sys.exit("markers /*DATA_START*/ ... /*DATA_END*/ not found")
html = pat.sub(lambda m: "/*DATA_START*/" + blob + "/*DATA_END*/", html, count=1)
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)
print(f"embedded {src} ({len(blob)//1024} KB) -> {html_path} ({len(html.encode())//1024} KB)")
