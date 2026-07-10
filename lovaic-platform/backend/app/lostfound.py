"""
In-memory Lost & Found registry with photo persistence.

Citizens post either a LOST report or a FOUND report (item photo + details).
Every new report is automatically matched (visual similarity) against the
opposite category, so a found item can surface the person who lost it.
"""
from __future__ import annotations

import base64
import json
import os
import uuid
from datetime import datetime, timezone

from . import embeddings

_STORE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage")
_DB_PATH = os.path.join(_STORE_DIR, "lostfound.json")

# item = {id, kind, title, description, category, location, contact,
#         image (data-uri), embedding, created_at}
_ITEMS: list[dict] = []


def _persist() -> None:
    os.makedirs(_STORE_DIR, exist_ok=True)
    with open(_DB_PATH, "w") as f:
        json.dump(_ITEMS, f)


def _load() -> None:
    global _ITEMS
    if os.path.exists(_DB_PATH):
        try:
            with open(_DB_PATH) as f:
                _ITEMS = json.load(f)
        except Exception:
            _ITEMS = []


_load()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_item(kind: str, raw: bytes, title: str, description: str,
             category: str, location: str, contact: str) -> dict:
    emb = embeddings.embed(raw)
    data_uri = "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")
    item = {
        "id": uuid.uuid4().hex[:12],
        "kind": kind,  # "lost" | "found"
        "title": title,
        "description": description,
        "category": category,
        "location": location,
        "contact": contact,
        "image": data_uri,
        "embedding": emb,
        "created_at": _now(),
    }
    _ITEMS.append(item)
    _persist()
    matches = match_against(emb, opposite_of=kind, top_k=5)
    return {"item": _public(item), "matches": matches}


def _public(item: dict) -> dict:
    return {k: v for k, v in item.items() if k != "embedding"}


def list_items(kind: str | None = None) -> list[dict]:
    items = [i for i in _ITEMS if kind is None or i["kind"] == kind]
    items = sorted(items, key=lambda i: i["created_at"], reverse=True)
    return [_public(i) for i in items]


def match_against(emb: list[float], opposite_of: str, top_k: int = 5) -> list[dict]:
    target_kind = "found" if opposite_of == "lost" else "lost"
    scored = []
    for it in _ITEMS:
        if it["kind"] != target_kind:
            continue
        score = embeddings.cosine(emb, it["embedding"])
        pub = _public(it)
        pub["match_score"] = round(score, 3)
        scored.append(pub)
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:top_k]


def search_by_photo(raw: bytes, kind: str | None = None, top_k: int = 8) -> list[dict]:
    emb = embeddings.embed(raw)
    scored = []
    for it in _ITEMS:
        if kind is not None and it["kind"] != kind:
            continue
        score = embeddings.cosine(emb, it["embedding"])
        pub = _public(it)
        pub["match_score"] = round(score, 3)
        scored.append(pub)
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored[:top_k]
