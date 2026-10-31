#!/usr/bin/env python3
"""Validate archive structure, completeness and duplicate IDs before publication."""
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

root = Path(__file__).resolve().parents[1]
errors = []
def read(path):
    try:
        return json.loads((root / path).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{path}: {exc}")
        return None

base = read("posts.json")
manifest = read("archive-index.json")
if not isinstance(base, list):
    errors.append("posts.json must be a list")
    base = []
if not isinstance(manifest, list):
    errors.append("archive-index.json must be a list")
    manifest = []
if len(manifest) != len(set(str(x) for x in manifest)):
    errors.append("archive-index.json contains duplicate entries")

entries = [(p, "posts.json") for p in base]
for item in manifest:
    if not isinstance(item, str) or not re.fullmatch(r"fb-\d+|batches/[a-zA-Z0-9_-]+\.json", item):
        errors.append(f"Invalid manifest item: {item!r}")
        continue
    path = item if item.startswith("batches/") else f"additional/{item}.json"
    data = read(path)
    if data is None:
        continue
    group = data if isinstance(data, list) else [data]
    entries.extend((p, path) for p in group)

seen = set()
for post, path in entries:
    if not isinstance(post, dict):
        errors.append(f"{path}: post must be an object")
        continue
    pid = post.get("id")
    if not isinstance(pid, str) or not re.fullmatch(r"fb-\d+", pid):
        errors.append(f"{path}: invalid post id {pid!r}")
    elif pid in seen:
        errors.append(f"{path}: duplicate id {pid}")
    seen.add(pid)
    if path.startswith("additional/") and pid + ".json" != Path(path).name:
        errors.append(f"{path}: id does not match filename")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(post.get("date", ""))):
        errors.append(f"{pid}: invalid date")
    for field in ("title", "category"):
        if not str(post.get(field, "")).strip():
            errors.append(f"{pid}: missing {field}")
    full = post.get("fullText") or post.get("text")
    if not isinstance(full, str) or len(full.strip()) < 30:
        errors.append(f"{pid}: commentary missing or very short; review manually")
    sources = post.get("sources") or [{"url": u} for u in post.get("urls", [])]
    if not sources:
        errors.append(f"{pid}: missing source reference")
    for src in sources:
        url = src.get("url", "") if isinstance(src, dict) else ""
        parsed = urlparse(url)
        if parsed.scheme not in ("https", "http") or not parsed.netloc:
            errors.append(f"{pid}: invalid source URL")

print(f"Validated {len(entries)} posts across {len(manifest)} manifest entries")
if errors:
    print("\n".join("ERROR: " + error for error in errors))
    sys.exit(1)
print("PASS: archive structural validation")
